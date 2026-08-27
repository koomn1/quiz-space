import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart' as firebase;

import '../data/quizspace_repository.dart';

class MobileAiService {
  static const workerUrl = String.fromEnvironment('AI_WORKER_URL');

  Future<String> ask(String prompt, {List<Map<String, String>> history = const []}) async {
    final normalizedPrompt = prompt.trim();
    if (normalizedPrompt.isEmpty || normalizedPrompt.length > 8000) {
      throw const MobileSessionException('اكتب سؤالًا واضحًا وقصيرًا لـCosmo.');
    }
    if (workerUrl.trim().isEmpty) {
      throw const MobileSessionException('خدمة Cosmo غير مضبوطة في نسخة التطبيق الحالية.');
    }
    final user = firebase.FirebaseAuth.instance.currentUser;
    if (user == null) throw const MobileSessionException('سجّل الدخول أولًا لاستخدام Cosmo.');
    final token = await user.getIdToken(true);
    if (token == null || token.isEmpty) throw const MobileSessionException('تعذر تأمين جلسة Cosmo. سجّل الدخول مرة أخرى.');

    final client = HttpClient()..connectionTimeout = const Duration(seconds: 8);
    try {
      final endpoint = Uri.parse('${workerUrl.replaceFirst(RegExp(r'/+$'), '')}/api/ai/openrouter');
      final request = await client.postUrl(endpoint).timeout(const Duration(seconds: 10));
      request.headers
        ..set(HttpHeaders.authorizationHeader, 'Bearer $token')
        ..set(HttpHeaders.contentTypeHeader, 'application/json')
        ..set(HttpHeaders.acceptHeader, 'application/json');
      request.add(utf8.encode(jsonEncode({
        'prompt': normalizedPrompt,
        'history': history.take(20).map((item) => {'role': item['role'], 'text': item['text']}).toList(growable: false),
        'currentPage': 'mobile-cosmo',
        'siteStatus': 'QuizSpace Native Android',
      })));
      final response = await request.close().timeout(const Duration(seconds: 70));
      final raw = await response.transform(utf8.decoder).join().timeout(const Duration(seconds: 8));
      final decoded = raw.trim().isEmpty ? <String, dynamic>{} : jsonDecode(raw);
      final body = decoded is Map ? Map<String, dynamic>.from(decoded) : <String, dynamic>{};
      if (response.statusCode < 200 || response.statusCode >= 300) {
        final message = (body['error'] ?? '').toString().trim();
        if (response.statusCode == 403) throw const MobileSessionException('Cosmo متاح لأعضاء الباقات المدفوعة فقط.');
        throw MobileSessionException(message.isEmpty ? 'Cosmo اتأخر أو الخدمة غير متاحة. حاول مرة أخرى.' : message);
      }
      final text = (body['text'] ?? '').toString().trim();
      if (text.isEmpty) throw const MobileSessionException('Cosmo رجّع ردًا فارغًا. حاول مرة أخرى.');
      return text;
    } on MobileSessionException {
      rethrow;
    } on SocketException {
      throw const MobileSessionException('تعذر الاتصال بـCosmo. تحقق من الإنترنت وحاول مرة أخرى.');
    } on TimeoutException {
      throw const MobileSessionException('Cosmo اتأخر في الرد. حاول مرة أخرى.');
    } on FormatException {
      throw const MobileSessionException('وصل رد غير مكتمل من Cosmo.');
    } catch (_) {
      throw const MobileSessionException('تعذر تشغيل Cosmo الآن. حاول مرة أخرى.');
    } finally {
      client.close(force: true);
    }
  }
}
