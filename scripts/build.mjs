// src/ 의 html·css·js 를 한 파일(index.html)로 합친다. 파일 미리보기·아티팩트·GitHub Pages 어디서든 깨지지 않게 하기 위함.
// 스크립트를 실행하지 않는 미리보기에서도 한자 목록이 보이도록, 정적 안내 화면을 #app 안에 미리 넣는다(앱이 실행되면 교체됨).
import { readFileSync, writeFileSync } from "node:fs";
const r = (p) => readFileSync(new URL("../src/" + p, import.meta.url), "utf8");

const data = new Function(r("js/data.js") + "; return { LEVELS, RAW_CHARS, BASICS };")();
const tiles = (lv) => data.RAW_CHARS[lv].trim().split("\n").map((l) => {
  const [h, k, s] = l.trim().split(/\s+/);
  return `<span class="tile"><span class="th">${h}</span><span class="tk">${k}</span><span class="ts">${s}</span></span>`;
}).join("");
const fallback = `<div class="head"><h1>한자 놀이터</h1><p>초급 한자를 퀴즈와 게임으로 배워요. (기초 다지기 · 한자 ${Object.values(data.RAW_CHARS).reduce((n, t) => n + t.trim().split("\n").length, 0)}자 · 단어 · 사자성어 · 퀴즈 · 짝 맞추기)</p></div>
<div class="card"><b>🔄 앱을 불러오는 중이에요.</b><p class="tiny">계속 이 화면이면 스크립트를 실행하지 않는 미리보기일 수 있어요. 크롬·엣지 같은 브라우저로 이 파일을 열면 퀴즈와 게임이 동작해요.</p></div>
${data.LEVELS.map((l) => `<h2 class="sec">${l.emoji} ${l.name} <span class="tiny">${l.sub}</span></h2><div class="tiles">${tiles(l.id)}</div>`).join("\n")}`;

let html = r("index.template.html");
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/, (_, p) => `<style>\n${r(p)}</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, p) => `<script>\n${r(p)}</script>`);
html = html.replace('<main id="app" class="wrap"></main>', () => `<main id="app" class="wrap">${fallback}</main>`);
writeFileSync(new URL("../index.html", import.meta.url), html);
console.log("index.html 생성:", (html.length / 1024).toFixed(0) + "KB");
