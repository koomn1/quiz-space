import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart' as firebase;
import 'package:google_sign_in/google_sign_in.dart';

import '../models/profile_models.dart';
import '../models/quiz_models.dart';

class AdminOverview {
  const AdminOverview({required this.users, required this.quizzes, required this.completions});

  final int users;
  final int quizzes;
  final int completions;

  factory AdminOverview.fromMap(Map<String, dynamic> map) => AdminOverview(users: _asInt(map['users']), quizzes: _asInt(map['quizzes']), completions: _asInt(map['completions']));
}

class NotificationPreferences {
  const NotificationPreferences({this.emailAlerts = true, this.rankUpdates = true, this.weeklyReports = false, this.pushEnabled = true});

  final bool emailAlerts;
  final bool rankUpdates;
  final bool weeklyReports;
  final bool pushEnabled;

  factory NotificationPreferences.fromMap(Map<String, dynamic> map) => NotificationPreferences(
    emailAlerts: map['email_alerts'] != false,
    rankUpdates: map['rank_updates'] != false,
    weeklyReports: map['weekly_reports'] == true,
    pushEnabled: map['push_enabled'] != false,
  );
}

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

  Future<AdminOverview> loadAdminOverview() async {
    final payload = await _invokeMobileSession(action: 'admin_overview');
    final overview = _asMap(payload['overview']);
    if (overview == null) throw const MobileSessionException('الصلاحية الإدارية مطلوبة.');
    return AdminOverview.fromMap(overview);
  }

  Future<NotificationPreferences> loadNotificationPreferences() async {
    final payload = await _invokeMobileSession(action: 'notification_preferences');
    final preferences = _asMap(payload['preferences']);
    return NotificationPreferences.fromMap(preferences ?? const {});
  }

  Future<NotificationPreferences> saveNotificationPreferences(NotificationPreferences preferences) async {
    final payload = await _invokeMobileSession(action: 'notification_preferences', extra: {
      'write': true,
      'email_alerts': preferences.emailAlerts,
      'rank_updates': preferences.rankUpdates,
      'weekly_reports': preferences.weeklyReports,
      'push_enabled': preferences.pushEnabled,
    });
    final result = _asMap(payload['preferences']);
    if (result == null) throw const MobileSessionException('تعذر حفظ تفضيلات الإشعارات.');
    return NotificationPreferences.fromMap(result);
  }

  Future<void> sendPasswordReset({required String email}) async {
    final normalizedEmail = email.trim();
    if (!normalizedEmail.contains('@')) throw const MobileSessionException('اكتب بريدًا إلكترونيًا صحيحًا.');
    await firebase.FirebaseAuth.instance.sendPasswordResetEmail(email: normalizedEmail);
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

  Future<List<QuizModel>> loadPublicQuizzes({String search = '', String category = '', int limit = 20}) async {
    final payload = await _invokeMobileSession(
      action: 'public_quizzes',
      extra: {
        'search': search.trim().substring(0, search.trim().length > 120 ? 120 : search.trim().length),
        'category': category.trim().substring(0, category.trim().length > 80 ? 80 : category.trim().length),
        'limit': limit.clamp(1, 40),
      },
    );
    return _asListOfMaps(payload['quizzes']).map(QuizModel.fromMap).where((item) => item.id.isNotEmpty).toList(growable: false);
  }

  Future<QuizDetailModel> loadQuizDetails(String quizId) async {
    final normalizedQuizId = quizId.trim();
    if (normalizedQuizId.isEmpty) throw const MobileSessionException('رقم الاختبار غير صحيح.');
    final payload = await _invokeMobileSession(action: 'quiz_detail', quizId: normalizedQuizId);
    final quiz = _asMap(payload['quiz']);
    if (quiz == null) throw const MobileSessionException('بيانات الاختبار غير مكتملة.');
    return QuizDetailModel.fromMap(quiz);
  }

  Future<QuizDetailModel> createQuiz({
    required String title,
    required String description,
    required String category,
    required List<Map<String, dynamic>> questions,
  }) async {
    final normalizedTitle = title.trim();
    if (normalizedTitle.length < 2 || normalizedTitle.length > 160) {
      throw const MobileSessionException('اسم الاختبار لازم يكون بين حرفين و160 حرفًا.');
    }
    if (questions.isEmpty || questions.length > 200) {
      throw const MobileSessionException('الاختبار لازم يحتوي من سؤال واحد إلى 200 سؤال.');
    }
    final payload = await _invokeMobileSession(
      action: 'create_quiz',
      extra: {
        'title': normalizedTitle,
        'description': description.trim(),
        'category': category.trim().isEmpty ? 'عام' : category.trim(),
        'questions': questions,
      },
    );
    final quiz = _asMap(payload['quiz']);
    if (quiz == null) throw const MobileSessionException('تعذر حفظ الاختبار.');
    return QuizDetailModel.fromMap(quiz);
  }

  Future<Map<String, dynamic>> updateOwnProfile({
    required String name,
    required String bio,
    required String location,
  }) async {
    final payload = await _invokeMobileSession(
      action: 'update_profile',
      extra: {
        'name': name.trim(),
        'bio': bio.trim(),
        'location': location.trim(),
      },
    );
    final user = _asMap(payload['user']);
    if (user == null) throw const MobileSessionException('تعذر حفظ بيانات البروفايل.');
    return user;
  }

  Future<Map<String, dynamic>> submitQuizAttempt({
    required String quizId,
    required List<String?> answers,
    int? rating,
    String feedback = '',
  }) async {
    final normalizedQuizId = quizId.trim();
    if (normalizedQuizId.isEmpty) throw const MobileSessionException('رقم الاختبار غير صحيح.');
    final payload = await _invokeMobileSession(
      action: 'submit_attempt',
      extra: {
        'quiz_id': normalizedQuizId,
        'answers': answers,
        if (rating != null) 'rating': rating,
        if (feedback.trim().isNotEmpty) 'feedback': feedback.trim(),
      },
    );
    final completion = _asMap(payload['completion']);
    if (completion == null) throw const MobileSessionException('تعذر حفظ المحاولة.');
    return completion;
  }

  Future<List<TakerModel>> loadQuizTakers(String quizId) async {
    final normalizedQuizId = quizId.trim();
    if (normalizedQuizId.isEmpty) return const [];

    final payload = await _invokeMobileSession(action: 'quiz_takers', quizId: normalizedQuizId);
    final rows = _asListOfMaps(payload['takers']);
    return rows.map(TakerModel.fromMap).toList(growable: false);
  }

  Future<Map<String, dynamic>> _invokeMobileSession({String action = 'bootstrap', String? quizId, Map<String, dynamic>? extra}) async {
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
        ...?extra,
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
