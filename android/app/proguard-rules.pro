# Quiz Space release hardening

# Keep Capacitor's plugin discovery and JavaScript bridge entry points.
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.plugins.** { *; }
-keep class com.aparajita.capacitor.securestorage.** { *; }

# Keep annotations used by Capacitor plugin registration.
-keepattributes RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations,AnnotationDefault
-keep @interface com.getcapacitor.annotation.**

# Preserve Android component constructors referenced from the manifest.
-keep public class com.koomn1.quizspace.MainActivity { public <init>(); }

# Remove line/source metadata from release artifacts.
-renamesourcefileattribute SourceFile
-dontusemixedcaseclassnames
-dontpreverify

# Supabase is JavaScript-side; no native secret is stored in this APK.
# Never add server keys, service-role keys, or private API keys to this file.
