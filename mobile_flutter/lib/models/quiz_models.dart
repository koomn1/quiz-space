class QuizQuestionModel {
  const QuizQuestionModel({
    required this.text,
    required this.options,
    required this.correctAnswer,
    this.explanation = '',
    this.imageUrl = '',
  });

  final String text;
  final List<String> options;
  final String correctAnswer;
  final String explanation;
  final String imageUrl;

  factory QuizQuestionModel.fromMap(Map<String, dynamic> map) {
    final rawOptions = map['options'];
    final options = rawOptions is List
        ? rawOptions.map((item) => item.toString().trim()).where((item) => item.isNotEmpty).take(8).toList(growable: false)
        : const <String>[];
    return QuizQuestionModel(
      text: (map['question'] ?? map['questionText'] ?? map['text'] ?? '').toString().trim(),
      options: options,
      correctAnswer: (map['correctAnswer'] ?? map['correct_answer'] ?? '').toString().trim(),
      explanation: (map['explanation'] ?? '').toString().trim(),
      imageUrl: (map['imageUrl'] ?? map['image_url'] ?? '').toString().trim(),
    );
  }

  Map<String, dynamic> toMap() => {
        'question': text,
        'options': options,
        'correctAnswer': correctAnswer,
        if (explanation.isNotEmpty) 'explanation': explanation,
        if (imageUrl.isNotEmpty) 'imageUrl': imageUrl,
      };
}

class QuizDetailModel {
  const QuizDetailModel({
    required this.id,
    required this.title,
    required this.description,
    required this.questions,
    required this.category,
    required this.timeLimit,
    required this.creatorName,
    required this.totalPlays,
    required this.averageRating,
  });

  final String id;
  final String title;
  final String description;
  final List<QuizQuestionModel> questions;
  final String category;
  final int timeLimit;
  final String creatorName;
  final int totalPlays;
  final double averageRating;

  factory QuizDetailModel.fromMap(Map<String, dynamic> map) {
    final rawQuestions = map['questions'];
    final questions = rawQuestions is List
        ? rawQuestions.whereType<Map>().map((item) => QuizQuestionModel.fromMap(Map<String, dynamic>.from(item))).where((item) => item.text.isNotEmpty && item.options.length >= 2).toList(growable: false)
        : const <QuizQuestionModel>[];
    return QuizDetailModel(
      id: (map['id'] ?? '').toString(),
      title: (map['title'] ?? 'اختبار بدون اسم').toString(),
      description: (map['description'] ?? '').toString(),
      questions: questions,
      category: (map['category'] ?? 'عام').toString(),
      timeLimit: _intValue(map['time_limit'] ?? map['timeLimit']),
      creatorName: (map['creator_name'] ?? map['creatorName'] ?? '').toString(),
      totalPlays: _intValue(map['total_plays'] ?? map['totalPlays']),
      averageRating: _doubleValue(map['avg_rating'] ?? map['averageRating']),
    );
  }
}

int _intValue(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.round();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

double _doubleValue(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0;
}
