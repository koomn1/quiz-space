import 'package:flutter_test/flutter_test.dart';
import 'package:quizspace_mobile/services/deep_link_service.dart';

void main() {
  test('extracts quiz id from the native-friendly hash route', () {
    expect(quizIdFromLink('https://quiz-space-app.pages.dev/#/quiz/quiz-123'), 'quiz-123');
  });

  test('extracts quiz id from a shared quiz query link', () {
    expect(quizIdFromLink('https://quiz-space-app.pages.dev/share/quiz?quiz=quiz-456&title=Biology'), 'quiz-456');
  });

  test('accepts the quiz share pages host', () {
    expect(quizIdFromLink('https://quiz-space-share.pages.dev/share/quiz?quiz=quiz-share-1'), 'quiz-share-1');
  });

  test('rejects links from untrusted hosts', () {
    expect(quizIdFromLink('https://example.com/#/quiz/quiz-789'), isNull);
  });
}
