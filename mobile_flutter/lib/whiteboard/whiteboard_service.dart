// Worker access for whiteboard lessons: same endpoints the web app uses.
// Auth mirrors mobile_ai_service: Firebase ID token first, Supabase session as fallback.
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
      // Write raw UTF-8 bytes: request.write() would encode via the request's
      // string encoding, which throws ArgumentError on Arabic text.
      request.add(utf8.encode(jsonEncode({'topic': topic})));
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

  /// Ask a question mid-lesson; the worker answers with one validated branch step
  /// (same /api/ai/lesson-followup the web player uses). Throws with an Arabic message on failure.
  static Future<LessonStep> askFollowup({
    required String question,
    required String lang,
    required String lessonTitle,
    required LessonStep step,
  }) async {
    if (_workerUrl.isEmpty) throw const HttpException('خدمة الذكاء الاصطناعي غير مهيأة.');
    final token = await _bearerToken();
    final client = HttpClient();
    try {
      final request = await client.postUrl(Uri.parse('$_workerUrl/api/ai/lesson-followup'));
      request.headers
        ..set(HttpHeaders.authorizationHeader, 'Bearer $token')
        ..set(HttpHeaders.contentTypeHeader, 'application/json');
      // UTF-8 bytes for the same reason as generateLesson (Arabic questions).
      request.add(utf8.encode(jsonEncode({
        'question': question,
        'lang': lang,
        'lessonTitle': lessonTitle,
        'step': {'title': step.title ?? '', 'narration': step.narration, 'nodes': step.nodes.map((n) => n.toJson()).toList()},
      })));
      final response = await request.close().timeout(const Duration(minutes: 2));
      final body = await utf8.decodeStream(response);
      if (response.statusCode != 200) {
        throw HttpException('تعذر الرد على السؤال (${response.statusCode}). حاول مرة أخرى.');
      }
      final data = jsonDecode(body);
      final stepJson = data is Map<String, dynamic> ? data['step'] : null;
      if (stepJson is! Map<String, dynamic>) throw const HttpException('رد غير صالح من الخادم.');
      return LessonStep.fromJson(stepJson);
    } finally {
      client.close();
    }
  }

  /// Teacher narration clip (Munsit WAV) for one step. Null on any failure —
  /// the lesson then plays silent with the on-board explanation, same as web.
  static Future<List<int>?> fetchTts(String text, {String voice = 'boy', double speed = 1, String provider = 'munsit'}) async {
    if (_workerUrl.isEmpty || text.trim().length < 2) return null;
    try {
      final token = await _bearerToken();
      final client = HttpClient();
      try {
        final request = await client.postUrl(Uri.parse('$_workerUrl/api/ai/lesson-tts'));
        request.headers
          ..set(HttpHeaders.authorizationHeader, 'Bearer $token')
          ..set(HttpHeaders.contentTypeHeader, 'application/json');
        // UTF-8 bytes: Arabic narration throws on request.write (see above).
        request.add(utf8.encode(jsonEncode({'text': text, 'voice': voice, 'speed': speed, 'provider': provider})));
        final response = await request.close().timeout(const Duration(seconds: 45));
        if (response.statusCode != 200) return null;
        final bytes = await response.fold<List<int>>(<int>[], (acc, chunk) => acc..addAll(chunk));
        return bytes.isEmpty ? null : bytes;
      } finally {
        client.close();
      }
    } catch (_) {
      return null;
    }
  }
}

/// Server library entry for the history list (no full lesson payload).
class WhiteboardLessonMeta {
  WhiteboardLessonMeta({required this.id, required this.title, required this.lang, required this.stepCount, this.createdAt});
  final String id;
  final String title;
  final String lang;
  final int stepCount;
  final String? createdAt;
}

/// Result of a library call: ok, storageNotReady (migration pending), or failed.
enum LibraryResult { ok, storageNotReady, failed }

