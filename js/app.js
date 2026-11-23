/* 한자 놀이터 - 앱 로직 (순수 정적, 서버 없음. 기록은 이 브라우저의 localStorage에만 저장) */
"use strict";

/* ---------- 데이터 준비 ---------- */
const CHARS = [];
const CHAR_MAP = {};
for (const lv of Object.keys(RAW_CHARS)) {
  RAW_CHARS[lv].trim().split("\n").forEach((line) => {
    const [h, k, s] = line.trim().split(/\s+/);
    const c = { h, k, s, level: Number(lv), id: h };
    CHARS.push(c);
    CHAR_MAP[h] = c;
  });
}
const WORDS = RAW_WORDS.trim().split("\n").map((line) => {
  const [h, r, m] = line.split("|");
  const level = Math.max(...[...h].map((ch) => (CHAR_MAP[ch] ? CHAR_MAP[ch].level : 0)));
  return { h, r, m, level, id: "w:" + h };
}).filter((w) => w.level > 0);
const IDIOMS = RAW_IDIOMS.trim().split("\n").map((line) => {
  const [h, r, m] = line.split("|");
  return { h, r, m, id: "i:" + h };
});
const charLabel = (c) => `${c.k} ${c.s}`;
const LEVEL_NAME = (n) => (LEVELS.find((l) => l.id === n) || {}).name;

