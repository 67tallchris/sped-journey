const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });

export async function onRequestGet({ env }) {
  if (!env.PROGRESS) return json({ ok: false, error: "KV binding PROGRESS is not configured" }, 500);
  const data = await env.PROGRESS.get("progress");
  if (!data) return json({ ok: false, fallback: true }, 404);
  return new Response(data, {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export async function onRequestPut({ request, env }) {
  if (!env.ADMIN_TOKEN) return json({ ok: false, error: "ADMIN_TOKEN is not configured" }, 500);
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (token !== env.ADMIN_TOKEN) return json({ ok: false, error: "unauthorized" }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid JSON" }, 400);
  }
  if (!body || !Array.isArray(body.milestones)) {
    return json({ ok: false, error: "invalid progress shape" }, 400);
  }

  await env.PROGRESS.put("progress", JSON.stringify(body));
  return json({ ok: true, savedAt: new Date().toISOString() });
}
