import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../data/quizspace_repository.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.repository});

  final QuizSpaceRepository repository;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isRegister = false;
  bool _loading = false;
  bool _googleLoading = false;
  String? _error;
  String? _success;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _signInWithGoogle() async {
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _googleLoading = true;
      _error = null;
      _success = null;
    });
    try {
      await widget.repository.signInWithGoogle();
    } on FirebaseAuthException catch (error) {
      if (mounted) setState(() => _error = _firebaseErrorMessage(error.code, google: true));
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر فتح تسجيل Google الآن. تحقق من اتصال الإنترنت وحاول مرة أخرى.');
    } finally {
      if (mounted) setState(() => _googleLoading = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _loading = true;
      _error = null;
      _success = null;
    });

    try {
      if (_isRegister) {
        await widget.repository.signUp(
          email: _emailController.text,
          password: _passwordController.text,
        );
        if (!mounted) return;
        setState(() => _success = 'تم إنشاء الحساب. إذا ظهر طلب تأكيد، راجع بريدك ثم سجّل الدخول.');
      } else {
        await widget.repository.signIn(
          email: _emailController.text,
          password: _passwordController.text,
        );
      }
    } on FirebaseAuthException catch (error) {
      if (mounted) setState(() => _error = _firebaseErrorMessage(error.code, register: _isRegister));
    } catch (_) {
      if (mounted) setState(() => _error = 'حدث خطأ مؤقت في الاتصال. حاول مرة أخرى.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 30, 24, 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(child: Image.asset('assets/quizspace-logo.webp', width: 92, height: 92)),
                  const SizedBox(height: 20),
                  const Text('QuizSpace', textAlign: TextAlign.center, style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, letterSpacing: 0.4)),
                  const SizedBox(height: 8),
                  Text(_isRegister ? 'أنشئ حسابك وابدأ التعلم' : 'مرحبًا بعودتك', textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withValues(alpha: 0.68), fontSize: 16)),
                  const SizedBox(height: 30),
                  Card(
                    color: colors.surface.withValues(alpha: 0.94),
                    elevation: 8,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                    child: Padding(
                      padding: const EdgeInsets.all(22),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              autofillHints: const [AutofillHints.email],
                              decoration: const InputDecoration(labelText: 'البريد الإلكتروني', prefixIcon: Icon(Icons.mail_outline), border: OutlineInputBorder()),
                              validator: (value) => value == null || !value.contains('@') ? 'اكتب بريدًا إلكترونيًا صحيحًا' : null,
                            ),
                            const SizedBox(height: 14),
                            TextFormField(
                              controller: _passwordController,
                              obscureText: true,
                              autofillHints: const [AutofillHints.password],
                              decoration: const InputDecoration(labelText: 'كلمة المرور', prefixIcon: Icon(Icons.lock_outline), border: OutlineInputBorder()),
                              validator: (value) => value == null || value.length < 6 ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : null,
                              onFieldSubmitted: (_) => _submit(),
                            ),
                            if (_error != null) ...[
                              const SizedBox(height: 14),
                              _MessageBanner(text: _error!, color: colors.error),
                            ],
                            if (_success != null) ...[
                              const SizedBox(height: 14),
                              _MessageBanner(text: _success!, color: colors.tertiary),
                            ],
                            const SizedBox(height: 20),
                            FilledButton.icon(
                              onPressed: _loading || _googleLoading ? null : _submit,
                              icon: _loading ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.arrow_forward_rounded),
                              label: Text(_isRegister ? 'إنشاء الحساب' : 'تسجيل الدخول'),
                              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                            ),
                            const SizedBox(height: 14),
                            Row(children: [Expanded(child: Divider(color: Colors.white.withValues(alpha: 0.14))), Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Text('أو', style: TextStyle(color: Colors.white.withValues(alpha: 0.52)))), Expanded(child: Divider(color: Colors.white.withValues(alpha: 0.14)))]),
                            const SizedBox(height: 14),
                            OutlinedButton.icon(
                              onPressed: _loading || _googleLoading ? null : _signInWithGoogle,
                              icon: _googleLoading ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const _GoogleMark(),
                              label: Text(_googleLoading ? 'جارٍ فتح Google...' : 'المتابعة باستخدام Google'),
                              style: OutlinedButton.styleFrom(foregroundColor: Colors.white, minimumSize: const Size.fromHeight(52), side: BorderSide(color: Colors.white.withValues(alpha: 0.22)), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                            ),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: _loading || _googleLoading ? null : () => setState(() { _isRegister = !_isRegister; _error = null; _success = null; }),
                              child: Text(_isRegister ? 'لديك حساب؟ سجّل الدخول' : 'ليس لديك حساب؟ أنشئ حسابًا'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 22),
                  Text('بياناتك محمية بجلسة Supabase، والتطبيق لا يضع مفاتيح إدارية داخله.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withValues(alpha: 0.48), fontSize: 12, height: 1.4)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

String _firebaseErrorMessage(String code, {bool register = false, bool google = false}) {
  if (code == 'email-not-verified' || code == 'user-disabled') return 'الحساب غير متاح حاليًا. تأكد من البريد الإلكتروني أو تواصل مع الدعم.';
  if (code == 'email-already-in-use') return 'هذا البريد مسجّل بالفعل. سجّل الدخول بدل إنشاء حساب جديد.';
  if (code == 'invalid-credential' || code == 'wrong-password' || code == 'user-not-found') return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if (code == 'weak-password') return 'اختَر كلمة مرور أقوى من 6 أحرف.';
  if (code == 'invalid-email') return 'اكتب بريدًا إلكترونيًا صحيحًا.';
  if (google) return 'تعذر تسجيل الدخول بحساب Google. تأكد من إعداد Firebase وحاول مرة أخرى.';
  return register ? 'تعذر إنشاء الحساب الآن. راجع البيانات وحاول مرة أخرى.' : 'تعذر تسجيل الدخول الآن. راجع البيانات وحاول مرة أخرى.';
}

class _GoogleMark extends StatelessWidget {
  const _GoogleMark();

  @override
  Widget build(BuildContext context) {
    return const Text('G', style: TextStyle(color: Color(0xFF4285F4), fontSize: 21, fontWeight: FontWeight.w900));
  }
}

class _MessageBanner extends StatelessWidget {
  const _MessageBanner({required this.text, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withValues(alpha: 0.35))),
      child: Text(text, style: TextStyle(color: color, height: 1.35)),
    );
  }
}
