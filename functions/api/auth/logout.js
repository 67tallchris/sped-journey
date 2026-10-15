import { sessionCookie } from "../_session.js";

export async function onRequestGet() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/admin",
      "Set-Cookie": sessionCookie("", 0)
    }
  });
}
