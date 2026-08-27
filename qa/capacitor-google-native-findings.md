# Capacitor Google Native findings

The project currently has no Capacitor dependencies in package.json, while historical commit e847426 used Capacitor 8 and a web wrapper. The current web AuthContext uses Supabase OAuth redirect for Google, which is not suitable for an Android account-picker requirement.

The reviewed `@capawesome/capacitor-google-sign-in` documentation reports compatibility with Capacitor 8, returns an ID token, requires a Web OAuth client ID in `initialize`, and still requires a matching Android OAuth client for the package name and signing SHA-1. It documents native Android sign-in through `signIn()` and cancellation/configuration errors without requiring browser OAuth on Android. The plugin documentation also states that the ID token must be verified server-side before trusting claims.

Sources:
- https://capawesome.io/docs/sdks/capacitor/google-sign-in/
- https://www.npmjs.com/package/@capawesome/capacitor-google-sign-in
- https://capgo.app/docs/plugins/social-login/migrations/google/
