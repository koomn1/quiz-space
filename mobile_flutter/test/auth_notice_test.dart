import 'package:flutter_test/flutter_test.dart';

import 'package:quizspace_mobile/data/quizspace_repository.dart';

void main() {
  test('auth notice distinguishes confirmation success from verification error', () {
    const success = MobileAuthNotice(
      email: 'learner@example.com',
      message: 'تم إرسال رسالة تأكيدية للحساب.',
      kind: MobileAuthNoticeKind.success,
    );
    const error = MobileAuthNotice(
      email: 'learner@example.com',
      message: 'الحساب غير مؤكّد.',
      kind: MobileAuthNoticeKind.error,
    );

    expect(success.kind, MobileAuthNoticeKind.success);
    expect(error.kind, MobileAuthNoticeKind.error);
    expect(success.email, error.email);
  });
}
