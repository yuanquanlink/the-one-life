import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("mobile shell exposes five primary actions and a compact composer", () => {
  assert.match(page, /className="mobile-tabbar"/);
  assert.match(page, /aria-label="手机快捷导航"/);
  assert.match(page, /className="mobile-add-toggle/);
  assert.match(page, /composerOpen/);
});

test("mobile controls remain touchable and clear of the safe area", () => {
  assert.match(css, /\.mobile-tabbar\{position:fixed;display:grid/);
  assert.match(css, /height:calc\(68px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /button,.pixel-button,.text-button,.row-actions button\{min-height:44px\}/);
  assert.match(css, /input,select,textarea\{font-size:16px!important\}/);
});

test("mobile overlays use bottom-sheet layouts", () => {
  assert.match(css, /\.edit-modal\{left:0;right:0;top:auto;bottom:0/);
  assert.match(css, /\.install-guide-backdrop\{place-items:end center/);
  assert.match(css, /\.agent-panel\{inset:auto 8px calc\(76px \+ env\(safe-area-inset-bottom\)\)/);
});

test("command deck adds local-first planning, focus and weekly signals", () => {
  assert.match(page, /今日航线/);
  assert.match(page, /快速收集箱/);
  assert.match(page, /DEEP WORK CABIN/);
  assert.match(page, /习惯强度/);
  assert.match(page, /本月预算信封/);
  assert.match(page, /七天节奏/);
  assert.match(page, /normalizeState/);
});

test("new command surfaces stay responsive on phones", () => {
  assert.match(css, /\.command-grid,.command-side,.focus-grid,.insights-stack,.insight-grid\{gap:11px\}/);
  assert.match(css, /\.focus-actions\{display:grid;grid-template-columns:1fr 1fr;width:100%\}/);
  assert.match(css, /\.signal-grid\{grid-template-columns:1fr 1fr;gap:8px\}/);
});
