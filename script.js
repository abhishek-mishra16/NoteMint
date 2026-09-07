const STORE = {
  packs: "notemint.studyPacks",
  theme: "notemint.theme",
  student: "notemint.studentProfile",
  accounts: "notemint.studentAccounts",
  mascot: "notemint.mascotName"
};

const sampleNotes = `
Cell biology studies the structure and function of cells. The cell membrane is a selectively permeable barrier made mainly of phospholipids and proteins. It controls what enters and leaves the cell and helps cells communicate.

The nucleus stores DNA and controls most cell activities. DNA contains instructions for making proteins. The nucleolus inside the nucleus helps assemble ribosomes.

Mitochondria produce ATP through cellular respiration. ATP is the main energy currency of the cell. Chloroplasts in plant cells use sunlight to make glucose during photosynthesis.

Ribosomes build proteins. The rough endoplasmic reticulum modifies proteins, while the smooth endoplasmic reticulum makes lipids and helps detoxify chemicals. The Golgi apparatus packages and ships proteins and lipids.

Lysosomes digest worn-out cell parts and waste materials. Vacuoles store water, food, and other substances. The cytoskeleton gives the cell shape and helps with movement.

Plant cells have a cell wall, chloroplasts, and a large central vacuole. Animal cells do not have cell walls or chloroplasts but usually have smaller vacuoles.

Cell division allows organisms to grow, repair tissues, and reproduce. Mitosis produces two identical daughter cells. Meiosis produces sex cells with half the number of chromosomes.
`;

let state = {
  packs: [],
  currentPack: null,
  currentPage: "home",
  mcqIndex: 0,
  sqIndex: 0,
  fcIndex: 0,
  mindmapZoom: 1,
  authMode: "signup",
  student: null,
  mascotName: "Mint"
};

const $ = (id) => document.getElementById(id);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

document.addEventListener("DOMContentLoaded", init);

function init() {
  loadState();
  bindNavigation();
  bindUpload();
  bindTheme();
  bindPractice();
  bindAuth();
  bindMascotName();
  bindReferenceProfileUI();
  bindNotifications();
  startHomeThinkingPreview();
  bindSearch();
  bindMascotFallbacks();
  renderStudent();
  renderMascotName();
  renderRecentPacks();
  renderLibrary();
  if (state.packs[0]) setCurrentPack(state.packs[0]);
}

function loadState() {
  state.packs = readJson(STORE.packs, []);
  state.student = readJson(STORE.student, null);
  state.mascotName = localStorage.getItem(STORE.mascot) || "Mint";
  const theme = localStorage.getItem(STORE.theme) || "light";
  document.documentElement.dataset.theme = theme;
  document.body.classList.toggle("student-ready", Boolean(state.student));
  updateThemeIcon(theme);
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function bindNavigation() {
  $$("[data-page]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      showPage(el.dataset.page);
    });
  });
  $("menuBtn")?.addEventListener("click", () => document.querySelector(".sidebar")?.classList.toggle("open"));
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      $("globalSearch")?.focus();
    }
    if (event.key === "Escape") closeAuthModal();
  });
}

function showPage(page) {
  const target = $("page-" + page);
  if (!target) return;
  state.currentPage = page;
  $$(".page").forEach((section) => section.classList.toggle("active", section === target));
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.page === page));
  document.querySelector(".sidebar")?.classList.remove("open");
  if (page === "library") renderLibrary();
  if (page === "mindmap") renderMindmap();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindUpload() {
  const dropzone = $("dropzone");
  const fileInput = $("fileInput");
  dropzone?.addEventListener("click", () => fileInput?.click());
  $("browseLink")?.addEventListener("click", (event) => {
    event.stopPropagation();
    fileInput?.click();
  });
  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) handleFile(file);
    fileInput.value = "";
  });
  ["dragenter", "dragover"].forEach((type) => dropzone?.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  }));
  ["dragleave", "drop"].forEach((type) => dropzone?.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
  }));
  dropzone?.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });
  $("sampleBtn")?.addEventListener("click", () => processText(sampleNotes, "Cell Biology Sample Notes"));
}

async function handleFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  try {
    let text = "";
    if (ext === "txt") text = await file.text();
    else if (ext === "pdf") text = await readPdf(file);
    else if (ext === "docx") text = await readDocx(file);
    else {
      toast("Please choose a PDF, DOCX, or TXT file.");
      return;
    }
    if (!text.trim()) {
      toast("I could not find readable text in that file.");
      return;
    }
    processText(text, file.name.replace(/\.[^.]+$/, ""));
  } catch (error) {
    console.error(error);
    toast("That file could not be read in this browser.");
  }
}

async function readPdf(file) {
  if (!window.pdfjsLib) throw new Error("PDF library unavailable");
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const chunks = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    chunks.push(content.items.map((item) => item.str).join(" "));
  }
  return chunks.join("\n");
}