/* ---------- 저장소 ---------- */
const KEY = "hanja-basic-v1";
let S = { known: {}, wrong: {}, stats: {}, points: 0, days: [], best: {} };
try { S = Object.assign(S, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { /* 저장 불가 환경은 무시 */ }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 무시 */ } }
function today() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function touchDay() { if (!S.days.includes(today())) { S.days.push(today()); save(); } }
function streak() {
  let n = 0; const d = new Date();
  for (;;) {
    const k = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    if (S.days.includes(k)) { n++; d.setDate(d.getDate() - 1); } else if (n === 0) { d.setDate(d.getDate() - 1); if (!S.days.includes(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`)) break; } else break;
  }
  return n;
}
const TITLES = [[0, "한자 새싹", "🌱"], [100, "한자 꿈나무", "🌿"], [300, "한자 탐험가", "🧭"], [600, "한자 달인", "🥋"], [1000, "한자 박사", "🎓"]];
function title() { let t = TITLES[0]; TITLES.forEach((x) => { if (S.points >= x[0]) t = x; }); return t; }
function addPoints(n) { S.points += n; save(); }

/* ---------- 유틸 ---------- */
const $ = (s, r = document) => r.querySelector(s);
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function speak(t) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = "ko-KR"; u.rate = 0.85; speechSynthesis.speak(u); } catch (e) { /* 지원 안 함 */ } }
function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 1800); }
function confetti() {
  const em = ["🎉", "⭐", "✨", "🌟", "🎊"];
  for (let i = 0; i < 28; i++) {
    const s = document.createElement("span"); s.className = "confetti"; s.textContent = em[i % em.length];
    s.style.left = Math.random() * 100 + "vw"; s.style.animationDelay = Math.random() * 0.6 + "s"; s.style.fontSize = 18 + Math.random() * 18 + "px";
    document.body.appendChild(s); setTimeout(() => s.remove(), 3200);
  }
}
const knownCount = (lv) => CHARS.filter((c) => (!lv || c.level === lv) && S.known[c.id]).length;
const totalCount = (lv) => CHARS.filter((c) => !lv || c.level === lv).length;
function ring(pct, size = 120, label = "") {
  const r = size / 2 - 10, c = 2 * Math.PI * r;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" transform="rotate(-90 ${size / 2} ${size / 2})"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" class="ring-t">${label}</text></svg>`;
}
const wordsOf = (ch) => WORDS.filter((w) => w.h.includes(ch));

/* ---------- 라우터 ---------- */
const app = $("#app");
let route = "home", arg = null;
function go(r) { location.hash = "#/" + r; }
function parseHash() { const p = location.hash.replace(/^#\//, "").split("/"); route = p[0] || "home"; arg = p[1] || null; }
function render() {
  parseHash(); touchDay(); closeModal();
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === route || (route === "cards" && a.dataset.nav === "learn") || (route === "play" && a.dataset.nav === "quiz")));
  const v = { home: viewHome, learn: viewLearn, cards: viewCards, words: viewWords, idioms: viewIdioms, quiz: viewQuizMenu, play: viewPlay, match: viewMatch, me: viewMe }[route] || viewHome;
  app.innerHTML = v();
  window.scrollTo(0, 0);
  if (route === "match") matchInit();
}
window.addEventListener("hashchange", render);

/* ---------- 홈 ---------- */
function viewHome() {
  const k = knownCount(), t = totalCount();
  const day = Math.floor(Date.now() / 86400000);
  const dc = CHARS[(day * 7) % CHARS.length];
  const ti = title();
  return `
  <section class="hero card">
    <div class="hero-l">
      <p class="eyebrow">${ti[2]} ${ti[1]} · ${S.points}점 · 🔥 ${streak()}일 연속</p>
      <h1>오늘도 한자 한 글자,<br>재미있게 시작해요!</h1>
      <div class="row"><button class="btn primary" data-act="go" data-to="quiz/auto">⚡ 오늘의 퀴즈</button><button class="btn" data-act="go" data-to="cards/${nextLevel()}">🃏 카드로 배우기</button></div>
    </div>
    <div class="hero-r">${ring(t ? k / t : 0, 130, `${k}/${t}`)}<small>외운 한자</small></div>
  </section>
  <section class="grid2">
    <div class="card daily" data-act="open" data-ch="${dc.h}">
      <p class="eyebrow">오늘의 한자</p>
      <div class="big-h">${dc.h}</div>
      <p class="kor">${charLabel(dc)}</p>
      <p class="tiny">눌러서 자세히 보기</p>
    </div>
    <div class="card">
      <p class="eyebrow">바로 놀기</p>
      <div class="stack">
        <button class="btn wide" data-act="go" data-to="match">🧩 짝 맞추기 게임</button>
        <button class="btn wide" data-act="go" data-to="words">📖 한자 단어 읽기</button>
        <button class="btn wide" data-act="go" data-to="idioms">🏮 사자성어 배우기</button>
      </div>
    </div>
  </section>
  <h2 class="sec">단계별 학습</h2>
  <section class="grid3">
    ${LEVELS.map((l) => { const kk = knownCount(l.id), tt = totalCount(l.id); return `
    <button class="card lvl" data-act="go" data-to="learn/${l.id}">
      <span class="lvl-e">${l.emoji}</span><b>${l.name}</b><span class="tiny">${l.sub}</span>
      <div class="bar"><i style="width:${(kk / tt) * 100}%"></i></div><span class="tiny">${kk} / ${tt}자</span>
    </button>`; }).join("")}
  </section>
  <p class="notice">🔒 고객 정보·개인정보·비밀번호는 입력하지 마세요. 학습 기록은 이 브라우저에만 저장돼요.</p>`;
}
function nextLevel() { for (const l of LEVELS) if (knownCount(l.id) < totalCount(l.id)) return l.id; return 1; }

/* ---------- 한자 배우기 ---------- */
function chips(cur, base, withAll = true) {
  return `<div class="chips">${withAll ? `<button class="chip ${cur === "all" ? "on" : ""}" data-act="go" data-to="${base}/all">전체</button>` : ""}${LEVELS.map((l) => `<button class="chip ${String(cur) === String(l.id) ? "on" : ""}" data-act="go" data-to="${base}/${l.id}">${l.emoji} ${l.name}</button>`).join("")}</div>`;
}
function viewLearn() {
  const cur = arg || "all";
  const list = CHARS.filter((c) => cur === "all" || c.level === Number(cur));
  return `
  <div class="head"><h1>한자 배우기</h1><p>글자를 눌러 훈과 음, 그 한자가 들어간 단어를 확인해요. 외웠으면 ✓ 표시!</p></div>
  ${chips(cur, "learn")}
  <div class="row between"><span class="tiny">${list.filter((c) => S.known[c.id]).length} / ${list.length}자 외움</span>${cur !== "all" ? `<button class="btn small primary" data-act="go" data-to="cards/${cur}">🃏 이 단계 카드 학습</button>` : ""}</div>
  <div class="tiles">${list.map((c) => `<button class="tile ${S.known[c.id] ? "known" : ""}" data-act="open" data-ch="${c.h}"><span class="th">${c.h}</span><span class="tk">${c.k}</span><span class="ts">${c.s}</span></button>`).join("")}</div>`;
}
let modalList = [], modalIdx = 0;
function openModal(ch) {
  const scope = $(".tiles") ? [...document.querySelectorAll(".tile")].map((t) => t.querySelector(".th").textContent) : [ch];
  modalList = scope.length ? scope : [ch]; modalIdx = Math.max(0, modalList.indexOf(ch));
  drawModal();
}
function drawModal() {
  const c = CHAR_MAP[modalList[modalIdx]]; const ws = wordsOf(c.h);
  let m = $("#modal"); if (!m) { m = document.createElement("div"); m.id = "modal"; document.body.appendChild(m); }
  m.innerHTML = `<div class="scrim" data-act="close"></div><div class="sheet card">
    <button class="x" data-act="close" aria-label="닫기">✕</button>
    <p class="eyebrow">${LEVEL_NAME(c.level)} · ${modalIdx + 1}/${modalList.length}</p>
    <div class="big-h">${c.h}</div>
    <p class="kor">${charLabel(c)}</p>
    <div class="row center"><button class="btn small" data-act="say" data-t="${c.k} ${c.s.replace(/\(.*\)/, "")}">🔊 듣기</button>
    <button class="btn small ${S.known[c.id] ? "ok" : "primary"}" data-act="know" data-ch="${c.h}">${S.known[c.id] ? "✓ 외웠어요" : "외웠어요!"}</button></div>
    <h3>이 한자가 들어간 단어</h3>
    <div class="wlist">${ws.length ? ws.slice(0, 8).map((w) => `<div class="w"><b>${w.h}</b><span>${w.r}</span><em>${w.m}</em></div>`).join("") : '<p class="tiny">아직 등록된 단어가 없어요.</p>'}</div>
    <div class="row between"><button class="btn small" data-act="mprev">◀ 이전</button><button class="btn small" data-act="mnext">다음 ▶</button></div>
  </div>`;
}
function closeModal() { const m = $("#modal"); if (m) m.remove(); }
function toggleKnow(ch) {
  if (S.known[ch]) delete S.known[ch]; else { S.known[ch] = true; addPoints(5); }
  save();
}

/* ---------- 카드 학습 ---------- */
let deck = null;
function viewCards() {
  const lv = Number(arg) || 1;
  if (!deck || deck.lv !== lv) {
    const list = CHARS.filter((c) => c.level === lv);
    const first = list.filter((c) => !S.known[c.id]);
    deck = { lv, queue: shuffle(first.length ? first : list), flipped: false, done: 0, total: first.length || list.length };
  }
  const c = deck.queue[0];
  if (!c) { const d = deck; deck = null; return `<div class="card center-box"><div class="big-e">🎉</div><h2>${LEVEL_NAME(d.lv)} 카드 학습 끝!</h2><p>${d.total}장을 모두 확인했어요.</p><div class="row center"><button class="btn primary" data-act="go" data-to="quiz/auto">퀴즈 풀러 가기</button><button class="btn" data-act="go" data-to="learn/${d.lv}">목록 보기</button></div></div>`; }
  const ws = wordsOf(c.h).slice(0, 3);
  return `
  <div class="head"><h1>카드 학습 <small>${LEVEL_NAME(lv)}</small></h1></div>
  ${chips(lv, "cards", false)}
  <div class="bar big"><i style="width:${(deck.done / deck.total) * 100}%"></i></div>
  <div class="flash ${deck.flipped ? "flip" : ""}" data-act="flip">
    <div class="face front"><div class="big-h xl">${c.h}</div><p class="tiny">눌러서 뒤집기</p></div>
    <div class="face back"><p class="kor xl">${charLabel(c)}</p>${ws.map((w) => `<div class="w"><b>${w.h}</b><span>${w.r}</span></div>`).join("")}</div>
  </div>
  <div class="row center">
    <button class="btn" data-act="again">🔁 다시 볼래요</button>
    <button class="btn" data-act="say" data-t="${c.k} ${c.s.replace(/\(.*\)/, "")}">🔊</button>
    <button class="btn primary" data-act="got">✓ 알았어요</button>
  </div>`;
}

/* ---------- 단어 · 사자성어 ---------- */
let hideMean = false;
function viewWords() {
  const cur = arg || "all";
  const list = WORDS.filter((w) => cur === "all" || w.level === Number(cur));
  return `
  <div class="head"><h1>한자 단어</h1><p>한자로 쓴 단어를 읽어 봐요. 가리기를 켜고 눌러서 정답을 확인해요. (${WORDS.length}개)</p></div>
  ${chips(cur, "words")}
  <label class="switch"><input type="checkbox" ${hideMean ? "checked" : ""} data-act="hide"> 독음·뜻 가리기</label>
  <div class="list">${list.map((w) => `<div class="item ${hideMean ? "hidden" : ""}" data-act="reveal"><div class="big-w">${w.h}</div><div class="info"><b>${w.r}</b><span>${w.m}</span></div><button class="icon" data-act="say" data-t="${w.r}" aria-label="듣기">🔊</button></div>`).join("")}</div>`;
}
function viewIdioms() {
  return `
  <div class="head"><h1>사자성어</h1><p>네 글자에 담긴 옛 지혜. 눌러서 뜻을 확인해요. (${IDIOMS.length}개)</p></div>
  <label class="switch"><input type="checkbox" ${hideMean ? "checked" : ""} data-act="hide"> 독음·뜻 가리기</label>
  <div class="list">${IDIOMS.map((w) => `<div class="item idiom ${hideMean ? "hidden" : ""}" data-act="reveal"><div class="big-w">${w.h}</div><div class="info"><b>${w.r}</b><span>${w.m}</span></div><button class="icon" data-act="say" data-t="${w.r}" aria-label="듣기">🔊</button></div>`).join("")}</div>`;
}

/* ---------- 퀴즈 ---------- */
const MODES = [
  { id: "hun", e: "🔤", name: "훈음 맞히기", d: "한자를 보고 훈과 음 고르기" },
  { id: "char", e: "🔍", name: "한자 찾기", d: "훈과 음을 보고 한자 고르기" },
  { id: "read", e: "📣", name: "단어 읽기", d: "한자 단어의 독음 고르기" },
  { id: "word", e: "🧠", name: "단어 뜻 찾기", d: "뜻을 보고 한자 단어 고르기" },
  { id: "idiom", e: "🏮", name: "사자성어", d: "뜻을 보고 사자성어 고르기" },
];
let QS = { mode: "hun", scope: "all" };
function viewQuizMenu() {
  if (arg === "auto") { QS.mode = "hun"; QS.scope = String(nextLevel()); startQuiz(); return ""; }
  return `
  <div class="head"><h1>퀴즈</h1><p>종류와 범위를 고르고 시작! 10문제를 풀면 별을 받아요.</p></div>
  <h2 class="sec">종류</h2>
  <div class="grid3">${MODES.map((m) => `<button class="card pick ${QS.mode === m.id ? "on" : ""}" data-act="mode" data-v="${m.id}"><span class="lvl-e">${m.e}</span><b>${m.name}</b><span class="tiny">${m.d}</span></button>`).join("")}</div>
  <h2 class="sec">범위</h2>
  <div class="chips"><button class="chip ${QS.scope === "all" ? "on" : ""}" data-act="scope" data-v="all">전체</button>${LEVELS.map((l) => `<button class="chip ${QS.scope === String(l.id) ? "on" : ""}" data-act="scope" data-v="${l.id}">${l.emoji} ${l.name}</button>`).join("")}<button class="chip ${QS.scope === "wrong" ? "on" : ""}" data-act="scope" data-v="wrong">📝 오답 노트 (${Object.keys(S.wrong).length})</button></div>
  <div class="row center sp"><button class="btn primary big" data-act="start">▶ 시작하기</button></div>
  <h2 class="sec">최고 기록</h2>
  <div class="tiny">${MODES.map((m) => `${m.e} ${m.name}: ${"★".repeat(S.best[m.id] || 0) || "-"}`).join(" &nbsp;·&nbsp; ")}</div>`;
}
let Q = null;
function poolFor(mode, scope) {
  const base = mode === "hun" || mode === "char" ? CHARS : mode === "idiom" ? IDIOMS : WORDS;
  let p = base;
  if (scope === "wrong") p = base.filter((x) => S.wrong[x.id]);
  else if (scope !== "all" && mode !== "idiom") p = base.filter((x) => x.level === Number(scope));
  return { base, pool: p };
}
const qKey = { hun: (x) => charLabel(x), char: (x) => x.h, read: (x) => x.r, word: (x) => x.h, idiom: (x) => x.h };
function startQuiz() {
  const { base, pool } = poolFor(QS.mode, QS.scope);
  if (pool.length < 1) { toast("이 범위에는 문제가 아직 없어요"); go("quiz"); return; }
  const items = shuffle(pool).slice(0, 10);
  Q = { mode: QS.mode, scope: QS.scope, i: 0, score: 0, answered: false, wrongs: [], base,
    list: items.map((it) => {
      const key = qKey[QS.mode];
      let opts = [it];
      for (const o of shuffle(base)) { if (opts.length >= 4) break; if (!opts.some((p) => key(p) === key(o))) opts.push(o); }
      return { it, opts: shuffle(opts) };
    }) };
  location.hash = "#/play";
  if (route === "play") render();
}
function viewPlay() {
  if (!Q) return viewQuizMenu();
  if (Q.i >= Q.list.length) return viewResult();
  const { it, opts } = Q.list[Q.i]; const m = Q.mode;
  let prompt = "", cls = "";
  if (m === "hun") prompt = `<div class="big-h">${it.h}</div><p class="ask">이 한자의 훈과 음은?</p>`;
  if (m === "char") { prompt = `<p class="kor xl">${charLabel(it)}</p><p class="ask">알맞은 한자를 고르세요</p>`; cls = "hanja-opt"; }
  if (m === "read") prompt = `<div class="big-w xl">${it.h}</div><p class="ask">알맞은 독음은?</p>`;
  if (m === "word") { prompt = `<p class="mean">${it.m}</p><p class="ask">이 뜻에 맞는 한자 단어는?</p>`; cls = "hanja-opt"; }
  if (m === "idiom") { prompt = `<p class="mean">${it.m}</p><p class="ask">이 뜻에 맞는 사자성어는?</p>`; cls = "hanja-opt idiom-opt"; }
  const label = (o) => (m === "hun" ? charLabel(o) : m === "char" ? o.h : m === "read" ? o.r : m === "word" ? o.h : `${o.h}<small>${o.r}</small>`);
  return `
  <div class="row between"><button class="btn small" data-act="go" data-to="quiz">✕ 그만하기</button><span class="tiny">${Q.i + 1} / ${Q.list.length} · ⭕ ${Q.score}</span></div>
  <div class="bar big"><i style="width:${(Q.i / Q.list.length) * 100}%"></i></div>
  <div class="card qcard">${prompt}</div>
  <div class="opts ${cls}">${opts.map((o, i) => `<button class="opt" data-act="ans" data-i="${i}">${label(o)}</button>`).join("")}</div>
  <div id="fb"></div>`;
}
function answer(i) {
  if (Q.answered) return; Q.answered = true;
  const { it, opts } = Q.list[Q.i]; const picked = opts[i]; const ok = picked.id === it.id;
  document.querySelectorAll(".opt").forEach((b, idx) => { b.disabled = true; if (opts[idx].id === it.id) b.classList.add("right"); else if (idx === i) b.classList.add("bad"); });
  const st = (S.stats[it.id] = S.stats[it.id] || { r: 0, w: 0 });
  if (ok) { Q.score++; st.r++; delete S.wrong[it.id]; addPoints(10); } else { st.w++; S.wrong[it.id] = true; Q.wrongs.push(it); }
  save();
  const ans = Q.mode === "hun" ? `${it.h} = ${charLabel(it)}` : Q.mode === "char" ? `${charLabel(it)} = ${it.h}` : `${it.h} (${it.r}) ${Q.mode === "read" ? "- " + it.m : ""}`;
  $("#fb").innerHTML = `<div class="fb ${ok ? "good" : "no"}"><b>${ok ? "🎉 정답이에요!" : "😅 아쉬워요"}</b><span>${ans}</span><button class="btn primary" data-act="next">${Q.i + 1 >= Q.list.length ? "결과 보기" : "다음 ▶"}</button></div>`;
  if (ok) setTimeout(() => { if (Q && Q.answered && Q.list[Q.i].it.id === it.id) nextQ(); }, 1100);
}
function nextQ() { if (!Q || !Q.answered) return; Q.i++; Q.answered = false; render(); }
function viewResult() {
  const pct = Q.score / Q.list.length; const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1;
  if (!Q.saved) { Q.saved = true; S.best[Q.mode] = Math.max(S.best[Q.mode] || 0, stars); addPoints(stars * 5); if (pct >= 0.8) setTimeout(confetti, 200); }
  const msg = pct >= 0.9 ? "완벽해요! 한자 박사!" : pct >= 0.6 ? "잘했어요! 조금만 더!" : "괜찮아요, 다시 하면 늘어요!";
  return `<div class="card center-box"><div class="stars">${"★".repeat(stars)}<span>${"★".repeat(3 - stars)}</span></div><h2>${Q.score} / ${Q.list.length} 정답</h2><p>${msg}</p>
  ${Q.wrongs.length ? `<div class="wrongs"><b>틀린 문제</b>${Q.wrongs.map((w) => `<div class="w"><b>${w.h}</b><span>${w.r || charLabel(w)}</span>${w.m ? `<em>${w.m}</em>` : ""}</div>`).join("")}</div>` : ""}
  <div class="row center"><button class="btn primary" data-act="start">🔁 한 번 더</button><button class="btn" data-act="go" data-to="quiz">다른 퀴즈</button><button class="btn" data-act="go" data-to="home">홈</button></div></div>`;
}

/* ---------- 짝 맞추기 ---------- */
let M = null;
function viewMatch() {
  return `
  <div class="head"><h1>짝 맞추기</h1><p>한자와 훈음을 짝지어 모두 없애 보세요!</p></div>
  <div class="chips">${["all", ...LEVELS.map((l) => String(l.id))].map((v) => `<button class="chip ${(M && M.scope) === v || (!M && v === "all") ? "on" : ""}" data-act="mscope" data-v="${v}">${v === "all" ? "전체" : LEVELS[v - 1].emoji + " " + LEVEL_NAME(Number(v))}</button>`).join("")}</div>
  <div class="row between"><span class="tiny" id="mi">시도 0번</span><button class="btn small" data-act="mnew">🔄 새로 시작</button></div>
  <div class="mgrid" id="mg"></div>`;
}
function matchInit(scope) {
  const sc = scope || (M && M.scope) || "all";
  const pool = CHARS.filter((c) => sc === "all" || c.level === Number(sc));
  const pick = shuffle(pool).slice(0, 6);
  const tiles = shuffle(pick.flatMap((c) => [{ id: c.id, t: "h", txt: c.h }, { id: c.id, t: "k", txt: charLabel(c) }]));
  M = { scope: sc, tiles, sel: null, tries: 0, left: 6, lock: false };
  $("#mg").innerHTML = tiles.map((t, i) => `<button class="mt ${t.t}" data-act="mt" data-i="${i}">${t.txt}</button>`).join("");
  document.querySelectorAll("[data-act=mscope]").forEach((b) => b.classList.toggle("on", b.dataset.v === sc));
  $("#mi").textContent = "시도 0번";
}
function matchTap(i) {
  if (!M || M.lock) return; const btn = $(`.mt[data-i="${i}"]`); if (btn.classList.contains("gone") || M.sel === i) return;
  if (M.sel === null) { M.sel = i; btn.classList.add("sel"); return; }
  const a = M.tiles[M.sel], b = M.tiles[i]; const ba = $(`.mt[data-i="${M.sel}"]`);
  M.tries++; $("#mi").textContent = `시도 ${M.tries}번`;
  if (a.id === b.id && a.t !== b.t) {
    ba.classList.replace("sel", "gone"); btn.classList.add("gone"); M.sel = null; M.left--;
    if (M.left === 0) { addPoints(30); confetti(); setTimeout(() => toast(`🎉 ${M.tries}번 만에 성공! +30점`), 300); }
  } else {
    btn.classList.add("shake"); ba.classList.add("shake"); M.lock = true;
    const s = M.sel; M.sel = null;
    setTimeout(() => { btn.classList.remove("shake"); ba.classList.remove("shake", "sel"); M.lock = false; void s; }, 600);
  }
}

/* ---------- 내 기록 ---------- */
function viewMe() {
  const ti = title(); const nxt = TITLES.find((x) => x[0] > S.points);
  const wr = CHARS.filter((c) => S.wrong[c.id]);
  return `
  <div class="head"><h1>내 기록</h1></div>
  <section class="grid2">
    <div class="card"><p class="eyebrow">나의 칭호</p><div class="big-e">${ti[2]}</div><h2>${ti[1]}</h2><p class="tiny">${S.points}점 ${nxt ? `· 다음 칭호까지 ${nxt[0] - S.points}점` : "· 최고 칭호예요!"}</p></div>
    <div class="card"><p class="eyebrow">학습 현황</p>${LEVELS.map((l) => `<div class="prow"><span>${l.emoji} ${l.name}</span><div class="bar"><i style="width:${(knownCount(l.id) / totalCount(l.id)) * 100}%"></i></div><span class="tiny">${knownCount(l.id)}/${totalCount(l.id)}</span></div>`).join("")}<p class="tiny">🔥 연속 학습 ${streak()}일 · 총 ${S.days.length}일</p></div>
  </section>
  <h2 class="sec">📝 오답 노트</h2>
  ${wr.length ? `<div class="tiles">${wr.map((c) => `<button class="tile" data-act="open" data-ch="${c.h}"><span class="th">${c.h}</span><span class="tk">${c.k}</span><span class="ts">${c.s}</span></button>`).join("")}</div><div class="row sp"><button class="btn primary" data-act="wrongquiz">오답만 다시 풀기</button></div>` : `<p class="tiny">틀린 한자가 아직 없어요. 퀴즈에 도전해 보세요!</p>`}
  <h2 class="sec">설정</h2>
  <button class="btn small danger" data-act="reset">기록 모두 지우기</button>`;
}

/* ---------- 이벤트 ---------- */
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]"); if (!el) return;
  const a = el.dataset.act;
  if (a === "go") go(el.dataset.to);
  else if (a === "open") openModal(el.dataset.ch);
  else if (a === "close") closeModal();
  else if (a === "mprev") { modalIdx = (modalIdx - 1 + modalList.length) % modalList.length; drawModal(); }
  else if (a === "mnext") { modalIdx = (modalIdx + 1) % modalList.length; drawModal(); }
  else if (a === "say") { e.stopPropagation(); speak(el.dataset.t); }
  else if (a === "know") { toggleKnow(el.dataset.ch); drawModal(); const t = document.querySelector(`.tile .th`); document.querySelectorAll(".tile").forEach((tl) => tl.classList.toggle("known", !!S.known[tl.querySelector(".th").textContent])); }
  else if (a === "flip") { deck.flipped = !deck.flipped; $(".flash").classList.toggle("flip", deck.flipped); }
  else if (a === "again") { deck.queue.push(deck.queue.shift()); deck.flipped = false; render(); }
  else if (a === "got") { const c = deck.queue.shift(); if (!S.known[c.id]) { S.known[c.id] = true; addPoints(5); save(); } deck.done++; deck.flipped = false; render(); }
  else if (a === "hide") { hideMean = el.checked; render(); }
  else if (a === "reveal") { if (e.target.closest("[data-act=say]")) return; el.classList.toggle("hidden"); }
  else if (a === "mode") { QS.mode = el.dataset.v; render(); }
  else if (a === "scope") { QS.scope = el.dataset.v; render(); }
  else if (a === "start") startQuiz();
  else if (a === "ans") answer(Number(el.dataset.i));
  else if (a === "next") nextQ();
  else if (a === "mscope") matchInit(el.dataset.v);
  else if (a === "mnew") matchInit();
  else if (a === "mt") matchTap(Number(el.dataset.i));
  else if (a === "wrongquiz") { QS.mode = "hun"; QS.scope = "wrong"; startQuiz(); }
  else if (a === "reset") { if (confirm("정말 모든 학습 기록을 지울까요?")) { S = { known: {}, wrong: {}, stats: {}, points: 0, days: [], best: {} }; save(); render(); toast("기록을 지웠어요"); } }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
if (!location.hash) location.hash = "#/home"; else render();
