import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../data/quizspace_repository.dart';

const _authBg = Color(0xFF080D1C);
const _authCard = Color(0xFF111A33);
const _authCardSoft = Color(0xFF182342);
const _authLavender = Color(0xFFC4B5FD);
const _authCyan = Color(0xFF67E8F9);

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
  bool _showPassword = false;
  String? _error;
  String? _success;

  @override
  void initState() {
    super.initState();
    final notice = widget.repository.takePendingAuthNotice();
    if (notice != null) {
      _emailController.text = notice.email;
      _isRegister = notice.kind == MobileAuthNoticeKind.success;
      if (notice.kind == MobileAuthNoticeKind.success) {
        _success = notice.message;
      } else {
        _error = notice.message;
      }
    }
  }

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
    String? nextError;
    try {
      await widget.repository.signInWithGoogle();
    } on GoogleSignInException catch (error) {
      nextError = googleSignInErrorMessage(error);
    } on FirebaseAuthException catch (error) {
      nextError = _firebaseErrorMessage(error.code, google: true);
    } catch (_) {
      nextError = 'تعذر فتح حساب Google. تأكد من وجود حساب على الهاتف وحاول مرة أخرى.';
    } finally {
      if (mounted) {
        setState(() {
          _googleLoading = false;
          _error = nextError;
        });
      }
    }
  }

  Future<void> _resetPassword() async {
    final email = _emailController.text.trim();
    if (!email.contains('@')) {
      setState(() => _error = 'اكتب بريدك الإلكتروني الأول عشان نرسل رابط الاستعادة.');
      return;
    }
    setState(() { _loading = true; _error = null; _success = null; });
    try {
      await widget.repository.sendPasswordReset(email: email);
      if (mounted) setState(() => _success = 'اتبعث رابط إعادة تعيين كلمة المرور على بريدك الإلكتروني.');
    } on FirebaseAuthException catch (error) {
      if (mounted) setState(() => _error = _firebaseErrorMessage(error.code));
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر إرسال رابط الاستعادة. حاول مرة أخرى.');
    } finally {
      if (mounted) setState(() => _loading = false);
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

    String? nextError;
    String? nextSuccess;
    try {
      if (_isRegister) {
        await widget.repository.signUp(
          email: _emailController.text,
          password: _passwordController.text,
        );
        nextSuccess = 'تم إرسال رسالة تأكيدية للحساب. من فضلك افتح بريدك الإلكتروني واستكشف الرسالة، ثم ارجع وسجّل الدخول.';
      } else {
        await widget.repository.signIn(
          email: _emailController.text,
          password: _passwordController.text,
        );
      }
    } on FirebaseAuthException catch (error) {
      nextError = _firebaseErrorMessage(error.code, register: _isRegister);
    } catch (_) {
      nextError = 'حصلت مشكلة مؤقتة في الاتصال. حاول مرة أخرى.';
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = nextError;
          _success = nextSuccess;
        });
      }
    }
  }

  void _toggleMode() {
    if (_loading || _googleLoading) return;
    setState(() {
      _isRegister = !_isRegister;
      _error = null;
      _success = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final busy = _loading || _googleLoading;

    return Scaffold(
      backgroundColor: _authBg,
      body: Stack(
        children: [
          const Positioned.fill(child: _AuthBackdrop()),
          SafeArea(
            child: Directionality(
              textDirection: TextDirection.rtl,
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 28, 20, 28),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 430),
                    child: Column(
                      children: [
                        _BrandHeader(isRegister: _isRegister),
                        const SizedBox(height: 26),
                        Container(
                          decoration: BoxDecoration(
                            color: _authCard.withValues(alpha: 0.96),
                            borderRadius: BorderRadius.circular(30),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.09)),
                            boxShadow: [
                              BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 30, offset: const Offset(0, 18)),
                            ],
                          ),
                          padding: const EdgeInsets.fromLTRB(18, 18, 18, 20),
                          child: Column(
                            children: [
                              _ModeSwitcher(isRegister: _isRegister, enabled: !busy, onChanged: (_) => _toggleMode()),
                              const SizedBox(height: 24),
                              Form(
                                key: _formKey,
                                child: AutofillGroup(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.stretch,
                                    children: [
                                      _FieldLabel(text: 'البريد الإلكتروني', icon: Icons.alternate_email_rounded),
                                      const SizedBox(height: 8),
                                      TextFormField(
                                        controller: _emailController,
                                        keyboardType: TextInputType.emailAddress,
                                        textDirection: TextDirection.ltr,
                                        textInputAction: TextInputAction.next,
                                        autofillHints: const [AutofillHints.email],
                                        enabled: !busy,
                                        decoration: const InputDecoration(hintText: 'name@example.com'),
                                        validator: (value) {
                                          final email = value?.trim() ?? '';
                                          return email.contains('@') && email.contains('.') ? null : 'اكتب بريدًا إلكترونيًا صحيحًا';
                                        },
                                      ),
                                      const SizedBox(height: 17),
                                      _FieldLabel(text: 'كلمة المرور', icon: Icons.lock_outline_rounded),
                                      const SizedBox(height: 8),
                                      TextFormField(
                                        controller: _passwordController,
                                        obscureText: !_showPassword,
                                        textInputAction: TextInputAction.done,
                                        autofillHints: const [AutofillHints.password],
                                        enabled: !busy,
                                        decoration: InputDecoration(
                                          hintText: _isRegister ? '6 أحرف على الأقل' : 'اكتب كلمة المرور',
                                          suffixIcon: IconButton(
                                            tooltip: _showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور',
                                            onPressed: busy ? null : () => setState(() => _showPassword = !_showPassword),
                                            icon: Icon(_showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                                          ),
                                        ),
                                        validator: (value) => value == null || value.length < 6 ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : null,
                                        onFieldSubmitted: (_) => _submit(),
                                      ),
                                      if (!_isRegister)
                                        Align(alignment: AlignmentDirectional.centerStart, child: TextButton(onPressed: busy ? null : _resetPassword, child: const Text('نسيت كلمة المرور؟'))),
                                      if (_error != null) ...[
                                        const SizedBox(height: 16),
                                        _MessageBanner(text: _error!, color: colors.error, icon: Icons.error_outline_rounded),
                                      ],
                                      if (_success != null) ...[
                                        const SizedBox(height: 16),
                                        _MessageBanner(text: _success!, color: const Color(0xFF5EEAD4), icon: Icons.mark_email_read_outlined),
                                      ],
                                      const SizedBox(height: 22),
                                      SizedBox(
                                        height: 56,
                                        child: FilledButton(
                                          onPressed: busy ? null : _submit,
                                          style: FilledButton.styleFrom(
                                            backgroundColor: _authLavender,
                                            foregroundColor: const Color(0xFF211338),
                                            disabledBackgroundColor: _authLavender.withValues(alpha: 0.45),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                                          ),
                                          child: AnimatedSwitcher(
                                            duration: const Duration(milliseconds: 180),
                                            child: _loading
                                                ? const SizedBox(key: ValueKey('loading'), width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Color(0xFF211338)))
                                                : Row(key: const ValueKey('label'), mainAxisAlignment: MainAxisAlignment.center, children: [Text(_isRegister ? 'إنشاء حساب' : 'تسجيل الدخول', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)), const SizedBox(width: 10), const Icon(Icons.arrow_back_rounded)]),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 22),
                              _OrDivider(color: Colors.white.withValues(alpha: 0.18)),
                              const SizedBox(height: 18),
                              SizedBox(
                                height: 54,
                                child: OutlinedButton(
                                  onPressed: busy ? null : _signInWithGoogle,
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.white,
                                    side: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                                  ),
                                  child: _googleLoading
                                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
                                      : Row(mainAxisAlignment: MainAxisAlignment.center, children: [const _GoogleMark(), const SizedBox(width: 10), Text('المتابعة باستخدام Google', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700))]),
                                ),
                              ),
                              const SizedBox(height: 18),
                              TextButton(
                                onPressed: busy ? null : _toggleMode,
                                child: Text(_isRegister ? 'عندك حساب؟ سجّل الدخول' : 'لسه جديد؟ أنشئ حسابك', style: const TextStyle(fontWeight: FontWeight.w700, color: _authLavender)),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.shield_outlined, size: 16, color: Colors.white.withValues(alpha: 0.46)),
                            const SizedBox(width: 7),
                            Text('تسجيل آمن بدون مفاتيح إدارية داخل التطبيق', style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 12)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AuthBackdrop extends StatelessWidget {
  const _AuthBackdrop();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(painter: _AuthBackdropPainter());
  }
}

class _AuthBackdropPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final topGlow = Paint()..shader = const RadialGradient(colors: [Color(0x554C1D95), Color(0x00080D1C)]).createShader(Rect.fromCircle(center: Offset(size.width * 0.82, size.height * 0.12), radius: size.width * 0.82));
    final bottomGlow = Paint()..shader = const RadialGradient(colors: [Color(0x3330C4D8), Color(0x00080D1C)]).createShader(Rect.fromCircle(center: Offset(size.width * 0.1, size.height * 0.86), radius: size.width * 0.7));
    canvas.drawRect(Offset.zero & size, Paint()..color = _authBg);
    canvas.drawRect(Offset.zero & size, topGlow);
    canvas.drawRect(Offset.zero & size, bottomGlow);
    final line = Paint()..color = Colors.white.withValues(alpha: 0.035)..style = PaintingStyle.stroke..strokeWidth = 1;
    for (var i = -size.height; i < size.width + size.height; i += 58) {
      canvas.drawLine(Offset(i.toDouble(), 0), Offset(i.toDouble() + size.height, size.height), line);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _BrandHeader extends StatelessWidget {
  const _BrandHeader({required this.isRegister});

  final bool isRegister;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 96,
          height: 96,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.06),
            shape: BoxShape.circle,
            border: Border.all(color: _authLavender.withValues(alpha: 0.32)),
            boxShadow: [BoxShadow(color: _authLavender.withValues(alpha: 0.12), blurRadius: 28)],
          ),
          child: Image.asset('assets/quizspace-logo.webp', filterQuality: FilterQuality.high),
        ),
        const SizedBox(height: 17),
        const Text('QuizSpace', style: TextStyle(fontSize: 35, fontWeight: FontWeight.w900, letterSpacing: 0.3)),
        const SizedBox(height: 7),
        Text(isRegister ? 'مكانك تبدأ رحلة تعلّم مختلفة' : 'أهلاً بعودتك إلى مساحة التعلّم', style: TextStyle(color: Colors.white.withValues(alpha: 0.67), fontSize: 15, height: 1.4)),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(color: _authCyan.withValues(alpha: 0.09), borderRadius: BorderRadius.circular(30), border: Border.all(color: _authCyan.withValues(alpha: 0.18))),
          child: const Row(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.auto_awesome_rounded, color: _authCyan, size: 15), SizedBox(width: 6), Text('حلّ أذكى • تقدّم أسرع', style: TextStyle(color: _authCyan, fontSize: 12, fontWeight: FontWeight.w700))]),
        ),
      ],
    );
  }
}

class _ModeSwitcher extends StatelessWidget {
  const _ModeSwitcher({required this.isRegister, required this.enabled, required this.onChanged});

  final bool isRegister;
  final bool enabled;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: _authCardSoft.withValues(alpha: 0.78), borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Expanded(child: _ModeButton(label: 'تسجيل الدخول', selected: !isRegister, enabled: enabled, onTap: () => onChanged(false))),
          Expanded(child: _ModeButton(label: 'حساب جديد', selected: isRegister, enabled: enabled, onTap: () => onChanged(true))),
        ],
      ),
    );
  }
}

