class QuizModel {
  const QuizModel({
    required this.id,
    required this.title,
    this.description = '',
  });

  final String id;
  final String title;
  final String description;

  factory QuizModel.fromMap(Map<String, dynamic> map) {
    return QuizModel(
      id: (map['id'] ?? '').toString(),
      title: (map['title'] ?? 'اختبار بدون اسم').toString(),
      description: (map['description'] ?? '').toString(),
    );
  }
}

class CompletionModel {
  const CompletionModel({
    required this.score,
    required this.totalQuestions,
    this.createdAt,
  });

  final int score;
  final int totalQuestions;
  final DateTime? createdAt;

  factory CompletionModel.fromMap(Map<String, dynamic> map) {
    return CompletionModel(
      score: _asInt(map['score']),
      totalQuestions: _asInt(map['total_questions'] ?? map['totalQuestions']),
      createdAt: DateTime.tryParse((map['created_at'] ?? map['createdAt'] ?? '').toString()),
    );
  }
}

class ProfileModel {
  const ProfileModel({
    required this.id,
    required this.name,
    required this.customId,
    required this.bio,
    required this.location,
    required this.photoUrl,
    required this.isPremium,
    required this.isFounder,
    required this.xp,
    required this.createdQuizzes,
    required this.completions,
  });

  final String id;
  final String name;
  final String customId;
  final String bio;
  final String location;
  final String photoUrl;
  final bool isPremium;
  final bool isFounder;
  final int xp;
  final List<QuizModel> createdQuizzes;
  final List<CompletionModel> completions;

  int get quizzesTaken => completions.length;

  int get accuracy {
    if (completions.isEmpty) return 0;
    final valid = completions.where((item) => item.totalQuestions > 0);
    if (valid.isEmpty) return 0;
    final ratio = valid.map((item) => item.score / item.totalQuestions).reduce((a, b) => a + b) / valid.length;
    final percentage = (ratio * 100).round();
    return percentage < 0 ? 0 : percentage > 100 ? 100 : percentage;
  }

  factory ProfileModel.fromMaps({
    required String id,
    required Map<String, dynamic> user,
    required List<Map<String, dynamic>> quizzes,
    required List<Map<String, dynamic>> completions,
  }) {
    return ProfileModel(
      id: id,
      name: (user['name'] ?? '').toString(),
      customId: (user['custom_id'] ?? '').toString(),
      bio: (user['bio'] ?? '').toString(),
      location: (user['location'] ?? '').toString(),
      photoUrl: (user['photo_url'] ?? '').toString(),
      isPremium: user['is_premium'] == true,
      isFounder: user['is_founder'] == true,
      xp: _asInt(user['xp']),
      createdQuizzes: quizzes.map(QuizModel.fromMap).where((item) => item.id.isNotEmpty).toList(growable: false),
      completions: completions.map(CompletionModel.fromMap).toList(growable: false),
    );
  }
}

class TakerModel {
  const TakerModel({
    required this.name,
    required this.score,
    required this.totalQuestions,
    required this.attemptsCount,
    this.lastAttemptAt,
  });

  final String name;
  final int score;
  final int totalQuestions;
  final int attemptsCount;
  final DateTime? lastAttemptAt;

  factory TakerModel.fromMap(Map<String, dynamic> map) {
    return TakerModel(
      name: (map['taker_name'] ?? map['takerName'] ?? 'عضو بدون اسم').toString(),
      score: _asInt(map['best_score'] ?? map['score']),
      totalQuestions: _asInt(map['total_questions'] ?? map['totalQuestions']),
      attemptsCount: _asInt(map['attempts_count'] ?? map['attemptNumber'] ?? 1),
      lastAttemptAt: DateTime.tryParse((map['last_attempt_at'] ?? map['created_at'] ?? '').toString()),
    );
  }
}

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.round();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
