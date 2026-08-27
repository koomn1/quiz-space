# Native online data and App Links findings

- The official google_sign_in 7.2.0 example documents `GoogleSignIn.instance.initialize(clientId: ..., serverClientId: ...)`, `authenticate()`, and structured `GoogleSignInExceptionCode` handling. Source: https://pub.dev/packages/google_sign_in/versions/7.2.0/example
- The official platform interface documents `GoogleSignInExceptionCode` values including `canceled`, `clientConfigurationError`, `providerConfigurationError`, `uiUnavailable`, and `userMismatch`. Source: https://raw.githubusercontent.com/flutter/packages/main/packages/google_sign_in/google_sign_in_platform_interface/lib/src/types.dart
- After Build & Deploy run 33121980767, `https://quiz-space-app.pages.dev/.well-known/assetlinks.json` returned a valid Android App Links document for package `com.quizspace.badawy` with at least one SHA-256 fingerprint.
- The same check returned 404 for `https://quiz-space-share.pages.dev/.well-known/assetlinks.json`, while `https://quiz-space-share.pages.dev/share/quiz?quiz=quiz-test` returned HTTP 200. The share-pages deployment needs its assetlinks path verified after the next deployment.
