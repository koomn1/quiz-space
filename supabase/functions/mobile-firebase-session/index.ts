import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decodeProtectedHeader, importX509, jwtVerify, type JWTPayload } from "https://esm.sh/jose@5.10.0";

type FirebaseClaims = JWTPayload & {
  user_id?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

type ServiceContext = {
  client: SupabaseClient;
  firebaseProjectId: string;
};

type CertificateCache = {
  expiresAt: number;
  certificates: Record<string, string>;
};

const MAX_EMAIL_LENGTH = 320;
const MAX_UID_LENGTH = 256;
const MAX_QUIZ_ID_LENGTH = 256;
const MAX_NAME_LENGTH = 160;
const MAX_PHOTO_LENGTH = 2_048;
const MAX_DESCRIPTION_LENGTH = 4_000;
const MAX_CATEGORY_LENGTH = 80;
const MAX_QUESTIONS = 200;
const MAX_QUESTION_LENGTH = 2_000;
const MAX_OPTION_LENGTH = 800;
const MAX_EXPLANATION_LENGTH = 4_000;
const MAX_ANSWERS = 200;
const MAX_FEEDBACK_LENGTH = 2_000;
const certificateUrl = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
let certificateCache: CertificateCache | null = null;

function response(body: Record<string, unknown>, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function genericFailure(status = 401): Response {
  return response({ error: "تعذر تأمين جلسة QuizSpace." }, status);
}

function boundedString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeLike(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function readBearer(request: Request): string | null {
  const value = request.headers.get("Authorization") ?? "";
  if (!value.startsWith("Bearer ")) return null;
  const token = value.slice("Bearer ".length).trim();
  return token.length >= 100 && token.length <= 16_384 ? token : null;
}

async function getCertificates(): Promise<Record<string, string>> {
  const now = Date.now();
  if (certificateCache && certificateCache.expiresAt > now + 30_000) {
    return certificateCache.certificates;
  }

  const fetched = await fetch(certificateUrl, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!fetched.ok) throw new Error("firebase_certificates_unavailable");

  const certificates = await fetched.json() as Record<string, string>;
  const maxAge = Number(fetched.headers.get("cache-control")?.match(/max-age=(\d+)/i)?.[1] ?? "300");
  certificateCache = {
    certificates,
    expiresAt: now + Math.max(60, Math.min(maxAge, 3_600)) * 1_000,
  };
  return certificates;
}

async function verifyFirebaseToken(token: string, projectId: string): Promise<FirebaseClaims> {
  const header = decodeProtectedHeader(token);
  if (header.alg !== "RS256" || typeof header.kid !== "string") {
    throw new Error("firebase_token_algorithm_invalid");
  }

  const certificates = await getCertificates();
  const certificate = certificates[header.kid];
  if (!certificate) throw new Error("firebase_certificate_not_found");

  const verified = await jwtVerify(token, await importX509(certificate, "RS256"), {
    algorithms: ["RS256"],
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    clockTolerance: 10,
  });
  const claims = verified.payload as FirebaseClaims;
  const email = boundedString(claims.email, MAX_EMAIL_LENGTH).toLowerCase();
  const uid = boundedString(claims.user_id ?? claims.sub, MAX_UID_LENGTH);
  if (!uid || !email || claims.email_verified !== true) {
    throw new Error("firebase_email_not_verified");
  }
  if (!claims.sub || claims.sub !== uid) throw new Error("firebase_subject_invalid");
  return { ...claims, email, user_id: uid, sub: uid };
}

function createServiceContext(): ServiceContext {
  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const firebaseProjectId = (Deno.env.get("FIREBASE_PROJECT_ID")?.trim() || "quiz--space").slice(0, 128);
  if (!url || !serviceRoleKey || !firebaseProjectId) throw new Error("server_configuration_missing");
  return {
    client: createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
    firebaseProjectId,
  };
}

async function resolveQuizSpaceUid(context: ServiceContext, claims: FirebaseClaims): Promise<{ uid: string; created: boolean }> {
  const firebaseUid = boundedString(claims.user_id ?? claims.sub, MAX_UID_LENGTH);
  const email = boundedString(claims.email, MAX_EMAIL_LENGTH).toLowerCase();
  if (!firebaseUid || !email) throw new Error("identity_missing");

  const byUid = await context.client
    .from("users")
    .select("uid, email")
    .eq("uid", firebaseUid)
    .limit(1);
  if (byUid.error) throw new Error("users_lookup_failed");
  if (byUid.data?.length === 1) {
    const storedEmail = boundedString(byUid.data[0].email, MAX_EMAIL_LENGTH).toLowerCase();
    if (storedEmail !== email) throw new Error("identity_conflict");
    return { uid: firebaseUid, created: false };
  }

  // The legacy web account is authoritative. Never rewrite its UID: many tables
  // reference it. A verified Firebase email is used only to resolve that row.
  let byEmail = await context.client
    .from("users")
    .select("uid")
    .eq("email", email)
    .limit(2);
  if (byEmail.error) throw new Error("users_email_lookup_failed");
  if ((byEmail.data?.length ?? 0) === 0) {
    byEmail = await context.client
      .from("users")
      .select("uid")
      .ilike("email", escapeLike(email))
      .limit(2);
    if (byEmail.error) throw new Error("users_email_lookup_failed");
  }
  if ((byEmail.data?.length ?? 0) > 1) throw new Error("ambiguous_legacy_email");
  if (byEmail.data?.length === 1) {
    return { uid: boundedString(byEmail.data[0].uid, MAX_UID_LENGTH), created: false };
  }

  const name = boundedString(claims.name, MAX_NAME_LENGTH) || email.split("@")[0].slice(0, MAX_NAME_LENGTH) || "طالب جديد";
  const photoUrl = boundedString(claims.picture, MAX_PHOTO_LENGTH);
  const inserted = await context.client.from("users").insert({
    uid: firebaseUid,
    email,
    name,
    photo_url: photoUrl,
    plan_name: "Free",
    is_premium: false,
  });
  if (inserted.error) {
    // A simultaneous request may have created the row. Re-read only by the
    // authenticated Firebase UID; never guess another user's identity.
    const retry = await context.client.from("users").select("uid").eq("uid", firebaseUid).limit(1);
    if (retry.error || retry.data?.length !== 1) throw new Error("users_insert_failed");
    return { uid: firebaseUid, created: false };
  }
  return { uid: firebaseUid, created: true };
}

async function loadProfile(context: ServiceContext, appUid: string): Promise<Record<string, unknown>> {
  const [userResult, quizResult, completionResult] = await Promise.all([
    context.client
      .from("users")
      .select("uid, custom_id, name, bio, location, photo_url, is_premium, is_founder, is_admin, plan_name, xp")
      .eq("uid", appUid)
      .limit(1),
    context.client
      .from("quizzes")
      .select("id, title, description")
      .eq("creator_id", appUid)
      .order("created_at", { ascending: false })
      .limit(50),
    context.client
      .from("completions")
      .select("score, total_questions, created_at")
      .eq("taker_id", appUid)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (userResult.error || quizResult.error || completionResult.error) throw new Error("profile_load_failed");
  const user = userResult.data?.[0];
  if (!user) throw new Error("profile_not_found");
  return {
    user,
    quizzes: quizResult.data ?? [],
    completions: completionResult.data ?? [],
  };
}

function normalizeQuestions(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_QUESTIONS) throw new Error("invalid_questions");
  return value.map((rawQuestion) => {
    if (!rawQuestion || typeof rawQuestion !== "object" || Array.isArray(rawQuestion)) throw new Error("invalid_questions");
    const question = rawQuestion as Record<string, unknown>;
    const text = boundedString(question.question ?? question.questionText ?? question.text, MAX_QUESTION_LENGTH);
    const rawOptions = question.options;
    if (!text || !Array.isArray(rawOptions) || rawOptions.length < 2 || rawOptions.length > 8) throw new Error("invalid_questions");
    const options = rawOptions.map((option) => boundedString(option, MAX_OPTION_LENGTH));
    if (options.some((option) => !option)) throw new Error("invalid_questions");

    const rawCorrect = question.correctAnswer ?? question.correct_answer;
    let correctAnswer = boundedString(rawCorrect, MAX_OPTION_LENGTH);
    const numericIndex = typeof rawCorrect === "number" || /^\d+$/.test(correctAnswer) ? Number(rawCorrect) : -1;
    if (numericIndex >= 0 && numericIndex < options.length) correctAnswer = options[numericIndex];
    if (!correctAnswer || !options.includes(correctAnswer)) throw new Error("invalid_questions");

    const normalized: Record<string, unknown> = {
      question: text,
      options,
      correctAnswer,
    };
    const explanation = boundedString(question.explanation, MAX_EXPLANATION_LENGTH);
    const imageUrl = boundedString(question.imageUrl ?? question.image_url, MAX_PHOTO_LENGTH);
    if (explanation) normalized.explanation = explanation;
    if (imageUrl) {
      let image: URL;
      try {
        image = new URL(imageUrl);
      } catch {
        throw new Error("invalid_questions");
      }
      if (image.protocol !== "https:") throw new Error("invalid_questions");
      normalized.imageUrl = image.toString();
    }
    return normalized;
  });
}

async function loadQuizDetails(context: ServiceContext, appUid: string, quizId: string): Promise<Record<string, unknown>> {
  const select = "id, title, description, questions, category, time_limit, creator_name, total_plays, avg_rating, distribution_routing, creator_id";
  const publicResult = await context.client
    .from("quizzes")
    .select(select)
    .eq("id", quizId)
    .eq("distribution_routing", "public")
    .limit(1);
  if (publicResult.error) throw new Error("quiz_lookup_failed");
  let quiz = publicResult.data?.[0] as Record<string, unknown> | undefined;
  if (!quiz) {
    const ownerResult = await context.client
      .from("quizzes")
      .select(select)
      .eq("id", quizId)
      .eq("creator_id", appUid)
      .limit(1);
    if (ownerResult.error) throw new Error("quiz_lookup_failed");
    quiz = ownerResult.data?.[0] as Record<string, unknown> | undefined;
  }
  if (!quiz) throw new Error("quiz_not_found");
  return {
    ...quiz,
    questions: Array.isArray(quiz.questions) ? quiz.questions.slice(0, MAX_QUESTIONS) : [],
  };
}

async function loadPublicQuizzes(context: ServiceContext, body: Record<string, unknown>): Promise<Record<string, unknown>[]> {
  const search = boundedString(body.search, 120);
  const category = boundedString(body.category, MAX_CATEGORY_LENGTH);
  const requestedLimit = Number(body.limit);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 40) : 20;
  let query = context.client
    .from("quizzes")
    .select("id, title, description, category, creator_name, total_plays, avg_rating, created_at")
    .eq("distribution_routing", "public")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (category) query = query.eq("category", category);
  if (search) query = query.ilike("title", `%${escapeLike(search)}%`);
  const result = await query;
  if (result.error) throw new Error("public_quizzes_failed");
  return (result.data ?? []) as Record<string, unknown>[];
}

async function createQuiz(context: ServiceContext, appUid: string, claims: FirebaseClaims, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const title = boundedString(body.title, 160);
  const description = boundedString(body.description, MAX_DESCRIPTION_LENGTH);
  const category = boundedString(body.category, MAX_CATEGORY_LENGTH) || "عام";
  if (title.length < 2) throw new Error("invalid_quiz");
  const questions = normalizeQuestions(body.questions);
  const userResult = await context.client.from("users").select("name").eq("uid", appUid).limit(1);
  if (userResult.error || userResult.data?.length !== 1) throw new Error("profile_not_found");
  const creatorName = boundedString(userResult.data[0].name, MAX_NAME_LENGTH) || boundedString(claims.name, MAX_NAME_LENGTH) || "عضو QuizSpace";
  const quizId = `quiz-${crypto.randomUUID()}`;
  const inserted = await context.client.from("quizzes").insert({
    id: quizId,
    title,
    description,
    creator_id: appUid,
    creator_name: creatorName,
    questions,
    category,
    distribution_routing: "public",
    time_limit: 0,
  }).select("id, title, description, questions, category, time_limit, creator_name, total_plays, avg_rating, distribution_routing, creator_id").single();
  if (inserted.error || !inserted.data) throw new Error("quiz_create_failed");
  return inserted.data as Record<string, unknown>;
}

async function loadAdminOverview(context: ServiceContext, appUid: string): Promise<Record<string, number>> {
  const admin = await context.client.from("users").select("is_admin").eq("uid", appUid).limit(1);
  if (admin.error || admin.data?.length !== 1 || admin.data[0].is_admin !== true) throw new Error("admin_required");
  const [users, quizzes, completions] = await Promise.all([
    context.client.from("users").select("uid", { count: "exact", head: true }),
    context.client.from("quizzes").select("id", { count: "exact", head: true }),
    context.client.from("completions").select("id", { count: "exact", head: true }),
  ]);
  if (users.error || quizzes.error || completions.error) throw new Error("admin_overview_failed");
  return { users: users.count ?? 0, quizzes: quizzes.count ?? 0, completions: completions.count ?? 0 };
}

async function loadNotificationPreferences(context: ServiceContext, appUid: string): Promise<Record<string, boolean>> {
  const result = await context.client.from("user_notification_preferences").select("email_alerts, rank_updates, weekly_reports, push_enabled").eq("user_id", appUid).maybeSingle();
  if (result.error) throw new Error("notification_preferences_failed");
  const row = (result.data ?? {}) as Record<string, unknown>;
  return {
    email_alerts: row.email_alerts !== false,
    rank_updates: row.rank_updates !== false,
    weekly_reports: row.weekly_reports === true,
    push_enabled: row.push_enabled !== false,
  };
}

async function updateNotificationPreferences(context: ServiceContext, appUid: string, body: Record<string, unknown>): Promise<Record<string, boolean>> {
  const value = (key: string, fallback: boolean): boolean => typeof body[key] === "boolean" ? body[key] as boolean : fallback;
  const preferences = {
    user_id: appUid,
    email_alerts: value("email_alerts", true),
    rank_updates: value("rank_updates", true),
    weekly_reports: value("weekly_reports", false),
    push_enabled: value("push_enabled", true),
    updated_at: new Date().toISOString(),
  };
  const result = await context.client.from("user_notification_preferences").upsert(preferences, { onConflict: "user_id" }).select("email_alerts, rank_updates, weekly_reports, push_enabled").limit(1);
  if (result.error || result.data?.length !== 1) throw new Error("notification_preferences_failed");
  return result.data[0] as Record<string, boolean>;
}

async function updateProfile(context: ServiceContext, appUid: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const name = boundedString(body.name, MAX_NAME_LENGTH);
  const bio = boundedString(body.bio, 2_000);
  const location = boundedString(body.location, 160);
  if (name.length < 1) throw new Error("invalid_profile");
  const updated = await context.client
    .from("users")
    .update({ name, bio, location, updated_at: new Date().toISOString() })
    .eq("uid", appUid)
    .select("uid, custom_id, name, bio, location, photo_url, is_premium, is_founder, xp")
    .limit(1);
  if (updated.error || updated.data?.length !== 1) throw new Error("profile_update_failed");
  return updated.data[0] as Record<string, unknown>;
}

async function submitQuizAttempt(context: ServiceContext, appUid: string, claims: FirebaseClaims, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const quizId = boundedString(body.quiz_id, MAX_QUIZ_ID_LENGTH);
  const rawAnswers = body.answers;
  if (!quizId || !Array.isArray(rawAnswers) || rawAnswers.length > MAX_ANSWERS) throw new Error("invalid_attempt");
  const quiz = await loadQuizDetails(context, appUid, quizId);
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  if (questions.length < 1 || questions.length > MAX_QUESTIONS) throw new Error("invalid_attempt");
  let score = 0;
  questions.forEach((rawQuestion, index) => {
    if (!rawQuestion || typeof rawQuestion !== "object" || Array.isArray(rawQuestion)) return;
    const question = rawQuestion as Record<string, unknown>;
    const options = Array.isArray(question.options) ? question.options.map((item) => boundedString(item, MAX_OPTION_LENGTH)) : [];
    const rawCorrect = question.correctAnswer ?? question.correct_answer;
    let correct = boundedString(rawCorrect, MAX_OPTION_LENGTH);
    const correctIndex = typeof rawCorrect === "number" || /^\d+$/.test(correct) ? Number(rawCorrect) : -1;
    if (correctIndex >= 0 && correctIndex < options.length) correct = options[correctIndex];
    const submitted = rawAnswers[index];
    let answer = boundedString(submitted, MAX_OPTION_LENGTH);
    const answerIndex = typeof submitted === "number" || /^\d+$/.test(answer) ? Number(submitted) : -1;
    if (answerIndex >= 0 && answerIndex < options.length) answer = options[answerIndex];
    if (correct && answer && correct === answer) score += 1;
  });

  const userResult = await context.client.from("users").select("name").eq("uid", appUid).limit(1);
  if (userResult.error || userResult.data?.length !== 1) throw new Error("profile_not_found");
  const takerName = boundedString(userResult.data[0].name, MAX_NAME_LENGTH) || boundedString(claims.name, MAX_NAME_LENGTH) || "عضو QuizSpace";
  const ratingValue = body.rating == null || body.rating === "" ? null : Number(body.rating);
  const rating = Number.isInteger(ratingValue) && ratingValue >= 1 && ratingValue <= 5 ? ratingValue : null;
  const feedback = boundedString(body.feedback, MAX_FEEDBACK_LENGTH);
  const result = await context.client.rpc("submit_mobile_quiz_attempt", {
    p_quiz_id: quizId,
    p_taker_id: appUid,
    p_taker_name: takerName,
    p_score: score,
    p_rating: rating,
    p_feedback: feedback,
  });
  if (result.error || !result.data) throw new Error("attempt_save_failed");
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  return typeof row === "object" && row !== null ? row as Record<string, unknown> : { score, total_questions: questions.length };
}

async function loadQuizTakers(context: ServiceContext, appUid: string, quizId: string): Promise<unknown[]> {
  const quiz = await context.client
    .from("quizzes")
    .select("id")
    .eq("id", quizId)
    .eq("creator_id", appUid)
    .limit(1);
  if (quiz.error) throw new Error("quiz_lookup_failed");
  if (quiz.data?.length !== 1) throw new Error("quiz_not_owned");

  const takers = await context.client.rpc("get_quiz_takers_unique", { p_quiz_id: quizId });
  if (takers.error || !Array.isArray(takers.data)) throw new Error("takers_load_failed");
  return takers.data.slice(0, 500).map((item: Record<string, unknown>) => ({
    taker_name: boundedString(item.taker_name, MAX_NAME_LENGTH) || "عضو بدون اسم",
    best_score: item.best_score,
    total_questions: item.total_questions,
    attempts_count: item.attempts_count,
    last_attempt_at: item.last_attempt_at,
  }));
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return response({}, 204);
  if (request.method !== "POST") return genericFailure(405);

  try {
    const token = readBearer(request);
    if (!token) return genericFailure();

    const context = createServiceContext();
    const claims = await verifyFirebaseToken(token, context.firebaseProjectId);
    const identity = await resolveQuizSpaceUid(context, claims);

    let body: Record<string, unknown>;
    try {
      const parsed = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return genericFailure(400);
      body = parsed as Record<string, unknown>;
    } catch (_) {
      return genericFailure(400);
    }

    const action = boundedString(body.action, 32) || "bootstrap";
    if (action === "bootstrap") {
      return response({
        app_user_uid: identity.uid,
        created: identity.created,
        profile: await loadProfile(context, identity.uid),
      });
    }

    if (action === "quiz_takers") {
      const quizId = boundedString(body.quiz_id, MAX_QUIZ_ID_LENGTH);
      if (!quizId) return genericFailure(400);
      return response({ takers: await loadQuizTakers(context, identity.uid, quizId) });
    }

    if (action === "public_quizzes") {
      return response({ quizzes: await loadPublicQuizzes(context, body) });
    }

    if (action === "quiz_detail") {
      const quizId = boundedString(body.quiz_id, MAX_QUIZ_ID_LENGTH);
      if (!quizId) return genericFailure(400);
      return response({ quiz: await loadQuizDetails(context, identity.uid, quizId) });
    }

    if (action === "create_quiz") {
      return response({ quiz: await createQuiz(context, identity.uid, claims, body) }, 201);
    }

    if (action === "submit_attempt") {
      return response({ completion: await submitQuizAttempt(context, identity.uid, claims, body) }, 201);
    }

    if (action === "update_profile") {
      return response({ user: await updateProfile(context, identity.uid, body) });
    }

    if (action === "notification_preferences") {
      if (body.write === true) return response({ preferences: await updateNotificationPreferences(context, identity.uid, body) });
      return response({ preferences: await loadNotificationPreferences(context, identity.uid) });
    }

    if (action === "admin_overview") {
      return response({ overview: await loadAdminOverview(context, identity.uid) });
    }

    return genericFailure(400);
  } catch (error) {
    console.error("mobile-firebase-session failed", error instanceof Error ? error.message : "unknown");
    const message = error instanceof Error ? error.message : "";
    if (message === "firebase_email_not_verified") return response({ error: "أكد بريدك الإلكتروني أولًا ثم سجّل الدخول مرة أخرى." }, 403);
    if (message === "ambiguous_legacy_email" || message === "identity_conflict") return response({ error: "تعذر ربط الحساب تلقائيًا. تواصل مع الدعم." }, 409);
    if (message === "quiz_not_owned" || message === "quiz_not_found") return genericFailure(404);
    if (message === "invalid_quiz" || message === "invalid_questions" || message === "invalid_attempt") return response({ error: "بيانات الاختبار أو المحاولة غير صالحة." }, 400);
    if (message === "attempt_save_failed") return response({ error: "تعذر حفظ المحاولة الآن. حاول مرة أخرى." }, 500);
    if (message === "invalid_profile") return response({ error: "بيانات البروفايل غير صالحة." }, 400);
    if (message === "profile_update_failed") return response({ error: "تعذر حفظ بيانات البروفايل الآن." }, 500);
    if (message === "public_quizzes_failed") return response({ error: "تعذر تحميل الاختبارات العامة الآن." }, 500);
    if (message === "notification_preferences_failed") return response({ error: "تعذر تحميل تفضيلات الإشعارات الآن." }, 500);
    if (message === "admin_required") return response({ error: "الصلاحية الإدارية مطلوبة." }, 403);
    if (message === "admin_overview_failed") return response({ error: "تعذر تحميل مؤشرات الإدارة الآن." }, 500);
    if (message === "server_configuration_missing") return genericFailure(503);
    return genericFailure(500);
  }
});