class _ModeButton extends StatelessWidget {
  const _ModeButton({required this.label, required this.selected, required this.enabled, required this.onTap});

  final String label;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: GestureDetector(
        onTap: enabled ? onTap : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: selected ? _authLavender : Colors.transparent, borderRadius: BorderRadius.circular(12)),
          child: Text(label, style: TextStyle(color: selected ? const Color(0xFF211338) : Colors.white.withValues(alpha: 0.68), fontWeight: FontWeight.w800, fontSize: 13)),
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel({required this.text, required this.icon});

  final String text;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Row(children: [Icon(icon, size: 17, color: _authLavender), const SizedBox(width: 7), Text(text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700))]);
  }
}

class _OrDivider extends StatelessWidget {
  const _OrDivider({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(children: [Expanded(child: Divider(color: color)), Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Text('أو', style: TextStyle(color: Colors.white.withValues(alpha: 0.55), fontWeight: FontWeight.w700))), Expanded(child: Divider(color: color))]);
  }
}

class _GoogleMark extends StatelessWidget {
  const _GoogleMark();

  @override
  Widget build(BuildContext context) {
    return const Text('G', style: TextStyle(color: Color(0xFF4285F4), fontSize: 23, fontWeight: FontWeight.w900));
  }
}

class _MessageBanner extends StatelessWidget {
  const _MessageBanner({required this.text, required this.color, required this.icon});

