"use strict";
/*
 * Market API: чат между пользователями и общие объявления.
 * Без внешних зависимостей. Реальное время через Server-Sent Events.
 * Переменные окружения:
 *   PORT        порт (Render задаёт сам)
 *   BOT_TOKEN   токен бота Telegram. Если задан, сервер принимает только
 *               пользователей с валидной подписью Telegram initData.
 *   DATA_FILE   путь к файлу данных (по умолчанию ./data.json)
 *   PUBLIC_DIR  папка сайта (по умолчанию ../public)
 * Сервер раздаёт и сайт (папка public), и API: адрес один, настраивать ничего не нужно.
 */
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const PORT = +process.env.PORT || 8787;
const BOT = process.env.BOT_TOKEN || "";
const FILE = process.env.DATA_FILE || path.join(__dirname, "data.json");
const PUB = path.resolve(process.env.PUBLIC_DIR || path.join(__dirname, "..", "public"));

let DB = { listings: {}, queue: {} };
try { DB = Object.assign(DB, JSON.parse(fs.readFileSync(FILE, "utf8"))); } catch (e) {}
let saveT = null;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => fs.writeFile(FILE, JSON.stringify(DB), () => {}), 400); };

const MIME = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".json": "application/json; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8" };
function serveStatic(req, res, pathname) {
  let p;
  try { p = decodeURIComponent(pathname); } catch (e) { res.writeHead(400); return res.end("bad request"); }
  if (p === "/landing") p = "/landing/";
  if (p.endsWith("/")) p += "index.html";
  const f = path.resolve(PUB, "." + p);
  if (f !== PUB && !f.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end("forbidden"); }
  fs.stat(f, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Not found"); }
    const ext = path.extname(f).toLowerCase();
    const nocache = ext === ".html" || path.basename(f) === "config.js";
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Content-Length": st.size, "Cache-Control": nocache ? "no-cache" : "public, max-age=3600", "X-Content-Type-Options": "nosniff" });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(f).pipe(res);
  });
}
const conns = new Map(); // uid -> Set<res>
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,X-Tg-Init",
  "Access-Control-Max-Age": "86400"
};
const reply = (res, code, obj) => { res.writeHead(code, Object.assign({ "Content-Type": "application/json; charset=utf-8" }, CORS)); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise((ok, no) => {
  let n = 0; const b = [];
  req.on("data", c => { n += c.length; if (n > 3e6) { no(new Error("too big")); req.destroy(); return; } b.push(c); });
  req.on("end", () => { try { ok(JSON.parse(Buffer.concat(b).toString() || "{}")); } catch (e) { no(e); } });
  req.on("error", no);
});

// Проверка подписи Telegram Mini App initData
function tgUser(init) {
  if (!init || !BOT) return null;
  const p = new URLSearchParams(init), hash = p.get("hash");
  if (!hash) return null;
  p.delete("hash");
  const data = [...p.entries()].map(([k, v]) => k + "=" + v).sort().join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(BOT).digest();
  const h = crypto.createHmac("sha256", secret).update(data).digest("hex");
  const a = Buffer.from(h), b = Buffer.from(hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const ad = +p.get("auth_date");
  if (!ad || Date.now() / 1000 - ad > 7 * 86400) return null;
  try { const u = JSON.parse(p.get("user") || "{}"); return u.id ? { uid: "tg" + u.id, name: String(u.username || u.first_name || "user" + u.id).slice(0, 24) } : null; } catch (e) { return null; }
}
function auth(req, url, claim) {
  if (BOT) return tgUser(req.headers["x-tg-init"] || url.searchParams.get("init") || "");
  const uid = String(claim.uid || "").slice(0, 40), name = String(claim.name || "").slice(0, 24);
  return uid && name ? { uid, name } : null;
}

const push = (uid, ev, data) => {
  const s = conns.get(uid); if (!s || !s.size) return false;
  for (const r of s) r.write("event: " + ev + "\ndata: " + JSON.stringify(data) + "\n\n");
  return true;
};
const online = uid => !!(conns.get(uid) && conns.get(uid).size);

const hits = new Map();
const limited = ip => { const t = Date.now(), a = (hits.get(ip) || []).filter(x => t - x < 60000); a.push(t); hits.set(ip, a); return a.length > 240; };
setInterval(() => { const t = Date.now(); for (const [k, v] of hits) if (!v.some(x => t - x < 60000)) hits.delete(k); }, 60000).unref();

const bit = v => (v ? 1 : 0), num = (v, max) => Math.max(0, Math.min(max, +v || 0));
const cleanDeal = d => ({
  id: String(d.id || "").slice(0, 60), rev: num(d.rev, 1e6), role: d.role === "s" ? "s" : "b",
  title: String(d.title || "").slice(0, 60), price: num(d.price, 1e7), lp: num(d.lp, 1e7), pp: num(d.pp, 1e7),
  pby: d.pby === "s" ? "s" : d.pby === "b" ? "b" : "", s: Math.floor(num(d.s, 6)), t: num(d.t, 4e12), paid: num(d.paid, 1e7),
  bd: (Array.isArray(d.bd) ? d.bd : []).slice(0, 8).map(x => ({ n: String(x && x.n || "").slice(0, 20), on: bit(x && x.on) })),
  unl: bit(d.unl), cs: bit(d.cs), em: String(d.em || "").slice(0, 80), ph: String(d.ph || "").slice(0, 24),
  ck: [0, 1, 2].map(i => bit(Array.isArray(d.ck) && d.ck[i])), dis: bit(d.dis), cx: bit(d.cx), out: num(d.out, 1e7), fee: num(d.fee, 100)
});
const cleanItem = i => ({
  id: +i.id || Date.now(), r: String(i.r || "").slice(0, 20),
  l: Math.max(1, Math.min(100, +i.l || 1)), s: Math.max(0, Math.min(999, +i.s || 0)),
  p: Math.max(0, Math.min(1e6, +i.p || 0)), d: String(i.d || "").slice(0, 140),
  ph: (Array.isArray(i.ph) ? i.ph : []).filter(x => typeof x === "string" && x.startsWith("data:image/") && x.length < 450000).slice(0, 4),
  old: +i.old || 0, ts: +i.ts || Date.now()
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  if (url.pathname === "/health") return reply(res, 200, { ok: true, online: conns.size });
  if (limited(ip)) return reply(res, 429, { error: "slow down" });
  try {
    if (req.method === "GET" && url.pathname === "/api/stream") {
      const u = auth(req, url, { uid: url.searchParams.get("uid"), name: url.searchParams.get("name") });
      if (!u) return reply(res, 401, { error: "auth" });
      res.writeHead(200, Object.assign({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no" }, CORS));
      res.write("retry: 3000\n\nevent: hello\ndata: " + JSON.stringify({ uid: u.uid }) + "\n\n");
      if (!conns.has(u.uid)) conns.set(u.uid, new Set());
      conns.get(u.uid).add(res);
      (DB.queue[u.uid] || []).forEach(m => res.write("event: " + (m.k === "d" ? "deal" : "m") + "\ndata: " + JSON.stringify(m) + "\n\n"));
      const ka = setInterval(() => res.write(":ka\n\n"), 20000);
      req.on("close", () => { clearInterval(ka); const s = conns.get(u.uid); if (s) { s.delete(res); if (!s.size) conns.delete(u.uid); } });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/presence") return reply(res, 200, { on: online(String(url.searchParams.get("uid") || "")) });
    if (req.method === "GET" && url.pathname === "/api/listings") {
      const out = [];
      for (const [uid, v] of Object.entries(DB.listings)) for (const it of v.items) out.push(Object.assign({ uid, name: v.name }, it));
      out.sort((a, b) => b.ts - a.ts);
      return reply(res, 200, { items: out.slice(0, 300) });
    }
    if (req.method === "POST" || req.method === "PUT") {
      const body = await readBody(req), u = auth(req, url, body);
      if (!u) return reply(res, 401, { error: "auth" });
      if (req.method === "PUT" && url.pathname === "/api/listings/mine") {
        const items = (Array.isArray(body.items) ? body.items : []).slice(0, 30).map(cleanItem);
        if (items.length) DB.listings[u.uid] = { name: u.name, items, ts: Date.now() }; else delete DB.listings[u.uid];
        save(); return reply(res, 200, { ok: true, n: items.length });
      }
      if (req.method === "POST" && url.pathname === "/api/send") {
        const to = String(body.to || "").slice(0, 40), text = String(body.text || "").slice(0, 2000);
        if (!to || !text.trim() || to === u.uid) return reply(res, 400, { error: "bad message" });
        const msg = { id: String(body.id || crypto.randomUUID()).slice(0, 40), from: u.uid, fname: u.name, text, ts: Date.now(),
          ctx: body.ctx && typeof body.ctx === "object" ? { id: body.ctx.id, title: String(body.ctx.title || "").slice(0, 60), price: +body.ctx.price || 0 } : null,
          rp: body.rp ? String(body.rp).slice(0, 80) : null };
        const q = DB.queue[to] || (DB.queue[to] = []);
        q.push(msg); if (q.length > 500) q.shift(); save();
        return reply(res, 200, { ok: true, delivered: push(to, "m", msg) });
      }
      if (req.method === "POST" && url.pathname === "/api/deal") {
        const to = String(body.to || "").slice(0, 40);
        if (!to || to === u.uid || !body.deal || typeof body.deal !== "object") return reply(res, 400, { error: "bad deal" });
        const deal = cleanDeal(body.deal);
        if (!deal.id) return reply(res, 400, { error: "bad deal" });
        const msg = { id: "d" + deal.id + ":" + deal.rev, k: "d", from: u.uid, fname: u.name, deal, ts: Date.now() };
        // в очереди держим только последнюю версию каждой сделки
        DB.queue[to] = (DB.queue[to] || []).filter(m => !(m.k === "d" && m.deal && m.deal.id === deal.id));
        DB.queue[to].push(msg); save();
        return reply(res, 200, { ok: true, delivered: push(to, "deal", msg) });
      }
      if (req.method === "POST" && url.pathname === "/api/ack") {
        const ids = new Set((Array.isArray(body.ids) ? body.ids : []).map(String));
        if (DB.queue[u.uid]) { DB.queue[u.uid] = DB.queue[u.uid].filter(m => !ids.has(m.id)); if (!DB.queue[u.uid].length) delete DB.queue[u.uid]; save(); }
        return reply(res, 200, { ok: true });
      }
      if (req.method === "POST" && url.pathname === "/api/typing") {
        push(String(body.to || ""), "ty", { from: u.uid });
        return reply(res, 200, { ok: true });
      }
    }
    if ((req.method === "GET" || req.method === "HEAD") && !url.pathname.startsWith("/api/")) return serveStatic(req, res, url.pathname);
    reply(res, 404, { error: "not found" });
  } catch (e) { reply(res, 400, { error: "bad request" }); }
});
server.listen(PORT, () => console.log("Market API on :" + PORT + (BOT ? " (Telegram auth ON)" : " (demo auth)")));
