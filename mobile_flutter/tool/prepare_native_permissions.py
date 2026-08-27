from pathlib import Path

root = Path(__file__).resolve().parents[1]
activity = root / 'android/app/src/main/kotlin/com/quizspace/badawy/MainActivity.kt'
activity.parent.mkdir(parents=True, exist_ok=True)
activity.write_text(
    '''package com.quizspace.badawy

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.annotation.NonNull
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "io.quizspace.mobile/permissions"
    private val permissionRequestCode = 8172
    private var pendingPermissionResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName).setMethodCallHandler { call, result ->
            when (call.method) {
                "request" -> requestPermission(call, result)
                "isGranted" -> result.success(isGranted(call.argument<String>("permission")))
                "openAppSettings" -> {
                    startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
                    result.success(null)
                }
                "openInstallSettings" -> {
                    openInstallSettings()
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun requestPermission(call: MethodCall, result: MethodChannel.Result) {
        val permission = call.argument<String>("permission") ?: run {
            result.success(false)
            return
        }
        if (permission == "installPackages") {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || packageManager.canRequestPackageInstalls()) {
                result.success(true)
            } else {
                openInstallSettings()
                result.success(false)
            }
            return
        }

        val androidPermission = androidPermissionFor(permission)
        if (androidPermission == null || Build.VERSION.SDK_INT < requiredSdk(permission) || checkSelfPermission(androidPermission) == PackageManager.PERMISSION_GRANTED) {
            result.success(true)
            return
        }
        pendingPermissionResult = result
        requestPermissions(arrayOf(androidPermission), permissionRequestCode)
    }

    private fun isGranted(permission: String?): Boolean {
        if (permission == null) return false
        if (permission == "installPackages") {
            return Build.VERSION.SDK_INT < Build.VERSION_CODES.O || packageManager.canRequestPackageInstalls()
        }
        val androidPermission = androidPermissionFor(permission) ?: return true
        return Build.VERSION.SDK_INT < requiredSdk(permission) || checkSelfPermission(androidPermission) == PackageManager.PERMISSION_GRANTED
    }

    private fun androidPermissionFor(permission: String): String? = when (permission) {
        "notifications" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) Manifest.permission.POST_NOTIFICATIONS else null
        "camera" -> Manifest.permission.CAMERA
        "photos" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) Manifest.permission.READ_MEDIA_IMAGES else Manifest.permission.READ_EXTERNAL_STORAGE
        else -> null
    }

    private fun requiredSdk(permission: String): Int = when (permission) {
        "notifications" -> Build.VERSION_CODES.TIRAMISU
        "photos" -> Build.VERSION_CODES.M
        else -> Build.VERSION_CODES.M
    }

    private fun openInstallSettings() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:$packageName")))
        } else {
            startActivity(Intent(Settings.ACTION_SECURITY_SETTINGS))
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == permissionRequestCode) {
            val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
            pendingPermissionResult?.success(granted)
            pendingPermissionResult = null
        }
    }
}
''',
    encoding='utf-8',
)
print(f'Prepared native permission bridge at {activity}')