async function readDocx(file) {
  if (!window.mammoth) throw new Error("DOCX library unavailable");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

function processText(text, title) {
  showPage("processing");
  animateProcessing(() => {
    const pack = buildStudyPack(text, title);
    state.packs = [pack, ...state.packs.filter((item) => item.id !== pack.id)].slice(0, 24);
    writeJson(STORE.packs, state.packs);
    setCurrentPack(pack);
    renderRecentPacks();
    renderLibrary();
    showPage("summary");
    toast("Study pack ready.");
  });
}

function animateProcessing(done) {
  // Keep every stage on screen long enough for its dedicated mascot motion
  // to be clearly visible.
  const stages = [
    { label: "Reading your file", sub: "Scanning pages and extracting the text", className: "stage-reading", motion: "reading", duration: 1150 },
    { label: "Analyzing important ideas", sub: "Thinking through key terms and sentences", className: "stage-analyzing", motion: "analyzing", duration: 1250 },
    { label: "Understanding relationships", sub: "Connecting concepts, definitions and examples", className: "stage-understanding", motion: "understanding", duration: 1150 },
    { label: "Organizing study material", sub: "Sorting information into a useful study flow", className: "stage-organizing", motion: "organizing", duration: 1150 },
    { label: "Generating your study pack", sub: "Creating summaries, questions and flashcards", className: "stage-generating", motion: "generating", duration: 1250 },
    { label: "Almost ready!", sub: "Giving your study pack the final polish", className: "stage-done", motion: "done", duration: 1050 }
  ];

  const fill = $("procFill");
  const pctEl = $("procPct");
  const labelEl = $("procLabel");
  const subEl = $("procSub2");
  const mascotStage = $("processingMascotStage");
  const processingCard = document.querySelector(".processing-card");
  const stageClasses = stages.map(stage => stage.className);

  let stageIndex = 0;
  let stageStart = performance.now();
  let rafId = null;
  let finished = false;

  const setStage = (index) => {
    const stage = stages[index];
    if (!stage) return;

    mascotStage?.classList.remove(...stageClasses);
    mascotStage?.classList.add(stage.className);
    mascotStage?.setAttribute("data-stage", stage.motion);
    mascotStage?.setAttribute("aria-label", `${stage.motion} mascot animation`);
    processingCard?.setAttribute("data-active-stage", stage.motion);

    if (labelEl) labelEl.textContent = stage.label;
    if (subEl) subEl.textContent = stage.sub;

    $$(".proc-step").forEach((step, i) => {
      step.classList.toggle("done", i < index);
      step.classList.toggle("current", i === index);
      step.setAttribute("aria-current", i === index ? "step" : "false");
    });

    // Force a fresh animation cycle at every stage transition.
    if (mascotStage) {
      mascotStage.classList.remove("stage-transition");
      void mascotStage.offsetWidth;
      mascotStage.classList.add("stage-transition");
    }
  };

  const tick = (now) => {
    if (finished) return;

    const elapsed = now - stageStart;
    const stage = stages[stageIndex];
    const progressInStage = Math.min(1, elapsed / stage.duration);
    const pct = Math.round(((stageIndex + progressInStage) / stages.length) * 100);

    if (fill) fill.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${pct}%`;

    if (progressInStage >= 1) {
      if (stageIndex < stages.length - 1) {
        stageIndex += 1;
        stageStart = now;
        setStage(stageIndex);
      } else {
        finished = true;
        if (fill) fill.style.width = "100%";
        if (pctEl) pctEl.textContent = "100%";
        setStage(stages.length - 1);
        window.setTimeout(() => {
          if (typeof done === "function") done();
        }, 900);
        return;
      }
    }

    rafId = requestAnimationFrame(tick);
  };

  if (rafId) cancelAnimationFrame(rafId);
  setStage(0);
  if (fill) fill.style.width = "0%";
  if (pctEl) pctEl.textContent = "0%";
  requestAnimationFrame((now) => {
    stageStart = now;
    rafId = requestAnimationFrame(tick);
  });
}

function buildStudyPack(text, title) {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = splitSentences(clean);
  const keywords = extractKeywords(clean, 14);
  const takeaways = scoreSentences(sentences, keywords).slice(0, 8);
  const topics = keywords.slice(0, 8);
  const summary = makeSummary(clean, takeaways);
  const mcqs = makeMcqs(keywords, sentences, 20);
  const shortQuestions = makeShortQuestions(keywords, sentences, 15);
  const flashcards = makeFlashcards(keywords, sentences, 25);
  return {
    id: "pack-" + Date.now(),
    title: title || "Untitled Notes",
    date: new Date().toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }),
    pages: Math.max(1, Math.ceil(clean.length / 1800)),
    sourceText: clean,
    summary,
    takeaways,
    topics,
    mcqs,
    shortQuestions,
    flashcards
  };
}

function splitSentences(text) {
  const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  return matches.map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 20);
}

function extractKeywords(text, limit) {
  const stop = new Set("about above after again against all also and any are because been before being below between both but can did does doing down during each few for from further had has have having here how into its itself more most other our out over own same she should some such than that the their them then there these they this those through too under until very was were what when where which while who why will with you your".split(" "));
  const counts = {};
  text.toLowerCase().match(/[a-z][a-z-]{3,}/g)?.forEach((word) => {
    const clean = word.replace(/-+/g, " ");
    if (!stop.has(clean)) counts[clean] = (counts[clean] || 0) + 1;
  });
  const words = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([word]) => titleCase(word));
  return words.length ? words.slice(0, limit) : ["Concepts", "Definitions", "Examples", "Processes", "Revision"];
}

function scoreSentences(sentences, keywords) {
  const lowerKeywords = keywords.map((keyword) => keyword.toLowerCase());
  return sentences
    .map((sentence) => ({
      sentence,
      score: lowerKeywords.reduce((sum, keyword) => sum + (sentence.toLowerCase().includes(keyword) ? 1 : 0), 0) + Math.min(sentence.length / 120, 2)
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.sentence.replace(/\s+/g, " "))
    .filter(unique)
    .slice(0, 12);
}

function makeSummary(text, takeaways) {
  const intro = takeaways.slice(0, 2).join(" ");
  const important = takeaways.slice(2, 6);
  return {
    overview: intro || text.slice(0, 360),
    important,
    conclusion: "Review the key terms, explain each process in your own words, and practice the generated questions until the ideas feel connected."
  };
}

function makeMcqs(keywords, sentences, count) {
  return Array.from({ length: count }, (_, index) => {
    const keyword = keywords[index % keywords.length];
    const related = findSentence(keyword, sentences);
    const options = shuffle([keyword, ...keywords.filter((item) => item !== keyword).slice(0, 3)]).slice(0, 4);
    while (options.length < 4) options.push("Related concept " + (options.length + 1));
    return {
      question: `Which topic best matches this note: "${truncate(related, 120)}"?`,
      options,
      answer: keyword,
      difficulty: index % 3 === 0 ? "Easy" : index % 3 === 1 ? "Medium" : "Hard",
      explanation: `${keyword} is the strongest match because it appears as an important repeated idea in the notes.`
    };
  });
}

function makeShortQuestions(keywords, sentences, count) {
  return Array.from({ length: count }, (_, index) => {
    const keyword = keywords[index % keywords.length];
    return {
      question: `Explain ${keyword} in your own words.`,
      answer: findSentence(keyword, sentences) || `${keyword} is one of the important ideas identified from your notes.`
    };
  });
}

function makeFlashcards(keywords, sentences, count) {
  return Array.from({ length: count }, (_, index) => {
    const keyword = keywords[index % keywords.length];
    return {
      front: `What should you remember about ${keyword}?`,
      back: findSentence(keyword, sentences) || `${keyword} is a key study point from this note pack.`
    };
  });
}

function findSentence(keyword, sentences) {
  return sentences.find((sentence) => sentence.toLowerCase().includes(keyword.toLowerCase())) || sentences[0] || "";
}

function setCurrentPack(pack) {
  state.currentPack = pack;
  state.mcqIndex = 0;
  state.sqIndex = 0;
  state.fcIndex = 0;
  renderSummary();
  renderMcq();
  renderShortQuestion();
  renderFlashcard();
  renderMindmap();
  renderPack();
}

function renderSummary() {
  const pack = state.currentPack;
  if (!pack) return;
  $("sumTitle").textContent = pack.title;
  $("sumDate").textContent = pack.date;
  $("sumPages").textContent = `${pack.pages} Pages`;
  $("statKeyPoints").textContent = pack.takeaways.length;
  $("statMcqs").textContent = pack.mcqs.length;
  $("statShortQ").textContent = pack.shortQuestions.length;
  $("statMindmaps").textContent = "02";
  $("statFlash").textContent = pack.flashcards.length;
  $("takeawaysList").innerHTML = pack.takeaways.map((item, index) => `<li><span class="tk-num">${index + 1}</span><span>${escapeHtml(item)}</span></li>`).join("");
  $("topicChips").innerHTML = pack.topics.map((topic) => `<span class="chip">${escapeHtml(topic)}</span>`).join("");
}

function renderRecentPacks() {
  const list = $("recentPacksList");
  if (!list) return;
  if (!state.packs.length) {
    list.innerHTML = `<div class="empty-state glass"><div class="e-ic">📚</div><p>No study packs yet. Upload notes or try the sample.</p></div>`;
    return;
  }
  list.innerHTML = state.packs.slice(0, 4).map(packCard).join("");
  bindPackCards(list);
}

function renderLibrary(query = "") {
  const grid = $("libraryGrid");
  if (!grid) return;
  const term = query.toLowerCase();
  const packs = state.packs.filter((pack) => pack.title.toLowerCase().includes(term) || pack.topics.join(" ").toLowerCase().includes(term));
  if (!packs.length) {
    grid.innerHTML = `<div class="empty-state glass"><div class="e-ic">🔎</div><p>No saved study packs found.</p></div>`;
    return;
  }
  grid.innerHTML = packs.map((pack) => `
    <div class="lib-card glass" data-pack-id="${pack.id}">
      <div class="lib-card-top"><span class="pack-ic mint">📄</span><span class="pack-meta">${pack.date}</span></div>
      <h4>${escapeHtml(pack.title)}</h4>
      <p class="pack-meta">${pack.pages} pages · ${pack.topics.slice(0, 3).join(", ")}</p>
      <div class="lib-card-icons"><span>${pack.mcqs.length} MCQs</span><span>${pack.flashcards.length} cards</span></div>
      <button class="lib-open">Open pack</button>
    </div>
  `).join("");
  bindPackCards(grid);
}

function packCard(pack) {
  return `
    <div class="pack-card glass" data-pack-id="${pack.id}">
      <div class="pack-ic lavender">📘</div>
      <h4>${escapeHtml(pack.title)}</h4>
      <p class="pack-meta">${pack.date} · ${pack.takeaways.length} key points</p>
    </div>
  `;
}

function bindPackCards(root) {
  root.querySelectorAll("[data-pack-id]").forEach((card) => {
    card.addEventListener("click", () => {
      const pack = state.packs.find((item) => item.id === card.dataset.packId);
      if (pack) {
        setCurrentPack(pack);
        showPage("pack");
      }
    });
  });
}

function renderMcq() {
  const pack = state.currentPack;
  if (!pack) return;
  const item = pack.mcqs[state.mcqIndex];
  $("mcqCount").textContent = `${pack.mcqs.length} Questions`;
  $("mcqProgress").textContent = `Question ${state.mcqIndex + 1} / ${pack.mcqs.length}`;
  $("mcqTrackFill").style.width = `${((state.mcqIndex + 1) / pack.mcqs.length) * 100}%`;
  $("mcqDiff").textContent = item.difficulty;
  $("mcqQuestion").textContent = item.question;
  $("mcqOptions").innerHTML = item.options.map((option, index) => `<button class="option" data-option="${escapeHtml(option)}"><span class="opt-letter">${String.fromCharCode(65 + index)}</span>${escapeHtml(option)}</button>`).join("");
  $("mcqFbStatus").textContent = "Pick an answer";
  $("mcqFbExplain").textContent = "Choose an option to see the explanation.";
  $("mcqPrev").disabled = state.mcqIndex === 0;
  $("mcqNext").textContent = state.mcqIndex === pack.mcqs.length - 1 ? "Back to Summary" : "Next Question →";
  $("mcqOptions").querySelectorAll(".option").forEach((button) => {
    button.addEventListener("click", () => selectMcq(button, item));
  });
}

function selectMcq(button, item) {
  $("mcqOptions").querySelectorAll(".option").forEach((option) => {
    option.classList.add("disabled");
    if (option.dataset.option === item.answer) option.classList.add("correct");
  });
  const correct = button.dataset.option === item.answer;
  button.classList.add(correct ? "correct" : "wrong");
  $("mcqFbStatus").textContent = correct ? "Correct answer" : "Good try";
  $("mcqFbExplain").textContent = item.explanation;
}

function renderShortQuestion() {
  const pack = state.currentPack;
  if (!pack) return;
  const item = pack.shortQuestions[state.sqIndex];
  $("sqCount").textContent = `${pack.shortQuestions.length} Questions`;
  $("sqProgress").textContent = `Question ${state.sqIndex + 1} / ${pack.shortQuestions.length}`;
  $("sqTrackFill").style.width = `${((state.sqIndex + 1) / pack.shortQuestions.length) * 100}%`;
  $("sqQuestion").textContent = item.question;
  $("sqModelAnswer").textContent = item.answer;
  $("sqAnswerCard").style.display = "none";
  $("sqPrev").disabled = state.sqIndex === 0;
}

function renderFlashcard() {
  const pack = state.currentPack;
  if (!pack) return;
  const item = pack.flashcards[state.fcIndex];
  $("fcCount").textContent = `${pack.flashcards.length} Cards`;
  $("fcIndex").textContent = `${String(state.fcIndex + 1).padStart(2, "0")} / ${pack.flashcards.length}`;
  $("fcFrontText").textContent = item.front;
  $("fcBackText").textContent = item.back;
  $("flashcardInner").classList.remove("flipped");
}

function renderMindmap() {
  const pack = state.currentPack;
  const svg = $("mindmapSvg");
  if (!pack || !svg) return;
  const topics = pack.topics.slice(0, 8);
  const nodes = topics.map((topic, index) => {
    const angle = (Math.PI * 2 * index) / topics.length;
    return { topic, x: 700 + Math.cos(angle) * 390, y: 400 + Math.sin(angle) * 240 };
  });
  svg.innerHTML = `
    <g transform="scale(${state.mindmapZoom})">
      <circle cx="700" cy="400" r="118" fill="var(--coral-soft)" stroke="var(--coral)" stroke-width="3"/>
      <text x="700" y="390" text-anchor="middle" font-size="30" font-family="Quicksand" font-weight="700" fill="var(--ink)">${escapeHtml(pack.title.slice(0, 24))}</text>
      <text x="700" y="428" text-anchor="middle" font-size="18" fill="var(--muted)">Study Map</text>
      ${nodes.map((node) => `
        <line x1="700" y1="400" x2="${node.x}" y2="${node.y}" stroke="var(--border)" stroke-width="4"/>
        <rect x="${node.x - 115}" y="${node.y - 34}" width="230" height="68" rx="22" fill="var(--surface)" stroke="var(--border)" stroke-width="2"/>
        <text x="${node.x}" y="${node.y + 6}" text-anchor="middle" font-size="19" font-family="Inter" font-weight="700" fill="var(--ink)">${escapeHtml(node.topic.slice(0, 20))}</text>
      `).join("")}
    </g>
  `;
}

function renderPack(tab = "overview") {
  const pack = state.currentPack;
  if (!pack) return;
  $("packTitle").textContent = pack.title;
  $$(".pack-tab").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  const main = $("packMain");
  if (tab === "mcqTab") {
    main.innerHTML = pack.mcqs.map((q, i) => `<h3>${i + 1}. ${escapeHtml(q.question)}</h3><p><b>Answer:</b> ${escapeHtml(q.answer)}</p><p>${escapeHtml(q.explanation)}</p>`).join("");
  } else if (tab === "sqTab") {
    main.innerHTML = pack.shortQuestions.map((q, i) => `<h3>${i + 1}. ${escapeHtml(q.question)}</h3><p>${escapeHtml(q.answer)}</p>`).join("");
  } else if (tab === "mmTab") {
    main.innerHTML = `<h3>Mind Map Topics</h3><p>${pack.topics.map(escapeHtml).join(" · ")}</p>`;
  } else if (tab === "fcTab") {
    main.innerHTML = pack.flashcards.map((card, i) => `<div class="pack-takeaway"><span class="tk-ic">🗂️</span><div><b>${i + 1}. ${escapeHtml(card.front)}</b><p>${escapeHtml(card.back)}</p></div></div>`).join("");
  } else {
    main.innerHTML = `
      <h3 id="pk-overview">Overview</h3><p>${escapeHtml(pack.summary.overview)}</p>
      <h3 id="pk-takeaways">Key Takeaways</h3>
      ${pack.takeaways.map((item) => `<div class="pack-takeaway"><span class="tk-ic">✓</span><div><b>Important point</b><p>${escapeHtml(item)}</p></div></div>`).join("")}
      <h3 id="pk-topics">Topics Covered</h3><p>${pack.topics.map(escapeHtml).join(", ")}</p>
      <h3 id="pk-important">Important Points</h3>${pack.summary.important.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
      <h3 id="pk-conclusion">Conclusion</h3><p>${escapeHtml(pack.summary.conclusion)}</p>
    `;
  }
}

function bindPractice() {
  $("mcqPrev")?.addEventListener("click", () => {
    if (state.mcqIndex > 0) {
      state.mcqIndex -= 1;
      renderMcq();
    }
  });
  $("mcqNext")?.addEventListener("click", () => {
    const pack = state.currentPack;
    if (!pack) return;
    if (state.mcqIndex < pack.mcqs.length - 1) {
      state.mcqIndex += 1;
      renderMcq();
    } else showPage("summary");
  });
  $("sqPrev")?.addEventListener("click", () => {
    if (state.sqIndex > 0) {
      state.sqIndex -= 1;
      renderShortQuestion();
    }
  });
  $("sqReveal")?.addEventListener("click", () => {
    const card = $("sqAnswerCard");
    card.style.display = card.style.display === "none" ? "flex" : "none";
  });
  $("sqAnswerInput")?.addEventListener("input", () => $("sqCharCount").textContent = $("sqAnswerInput").value.length);
  $("flashcard")?.addEventListener("click", () => $("flashcardInner").classList.toggle("flipped"));
  $("fcPrev")?.addEventListener("click", () => {
    if (!state.currentPack) return;
    state.fcIndex = (state.fcIndex - 1 + state.currentPack.flashcards.length) % state.currentPack.flashcards.length;
    renderFlashcard();
  });
  $("fcNext")?.addEventListener("click", () => {
    if (!state.currentPack) return;
    state.fcIndex = (state.fcIndex + 1) % state.currentPack.flashcards.length;
    renderFlashcard();
  });
  $("mmZoomIn")?.addEventListener("click", () => { state.mindmapZoom = Math.min(1.8, state.mindmapZoom + .1); renderMindmap(); });
  $("mmZoomOut")?.addEventListener("click", () => { state.mindmapZoom = Math.max(.6, state.mindmapZoom - .1); renderMindmap(); });
  $("mmZoomReset")?.addEventListener("click", () => { state.mindmapZoom = 1; renderMindmap(); });
  $("packTabs")?.addEventListener("click", (event) => {
    const tab = event.target.closest(".pack-tab");
    if (tab) renderPack(tab.dataset.tab);
  });
  $("downloadSummaryBtn")?.addEventListener("click", downloadSummary);
  $("downloadMcqBtn")?.addEventListener("click", downloadMcqs);
  $("downloadShortQBtn")?.addEventListener("click", downloadShortQuestions);
  $("downloadFlashcardsBtn")?.addEventListener("click", downloadFlashcards);
  $("downloadMindmapBtn")?.addEventListener("click", downloadMindmapSvg);
  $("downloadAllBtn")?.addEventListener("click", downloadAllStudyPack);
  $("downloadPackAllBtn")?.addEventListener("click", downloadAllStudyPack);
  $("mindmapFullscreenBtn")?.addEventListener("click", toggleMindmapFullscreen);
  $("clearDataBtn")?.addEventListener("click", () => {
    if (!confirm("Clear all saved study packs from this browser?")) return;
    state.packs = [];
    state.currentPack = null;
    writeJson(STORE.packs, []);
    renderRecentPacks();
    renderLibrary();
    toast("Study packs cleared.");
    showPage("home");
  });
}

function bindTheme() {
  $("themeToggle")?.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  $("settingsLight")?.addEventListener("click", () => setTheme("light"));
  $("settingsDark")?.addEventListener("click", () => setTheme("dark"));
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORE.theme, theme);
  updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
  if ($("themeIcon")) $("themeIcon").textContent = theme === "dark" ? "🌙" : "☀️";
  const toggle = $("themeToggle");
  if (toggle) {
    toggle.setAttribute("aria-pressed", String(theme === "dark"));
    toggle.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  }
  const label = $("themeToggle")?.querySelector(".theme-label");
  if (label) label.textContent = theme === "dark" ? "Dark Mode" : "Light Mode";
  syncProfileTheme();
}

function bindNotifications() {
  const menu = $("notificationMenu");
  const button = $("notificationBtn");
  const panel = $("notificationPanel");
  const list = $("notificationList");
  const badge = $("notificationBadge");
  const countText = $("notificationCountText");
  const empty = $("notificationEmpty");
  const markAll = $("markNotificationsRead");
  if (!menu || !button || !panel) return;

  const sync = () => {
    const unread = list ? list.querySelectorAll(".notification-item.unread").length : 0;
    if (badge) { badge.textContent = unread; badge.hidden = unread === 0; }
    if (countText) countText.textContent = unread === 0 ? "All caught up" : `${unread} unread`;
    if (empty) empty.hidden = unread !== 0;
  };

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    panel.hidden = !panel.hidden;
    button.setAttribute("aria-expanded", String(!panel.hidden));
  });

  list?.querySelectorAll(".notification-item").forEach((item) => {
    item.addEventListener("click", () => {
      item.classList.remove("unread");
      sync();
    });
  });

  markAll?.addEventListener("click", () => {
    list?.querySelectorAll(".notification-item.unread").forEach((item) => item.classList.remove("unread"));
    sync();
  });

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
    }
  });

  sync();
}

function bindAuth() {
  $("authOpenBtn")?.addEventListener("click", openAuthModal);
  $("settingsAuthBtn")?.addEventListener("click", openAuthModal);
  $("authCloseBtn")?.addEventListener("click", closeAuthModal);
  $("authModal")?.addEventListener("click", (event) => {
    if (event.target === $("authModal")) closeAuthModal();
  });
  $("signOutBtn")?.addEventListener("click", () => {
    state.student = null;
    localStorage.removeItem(STORE.student);
    renderStudent();
    $("profileDropdown") && ($("profileDropdown").hidden = true);
    toast("Signed out successfully.");
  });
  $$(".auth-tab").forEach((tab) => tab.addEventListener("click", () => setAuthMode(tab.dataset.authMode)));
  $("authForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("authName").value.trim();
    const email = $("authEmail").value.trim().toLowerCase();
    if (!email) return;
    const accounts = readJson(STORE.accounts, {});
    if (state.authMode === "signup") {
      if (!name) {
        toast("Please enter your name.");
        return;
      }
      accounts[email] = { name, email, createdAt: new Date().toISOString() };
      writeJson(STORE.accounts, accounts);
      state.student = accounts[email];
      toast("Local student profile created.");
    } else {
      state.student = accounts[email] || { name: name || email.split("@")[0], email, createdAt: new Date().toISOString() };
      if (!accounts[email]) {
        accounts[email] = state.student;
        writeJson(STORE.accounts, accounts);
      }
      toast("Logged in on this browser.");
    }
    writeJson(STORE.student, state.student);
    closeAuthModal();
    renderStudent();
  });
}


function bindReferenceProfileUI() {
  const menu = $("profileMenu");
  const trigger = $("profileTrigger");
  const dropdown = $("profileDropdown");
  if (!menu || !trigger || !dropdown) return;

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = dropdown.hidden;
    dropdown.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) {
      dropdown.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  $("profileInfoBtn")?.addEventListener("click", () => {
    dropdown.hidden = true;
    showPage("settings");
  });
  $("changeMascotBtn")?.addEventListener("click", () => changeMascotName());
  $("homeChangeMascotBtn")?.addEventListener("click", () => changeMascotName());
  $("profileThemeBtn")?.addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    syncProfileTheme();
  });
}

function changeMascotName() {
  const next = window.prompt("What would you like to call your study buddy?", state.mascotName);
  if (next === null) return;
  const value = next.trim().slice(0, 24);
  state.mascotName = value || "Mint";
  localStorage.setItem(STORE.mascot, state.mascotName);
  renderMascotName();
  toast(`${state.mascotName} is ready to study.`);
}

function syncProfileTheme() {
  const theme = document.documentElement.dataset.theme === "dark" ? "Dark" : "Light";
  if ($("profileThemeValue")) $("profileThemeValue").textContent = theme;
}

function startHomeThinkingPreview() {
  const fill = $("homeProgressFill");
  const pct = $("homeProgressPct");
  const card = document.querySelector(".home-thinking-card");
  const steps = $$(".thinking-step");
  const mascot = document.querySelector(".home-thinking-mascot");
  if (!fill || !pct) return;
  let value = 78;
  let stage = 3;
  const stageClasses = ["stage-reading", "stage-analyzing", "stage-understanding", "stage-organizing", "stage-generating", "stage-done"];
  const update = () => {
    fill.style.width = value + "%";
    pct.textContent = value + "%";
    steps.forEach((step, i) => {
      step.classList.toggle("done", i < stage);
      step.classList.toggle("current", i === stage);
    });
    if (mascot) {
      mascot.classList.remove(...stageClasses);
      mascot.classList.add(stageClasses[stage]);
    }
    card?.setAttribute("data-thinking-stage", stageClasses[stage].replace("stage-", ""));
  };
  update();
  setInterval(() => {
    stage = (stage + 1) % stageClasses.length;
    const targets = [22, 42, 58, 74, 88, 100];
    value = targets[stage];
    if (value === 100) setTimeout(() => { value = 28; }, 850);
    update();
  }, 1900);
}

function openAuthModal() {
  $("authModal").hidden = false;
  $("authEmail")?.focus();
}

function closeAuthModal() {
  const modal = $("authModal");
  if (modal) modal.hidden = true;
}

function setAuthMode(mode) {
  state.authMode = mode;
  $$(".auth-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.authMode === mode));
  $("authNameLabel").style.display = mode === "signup" ? "block" : "none";
  $("authName").style.display = mode === "signup" ? "block" : "none";
  $("authName").required = mode === "signup";
  $("authSubmitBtn").textContent = mode === "signup" ? "Create my profile" : "Log in";
  if ($("authTitle")) $("authTitle").textContent = mode === "signup" ? "Create your student profile" : "Welcome back";
}

function renderStudent() {
  const isSignedIn = Boolean(state.student);
  if ($("studentChip")) $("studentChip").hidden = true;
  if ($("profileMenu")) $("profileMenu").hidden = !isSignedIn;
  $("authOpenBtn").hidden = isSignedIn;
  document.body.classList.toggle("student-ready", isSignedIn);
  const name = state.student?.name || "learner";
  if ($("studentGreeting")) $("studentGreeting").textContent = `Hey, ${name} 👋`;
  if ($("studentEmail")) $("studentEmail").textContent = state.student?.email || "student@example.com";
  if ($("heroGreeting")) $("heroGreeting").textContent = `Hello, ${name}! 👋`;
  if ($("userAvatar")) $("userAvatar").textContent = "";
  if ($("profileMascotName")) $("profileMascotName").textContent = state.mascotName;
  if ($("homeThinkingName")) $("homeThinkingName").textContent = state.mascotName;
  syncProfileTheme();
}

function bindMascotName() {
  $("saveMascotNameBtn")?.addEventListener("click", () => {
    const value = $("mascotNameInput").value.trim() || "Mint";
    state.mascotName = value.slice(0, 24);
    localStorage.setItem(STORE.mascot, state.mascotName);
    renderMascotName();
    toast(`${state.mascotName} is ready to study.`);
  });
}

function renderMascotName() {
  if ($("mascotNameHome")) $("mascotNameHome").textContent = state.mascotName;
  if ($("procMascotName")) $("procMascotName").textContent = state.mascotName;
  if ($("mascotNameInput")) $("mascotNameInput").value = state.mascotName;
  if ($("profileMascotName")) $("profileMascotName").textContent = state.mascotName;
  if ($("homeThinkingName")) $("homeThinkingName").textContent = state.mascotName;
}

function bindSearch() {
  $("libSearch")?.addEventListener("input", (event) => renderLibrary(event.target.value));
  $("globalSearch")?.addEventListener("input", (event) => renderLibrary(event.target.value));
}

function bindMascotFallbacks() {
  $$("img.mascot-img").forEach((img) => {
    img.addEventListener("error", () => img.classList.add("is-missing"), { once: true });
  });
}

function downloadSummary() {
  const pack = state.currentPack;
  if (!pack) return;
  const text = [
    pack.title,
    `Generated ${pack.date}`,
    "",
    "Overview",
    pack.summary.overview,
    "",
    "Key Takeaways",
    ...pack.takeaways.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Topics",
    pack.topics.join(", "),
    "",
    "Important Points",
    ...pack.summary.important.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Conclusion",
    pack.summary.conclusion,
    "",
    "Source Text",
    pack.sourceText
  ].join("\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${pack.title.replace(/[^\w-]+/g, "-").toLowerCase()}-summary.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(content, filename, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function safeFilename(title, suffix) {
  return `${(title || "notemint-study-pack").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}-${suffix}`;
}

function downloadMcqs() {
  const pack = state.currentPack;
  if (!pack) return toast("Generate a study pack first.");
  const text = [pack.title, "", "MCQs", ...pack.mcqs.map((q, i) => `${i + 1}. ${q.question}\nA) ${q.options[0]}\nB) ${q.options[1]}\nC) ${q.options[2]}\nD) ${q.options[3]}\nAnswer: ${q.answer}\nExplanation: ${q.explanation}\n`)].join("\n");
  downloadBlob(text, safeFilename(pack.title, "mcqs.txt"));
  toast("MCQs downloaded.");
}

function downloadShortQuestions() {
  const pack = state.currentPack;
  if (!pack) return toast("Generate a study pack first.");
  const text = [pack.title, "", "Short Questions", ...pack.shortQuestions.map((q, i) => `${i + 1}. ${q.question}\nModel Answer: ${q.answer}\n`)].join("\n");
  downloadBlob(text, safeFilename(pack.title, "short-questions.txt"));
  toast("Short questions downloaded.");
}

function downloadFlashcards() {
  const pack = state.currentPack;
  if (!pack) return toast("Generate a study pack first.");
  const rows = ["Front,Back", ...pack.flashcards.map(card => `"${String(card.front).replace(/"/g, '""')}","${String(card.back).replace(/"/g, '""')}"`)];
  downloadBlob(rows.join("\n"), safeFilename(pack.title, "flashcards.csv"), "text/csv;charset=utf-8");
  toast("Flashcards downloaded as CSV.");
}

function downloadMindmapSvg() {
  const pack = state.currentPack;
  const svg = $("mindmapSvg");
  if (!pack || !svg) return toast("Generate a study pack first.");
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", "1400");
  clone.setAttribute("height", "800");
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `:root{--ink:${getComputedStyle(document.documentElement).getPropertyValue("--ink")};--muted:${getComputedStyle(document.documentElement).getPropertyValue("--muted")};--border:${getComputedStyle(document.documentElement).getPropertyValue("--border")};--surface:${getComputedStyle(document.documentElement).getPropertyValue("--surface")};--coral:${getComputedStyle(document.documentElement).getPropertyValue("--coral")};--coral-soft:${getComputedStyle(document.documentElement).getPropertyValue("--coral-soft")};} text{dominant-baseline:middle}`;
  clone.insertBefore(style, clone.firstChild);
  const source = new XMLSerializer().serializeToString(clone);
  downloadBlob(source, safeFilename(pack.title, "mind-map.svg"), "image/svg+xml;charset=utf-8");
  toast("Mind map downloaded as SVG.");
}

function buildStudyPackHtml(pack) {
  const esc = (value) => escapeHtml(String(value ?? ""));
  const mapSvg = $("mindmapSvg")?.outerHTML || "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(pack.title)} — NoteMint Study Pack</title><style>body{font-family:Arial,sans-serif;max-width:980px;margin:40px auto;padding:0 24px;color:#1d2030;line-height:1.6}h1{color:#ff5f68}h2{margin-top:34px;border-bottom:1px solid #ddd;padding-bottom:8px}li{margin:10px 0}.card{background:#f8f6f4;border-radius:16px;padding:18px;margin:12px 0}.question{font-weight:700}.answer{color:#555}.mindmap{overflow:auto;border:1px solid #ddd;border-radius:16px;padding:10px}</style></head><body><h1>${esc(pack.title)}</h1><p>Generated by NoteMint · ${esc(pack.date)}</p><h2>Summary</h2><div class="card"><p>${esc(pack.summary.overview)}</p></div><h2>Key Takeaways</h2><ol>${pack.takeaways.map(x=>`<li>${esc(x)}</li>`).join("")}</ol><h2>Topics Covered</h2><p>${pack.topics.map(esc).join(" · ")}</p><h2>MCQs</h2>${pack.mcqs.map((q,i)=>`<div class="card"><div class="question">${i+1}. ${esc(q.question)}</div><p>A) ${esc(q.options[0])}<br>B) ${esc(q.options[1])}<br>C) ${esc(q.options[2])}<br>D) ${esc(q.options[3])}</p><p class="answer"><b>Answer:</b> ${esc(q.answer)}<br>${esc(q.explanation)}</p></div>`).join("")}<h2>Short Questions</h2>${pack.shortQuestions.map((q,i)=>`<div class="card"><div class="question">${i+1}. ${esc(q.question)}</div><p class="answer"><b>Model answer:</b> ${esc(q.answer)}</p></div>`).join("")}<h2>Flashcards</h2>${pack.flashcards.map((c,i)=>`<div class="card"><b>${i+1}. ${esc(c.front)}</b><p class="answer">${esc(c.back)}</p></div>`).join("")}<h2>Mind Map</h2><div class="mindmap">${mapSvg}</div></body></html>`;
}

function downloadAllStudyPack() {
  const pack = state.currentPack;
  if (!pack) return toast("Generate a study pack first.");
  downloadBlob(buildStudyPackHtml(pack), safeFilename(pack.title, "study-pack.html"), "text/html;charset=utf-8");
  toast("Complete study pack downloaded.");
}

function toggleMindmapFullscreen() {
  const wrap = document.querySelector(".mindmap-canvas-wrap");
  if (!wrap) return;
  if (document.fullscreenElement) document.exitFullscreen?.();
  else wrap.requestFullscreen?.();
}

function toast(message) {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2400);
}

function titleCase(word) {
  return word.replace(/\b\w/g, (char) => char.toUpperCase());
}

function truncate(text, length) {
  return text.length > length ? text.slice(0, length - 1) + "…" : text;
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function unique(value, index, array) {
  return array.indexOf(value) === index;
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "ST";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
 
 
