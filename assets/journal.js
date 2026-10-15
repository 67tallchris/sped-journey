/* Study journal: Obsidian competency notes + the alternative-certificate checklist. */
(async function () {
  fillHeader("journal");
  const wrap = document.getElementById("journal");
  try {
    const [journal, progress] = await Promise.all([getJSON("data/journal.json"), getProgress()]);
    renderHeader(journal);
    renderFilters(journal);
    renderNotes(journal, "all", "");
    renderChecklist();
    renderMilestoneSummary(progress);
  } catch (err) {
    wrap.innerHTML = `<div class="card"><h2>Couldn't load the journal</h2><p class="muted">${esc(err.message)}</p></div>`;
  }
})();

let JOURNAL = null;

function renderHeader(journal) {
  document.getElementById("journal-head").innerHTML = `
    <div class="section-head">
      <h2>Study journal</h2>
      <p>Every practice question I miss turns into a note with the correct answer and the <em>why</em>.
      This page is generated from my Obsidian vault — ${journal.noteCount} notes and
      ${journal.questionCount} study questions across ${journal.exams.length} exams.</p>
    </div>`;
  JOURNAL = journal;
}

function renderFilters(journal) {
  const el = document.getElementById("filters");
  el.innerHTML = `
    <button class="btn secondary small exam-filter active" data-exam="all">All exams</button>
    ${journal.exams.map(e => `<button class="btn secondary small exam-filter" data-exam="${esc(e.exam)}">${esc(e.exam.replace(/^AEPA\/NES /, ""))} (${e.questions})</button>`).join("")}
    <input id="journal-search" type="search" placeholder="Search topics and answers…" aria-label="Search study notes">`;
  el.querySelectorAll(".exam-filter").forEach(b => b.addEventListener("click", () => {
    el.querySelectorAll(".exam-filter").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    renderNotes(JOURNAL, b.dataset.exam, document.getElementById("journal-search").value);
  }));
  document.getElementById("journal-search").addEventListener("input", e => {
    const exam = el.querySelector(".exam-filter.active")?.dataset.exam || "all";
    renderNotes(JOURNAL, exam, e.target.value);
  });
}

function renderNotes(journal, exam, q) {
  const query = (q || "").trim().toLowerCase();
  const notes = journal.notes.filter(n => exam === "all" || n.exam === exam);
  const el = document.getElementById("notes");
  if (!notes.length) { el.innerHTML = `<p class="muted">No notes match.</p>`; return; }
  el.innerHTML = notes.map(n => {
    const questions = n.questions.filter(x =>
      !query || (x.topic + " " + x.answer + " " + x.why.join(" ")).toLowerCase().includes(query));
    if (!questions.length) return "";
    return `
      <div class="journal-exam">
        <h3>${esc(n.competency || n.title)}</h3>
        <div class="exam-meta">${esc(n.exam)} · ${questions.length} question${questions.length > 1 ? "s" : ""} · status: ${esc(n.status)}</div>
        ${questions.map(x => `
          <details class="note">
            <summary>${esc(x.topic)}
              <span class="badge ${n.status === "in-progress" ? "in-progress" : ""}">Q${x.n}</span></summary>
            <div class="note-body">
              <div class="qblock">
                <div class="answer"><b>My takeaway:</b> ${esc(x.answer || "—")}</div>
                ${x.why.length ? `<div class="why"><h4>Why</h4><ul>${x.why.map(w => `<li>${esc(w)}</li>`).join("")}</ul></div>` : ""}
              </div>
            </div>
          </details>`).join("")}
      </div>`;
  }).join("") || `<p class="muted">No notes match.</p>`;
}

function renderChecklist() {
  const steps = [
    "Pass AEPA/NES Special Education 601 (NT601)",
    "Get admitted to an approved Arizona EPP",
    "Request the EPP enrollment-verification letter from the program designee",
    "Get/renew the IVP fingerprint clearance card",
    "Submit the ADE application for the Alternative Teaching Certificate",
    "Apply for SPED openings during the March–June hiring season",
    "Accept an offer; get Confirmation of Employment signed by principal + district HR",
    "Confirm the EPP approves the placement and can supervise it",
    "Finish the US/AZ Constitution requirement within 3 years",
    "Complete coursework + professional experience in my own classroom",
    "Finish program → Institutional Recommendation → Standard Professional SPED certificate"
  ];
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("sped-checklist") || "{}"); } catch (e) {}
  const el = document.getElementById("checklist");
  el.innerHTML = `
    <div class="grid two">
      <div>
        <h3>Alternative certificate checklist</h3>
        <p class="muted small">The actual critical path to being hired as a teacher of record while finishing the program. Checked items are saved in this browser.</p>
        <ul class="checklist">
          ${steps.map((s, i) => `<li><input type="checkbox" id="ck-${i}" ${saved[i] ? "checked" : ""}><label for="ck-${i}">${esc(s)}</label></li>`).join("")}
        </ul>
      </div>
      <div class="card" id="milestone-summary"></div>
    </div>`;
  el.querySelectorAll("input[type=checkbox]").forEach(cb => cb.addEventListener("change", () => {
    saved = {};
    el.querySelectorAll("input[type=checkbox]").forEach(c => { if (c.checked) saved[c.id.replace("ck-", "")] = 1; });
    try { localStorage.setItem("sped-checklist", JSON.stringify(saved)); } catch (e) {}
  }));
}

function renderMilestoneSummary(progress) {
  const el = document.getElementById("milestone-summary");
  if (!el) return;
  el.innerHTML = `
    <h3>Milestone status</h3>
    ${progress.milestones.map(m => {
      const done = (m.tasks || []).filter(t => t.done).length, total = (m.tasks || []).length;
      return `<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;gap:8px;font-size:14px">
          <b>${esc(m.short || m.title)}</b><span class="muted">${done}/${total}</span></div>
        <div class="ms-bar" style="margin-top:4px"><i style="width:${pct(done, total)}%"></i></div>
      </div>`;
    }).join("")}
    <a class="btn small secondary" href="/#path">Open the full critical path</a>`;
}
