import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/profile_models.dart';

class QuizSpaceRepository {
  QuizSpaceRepository(this.client);

  final SupabaseClient client;

  Stream<AuthState> get authChanges => client.auth.onAuthStateChange;

  User? get currentUser => client.auth.currentUser;

  static const googleRedirectUri = 'io.quizspace.mobile://login-callback';

  Future<void> signIn({required String email, required String password}) async {
    final response = await client.auth.signInWithPassword(email: email.trim(), password: password);
    final user = response.user;
    if (user == null) throw AuthException('LOGIN_FAILED');
    if (user.emailConfirmedAt == null) {
      await client.auth.signOut(scope: SignOutScope.local);
      throw AuthException('EMAIL_NOT_CONFIRMED');
    }
  }

  Future<void> signUp({required String email, required String password}) async {
    final response = await client.auth.signUp(email: email.trim(), password: password);
    if (response.user == null) throw AuthException('SIGNUP_FAILED');
  }

  Future<void> signInWithGoogle() async {
    await client.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: googleRedirectUri,
      authScreenLaunchMode: LaunchMode.externalApplication,
      queryParams: const {'prompt': 'select_account'},
    );
  }

  Future<void> signOut() => client.auth.signOut();

  Future<ProfileModel> loadOwnProfile() async {
    final userId = currentUser?.id;
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
