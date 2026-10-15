/* Testing area: multiple quizzes, sets of 10, grading, private full bank for the owner. */
const SET_SIZE = 10;
const STORE_KEY = "sped-quiz-v2";
const LAST_KEY = "sped-quiz-last";

let INDEX = null;
let SESSION = { authenticated: false };
let currentTest = null;
let questions = [];
let setIndex = 0;
let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && typeof s === "object") return { answers: s.answers || {}, submitted: s.submitted || {} };
    }
  } catch (e) {}
  return { answers: {}, submitted: {} };
}
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
}
function answers() { return (state.answers[currentTest.id] = state.answers[currentTest.id] || {}); }
function submitted() { return (state.submitted[currentTest.id] = state.submitted[currentTest.id] || {}); }
function setCount() { return Math.ceil(questions.length / SET_SIZE); }
function setOf(i) { return questions.slice(i * SET_SIZE, (i + 1) * SET_SIZE); }
function accessible(t) { return !t.private || SESSION.authenticated; }

async function init() {
  fillHeader("quiz");
  try { SESSION = await getJSON("/api/session"); } catch (e) { SESSION = { authenticated: false }; }
  try {
    INDEX = await getJSON("data/quizzes.json?v=" + Date.now());
  } catch (err) {
    document.getElementById("quiz").innerHTML =
      `<div class="card"><h2>Couldn't load the tests</h2><p class="muted">${esc(err.message)}</p></div>`;
    return;
  }
  renderPicker();
  const last = localStorage.getItem(LAST_KEY);
  const test = INDEX.tests.find(t => t.id === last && accessible(t)) ||
    INDEX.tests.find(accessible) || INDEX.tests[0];
  if (test) await selectTest(test);
}

