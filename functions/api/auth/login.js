import { STATE_COOKIE, jsonResponse } from "../_session.js";

function safeNext(next) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/admin";
  return next;
}

export async function onRequestGet({ request, env }) {
  if (!env.GITHUB_CLIENT_ID) return jsonResponse({ error: "GitHub OAuth not configured" }, 500);
  const url = new URL(request.url);

  // Keep OAuth on the canonical domain so the registered callback URL always matches.
  const host = url.hostname;
  const local = host === "localhost" || host === "127.0.0.1";
  if (host !== "sped.notallorder.com" && !local) {
    const next = safeNext(url.searchParams.get("next"));
    return Response.redirect(`https://sped.notallorder.com/api/auth/login?next=${encodeURIComponent(next)}`, 302);
  }

  const state = crypto.randomUUID();
  const next = safeNext(url.searchParams.get("next"));
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", `${url.origin}/api/auth/callback`);
  authorize.searchParams.set("scope", "read:user");
  authorize.searchParams.set("state", state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      "Set-Cookie": `${STATE_COOKIE}=${encodeURIComponent(state + "|" + next)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
    }
  });
}
