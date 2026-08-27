import 'package:flutter/services.dart';

enum NativePermissionType { notifications, camera, photos, installPackages }

class NativePermissionService {
  static const _channel = MethodChannel('io.quizspace.mobile/permissions');

  Future<bool> request(NativePermissionType permission) async {
    final result = await _channel.invokeMethod<bool>('request', {'permission': permission.name});
    return result ?? false;
  }

  Future<bool> isGranted(NativePermissionType permission) async {
    final result = await _channel.invokeMethod<bool>('isGranted', {'permission': permission.name});
    return result ?? false;
  }

  Future<void> openAppSettings() => _channel.invokeMethod<void>('openAppSettings');

  Future<void> openInstallSettings() => _channel.invokeMethod<void>('openInstallSettings');
}
