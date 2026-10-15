import { isAuthorized, jsonResponse } from "./_session.js";

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
