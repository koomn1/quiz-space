from pathlib import Path

root = Path(__file__).resolve().parents[1]
activity = root / 'android/app/src/main/kotlin/com/quizspace/badawy/MainActivity.kt'
activity.parent.mkdir(parents=True, exist_ok=True)
activity.write_text(
    '''package com.quizspace.badawy

import android.Manifest
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import androidx.annotation.NonNull
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    private val permissionChannelName = "io.quizspace.mobile/permissions"
    private val updateChannelName = "io.quizspace.mobile/update"
    private val permissionRequestCode = 8172
    private val updatePreferencesName = "quizspace_update_download"
    private var pendingPermissionResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, permissionChannelName).setMethodCallHandler { call, result ->
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

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, updateChannelName).setMethodCallHandler { call, result ->
            when (call.method) {
                "status" -> result.success(queryDownload(call.argument<String>("version") ?: ""))
                "enqueue" -> enqueueUpdate(call, result)
                "clear" -> clearUpdate(call.argument<String>("version"), result)
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

    private fun updatePrefs() = getSharedPreferences(updatePreferencesName, Context.MODE_PRIVATE)

    private fun safeUpdateFileName(raw: String): String {
        val sanitized = raw.replace(Regex("[^A-Za-z0-9._-]"), "-").trim('-')
        return if (sanitized.isEmpty()) "quizspace-update.apk" else sanitized.take(120)
    }

    private fun isTrustedUpdateUrl(raw: String): Boolean {
        val uri = Uri.parse(raw)
        val host = uri.host?.lowercase() ?: return false
        return uri.scheme == "https" && (host == "github.com" || host.endsWith(".github.com") || host.endsWith(".githubusercontent.com"))
    }

    private fun updateDirectory(): File = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: filesDir

    private fun queryDownload(version: String): Map<String, Any?> {
        val prefs = updatePrefs()
        val savedVersion = prefs.getString("version", null)
        val downloadId = prefs.getLong("download_id", -1L)
        if (savedVersion != version || downloadId <= 0L) {
            return mapOf("version" to version, "status" to "none", "received" to 0L, "total" to 0L)
        }

        val manager = getSystemService(DOWNLOAD_SERVICE) as DownloadManager
        val cursor = manager.query(DownloadManager.Query().setFilterById(downloadId))
        cursor.use {
            if (!it.moveToFirst()) {
                return mapOf("version" to version, "status" to "none", "received" to 0L, "total" to 0L)
            }
            val received = it.getLong(it.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
            val total = it.getLong(it.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
            val status = when (it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))) {
                DownloadManager.STATUS_PENDING -> "pending"
                DownloadManager.STATUS_RUNNING -> "running"
                DownloadManager.STATUS_PAUSED -> "paused"
                DownloadManager.STATUS_SUCCESSFUL -> "complete"
                DownloadManager.STATUS_FAILED -> "failed"
                else -> "unknown"
            }
            val file = File(updateDirectory(), prefs.getString("file_name", "quizspace-update-$version.apk") ?: "quizspace-update-$version.apk")
            val actualStatus = if (status == "complete" && file.exists() && file.length() > 0L) "complete" else status
            val result = mutableMapOf<String, Any?>(
                "version" to version,
                "status" to actualStatus,
                "received" to received,
                "total" to total,
                "filePath" to if (actualStatus == "complete") file.absolutePath else null,
            )
            if (status == "failed") {
                result["reason"] = it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON))
            }
            return result
        }
    }

    private fun enqueueUpdate(call: MethodCall, result: MethodChannel.Result) {
        val version = call.argument<String>("version")?.trim().orEmpty()
        val url = call.argument<String>("url")?.trim().orEmpty()
        val fileName = safeUpdateFileName(call.argument<String>("fileName") ?: "quizspace-update-$version.apk")
        if (version.isEmpty() || version.length > 32 || !isTrustedUpdateUrl(url)) {
            result.error("INVALID_UPDATE", "Update URL is not trusted", null)
            return
        }

        val current = queryDownload(version)
        if (current["status"] == "pending" || current["status"] == "running" || current["status"] == "paused" || current["status"] == "complete") {
            result.success(current)
            return
        }

        val prefs = updatePrefs()
        val oldId = prefs.getLong("download_id", -1L)
        if (oldId > 0L) {
            (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).remove(oldId)
        }

        val target = File(updateDirectory(), fileName)
        if (target.exists()) target.delete()
        val request = DownloadManager.Request(Uri.parse(url))
            .setTitle("تحديث QuizSpace $version")
            .setDescription("التحديث سيكمل في الخلفية حتى لو أغلقت التطبيق")
            .setMimeType("application/vnd.android.package-archive")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(false)
            .setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, fileName)
        val downloadId = (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
        prefs.edit()
            .putString("version", version)
            .putString("url", url)
            .putString("file_name", fileName)
            .putLong("download_id", downloadId)
            .apply()
        result.success(queryDownload(version))
    }

    private fun clearUpdate(version: String?, result: MethodChannel.Result) {
        val requestedVersion = version?.trim().orEmpty()
        val prefs = updatePrefs()
        if (requestedVersion.isNotEmpty() && prefs.getString("version", null) != requestedVersion) {
            result.success(null)
            return
        }
        val downloadId = prefs.getLong("download_id", -1L)
        if (downloadId > 0L) (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).remove(downloadId)
        val fileName = prefs.getString("file_name", null)
        if (!fileName.isNullOrEmpty()) File(updateDirectory(), fileName).delete()
        prefs.edit().clear().apply()
        result.success(null)
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
print(f'Prepared native permission and background update bridge at {activity}')
