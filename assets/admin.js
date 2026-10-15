/* Progress admin: GitHub-authenticated editing, with admin-token fallback. */
let DATA = null;
let SESSION = { configured: false, authenticated: false, login: null };
const TOKEN_KEY = "sped-admin-token";

(async function () {
  SESSION = await fetchSession();
  const token = localStorage.getItem(TOKEN_KEY) || "";
  if (SESSION.authenticated || token) {
    try {
      DATA = await getProgress();
      render();
    } catch (err) {
      renderGate(`Couldn't load progress data: ${err.message}`);
    }
  } else {
    renderGate();
  }
})();

async function fetchSession() {
  try {
    return await getJSON("/api/session");
  } catch {
    return { configured: false, authenticated: false, login: null };
  }
}

function msg(text, kind) {
  const el = document.getElementById("status");
  if (!el) return;
  el.className = "status-msg " + (kind || "");
  el.textContent = text;
  el.hidden = false;
}

function authBanner() {
  if (SESSION.authenticated) {
    return `<div class="card" style="margin-bottom:18px;display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
      <div>Signed in as <b>@${esc(SESSION.login)}</b> <span class="muted small">(GitHub)</span></div>
      <a class="btn small secondary" href="/api/auth/logout">Sign out</a>
    </div>`;
  }
  return `<details class="card" style="margin-bottom:18px">
    <summary><b>Using admin token</b> <span class="muted small">— GitHub sign-in ${
      SESSION.configured ? "is available" : "is not configured yet"}</span></summary>
    <div class="token-row" style="margin-top:10px">
      <input type="password" id="token" placeholder="ADMIN_TOKEN"
        style="flex:1;min-width:220px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit">
      <button class="btn small" id="saveToken">Save token</button>
      ${SESSION.configured ? `<a class="btn small secondary" href="/api/auth/login">Sign in with GitHub</a>` : ""}
    </div>
  </details>`;
}

function renderGate(error) {
  const el = document.getElementById("admin");
  el.innerHTML = `
    <div class="card" style="max-width:680px">
      <h3>Sign in to edit</h3>
      ${error ? `<p class="muted">${esc(error)}</p>` : ""}
      <p class="muted">This editor is limited to the site owner. The public pages stay open;
      writes are restricted to a GitHub-authenticated session (or the admin token as a fallback).</p>
      ${SESSION.configured
        ? `<a class="btn" href="/api/auth/login">Sign in with GitHub</a>`
        : `<p class="small muted">GitHub sign-in isn't configured yet — set <code>GITHUB_CLIENT_ID</code>,
             <code>GITHUB_CLIENT_SECRET</code>, <code>ADMIN_GITHUB_LOGIN</code>, and <code>SESSION_SECRET</code>
             on the Pages project.</p>`}
      <div id="status" class="status-msg" hidden></div>
    </div>`;
  document.getElementById("saveToken")?.addEventListener("click", () => {
    localStorage.setItem(TOKEN_KEY, document.getElementById("token").value.trim());
    msg("Token saved — reloading.", "ok");
    setTimeout(() => location.reload(), 400);
  });
}

