// จำลองมือถือผ่าน CDP: ล็อกอิน → ไล่ทดสอบปุ่มทุกหน้า
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const envContent = readFileSync(join(process.cwd(), ".env"), "utf8");
const pwdMatch = envContent.match(/^ADMIN_PASSWORD="?([^"\r\n]+)"?/m);
const PASSWORD = pwdMatch ? pwdMatch[1] : "pawn1234";

const port = 9223;
const userData = mkdtempSync(join(tmpdir(), "mobile-test-"));
const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userData}`,
  "--window-size=390,844",
  "about:blank",
]);
await new Promise((r) => setTimeout(r, 2500));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWs() {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`http://localhost:${port}/json`);
    const targets = await res.json();
    const page = targets.find((t) => t.type === "page");
    if (page) return page.webSocketDebuggerUrl;
    await sleep(500);
  }
  throw new Error("no page target");
}

const ws = new WebSocket(await getWs());
await new Promise((r) => (ws.onopen = r));
let msgId = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};
function send(method, params = {}) {
  return new Promise((resolve) => {
    const id = ++msgId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evalJs(expr) {
  const res = await send("Runtime.evaluate", {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  });
  return res.result?.result?.value;
}
async function tap(x, y) {
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await sleep(600);
}
// ตรวจว่า ณ จุด (x,y) มี element ไหนอยู่บนสุดซ้อนทับอยู่
async function topAt(x, y) {
  return evalJs(`(() => {
    const el = document.elementFromPoint(${x}, ${y});
    if (!el) return 'none';
    const r = el.getBoundingClientRect();
    return el.tagName + '.' + (el.className && typeof el.className === 'string' ? el.className.split(' ').slice(0,3).join('.') : '') + ' z=' + getComputedStyle(el).zIndex + ' pe=' + getComputedStyle(el).pointerEvents;
  })()`);
}

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await send("Page.enable");
await evalJs(`window.__testErrors = []; window.addEventListener('error', (e) => window.__testErrors.push(e.message)); true;`);

await send("Page.navigate", { url: "http://192.168.1.114:3000/login" });
await sleep(3500);
await evalJs(`
  (() => {
    const input = document.querySelector('input[name="password"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(PASSWORD)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('form').requestSubmit();
    return true;
  })()
`);
await sleep(3500);

const pages = ["/", "/pos", "/pawns", "/products", "/customers", "/reports"];
for (const path of pages) {
  await send("Page.navigate", { url: `http://192.168.1.114:3000${path}` });
  await sleep(3000);
  const info = await evalJs(`(() => {
    const btns = [...document.querySelectorAll('button, a[href]')].filter(b => b.offsetParent);
    const hamburger = document.querySelector('button[aria-label*="เมนู"]');
    let burgerRect = null;
    if (hamburger) burgerRect = hamburger.getBoundingClientRect().toJSON();
    return { path: location.pathname, btnCount: btns.length, burger: burgerRect, firstBtns: btns.slice(0, 8).map(b => ({ tag: b.tagName, text: (b.textContent||'').trim().slice(0,25), disabled: b.disabled })) };
  })()`);
  console.log("\n=== " + path + " ===");
  console.log("buttons:", info.btnCount, "| burger:", JSON.stringify(info.burger));
  console.log(JSON.stringify(info.firstBtns, null, 1));
  if (info.burger) {
    const x = info.burger.x + info.burger.width / 2;
    const y = info.burger.y + info.burger.height / 2;
    console.log("top element at burger:", await topAt(x, y));
    await tap(x, y);
    const opened = await evalJs(`[...document.querySelectorAll('nav')].some(n => n.offsetParent && n.querySelectorAll('ul a').length >= 6)`);
    console.log("burger toggle worked:", opened);
    // ปิดเมนู
    await tap(x, y);
  }
  // ทดสอบปุ่มแรกที่เจอ
  if (info.firstBtns.length > 0) {
    const btn = info.firstBtns[0];
    if (btn.tag === "BUTTON" && !btn.disabled) {
      const r = await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.textContent||'').trim().startsWith(${JSON.stringify(btn.text.slice(0,10))})); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; })()`);
      if (r) {
        console.log("top element at first button:", await topAt(r.x, r.y));
        await tap(r.x, r.y);
        console.log("after tap first btn:", await evalJs(`location.pathname`));
      }
    }
  }
}

console.log("\njs errors:", JSON.stringify(await evalJs(`window.__testErrors`)));
ws.close();
chrome.kill();
process.exit(0);