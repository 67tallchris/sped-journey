/* Public demo quiz: 10 original sample questions showing the practice-test interface. */
(async function () {
  fillHeader("quiz");
  const el = document.getElementById("quiz");
  let questions = [];
  try {
    questions = await getJSON("data/demo-questions.json");
  } catch (err) {
    el.innerHTML = `<div class="card"><h2>Couldn't load the quiz</h2><p class="muted">${esc(err.message)}</p></div>`;
    return;
  }
  let answers = {};

  function render() {
    const graded = Object.keys(answers).length === questions.length;
    el.innerHTML = `
      <div class="demo-banner">
        <b>Demo:</b> these are 10 original sample questions that show how the practice app works.
        The full <b>80-question AEPA Field 22</b> practice bank (parsed from the study guide) runs
        privately — it isn't republished here. The interaction, grading, and feedback are identical.
      </div>
      <div class="summary" id="score" hidden></div>
      ${questions.map(q => qCard(q, graded)).join("")}
      <div class="actions">
        ${graded
          ? `<button class="btn" id="retry">Retry the set</button>`
          : `<button class="btn" id="submit">Submit the set</button>`}
        <a class="btn secondary" href="/#path">Back to the critical path</a>
      </div>`;
    if (graded) showScore();
    document.getElementById("submit")?.addEventListener("click", grade);
    document.getElementById("retry")?.addEventListener("click", () => { answers = {}; render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
    el.querySelectorAll(".opt input").forEach(input => input.addEventListener("change", () => {
      answers[input.name] = input.value;
    }));
  }

  function qCard(q, graded) {
    const chosen = answers["q" + q.number];
    const cls = graded ? (chosen === q.answer ? "correct" : "wrong") : "";
    return `<article class="qcard ${cls}">
      <div class="qnum">Question ${q.number} · ${esc(q.objective)}</div>
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
        <p class="explain">${esc(q.explanation)}</p>` : ""}
    </article>`;
  }

  function grade() {
    const unanswered = questions.filter(q => !answers["q" + q.number]).length;
    if (unanswered && !confirm(`${unanswered} unanswered question(s) will be marked incorrect. Submit anyway?`)) return;
    // fill a sentinel so the quiz renders as graded
    questions.forEach(q => { if (!answers["q" + q.number]) answers["q" + q.number] = "—"; });
    render();
    document.getElementById("score")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showScore() {
    const score = questions.filter(q => answers["q" + q.number] === q.answer).length;
    const box = document.getElementById("score");
    box.hidden = false;
    box.innerHTML = `<span class="score">${score}/${questions.length}</span> correct
      <span class="muted">(${Math.round(score / questions.length * 100)}%)</span>`;
  }

  render();
})();
