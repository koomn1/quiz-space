// Per-account local cache of whiteboard lessons + reconciliation with the server library.
// Mirrors the web lessonDrafts/whiteboardLibrary pair: SharedPreferences is the fast cache,
// the worker (public.whiteboard_lessons) is the source of truth once the migration lands.
import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart' as firebase;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'whiteboard_models.dart';
import 'whiteboard_service.dart';

class WhiteboardLibrary {
  WhiteboardLibrary._();

  static const _baseKey = 'whiteboard.lessons.v1';
  static const _maxSaved = 50;
  static const _maxTombstones = 100;

  /// Stable per-account key; guests share the device key. The id only scopes the local
  /// cache — server isolation is enforced by the worker from the verified token.
  static String _accountId() {
    final supaUser = Supabase.instance.client.auth.currentUser;
    if (supaUser != null && supaUser.id.isNotEmpty) return supaUser.id;
    final fireUser = firebase.FirebaseAuth.instance.currentUser;
    if (fireUser != null && fireUser.uid.isNotEmpty) return fireUser.uid;
    return 'guest';
  }

  static String _lessonsKey() => '$_baseKey.u-${_accountId()}';
  static String _tombstonesKey() => '${_lessonsKey()}.deleted';

  static Future<List<WhiteboardLesson>> loadSaved() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_lessonsKey());
      if (raw == null || raw.isEmpty) return const [];
      final parsed = jsonDecode(raw);
      if (parsed is! List) return const [];
      return parsed.whereType<Map<String, dynamic>>().map(WhiteboardLesson.fromJson).where((l) => l.steps.isNotEmpty).toList();
    } catch (_) {
      return const [];
    }
  }

  static Future<List<WhiteboardLesson>> _persist(List<WhiteboardLesson> lessons) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_lessonsKey(), jsonEncode(lessons.map((l) => l.toJson()).toList()));
    return lessons;
  }

  /// Saves a lesson to the account cache (newest first, deduped by id).
  static Future<List<WhiteboardLesson>> saveLocal(WhiteboardLesson lesson) async {
    final stamped = lesson.createdAt != null
        ? lesson
        : WhiteboardLesson(id: lesson.id, title: lesson.title, lang: lesson.lang, canvasW: lesson.canvasW, canvasH: lesson.canvasH, steps: lesson.steps, createdAt: DateTime.now().toIso8601String());
    final next = [stamped, ...(await loadSaved()).where((l) => l.id != stamped.id)].take(_maxSaved).toList();
    return _persist(next);
  }

  static Future<List<String>> _tombstones() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_tombstonesKey());
      final parsed = raw == null ? null : jsonDecode(raw);
      return parsed is List ? parsed.whereType<String>().toList() : const [];
    } catch (_) {
      return const [];
    }
  }

  /// Removes locally and leaves a tombstone so server sync never resurrects the lesson.
  static Future<List<WhiteboardLesson>> removeLocal(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final tombs = [id, ...(await _tombstones()).where((x) => x != id)].take(_maxTombstones).toList();
    await prefs.setString(_tombstonesKey(), jsonEncode(tombs));
    return _persist((await loadSaved()).where((l) => l.id != id).toList());
  }

  /// Reconcile with the server library: upload lessons the server lacks, download lessons
  /// this device lacks. Returns the merged cache, or null when offline / migration pending.
  static Future<List<WhiteboardLesson>?> syncFromServer() async {
    final (result, metas) = await WhiteboardLibraryApi.listLessonMetas();
    if (result != LibraryResult.ok) return null;
    final serverIds = metas.map((m) => m.id).toSet();
    final local = await loadSaved();
    final tombs = (await _tombstones()).toSet();
    for (final lesson in local.where((l) => !serverIds.contains(l.id) && !tombs.contains(l.id))) {
      await WhiteboardLibraryApi.saveLesson(lesson);
    }
    final localIds = local.map((l) => l.id).toSet();
    final downloaded = <WhiteboardLesson>[];
    for (final meta in metas.take(20)) {
      if (localIds.contains(meta.id)) continue;
      final lesson = await WhiteboardLibraryApi.fetchLesson(meta.id);
      if (lesson != null && lesson.steps.isNotEmpty && !tombs.contains(lesson.id)) downloaded.add(lesson);
    }
    if (downloaded.isEmpty) return local;
    final byId = <String, WhiteboardLesson>{};
    for (final l in [...downloaded, ...local]) {
      byId.putIfAbsent(l.id, () => l);
    }
    final merged = byId.values.toList()
      ..sort((a, b) => (b.createdAt ?? '').compareTo(a.createdAt ?? ''));
    return _persist(merged.take(_maxSaved).toList());
  }
}
