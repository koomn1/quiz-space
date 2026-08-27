import 'package:shared_preferences/shared_preferences.dart';

import 'native_permissions.dart';

class AppPermissionsService {
  static const _notificationPromptKey = 'notification_permission_prompted_v1';
  final _native = NativePermissionService();

  Future<bool> requestNotificationsOnce() async {
    final preferences = await SharedPreferences.getInstance();
    if (preferences.getBool(_notificationPromptKey) ?? false) {
      return _native.isGranted(NativePermissionType.notifications);
    }
    await preferences.setBool(_notificationPromptKey, true);
    return _native.request(NativePermissionType.notifications);
  }

  Future<bool> requestCamera() => _native.request(NativePermissionType.camera);

  Future<bool> requestPhotos() => _native.request(NativePermissionType.photos);

  Future<bool> requestInstallPackages() => _native.request(NativePermissionType.installPackages);

  Future<bool> isGranted(NativePermissionType permission) => _native.isGranted(permission);

  Future<void> openAppSettings() => _native.openAppSettings();

  Future<void> openInstallSettings() => _native.openInstallSettings();
}
