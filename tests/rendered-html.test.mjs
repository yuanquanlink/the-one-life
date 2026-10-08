import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("https://the-one-life.example/", { headers: { accept: "text/html", host: "the-one-life.example", "x-forwarded-proto": "https" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders The One Life shell and product metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /The One Life/);
  assert.match(html, /像素生活工作台/);
  assert.match(html, /欢迎回来/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /https:\/\/the-one-life\.example\/og\.png/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|SkeletonPreview/);
});

test("ships installable PWA assets for Android, iPhone and HarmonyOS", async () => {
  const [manifestText, serviceWorker, page] = await Promise.all([
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));
  assert.match(serviceWorker, /caches\.open/);
  assert.match(page, /Android/);
  assert.match(page, /iPhone/);
  assert.match(page, /HarmonyOS/);
  assert.match(page, /localStorage/);
});