  final String text;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 12),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.11), borderRadius: BorderRadius.circular(15), border: Border.all(color: color.withValues(alpha: 0.34))),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(icon, color: color, size: 19), const SizedBox(width: 9), Expanded(child: Text(text, style: TextStyle(color: color, height: 1.4, fontSize: 13)))]),
    );
  }
}

String googleSignInErrorMessage(GoogleSignInException error) {
  switch (error.code) {
    case GoogleSignInExceptionCode.canceled:
      return '';
    case GoogleSignInExceptionCode.clientConfigurationError:
      return 'إعداد Google للتطبيق غير مكتمل. نزّل النسخة الأخيرة بعد ضبط شهادة Android وجرّب مرة أخرى.';
    case GoogleSignInExceptionCode.providerConfigurationError:
      return 'خدمة Google غير متاحة على الجهاز حاليًا. تأكد من تحديث Google Play services ثم حاول مرة أخرى.';
    case GoogleSignInExceptionCode.uiUnavailable:
      return 'تعذر فتح اختيار حساب Google الآن. اقفل أي نافذة تسجيل مفتوحة وحاول مرة أخرى.';
    case GoogleSignInExceptionCode.interrupted:
      return '';
    case GoogleSignInExceptionCode.userMismatch:
      return 'اختار حساب Google آخر أو سجّل خروجًا من الحساب الحالي ثم حاول مرة أخرى.';
    case GoogleSignInExceptionCode.unknownError:
      return 'تعذر تسجيل الدخول بحساب Google. تأكد من اتصال الإنترنت وحاول مرة أخرى.';
  }
}

