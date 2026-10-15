/* Shared helpers for the SPED journey site. */
async function getJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

/* Progress API: live KV data first, static file fallback. */
async function getProgress() {
  try {
    const live = await getJSON("/api/progress");
    if (live && Array.isArray(live.milestones)) return live;
  } catch (e) { /* not deployed with Functions, or KV empty */ }
  return getJSON("data/progress.json");
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function tasksDone(ms) {
  return (ms.tasks || []).filter(t => t.done).length;
}
function pct(done, total) {
  return total ? Math.round((done / total) * 100) : 0;
}
function milestonePct(ms) {
  return pct(tasksDone(ms), (ms.tasks || []).length);
}
function overallPct(data) {
  const all = (data.milestones || []).flatMap(m => m.tasks || []);
  return pct(all.filter(t => t.done).length, all.length);
}
function statusLabel(s) {
  return ({ "done": "Complete", "in-progress": "In progress", "planned": "Planned", "goal": "Goal" })[s] || s;
}
function fundingStatusLabel(s) {
  return ({ "confirmed": "Confirmed", "in-progress": "In progress", "applied": "Applied", "exploring": "Exploring", "backup": "Backup" })[s] || s;
}

function progressRing(el, pctValue) {
  const r = 70, c = 2 * Math.PI * r;
  const off = c - (pctValue / 100) * c;
  el.innerHTML = `
    <svg width="170" height="170" viewBox="0 0 170 170" aria-hidden="true">
      <circle cx="85" cy="85" r="${r}" fill="none" stroke="#edf0f5" stroke-width="14"></circle>
      <circle cx="85" cy="85" r="${r}" fill="none" stroke="url(#g)" stroke-width="14"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"></circle>
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#2056d6"/><stop offset="100%" stop-color="#0d8f7f"/>
      </linearGradient></defs>
    </svg>
    <div class="pct">${pctValue}%<small>of the path</small></div>`;
}

function renderTasks(ms) {
  if (!ms.tasks || !ms.tasks.length) return "";
  const items = ms.tasks.map(t => `
    <li class="${t.done ? "done" : ""}">
      <input type="checkbox" disabled ${t.done ? "checked" : ""}>
      <label>${esc(t.label)}</label>
    </li>`).join("");
  return `<ul class="tasks">${items}</ul>`;
}

function renderMilestone(ms, i) {
  const done = tasksDone(ms), total = (ms.tasks || []).length, p = milestonePct(ms);
  const evidence = (ms.evidence || []).filter(e => e.href);
  return `
    <article class="milestone ${esc(ms.status)}" id="ms-${esc(ms.id)}">
      <div class="ms-top">
        <div class="ms-num">${ms.status === "done" ? "✓" : i + 1}</div>
        <div>
          <h3 class="ms-title">${esc(ms.title)}</h3>
          <p class="ms-sum">${esc(ms.summary || "")}</p>
        </div>
        <div class="ms-meta">
          <span class="pill ${esc(ms.status)}">${esc(statusLabel(ms.status))}</span>
          ${ms.target ? `<span class="ms-target">Target: ${esc(ms.target)}</span>` : ""}
        </div>
      </div>
      <div class="ms-progress">
        <div class="ms-bar"><i style="width:${p}%"></i></div>
        <span class="ms-bar-label">${done}/${total} · ${p}%</span>
      </div>
      <div class="ms-body">
        <div>${renderTasks(ms)}</div>
        <div class="evidence">
          ${evidence.length ? `<h4>Evidence</h4><ul>${evidence.map(e => `<li><a href="${esc(e.href)}">${esc(e.label)}</a></li>`).join("")}</ul>` : `<h4>Evidence</h4><p class="muted small">Building…</p>`}
        </div>
      </div>
    </article>`;
}

function renderTests(tests) {
  if (!tests || !tests.length) return "<p class='muted'>No exams tracked yet.</p>";
  const rows = tests.map(t => `
    <tr>
      <td><b>${esc(t.name)}</b>${t.note ? `<div class="muted small">${esc(t.note)}</div>` : ""}</td>
      <td>${esc(t.status || "")}</td>
      <td>${esc(t.target || "")}</td>
      <td>${esc(t.score || "—")}</td>
    </tr>`).join("");
  return `<table style="width:100%;border-collapse:collapse">
      <thead><tr style="text-align:left;border-bottom:2px solid var(--line)">
        <th style="padding:8px 6px">Exam</th><th>Status</th><th>Target</th><th>Score</th>
      </tr></thead><tbody>${rows}</tbody></table>`;
}

function fillHeader(active) {
  document.querySelectorAll(".site-nav a[data-nav]").forEach(a => {
    if (a.dataset.nav === active) a.classList.add("cta");
  });
}
