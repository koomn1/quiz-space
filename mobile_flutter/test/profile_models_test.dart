import 'package:flutter_test/flutter_test.dart';

import '../lib/models/profile_models.dart';

void main() {
  test('computes accuracy from valid completion rows only', () {
    final profile = ProfileModel.fromMaps(
      id: 'user-1',
      user: const {'name': 'Tester', 'is_premium': true, 'xp': 120},
      quizzes: const [
        {'id': 'quiz-1', 'title': 'Biology'},
      ],
      completions: const [
        {'score': 8, 'total_questions': 10},
        {'score': 4, 'total_questions': 5},
        {'score': 0, 'total_questions': 0},
      ],
    );

    expect(profile.quizzesTaken, 3);
    expect(profile.accuracy, 80);
    expect(profile.createdQuizzes, hasLength(1));
    expect(profile.isPremium, isTrue);
  });

  test('does not invent a score or quiz when rows are absent', () {
    final profile = ProfileModel.fromMaps(
      id: 'user-2',
      user: const {},
      quizzes: const [],
      completions: const [],
    );

    expect(profile.name, isEmpty);
    expect(profile.accuracy, 0);
    expect(profile.quizzesTaken, 0);
    expect(profile.createdQuizzes, isEmpty);
  });

  test('maps unique taker rows from the existing RPC contract', () {
    final taker = TakerModel.fromMap(const {
      'taker_name': 'Student',
      'best_score': 9,
      'total_questions': 10,
      'attempts_count': 2,
    });

    expect(taker.name, 'Student');
    expect(taker.score, 9);
    expect(taker.totalQuestions, 10);
    expect(taker.attemptsCount, 2);
  });
}
