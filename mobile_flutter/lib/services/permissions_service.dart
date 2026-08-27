import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppPermissionsService {
  static const _notificationPromptKey = 'notification_permission_prompted_v1';

  Future<PermissionStatus> requestNotificationsOnce() async {
    final preferences = await SharedPreferences.getInstance();
    if (preferences.getBool(_notificationPromptKey) ?? false) {
      return Permission.notification.status;
    }
    await preferences.setBool(_notificationPromptKey, true);
    return Permission.notification.request();
  }

  Future<PermissionStatus> requestCamera() => Permission.camera.request();

  Future<PermissionStatus> requestPhotos() => Permission.photos.request();

  Future<PermissionStatus> requestInstallPackages() => Permission.requestInstallPackages.request();
}