extension WhiteboardLibraryApi on WhiteboardService {
  /// CRUD against the per-user server library. All errors map to LibraryResult so the
  /// caller can degrade to the local cache quietly (e.g. before the migration is applied).
  static Future<(LibraryResult, List<WhiteboardLessonMeta>)> listLessonMetas() async {
    if (WhiteboardService._workerUrl.isEmpty) return (LibraryResult.failed, const []);
    try {
      final token = await WhiteboardService._bearerToken();
      final client = HttpClient();
      try {
        final request = await client.getUrl(Uri.parse('${WhiteboardService._workerUrl}/api/ai/whiteboard-lessons'));
        request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
        final response = await request.close().timeout(const Duration(seconds: 30));
        final body = await utf8.decodeStream(response);
        if (response.statusCode == 503) return (LibraryResult.storageNotReady, const []);
        if (response.statusCode != 200) return (LibraryResult.failed, const []);
        final data = jsonDecode(body);
        final rows = data is Map<String, dynamic> ? data['lessons'] : null;
        if (rows is! List) return (LibraryResult.failed, const []);
        return (
          LibraryResult.ok,
          rows.whereType<Map<String, dynamic>>().map((m) => WhiteboardLessonMeta(
                id: '${m['id'] ?? ''}',
                title: '${m['title'] ?? ''}',
                lang: '${m['lang'] ?? 'ar'}',
                stepCount: (m['step_count'] as num?)?.toInt() ?? 0,
                createdAt: m['created_at'] as String?,
              )).toList(),
        );
      } finally {
        client.close();
      }
    } catch (_) {
      return (LibraryResult.failed, const []);
    }
  }

  static Future<WhiteboardLesson?> fetchLesson(String id) async {
    if (WhiteboardService._workerUrl.isEmpty) return null;
    try {
      final token = await WhiteboardService._bearerToken();
      final client = HttpClient();
      try {
        final request = await client.getUrl(Uri.parse('${WhiteboardService._workerUrl}/api/ai/whiteboard-lessons/${Uri.encodeComponent(id)}'));
        request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
        final response = await request.close().timeout(const Duration(seconds: 30));
        if (response.statusCode != 200) return null;
        final data = jsonDecode(await utf8.decodeStream(response));
        final lessonJson = data is Map<String, dynamic> ? data['lesson'] : null;
        if (lessonJson is! Map<String, dynamic>) return null;
        return WhiteboardLesson.fromJson(lessonJson);
      } finally {
        client.close();
      }
    } catch (_) {
      return null;
    }
  }

  static Future<LibraryResult> saveLesson(WhiteboardLesson lesson) async {
    if (WhiteboardService._workerUrl.isEmpty) return LibraryResult.failed;
    try {
      final token = await WhiteboardService._bearerToken();
      final client = HttpClient();
      try {
        final request = await client.putUrl(Uri.parse('${WhiteboardService._workerUrl}/api/ai/whiteboard-lessons/${Uri.encodeComponent(lesson.id)}'));
        request.headers
          ..set(HttpHeaders.authorizationHeader, 'Bearer $token')
          ..set(HttpHeaders.contentTypeHeader, 'application/json');
        // UTF-8 bytes: Arabic lesson titles/narration throw on request.write.
        request.add(utf8.encode(jsonEncode({'lesson': lesson.toJson()})));
        final response = await request.close().timeout(const Duration(seconds: 30));
        await utf8.decodeStream(response);
        if (response.statusCode == 503) return LibraryResult.storageNotReady;
        return response.statusCode == 200 ? LibraryResult.ok : LibraryResult.failed;
      } finally {
        client.close();
      }
    } catch (_) {
      return LibraryResult.failed;
    }
  }

  static Future<LibraryResult> deleteLesson(String id) async {
    if (WhiteboardService._workerUrl.isEmpty) return LibraryResult.failed;
    try {
      final token = await WhiteboardService._bearerToken();
      final client = HttpClient();
      try {
        final request = await client.deleteUrl(Uri.parse('${WhiteboardService._workerUrl}/api/ai/whiteboard-lessons/${Uri.encodeComponent(id)}'));
        request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
        final response = await request.close().timeout(const Duration(seconds: 30));
        await utf8.decodeStream(response);
        if (response.statusCode == 503) return LibraryResult.storageNotReady;
        return response.statusCode == 200 ? LibraryResult.ok : LibraryResult.failed;
      } finally {
        client.close();
      }
    } catch (_) {
      return LibraryResult.failed;
    }
  }
}
