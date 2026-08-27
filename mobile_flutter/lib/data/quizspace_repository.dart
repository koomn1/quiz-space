import 'package:firebase_auth/firebase_auth.dart' as firebase;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/profile_models.dart';

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

  Future<ProfileModel> loadOwnProfile() async {
    final userId = currentUser?.uid;
    if (userId == null) throw const AuthException('يجب تسجيل الدخول أولًا.');

    final responses = await Future.wait<dynamic>([
      client
          .from('users')
          .select('uid, custom_id, name, bio, location, photo_url, is_premium, is_founder, xp')
          .eq('uid', userId)
          .maybeSingle(),
      client
          .from('quizzes')
          .select('id, title, description')
          .eq('creator_id', userId)
          .order('created_at', ascending: false)
          .limit(50),
      client
          .from('completions')
          .select('score, total_questions, created_at')
          .eq('taker_id', userId)
          .order('created_at', ascending: false)
          .limit(100),
    ]);

    final user = Map<String, dynamic>.from((responses[0] as Map<String, dynamic>?) ?? <String, dynamic>{});
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

    final rows = await client.rpc(
      'get_quiz_takers_unique',
      params: {'p_quiz_id': normalizedQuizId},
    );
    if (rows is! List) return const [];

    return rows
        .whereType<Map<String, dynamic>>()
        .map(TakerModel.fromMap)
        .toList(growable: false);
  }
}
