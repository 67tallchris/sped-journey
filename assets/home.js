/* Home page: profile, critical path, stats, resume, projects. */
(async function () {
  fillHeader("home");
  const app = document.getElementById("app");
  try {
    const [site, progress, journal] = await Promise.all([
      getJSON("data/site.json"),
      getProgress(),
      getJSON("data/journal.json")
    ]);
    renderHero(site, progress);
    renderMission(site);
    renderStats(site, progress, journal);
    renderPath(progress);
    renderTests(progress.tests);
    renderResume(site);
    renderProjects(site);
    renderContact(site);
  } catch (err) {
    app.innerHTML = `<section class="wrap"><h2>Couldn't load the data</h2>
      <p class="muted">${esc(err.message)}. If you're opening this file directly, run a local server
      (<code>python3 -m http.server</code>) or view it on the deployed site.</p></section>`;
  }
})();

function renderHero(site, progress) {
  const p = overallPct(progress);
  const el = document.getElementById("hero");
  el.innerHTML = `
    <div>
      <div class="eyebrow">${esc(site.location)} · ${esc(site.target.role)}</div>
      <h1>${esc(site.name)}</h1>
      <p class="lede"><b>${esc(site.headline)}</b></p>
      <p class="lede">${esc(site.subhead)}</p>
      <div class="hero-actions">
        <a class="btn" href="#path">See the critical path</a>
        <a class="btn secondary" href="/journal">Study journal</a>
        <a class="btn secondary" href="/quiz">Try the quiz</a>
      </div>
    </div>
    <div class="hero-card">
      <div class="ring" id="ring"></div>
      <p class="small muted" id="ringNote"></p>
    </div>`;
  progressRing(document.getElementById("ring"), p);
  const all = progress.milestones.flatMap(m => m.tasks || []);
  document.getElementById("ringNote").textContent =
    `${all.filter(t => t.done).length} of ${all.length} tracked steps complete · updated ${progress.updated || ""}`;
}

function renderMission(site) {
  document.getElementById("mission").innerHTML = `
    <div class="section-head">
      <h2>Why special education</h2>
    </div>
    <div class="grid two">
      <div class="card">${site.mission.map(p => `<p>${esc(p)}</p>`).join("")}</div>
      <div class="card">
        <h3>The goal, in one line</h3>
        <p>Teach <b>Special Education (Mild/Moderate, K–12)</b> in the <b>${esc(site.target.district)}</b> —
        hired through Arizona's alternative pathway while I finish my master's, then convert to a full
        Standard Professional certificate.</p>
        <p class="muted small">${esc(site.target.pathway)}</p>
      </div>
    </div>`;
}

function renderStats(site, progress, journal) {
  const done = progress.milestones.flatMap(m => m.tasks || []).filter(t => t.done).length;
  const total = progress.milestones.flatMap(m => m.tasks || []).length;
  document.getElementById("stats").innerHTML = `
    <div class="stat"><b>${journal.questionCount}</b><span>study questions rewritten in my own notes</span></div>
    <div class="stat"><b>${journal.noteCount}</b><span>competency notes across ${journal.exams.length} exams</span></div>
    <div class="stat"><b>${done}/${total}</b><span>milestone steps complete</span></div>
    <div class="stat"><b>${(progress.tests || []).length}</b><span>exams tracked</span></div>`;
}

function renderPath(progress) {
  document.getElementById("path").innerHTML = `
    <div class="section-head">
      <h2>${esc(progress.title)}</h2>
      <p>${esc(progress.intro)}</p>
    </div>
    <div class="timeline">${progress.milestones.map(renderMilestone).join("")}</div>`;
}

function renderTests(tests) {
  document.getElementById("tests").innerHTML = `
    <div class="section-head"><h2>Exam tracker</h2>
      <p>Every state exam between me and the classroom, and where each one stands.</p></div>
    <div class="card">${renderTestsTable(tests)}</div>`;
}

function renderTestsTable(tests) { return renderTestRows(tests); }

function renderTestRows(tests) {
  if (!tests || !tests.length) return "<p class='muted'>No exams tracked yet.</p>";
  return `<table style="width:100%;border-collapse:collapse">
    <thead><tr style="text-align:left;border-bottom:2px solid var(--line)">
      <th style="padding:8px 6px">Exam</th><th>Status</th><th>Target</th><th>Score</th></tr></thead>
    <tbody>${tests.map(t => `<tr style="border-bottom:1px solid var(--line)">
      <td style="padding:10px 6px"><b>${esc(t.name)}</b>${t.note ? `<div class="muted small">${esc(t.note)}</div>` : ""}</td>
      <td>${esc(t.status || "")}</td><td>${esc(t.target || "")}</td>
      <td>${esc(t.score || "—")}</td></tr>`).join("")}</tbody></table>`;
}

function renderResume(site) {
  const jobs = site.experience.map(j => `
    <div class="job">
      <div class="role">${esc(j.role)}</div>
      <div class="org">${esc(j.org)}</div>
      <div class="dates">${esc(j.dates)} · ${esc(j.location)}</div>
      <ul>${j.bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>
    </div>`).join("");
  const skills = site.skills.map(g => `
    <div class="skillgroup"><b>${esc(g.group)}</b>
      <div class="chips">${g.items.map(s => `<span class="chip">${esc(s)}</span>`).join("")}</div>
    </div>`).join("");
  document.getElementById("resume").innerHTML = `
    <div class="section-head"><h2>Resume</h2>
      <p>20 years of business experience, now pointed at the classroom.</p></div>
    <div class="resume-grid">
      <div>
        <div class="card" style="margin-bottom:16px">
          <h3>Education</h3>
          ${site.education.map(e => `
            <div class="job">
              <div class="role">${esc(e.credential)}</div>
              <div class="org">${esc(e.school)}</div>
              <div class="dates">${esc(e.year)}</div>
              <p class="small muted" style="margin-top:6px">${esc(e.note || "")}</p>
            </div>`).join("")}
          <h3 style="margin-top:18px">Skills</h3>
          ${skills}
        </div>
      </div>
      <div class="card"><h3>Experience</h3>${jobs}</div>
    </div>`;
}

function renderProjects(site) {
  document.getElementById("projects").innerHTML = `
    <div class="section-head"><h2>Projects & evidence</h2>
      <p>Tools I've built while preparing — proof of the studying, not just claims about it.</p></div>
    <div class="grid three">
      ${site.projects.map(p => `
        <div class="card">
          <h3>${esc(p.title)}</h3>
          <p class="small muted">${esc(p.desc)}</p>
          <a class="btn small secondary" href="${esc(p.link)}">${esc(p.linkLabel)}</a>
          <div class="tagrow">${(p.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        </div>`).join("")}
    </div>`;
}

function renderContact(site) {
  document.getElementById("contact").innerHTML = `
    <div class="card" style="display:flex;gap:16px;justify-content:space-between;flex-wrap:wrap;align-items:center">
      <div>
        <h2 style="margin-bottom:4px">Hiring for SPED in Marana?</h2>
        <p class="muted" style="margin:0">I'd love to talk about the 2027–28 school year.</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn" href="mailto:${esc(site.email)}">Email me</a>
        ${site.linkedin ? `<a class="btn secondary" href="${esc(site.linkedin)}">LinkedIn</a>` : ""}
        ${site.github ? `<a class="btn secondary" href="${esc(site.github)}">GitHub</a>` : ""}
      </div>
    </div>`;
}
