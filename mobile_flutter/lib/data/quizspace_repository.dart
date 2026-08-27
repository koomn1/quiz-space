import 'package:firebase_auth/firebase_auth.dart' as firebase;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/profile_models.dart';

class MobileSessionException implements Exception {
  const MobileSessionException(this.message);

  final String message;

  @override
  String toString() => message;
}

class QuizSpaceRepository {
  QuizSpaceRepository(this.client);

  final SupabaseClient client;

  Stream<firebase.User?> get authChanges => firebase.FirebaseAuth.instance.authStateChanges();

  firebase.User? get currentUser => firebase.FirebaseAuth.instance.currentUser;

  static bool _googleInitialized = false;

  Future<void> signIn({required String email, required String password}) async {
    final credential = await firebase.FirebaseAuth.instance.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    final user = credential.user;
    if (user == null) throw firebase.FirebaseAuthException(code: 'user-not-found');
    if (!user.emailVerified) {
      await firebase.FirebaseAuth.instance.signOut();
      throw firebase.FirebaseAuthException(code: 'email-not-verified');
    }
  }

  Future<void> signUp({required String email, required String password}) async {
    final credential = await firebase.FirebaseAuth.instance.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    await credential.user?.sendEmailVerification();
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

  /// Verifies that Firebase has a usable token and that Supabase can reach the
  /// user's profile before AuthGate leaves the auth screen.
  Future<void> prepareDataSession() async {
    final user = currentUser;
    if (user == null) {
      throw const MobileSessionException('يجب تسجيل الدخول أولًا.');
    }

    final token = await user.getIdToken();
    if (token == null || token.isEmpty) {
      throw const MobileSessionException('تعذر تأمين جلسة الحساب. سجّل الدخول مرة أخرى.');
    }

    try {
      await _ensureAppUser(user);
      await loadOwnProfile();
    } on PostgrestException catch (_) {
      throw const MobileSessionException(
        'تم تسجيل الحساب، لكن ربط قاعدة البيانات غير مكتمل. راجع إعداد Firebase Third-Party Auth ثم حاول مرة أخرى.',
      );
    } on AuthException catch (_) {
      throw const MobileSessionException('انتهت جلسة الحساب. سجّل الدخول مرة أخرى.');
    } on MobileSessionException {
      rethrow;
    } catch (_) {
      throw const MobileSessionException('تعذر تحميل الحساب الآن. تحقق من الإنترنت وحاول مرة أخرى.');
    }
  }

  Future<void> _ensureAppUser(firebase.User user) async {
    final existing = await client
        .from('users')
        .select('uid, name, photo_url')
        .eq('uid', user.uid)
        .maybeSingle()
        .timeout(const Duration(seconds: 12));

    if (existing != null) return;

    final metadata = user.providerData.isNotEmpty ? user.providerData.first : null;
    final fallbackName = user.email?.split('@').first.trim();
    final name = (user.displayName ?? metadata?.displayName ?? fallbackName ?? 'طالب جديد').trim();
    final photoUrl = (user.photoURL ?? metadata?.photoURL ?? '').trim();

    await client.from('users').insert({
      'uid': user.uid,
      'email': user.email ?? '',
      'name': name.isEmpty ? 'طالب جديد' : name,
      'photo_url': photoUrl,
      'plan_name': 'Free',
      'is_premium': false,
    }).timeout(const Duration(seconds: 12));
  }

  Future<ProfileModel> loadOwnProfile() async {
    final userId = currentUser?.uid;
    if (userId == null) throw const AuthException('يجب تسجيل الدخول أولًا.');

    final responses = await Future.wait<dynamic>([
      client
          .from('users')
          .select('uid, custom_id, name, bio, location, photo_url, is_premium, is_founder, xp')
          .eq('uid', userId)
          .maybeSingle()
          .timeout(const Duration(seconds: 12)),
      client
          .from('quizzes')
          .select('id, title, description')
          .eq('creator_id', userId)
          .order('created_at', ascending: false)
          .limit(50)
          .timeout(const Duration(seconds: 12)),
      client
          .from('completions')
          .select('score, total_questions, created_at')
          .eq('taker_id', userId)
          .order('created_at', ascending: false)
          .limit(100)
          .timeout(const Duration(seconds: 12)),
    ]).timeout(const Duration(seconds: 18));

    final user = Map<String, dynamic>.from(
      (responses[0] as Map<String, dynamic>?) ?? <String, dynamic>{},
    );
    final quizzes = (responses[1] as List<dynamic>?)
            ?.whereType<Map<String, dynamic>>()
            .toList(growable: false) ??
        const <Map<String, dynamic>>[];
    final completions = (responses[2] as List<dynamic>?)
            ?.whereType<Map<String, dynamic>>()
            .toList(growable: false) ??
        const <Map<String, dynamic>>[];

    return ProfileModel.fromMaps(
      id: userId,
      user: user,
      quizzes: quizzes,
      completions: completions,
    );
  }

  Future<List<TakerModel>> loadQuizTakers(String quizId) async {
    final normalizedQuizId = quizId.trim();
    if (normalizedQuizId.isEmpty) return const [];

    final rows = await client
        .rpc('get_quiz_takers_unique', params: {'p_quiz_id': normalizedQuizId})
        .timeout(const Duration(seconds: 12));
    if (rows is! List) return const [];

    return rows
        .whereType<Map<String, dynamic>>()
        .map(TakerModel.fromMap)
        .toList(growable: false);
  }
}
