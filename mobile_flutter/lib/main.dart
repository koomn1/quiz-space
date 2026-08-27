import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'data/quizspace_repository.dart';
import 'screens/auth_screen.dart';
import 'screens/home_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
    runApp(const QuizSpaceApp(configurationMissing: true));
    return;
  }

  await Supabase.initialize(url: supabaseUrl, publishableKey: supabaseAnonKey);
  runApp(const QuizSpaceApp());
}

class QuizSpaceApp extends StatelessWidget {
  const QuizSpaceApp({super.key, this.configurationMissing = false});

  final bool configurationMissing;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QuizSpace',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0B1020),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF8B5CF6),
          brightness: Brightness.dark,
          surface: const Color(0xFF151B31),
        ),
        useMaterial3: true,
        fontFamily: 'Arial',
      ),
      home: configurationMissing ? const _ConfigurationScreen() : const _AuthGate(),
    );
  }
}

class _AuthGate extends StatelessWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context) {
    final repository = QuizSpaceRepository(Supabase.instance.client);
    return StreamBuilder<AuthState>(
      stream: repository.authChanges,
      builder: (context, snapshot) {
        final user = repository.currentUser;
        if (user == null) return AuthScreen(repository: repository);
        return HomeScreen(repository: repository);
      },
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
