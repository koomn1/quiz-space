import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart' as firebase;
import 'package:google_sign_in/google_sign_in.dart';

import '../models/profile_models.dart';

class MobileSessionException implements Exception {
  const MobileSessionException(this.message);

  final String message;

  @override
  String toString() => message;
}

enum MobileAuthNoticeKind { success, error }

class MobileAuthNotice {
  const MobileAuthNotice({required this.email, required this.message, required this.kind});

  final String email;
  final String message;
  final MobileAuthNoticeKind kind;
}

class QuizSpaceRepository {
  QuizSpaceRepository({required this.supabaseUrl, required this.supabaseAnonKey});

  final String supabaseUrl;
  final String supabaseAnonKey;

  Stream<firebase.User?> get authChanges => firebase.FirebaseAuth.instance.authStateChanges();

  firebase.User? get currentUser => firebase.FirebaseAuth.instance.currentUser;

  static bool _googleInitialized = false;
  MobileAuthNotice? _pendingAuthNotice;

  MobileAuthNotice? takePendingAuthNotice() {
    final notice = _pendingAuthNotice;
    _pendingAuthNotice = null;
    return notice;
  }

  Future<void> signIn({required String email, required String password}) async {
    final credential = await firebase.FirebaseAuth.instance.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    final user = credential.user;
    if (user == null) throw firebase.FirebaseAuthException(code: 'user-not-found');
    if (!user.emailVerified) {
      _pendingAuthNotice = MobileAuthNotice(
        email: email.trim(),
        message: 'الحساب غير مؤكّد. افتح رسالة التأكيد في بريدك ثم ارجع وسجّل الدخول مرة أخرى.',
        kind: MobileAuthNoticeKind.error,
      );
      await firebase.FirebaseAuth.instance.signOut();
      throw firebase.FirebaseAuthException(code: 'email-not-verified');
    }
  }

  Future<void> signUp({required String email, required String password}) async {
    final normalizedEmail = email.trim();
    final credential = await firebase.FirebaseAuth.instance.createUserWithEmailAndPassword(
      email: normalizedEmail,
      password: password,
    );
    await credential.user?.sendEmailVerification();
    _pendingAuthNotice = MobileAuthNotice(
      email: normalizedEmail,
      message: 'تم إرسال رسالة تأكيدية للحساب. من فضلك افتح بريدك الإلكتروني واستكشف الرسالة، ثم ارجع وسجّل الدخول.',
      kind: MobileAuthNoticeKind.success,
    );
    await firebase.FirebaseAuth.instance.signOut();
  }

  Future<void> signInWithGoogle() async {
    if (!_googleInitialized) {
      await GoogleSignIn.instance.initialize();
      _googleInitialized = true;
    }

    final googleUser = await GoogleSignIn.instance.authenticate();
    final googleAuth = googleUser.authentication;
    final idToken = googleAuth.idToken;
    if (idToken == null || idToken.isEmpty) {
      throw firebase.FirebaseAuthException(code: 'missing-google-id-token');
    }

    final credential = firebase.GoogleAuthProvider.credential(idToken: idToken);
    await firebase.FirebaseAuth.instance.signInWithCredential(credential);
  }

  Future<void> signOut() async {
    await GoogleSignIn.instance.signOut();
    await firebase.FirebaseAuth.instance.signOut();
  }

  /// Verifies Firebase and lets the server resolve the legacy QuizSpace UID.
  /// The app never rewrites users.uid and never uses a service-role key.
  Future<void> prepareDataSession() async {
    final payload = await _invokeMobileSession();
    final appUid = (payload['app_user_uid'] ?? '').toString().trim();
    if (appUid.isEmpty || _asMap(payload['profile']) == null) {
      throw const MobileSessionException('تعذر تجهيز بيانات حساب QuizSpace الآن. حاول مرة أخرى.');
    }
  }

