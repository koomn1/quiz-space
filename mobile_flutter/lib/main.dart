import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart' as firebase;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'data/quizspace_repository.dart';
import 'screens/auth_screen.dart';
import 'screens/native_app_shell.dart';
import 'widgets/update_gate.dart';

const _background = Color(0xFF080D1C);
const _surface = Color(0xFF121A31);
const _surfaceRaised = Color(0xFF192342);
const _primary = Color(0xFFA78BFA);
const _primaryStrong = Color(0xFF7C3AED);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
    runApp(const QuizSpaceApp(configurationMissing: true));
    return;
  }

  try {
    await Firebase.initializeApp();
    await Supabase.initialize(
      url: supabaseUrl,
      publishableKey: supabaseAnonKey,
      accessToken: () async => firebase.FirebaseAuth.instance.currentUser?.getIdToken(),
    );
    runApp(const QuizSpaceApp());
  } catch (_) {
    runApp(const QuizSpaceApp(configurationMissing: true));
  }
}

class QuizSpaceApp extends StatelessWidget {
  const QuizSpaceApp({super.key, this.configurationMissing = false});

  final bool configurationMissing;

  @override
  Widget build(BuildContext context) {
    final scheme = ColorScheme.fromSeed(
      seedColor: _primaryStrong,
      brightness: Brightness.dark,
      surface: _surface,
    ).copyWith(
      primary: _primary,
      onPrimary: const Color(0xFF160C2B),
      secondary: const Color(0xFF67E8F9),
      tertiary: const Color(0xFFFBBF24),
      surface: _surface,
      onSurface: const Color(0xFFF7F5FF),
      outline: const Color(0xFF3B4668),
    );

    return MaterialApp(
      title: 'QuizSpace',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: _background,
        colorScheme: scheme,
        useMaterial3: true,
        fontFamily: 'Arial',
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: _surfaceRaised.withValues(alpha: 0.68),
          contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 17),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: BorderSide(color: scheme.outline.withValues(alpha: 0.72)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: BorderSide(color: scheme.outline.withValues(alpha: 0.72)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: _primary, width: 1.5),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: BorderSide(color: scheme.error.withValues(alpha: 0.85)),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: BorderSide(color: scheme.error, width: 1.5),
          ),
          labelStyle: TextStyle(color: Colors.white.withValues(alpha: 0.68)),
          floatingLabelStyle: const TextStyle(color: _primary),
        ),
      ),
      home: configurationMissing ? const _ConfigurationScreen() : const UpdateGate(child: _AuthGate()),
    );
  }
}

class _AuthGate extends StatefulWidget {
  const _AuthGate();

  @override
  State<_AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<_AuthGate> {
  late final QuizSpaceRepository _repository;
  StreamSubscription<firebase.User?>? _authSubscription;
  firebase.User? _user;
  bool _initializing = true;

  @override
  void initState() {
    super.initState();
    _repository = QuizSpaceRepository(
      supabaseUrl: const String.fromEnvironment('SUPABASE_URL'),
      supabaseAnonKey: const String.fromEnvironment('SUPABASE_ANON_KEY'),
    );
    _user = _repository.currentUser;
    _authSubscription = _repository.authChanges.listen(_onAuthChanged);
    _initializing = false;
  }

  void _onAuthChanged(firebase.User? user) {
    if (!mounted) return;
    setState(() => _user = user);
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_initializing) return const _AuthLoadingView(label: 'بنجهز جلستك...');
    final user = _user;
    if (user == null) return AuthScreen(repository: _repository);

    return NativeAppShell(repository: _repository);
  }
}

class _AuthLoadingView extends StatelessWidget {
  const _AuthLoadingView({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [_background, Color(0xFF111A38), _background],
          ),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Image.asset('assets/quizspace-logo.webp', width: 84, height: 84),
              const SizedBox(height: 22),
              const SizedBox(width: 26, height: 26, child: CircularProgressIndicator(strokeWidth: 2.5, color: _primary)),
              const SizedBox(height: 18),
              Text(label, style: TextStyle(color: Colors.white.withValues(alpha: 0.74), fontSize: 15)),
            ],
          ),
        ),
      ),
    );
  }
}


class _ConfigurationScreen extends StatelessWidget {
  const _ConfigurationScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Image.asset('assets/quizspace-logo.webp', width: 86, height: 86),
              const SizedBox(height: 18),
              const Text('التطبيق جاهز، وينقصه إعداد الاتصال الآمن.', textAlign: TextAlign.center, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              Text('شغّل نسخة البناء مع SUPABASE_URL وSUPABASE_ANON_KEY عبر dart-define. لا تضع مفاتيح سرية داخل التطبيق.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withValues(alpha: 0.68), height: 1.5)),
            ],
          ),
        ),
      ),
    );
  }
}
