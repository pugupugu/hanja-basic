// src/ 의 html·css·js 를 한 파일(index.html)로 합친다. 파일 미리보기·아티팩트·GitHub Pages 어디서든 깨지지 않게 하기 위함.
import { readFileSync, writeFileSync } from "node:fs";
const r = (p) => readFileSync(new URL("../src/" + p, import.meta.url), "utf8");
let html = r("index.template.html");
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/, (_, p) => `<style>\n${r(p)}</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, p) => `<script>\n${r(p)}</script>`);
writeFileSync(new URL("../index.html", import.meta.url), html);
console.log("index.html 생성:", (html.length / 1024).toFixed(0) + "KB");