function renderPicker() {
  const el = document.getElementById("testPicker");
  el.innerHTML = INDEX.tests.map(t => {
    const locked = !accessible(t);
    return `<button type="button" class="batch-btn test-btn ${currentTest && currentTest.id === t.id ? "active" : ""} ${locked ? "locked" : ""}"
        data-test="${esc(t.id)}" data-locked="${locked ? "1" : "0"}">
      <b>${locked ? "🔒 " : ""}${esc(t.title)}</b>
      <span class="bmeta">${locked ? "Sign in with GitHub to load" : esc(t.subtitle)}</span>
    </button>`;
  }).join("");
  el.querySelectorAll("[data-test]").forEach(b => b.addEventListener("click", async () => {
    if (b.dataset.locked === "1") {
      window.location.href = "/api/auth/login?next=%2Fquiz";
      return;
    }
    const t = INDEX.tests.find(x => x.id === b.dataset.test);
    if (t && (!currentTest || t.id !== currentTest.id)) {
      await selectTest(t);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }));
}

async function selectTest(test) {
  if (!accessible(test)) return;
  currentTest = test;
  localStorage.setItem(LAST_KEY, test.id);
  try {
    let url;
    if (test.private) {
      if (!test.endpoint) throw new Error("This private test is missing its endpoint");
      url = test.endpoint;
    } else {
      if (!test.file) throw new Error("This test is missing its data file");
      url = test.file + "?v=" + Date.now();
    }
    const data = await getJSON(url);
    questions = (Array.isArray(data) ? data : (data.questions || [])).sort((a, b) => a.number - b.number);
  } catch (err) {
    document.getElementById("quiz").innerHTML =
      `<div class="card"><h2>Couldn't load this test</h2><p class="muted">${esc(err.message)}</p>
       ${test.private ? `<p><a class="btn small" href="/api/auth/login?next=%2Fquiz">Sign in with GitHub</a></p>` : ""}</div>`;
    return;
  }
  setIndex = 0;
  renderPicker();
  render();
}

function renderMeta() {
  document.getElementById("quizMeta").innerHTML = `
    <div class="card" style="margin-bottom:4px">
      <h3 style="margin-bottom:2px">${esc(currentTest.title)}</h3>
      <p class="small muted" style="margin:0">
        ${esc(currentTest.note || "")}
        ${currentTest.source ? ` · <a href="${esc(currentTest.source)}" target="_blank" rel="noopener">${esc(currentTest.sourceLabel || "source")}</a>` : ""}
      </p>
    </div>`;
}

function updateProgress() {
  const box = document.getElementById("quizProgress");
  if (!box) return;
  if (!questions.length) { box.hidden = true; return; }
  const ans = Object.keys(answers()).length;
  document.getElementById("quizProgressBar").style.width = Math.round(ans / questions.length * 100) + "%";
  document.getElementById("quizProgressText").textContent =
    `${ans} / ${questions.length} answered · ${Object.keys(submitted()).length}/${setCount()} sets graded`;
  box.hidden = false;
}

function renderSetNav() {
  const el = document.getElementById("setNav");
  const subs = submitted();
  el.innerHTML = Array.from({ length: setCount() }, (_, i) => {
    const sub = subs[i];
    const batch = setOf(i);
    const answered = batch.filter(q => answers()[q.number]).length;
    const meta = sub
      ? `<span class="bscore">${sub.score}/${sub.total}</span>`
      : `<span class="bmeta">${answered}/${batch.length}</span>`;
    const low = sub && sub.score / sub.total < 0.6 ? " low" : "";
    return `<button type="button" class="batch-btn ${i === setIndex ? "active" : ""} ${sub ? "graded" + low : answered ? "partial" : ""}" data-set="${i}">
      Set ${i + 1}${meta}</button>`;
  }).join("");
  el.querySelectorAll("[data-set]").forEach(b => b.addEventListener("click", () => {
    setIndex = Number(b.dataset.set);
    render();
    document.getElementById("quiz").scrollIntoView({ behavior: "smooth", block: "start" });
  }));
}

function render() {
  renderMeta();
  updateProgress();
  renderSetNav();
  const el = document.getElementById("quiz");
  const batch = setOf(setIndex);
  const sub = submitted()[setIndex];
  const first = batch[0] ? batch[0].number : 0;
  const last = batch.length ? batch[batch.length - 1].number : 0;

  el.innerHTML = `
    <div class="sethead"><h2>Set ${setIndex + 1} of ${setCount()}</h2>
      <span class="range">Questions ${first}–${last}</span></div>
    ${sub ? `<div class="summary"><span class="score">${sub.score}/${sub.total}</span> correct
      <span class="pct">(${Math.round(sub.score / sub.total * 100)}%) · ${sub.total - sub.score} incorrect</span></div>` : ""}
    ${batch.map(q => qCard(q, !!sub)).join("")}
    <div class="actions">
      ${sub
        ? `<button type="button" class="btn secondary" id="retry">Retry this set</button>`
        : `<button type="button" class="btn" id="submit">Submit this set</button>`}
      <button type="button" class="btn secondary" id="prev" ${setIndex === 0 ? "disabled" : ""}>← Previous set</button>
      <button type="button" class="btn" id="next" ${setIndex === setCount() - 1 ? "disabled" : ""}>Next set →</button>
    </div>
    <div class="resetbar"><button type="button" class="linkbtn" id="resetTest">Reset this test</button></div>`;

  el.querySelectorAll(".opt input").forEach(input => input.addEventListener("change", () => {
    answers()[input.name.replace("q", "")] = input.value;
    saveState();
    renderSetNav();
    updateProgress();
  }));
  document.getElementById("submit")?.addEventListener("click", submitSet);
  document.getElementById("retry")?.addEventListener("click", () => {
    batch.forEach(q => { delete answers()[q.number]; });
    delete submitted()[setIndex];
    saveState();
    render();
  });
  document.getElementById("prev")?.addEventListener("click", () => { setIndex--; render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  document.getElementById("next")?.addEventListener("click", () => { setIndex++; render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  document.getElementById("resetTest")?.addEventListener("click", () => {
    if (!confirm(`Clear answers and scores for "${currentTest.title}"?`)) return;
    delete state.answers[currentTest.id];
    delete state.submitted[currentTest.id];
    saveState();
    setIndex = 0;
    render();
  });
}

function qCard(q, graded) {
  const chosen = answers()[q.number];
  const cls = graded ? (chosen === q.answer ? "correct" : "wrong") : "";
  return `<article class="qcard ${cls}">
    <div class="qnum">Question ${q.number}${q.objective ? " · " + esc(q.objective) : ""}</div>
    <p class="stem">${esc(q.stem)}</p>
    <div class="opts">
      ${q.options.map(o => {
        let c = "opt";
        if (graded) {
          c += " disabled";
          if (o.letter === q.answer) c += " correct";
          else if (o.letter === chosen) c += " wrong";
        }
        return `<label class="${c}">
          <input type="radio" name="q${q.number}" value="${o.letter}" ${chosen === o.letter ? "checked" : ""} ${graded ? "disabled" : ""}>
          <span class="letter">${o.letter}.</span><span>${esc(o.text)}</span></label>`;
      }).join("")}
    </div>
    ${graded ? `<p class="verdict ${chosen === q.answer ? "ok" : "bad"}">
        ${chosen === q.answer ? "✓ Correct" : `✗ Incorrect — correct answer: ${q.answer}`}</p>
      ${q.explanation ? `<p class="explain">${esc(q.explanation)}</p>` : ""}` : ""}
  </article>`;
}

function submitSet() {
  const batch = setOf(setIndex);
  const unanswered = batch.filter(q => !answers()[q.number]).length;
  if (unanswered && !confirm(`${unanswered} unanswered question(s) in this set will be marked incorrect. Submit anyway?`)) return;
  const score = batch.filter(q => answers()[q.number] === q.answer).length;
  submitted()[setIndex] = { score, total: batch.length };
  saveState();
  render();
  document.getElementById("quiz").scrollIntoView({ behavior: "smooth", block: "start" });
}

init();
