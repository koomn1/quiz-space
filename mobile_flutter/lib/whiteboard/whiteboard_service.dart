/// Worker access for whiteboard lessons: same endpoints the web app uses.
/// Auth mirrors mobile_ai_service: Firebase ID token first, Supabase session as fallback.
import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart' as firebase;
import 'package:supabase_flutter/supabase_flutter.dart';

import 'whiteboard_models.dart';

class WhiteboardService {
  static const _workerUrl = String.fromEnvironment('AI_WORKER_URL');

  static Future<String> _bearerToken() async {
    final user = firebase.FirebaseAuth.instance.currentUser;
    if (user != null) {
      final token = await user.getIdToken(true);
      if (token != null && token.isNotEmpty) return token;
    }
    final session = Supabase.instance.client.auth.currentSession;
    if (session != null && session.accessToken.isNotEmpty) return session.accessToken;
    throw const HttpException('سجل الدخول أولاً لتوليد درس على السبورة.');
  }

  /// Generate a lesson from a topic. Throws with an Arabic message on failure.
  static Future<WhiteboardLesson> generateLesson(String topic) async {
    if (_workerUrl.isEmpty) throw const HttpException('خدمة الذكاء الاصطناعي غير مهيأة.');
    final token = await _bearerToken();
    final client = HttpClient();
    try {
      final request = await client.postUrl(Uri.parse('$_workerUrl/api/ai/lesson-generate'));
      request.headers
        ..set(HttpHeaders.authorizationHeader, 'Bearer $token')
        ..set(HttpHeaders.contentTypeHeader, 'application/json');
      request.write(jsonEncode({'topic': topic}));
      final response = await request.close().timeout(const Duration(minutes: 4));
      final body = await utf8.decodeStream(response);
      if (response.statusCode == 403) {
        throw const HttpException('دروس السبورة متاحة في باقتي Gold وDiamond فقط.');
      }
      if (response.statusCode != 200) {
        throw HttpException('تعذر توليد الدرس (${response.statusCode}). حاول مرة أخرى.');
      }
      final data = jsonDecode(body);
      final lessonJson = data is Map<String, dynamic> ? data['lesson'] : null;
      if (lessonJson is! Map<String, dynamic>) throw const HttpException('رد غير صالح من الخادم.');
      final lesson = WhiteboardLesson.fromJson(lessonJson);
      if (lesson.steps.isEmpty) throw const HttpException('الدرس المولد فارغ. حاول بصياغة أخرى.');
      return lesson;
    } finally {
      client.close();
    }
  }
}