function render() {
  const el = document.getElementById("admin");
  el.innerHTML = `
    ${authBanner()}
    <div id="status" class="status-msg" hidden></div>

    <div class="admin-form">
      ${DATA.milestones.map((m, mi) => `
        <div class="admin-milestone">
          <div class="row">
            <b style="flex:1">${esc(m.title)}</b>
            <label class="small muted">Status
              <select data-status="${mi}">
                ${["done", "in-progress", "planned", "goal"].map(s =>
                  `<option value="${s}" ${m.status === s ? "selected" : ""}>${statusLabel(s)}</option>`).join("")}
              </select>
            </label>
          </div>
          <div class="admin-tasks">
            ${(m.tasks || []).map((t, ti) => `
              <label><input type="checkbox" data-task="${mi}:${ti}" ${t.done ? "checked" : ""}> ${esc(t.label)}</label>`).join("")}
          </div>
        </div>`).join("")}

      <div class="admin-milestone admin-tests">
        <div class="row"><b style="flex:1">Exams</b>
          <button class="btn small secondary" id="addTest">+ Add exam</button></div>
        <table>
          <thead><tr><th>Exam</th><th>Status</th><th>Target</th><th>Score</th><th>Note</th><th></th></tr></thead>
          <tbody>
            ${(DATA.tests || []).map((t, i) => `
              <tr>
                <td><input data-test="${i}:name" value="${esc(t.name)}"></td>
                <td><input data-test="${i}:status" value="${esc(t.status)}" size="8"></td>
                <td><input data-test="${i}:target" value="${esc(t.target)}" size="8"></td>
                <td><input data-test="${i}:score" value="${esc(t.score)}" size="6"></td>
                <td><input data-test="${i}:note" value="${esc(t.note)}"></td>
                <td><button class="btn small secondary" data-del="${i}">×</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>

      <div class="admin-milestone admin-tests">
        <div class="row"><b style="flex:1">Funding pathways</b>
          <label class="small muted">Annual tuition
            <input type="text" id="annualTuition" value="${esc((DATA.funding || {}).annualTuition || "")}" size="8">
          </label>
          <button class="btn small secondary" id="addFunding">+ Add pathway</button></div>
        <table>
          <thead><tr><th>Pathway</th><th>Amount</th><th>Status</th><th>Terms</th><th>Source</th><th></th></tr></thead>
          <tbody>
            ${((DATA.funding || {}).pathways || []).map((p, i) => `
              <tr>
                <td><input data-fund="${i}:name" value="${esc(p.name)}"></td>
                <td><input data-fund="${i}:amount" value="${esc(p.amount)}" size="10"></td>
                <td><select data-fund="${i}:status">
                  ${["confirmed", "in-progress", "applied", "exploring", "backup"].map(s =>
                    `<option value="${s}" ${p.status === s ? "selected" : ""}>${fundingStatusLabel(s)}</option>`).join("")}
                </select></td>
                <td><input data-fund="${i}:terms" value="${esc(p.terms)}"></td>
                <td><input data-fund="${i}:source" value="${esc(p.source || "")}" size="12"></td>
                <td><button class="btn small secondary" data-del-fund="${i}">×</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div class="actions" style="margin-top:18px">
      <button class="btn" id="save">Save to Cloudflare</button>
      <button class="btn secondary" id="download">Download JSON</button>
      <button class="btn secondary" id="reload">Reload live</button>
    </div>
    <p class="muted small">If the API isn't available (local preview), use <b>Download JSON</b> and
    replace <code>data/progress.json</code> before redeploying.</p>`;

  document.getElementById("saveToken")?.addEventListener("click", () => {
    localStorage.setItem(TOKEN_KEY, document.getElementById("token").value.trim());
    msg("Token saved — reloading.", "ok");
    setTimeout(() => location.reload(), 400);
  });
  document.getElementById("addTest").addEventListener("click", () => {
    collect();
    DATA.tests = DATA.tests || [];
    DATA.tests.push({ name: "", status: "studying", target: "", score: "", note: "" });
    render();
  });
  el.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => {
    collect();
    DATA.tests.splice(Number(b.dataset.del), 1);
    render();
  }));
  document.getElementById("addFunding").addEventListener("click", () => {
    collect();
    DATA.funding = DATA.funding || { annualTuition: 13000, note: "", pathways: [] };
    DATA.funding.pathways = DATA.funding.pathways || [];
    DATA.funding.pathways.push({ id: "new" + Date.now(), name: "", amount: "", status: "exploring", terms: "", source: "" });
    render();
  });
  el.querySelectorAll("[data-del-fund]").forEach(b => b.addEventListener("click", () => {
    collect();
    DATA.funding.pathways.splice(Number(b.dataset.delFund), 1);
    render();
  }));
  document.getElementById("save").addEventListener("click", save);
  document.getElementById("download").addEventListener("click", download);
  document.getElementById("reload").addEventListener("click", async () => { DATA = await getProgress(); render(); });
}

/* Read the form into DATA. */
function collect() {
  document.querySelectorAll("select[data-status]").forEach(sel => {
    DATA.milestones[Number(sel.dataset.status)].status = sel.value;
  });
  document.querySelectorAll("input[data-task]").forEach(cb => {
    const [mi, ti] = cb.dataset.task.split(":").map(Number);
    DATA.milestones[mi].tasks[ti].done = cb.checked;
  });
  document.querySelectorAll("input[data-test]").forEach(inp => {
    const [i, field] = inp.dataset.test.split(":");
    if (DATA.tests[Number(i)]) DATA.tests[Number(i)][field] = inp.value;
  });
  if (!DATA.funding) DATA.funding = { annualTuition: 0, note: "", pathways: [] };
  const at = document.getElementById("annualTuition");
  if (at) DATA.funding.annualTuition = Number(at.value) || 0;
  document.querySelectorAll("input[data-fund]").forEach(inp => {
    const [i, field] = inp.dataset.fund.split(":");
    if (DATA.funding.pathways[Number(i)]) DATA.funding.pathways[Number(i)][field] = inp.value;
  });
  document.querySelectorAll("select[data-fund]").forEach(sel => {
    const [i, field] = sel.dataset.fund.split(":");
    if (DATA.funding.pathways[Number(i)]) DATA.funding.pathways[Number(i)][field] = sel.value;
  });
  DATA.updated = new Date().toISOString().slice(0, 10);
}

async function save() {
  collect();
  const token = localStorage.getItem(TOKEN_KEY) || "";
  const headers = { "content-type": "application/json" };
  if (!SESSION.authenticated && token) headers.Authorization = "Bearer " + token;
  try {
    const res = await fetch("/api/progress", {
      method: "PUT",
      headers,
      credentials: "same-origin",
      body: JSON.stringify(DATA)
    });
    const out = await res.json().catch(() => ({}));
    if (res.status === 401) {
      return msg("Not authorized — sign in with GitHub (or save a valid admin token).", "err");
    }
    if (!res.ok) return msg(`Save failed (${res.status}): ${out.error || "unknown error"}`, "err");
    msg(`Saved to Cloudflare at ${out.savedAt || "just now"}.`, "ok");
  } catch (err) {
    msg("API not reachable. Use Download JSON and commit data/progress.json instead.", "err");
  }
}

function download() {
  collect();
  const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "progress.json";
  a.click();
  URL.revokeObjectURL(a.href);
}
