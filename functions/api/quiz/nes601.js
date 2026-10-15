import { isAuthorized, jsonResponse } from "../_session.js";

/* Private full bank from the AEPA Field 22 study guide (copyrighted source material).
   Only served to the signed-in owner or with the ADMIN_TOKEN. */
export async function onRequestGet({ request, env }) {
  if (!(await isAuthorized(request, env))) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }
  if (!env.PROGRESS) return jsonResponse({ ok: false, error: "KV binding PROGRESS is not configured" }, 500);
  const data = await env.PROGRESS.get("quiz:nes601-full");
  if (!data) return jsonResponse({ ok: false, error: "quiz not uploaded" }, 404);
  return new Response(JSON.stringify({ ok: true, questions: JSON.parse(data) }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
