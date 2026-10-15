import { createSession, parseCookies, sessionCookie, STATE_COOKIE, jsonResponse } from "../_session.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = parseCookies(request);

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return jsonResponse({ error: "GitHub OAuth not configured" }, 500);
  }
  if (!code || !state || state !== cookies[STATE_COOKIE]) {
    return jsonResponse({ error: "Invalid OAuth state" }, 400);
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/auth/callback`
    })
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) return jsonResponse({ error: "OAuth exchange failed" }, 401);

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      authorization: `Bearer ${tokenData.access_token}`,
      accept: "application/vnd.github+json",
      "user-agent": "sped-journey-admin"
    }
  });
  const user = await userRes.json();
  const allowed = (env.ADMIN_GITHUB_LOGIN || "").toLowerCase();
  if (!user.login || user.login.toLowerCase() !== allowed) {
    return jsonResponse({ error: `Not authorized (${user.login || "unknown"})` }, 403);
  }

  const session = await createSession(user.login, env.SESSION_SECRET);
  const headers = new Headers({ Location: "/admin" });
  headers.append("Set-Cookie", sessionCookie(session, 60 * 60 * 24 * 30));
  headers.append("Set-Cookie", `${STATE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return new Response(null, { status: 302, headers });
}
