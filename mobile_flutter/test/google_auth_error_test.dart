import 'package:flutter_test/flutter_test.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:quizspace_mobile/screens/auth_screen.dart';

void main() {
  test('cancelling the native account picker is silent', () {
    const error = GoogleSignInException(code: GoogleSignInExceptionCode.canceled);
    expect(googleSignInErrorMessage(error), isEmpty);
  });

  test('client configuration errors tell the user to update the native setup', () {
    const error = GoogleSignInException(code: GoogleSignInExceptionCode.clientConfigurationError);
    expect(googleSignInErrorMessage(error), contains('إعداد Google'));
  });

  test('provider errors give an actionable Play services message', () {
    const error = GoogleSignInException(code: GoogleSignInExceptionCode.providerConfigurationError);
    expect(googleSignInErrorMessage(error), contains('Google Play services'));
  });
}
