import 'dart:async';

import 'package:flutter/services.dart';

String? quizIdFromLink(String rawLink) {
  final uri = Uri.tryParse(rawLink);
  if (uri == null) return null;
  final host = uri.host.toLowerCase();
  if (uri.scheme != 'https' && uri.scheme != 'quizspace') return null;
  if (uri.scheme == 'https' && host != 'quiz-space-app.pages.dev' && host != 'quiz-space-share.pages.dev') return null;

  String? validQuizId(String? value) {
    final id = value?.trim() ?? '';
    if (id.isEmpty || id.length > 128 || !RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(id)) return null;
    return id;
  }

  final queryQuiz = validQuizId(uri.queryParameters['quiz']);
  if (queryQuiz != null) return queryQuiz;

  final fragments = uri.fragment.split('/').where((part) => part.trim().isNotEmpty).toList(growable: false);
  if (fragments.length >= 2 && fragments.first == 'quiz') return validQuizId(fragments[1]);

  final segments = uri.pathSegments.where((part) => part.trim().isNotEmpty).toList(growable: false);
  if (segments.length >= 2 && segments.first == 'quiz') return validQuizId(segments[1]);
  return null;
}

class DeepLinkService {
  DeepLinkService._();

  static final instance = DeepLinkService._();

  static const _channel = EventChannel('io.quizspace.mobile/deep-links');
  final _controller = StreamController<String>.broadcast();
  StreamSubscription<dynamic>? _platformSubscription;
  String? _pendingLink;
  bool _started = false;

  Stream<String> get links => _controller.stream;

  void start() {
    if (_started) return;
    _started = true;
    _platformSubscription = _channel.receiveBroadcastStream().listen(
      (event) {
        final raw = event?.toString().trim() ?? '';
        if (raw.isEmpty) return;
        _pendingLink = raw;
        _controller.add(raw);
      },
      onError: (_, __) {
        // Deep links are optional; the app remains usable from its native shell.
      },
    );
  }

  String? takePendingLink() {
    final link = _pendingLink;
    _pendingLink = null;
    return link;
  }

  void dispose() {
    _platformSubscription?.cancel();
    _controller.close();
  }
}