  Future<ProfileModel> loadOwnProfile() async {
    final payload = await _invokeMobileSession();
    final appUid = (payload['app_user_uid'] ?? '').toString().trim();
    final envelope = _asMap(payload['profile']);
    if (appUid.isEmpty || envelope == null) {
      throw const MobileSessionException('بيانات الحساب غير مكتملة. حاول مرة أخرى.');
    }

    final user = _asMap(envelope['user']) ?? <String, dynamic>{};
    final quizzes = _asListOfMaps(envelope['quizzes']);
    final completions = _asListOfMaps(envelope['completions']);
    return ProfileModel.fromMaps(
      id: appUid,
      user: user,
      quizzes: quizzes,
      completions: completions,
    );
  }

  Future<List<TakerModel>> loadQuizTakers(String quizId) async {
    final normalizedQuizId = quizId.trim();
    if (normalizedQuizId.isEmpty) return const [];

    final payload = await _invokeMobileSession(action: 'quiz_takers', quizId: normalizedQuizId);
    final rows = _asListOfMaps(payload['takers']);
    return rows.map(TakerModel.fromMap).toList(growable: false);
  }

  Future<Map<String, dynamic>> _invokeMobileSession({String action = 'bootstrap', String? quizId}) async {
    final user = currentUser;
    if (user == null) {
      throw const MobileSessionException('يجب تسجيل الدخول أولًا.');
    }
    if (supabaseUrl.trim().isEmpty || supabaseAnonKey.trim().isEmpty) {
      throw const MobileSessionException('إعداد التطبيق غير مكتمل.');
    }

    final token = await user.getIdToken(true);
    if (token == null || token.isEmpty) {
      throw const MobileSessionException('تعذر تأمين جلسة الحساب. سجّل الدخول مرة أخرى.');
    }

    final endpoint = Uri.parse('${supabaseUrl.replaceFirst(RegExp(r'/+$'), '')}/functions/v1/mobile-firebase-session-v2');
    final httpClient = HttpClient()..connectionTimeout = const Duration(seconds: 8);
    try {
      final request = await httpClient.postUrl(endpoint).timeout(const Duration(seconds: 12));
      request.headers
        ..set(HttpHeaders.contentTypeHeader, 'application/json')
        ..set(HttpHeaders.acceptHeader, 'application/json')
        ..set('apikey', supabaseAnonKey)
        ..set(HttpHeaders.authorizationHeader, 'Bearer $token');
      request.add(utf8.encode(jsonEncode({
        'action': action,
        if (quizId != null) 'quiz_id': quizId,
      })));

      final httpResponse = await request.close().timeout(const Duration(seconds: 18));
      final rawBody = await httpResponse.transform(utf8.decoder).join().timeout(const Duration(seconds: 8));
      Map<String, dynamic> body = <String, dynamic>{};
      if (rawBody.trim().isNotEmpty) {
        final decoded = jsonDecode(rawBody);
        if (decoded is Map) body = Map<String, dynamic>.from(decoded);
      }

      if (httpResponse.statusCode < 200 || httpResponse.statusCode >= 300) {
        final serverMessage = (body['error'] ?? '').toString().trim();
        throw MobileSessionException(
          serverMessage.isEmpty ? 'تعذر تحميل حسابك الآن. تحقق من الإنترنت وحاول مرة أخرى.' : serverMessage,
        );
      }
      return body;
    } on MobileSessionException {
      rethrow;
    } on SocketException {
      throw const MobileSessionException('تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.');
    } on TimeoutException {
      throw const MobileSessionException('الخادم اتأخر في الرد. حاول مرة أخرى.');
    } on FormatException {
      throw const MobileSessionException('وصل رد غير مكتمل من الخادم. حاول مرة أخرى.');
    } catch (_) {
      throw const MobileSessionException('تعذر تحميل حسابك الآن. تحقق من الإنترنت وحاول مرة أخرى.');
    } finally {
      httpClient.close(force: true);
    }
  }

  static Map<String, dynamic>? _asMap(dynamic value) {
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }

  static List<Map<String, dynamic>> _asListOfMaps(dynamic value) {
    if (value is! List) return const <Map<String, dynamic>>[];
    return value.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList(growable: false);
  }
}
