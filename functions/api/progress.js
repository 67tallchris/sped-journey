import { parseCookies, verifySession, SESSION_COOKIE, jsonResponse } from "./_session.js";

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function isAuthorized(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (env.ADMIN_TOKEN && token && safeEqual(token, env.ADMIN_TOKEN)) return true;

  const cookies = parseCookies(request);
  const session = await verifySession(cookies[SESSION_COOKIE], env.SESSION_SECRET);
  return Boolean(session && env.ADMIN_GITHUB_LOGIN &&
    session.login.toLowerCase() === env.ADMIN_GITHUB_LOGIN.toLowerCase());
}

export async function onRequestGet({ env }) {
  if (!env.PROGRESS) return jsonResponse({ ok: false, error: "KV binding PROGRESS is not configured" }, 500);
  const data = await env.PROGRESS.get("progress");
  if (!data) return jsonResponse({ ok: false, fallback: true }, 404);
  return new Response(data, {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export async function onRequestPut({ request, env }) {
  if (!(await isAuthorized(request, env))) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid JSON" }, 400);
  }
  if (!body || !Array.isArray(body.milestones)) {
    return jsonResponse({ ok: false, error: "invalid progress shape" }, 400);
  }

  await env.PROGRESS.put("progress", JSON.stringify(body));
  return jsonResponse({ ok: true, savedAt: new Date().toISOString() });
}
