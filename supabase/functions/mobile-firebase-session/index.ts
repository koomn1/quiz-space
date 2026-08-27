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
      .select("uid, custom_id, name, bio, location, photo_url, is_premium, is_founder, xp")
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

    return genericFailure(400);
  } catch (error) {
    console.error("mobile-firebase-session failed", error instanceof Error ? error.message : "unknown");
    const message = error instanceof Error ? error.message : "";
    if (message === "firebase_email_not_verified") return response({ error: "أكد بريدك الإلكتروني أولًا ثم سجّل الدخول مرة أخرى." }, 403);
    if (message === "ambiguous_legacy_email" || message === "identity_conflict") return response({ error: "تعذر ربط الحساب تلقائيًا. تواصل مع الدعم." }, 409);
    if (message === "quiz_not_owned") return genericFailure(404);
    if (message === "server_configuration_missing") return genericFailure(503);
    return genericFailure(500);
  }
});