String _firebaseErrorMessage(String code, {bool register = false, bool google = false}) {
  if (code == 'email-not-verified') return 'الحساب غير مؤكّد. افتح رسالة التأكيد في بريدك ثم جرّب تسجيل الدخول.';
  if (code == 'user-disabled') return 'الحساب متوقف حاليًا. تواصل مع الدعم.';
  if (code == 'email-already-in-use') return 'البريد مسجّل بالفعل. بدّل إلى تسجيل الدخول.';
  if (code == 'invalid-credential' || code == 'wrong-password' || code == 'user-not-found') return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if (code == 'weak-password') return 'اختَر كلمة مرور أقوى من 6 أحرف.';
  if (code == 'invalid-email') return 'اكتب بريدًا إلكترونيًا صحيحًا.';
  if (code == 'network-request-failed') return 'مفيش اتصال بالإنترنت. راجع الشبكة وحاول مرة أخرى.';
  if (code == 'missing-google-id-token') return 'Google ما رجّعش رمز التحقق. حدّث التطبيق وحاول مرة أخرى.';
  if (code == 'account-exists-with-different-credential') return 'البريد ده مرتبط بطريقة دخول أخرى. استخدم البريد وكلمة المرور أو اربط Google من نفس الحساب.';
  if (google) return 'تعذر تسجيل الدخول بحساب Google. تأكد من إعداد Firebase وحاول مرة أخرى.';
  return register ? 'تعذر إنشاء الحساب الآن. راجع البيانات وحاول مرة أخرى.' : 'تعذر تسجيل الدخول الآن. راجع البيانات وحاول مرة أخرى.';
}
