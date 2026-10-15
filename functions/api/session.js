import { parseCookies, verifySession, SESSION_COOKIE, jsonResponse } from "./_session.js";

export async function onRequestGet({ request, env }) {
  const configured = Boolean(env.GITHUB_CLIENT_ID && env.SESSION_SECRET && env.ADMIN_GITHUB_LOGIN);
  const cookies = parseCookies(request);
  const session = await verifySession(cookies[SESSION_COOKIE], env.SESSION_SECRET);
  const allowed = session && env.ADMIN_GITHUB_LOGIN &&
    session.login.toLowerCase() === env.ADMIN_GITHUB_LOGIN.toLowerCase();
  return jsonResponse({
    configured,
    authenticated: Boolean(allowed),
    login: allowed ? session.login : null
  });
}
