import {
  TX, FACTS, INTERVENTIONS, HABITS, CYCLE, SAVE, ROOMS, DAYS, BODY, SDG,
  AZ, CAMPUS, RESOURCES, QUIZ_BANK, TAGLINE, HOME_NODES,
} from "./data.js";
import { ADMIN_HASHES, DEFAULT_MEMBERS, DEFAULT_NEWS } from "./content.js";

const $ = (s, r = document) => r.querySelector(s);
const state = {
  lang: localStorage.getItem("jal-shakti-lang") === "hi" ? "hi" : "en",
  view: localStorage.getItem("jal-shakti-view") === "2d" ? "2d" : "3d",
  route: "home",
  menu: false,
  letter: "A",
  query: "",
  cycle: "evaporation",
  room: "bath",
  on: {},
  day: 0,
  pin: "academic",
  quiz: null,
};

function t(obj) {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[state.lang] ?? obj.en ?? "";
}

const CONTENT_KEY = "jal-shakti-content-v1";
const DESK_KEY = "jal-shakti-desk";
const WALL_KEY = "jal-shakti-pledge-wall-v1";
let threeMod = null;
let paintBusy = false;

async function getThree() {
  if (!threeMod) threeMod = await import("./three-app.js");
  return threeMod;
}

function loadWall() {
  try {
    const list = JSON.parse(localStorage.getItem(WALL_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

function addToWall(name, habits) {
  const wall = loadWall();
  wall.unshift({
    name: String(name).trim().slice(0, 48),
    habits: habits || [],
    at: new Date().toISOString(),
  });
  localStorage.setItem(WALL_KEY, JSON.stringify(wall.slice(0, 240)));
}

function displayName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Friend";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

function applyChrome() {
  document.documentElement.lang = state.lang === "hi" ? "hi" : "en";
  document.documentElement.classList.toggle("lang-hi", state.lang === "hi");
  document.documentElement.classList.toggle("view-2d", state.view === "2d");
  document.documentElement.classList.toggle("view-3d", state.view === "3d");
  document.title = state.lang === "hi" ? "जल शक्ति बोर्ड · एनएलयूओ" : "Jal Shakti Board · NLUO";
  localStorage.setItem("jal-shakti-lang", state.lang);
  localStorage.setItem("jal-shakti-view", state.view);
}

function loadContent() {
  try {
    const raw = JSON.parse(localStorage.getItem(CONTENT_KEY) || "null");
    if (raw?.members && raw?.news) return raw;
  } catch { /* ignore */ }
  return {
    members: DEFAULT_MEMBERS.map((m) => ({ ...m })),
    news: DEFAULT_NEWS.map((n) => ({ ...n })),
  };
}

function saveContent(data) {
  localStorage.setItem(CONTENT_KEY, JSON.stringify(data));
}

function deskRole() {
  return sessionStorage.getItem(DESK_KEY) || "";
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function initials(name) {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function fileToPhoto(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = 240 / Math.max(img.width, img.height);
      const w = Math.round(img.width * Math.min(scale, 1));
      const h = Math.round(img.height * Math.min(scale, 1));
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.src = url;
  });
}

function hashRoute() {
  const h = (location.hash || "#/").replace(/^#\/?/, "").split("?")[0];
  return ["home", "learn", "cycle", "save", "life", "map", "sdg6", "quiz", "pledge", "about", "sources", "team", "news", "edit"].includes(h) ? h : "home";
}

function go(id) {
  location.hash = "#/" + (id === "home" ? "" : id);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dealQuiz() {
  return shuffle(QUIZ_BANK).slice(0, 12).map((q) => {
    const order = shuffle(q.options.map((_, i) => i));
    return {
      q: q.q,
      why: q.why,
      options: order.map((i) => q.options[i]),
      answer: order.indexOf(q.answer),
    };
  });
}

function hero(k, title, lede) {
  return `<header class="hero">
    <p class="kicker">${t(k)}</p>
    <h1>${title}</h1>
    <p class="lede">${t(lede)}</p>
  </header>`;
}

function sceneOr2d(id, twoD) {
  const hud = `<span class="glass glass-pill glass-hud">${state.view === "3d" ? t(TX.view3d) : t(TX.view2d)}</span>`;
  if (state.view === "3d") {
    return `<div class="glass glass-card scene-box">${hud}<div data-scene="${id}" style="position:absolute;inset:0"></div></div>`;
  }
  return `<div class="glass glass-card scene-box" style="display:grid;place-items:center;padding:1rem">${hud}${twoD}</div>`;
}

function renderNav() {
  const items = TX.nav.map((n) => {
    const active = state.route === n.id ? "active" : "";
    return `<a href="#/${n.id === "home" ? "" : n.id}" class="${active}">${t(n)}</a>`;
  }).join("");
  $("#nav-desk").innerHTML = items;
  $("#nav-mob").innerHTML = items;
  $("#nav-mob").classList.toggle("open", state.menu);
  $("[data-lang-en]").setAttribute("aria-pressed", String(state.lang === "en"));
  $("[data-lang-hi]").setAttribute("aria-pressed", String(state.lang === "hi"));
  $("[data-view-2d]").setAttribute("aria-pressed", String(state.view === "2d"));
  $("[data-view-3d]").setAttribute("aria-pressed", String(state.view === "3d"));
  $("#skip").textContent = t(TX.skip);
  $("#brand-name").textContent = t(TX.brand);
  $("#brand-sub").textContent = t(TX.uni);
}

function pageHome() {
  const dock = [
    ["learn", state.lang === "hi" ? "अ–ह कोश" : "A–Z atlas"],
    ["cycle", state.lang === "hi" ? "जल चक्र" : "Water cycle"],
    ["save", state.lang === "hi" ? "जल बचाएँ" : "Save water"],
    ["map", state.lang === "hi" ? "परिसर मानचित्र" : "Campus map"],
    ["team", state.lang === "hi" ? "समिति" : "Committee"],
    ["news", state.lang === "hi" ? "समाचार पत्र" : "Newsletters"],
  ].map(([id, lab]) => `<a class="glass glass-card pad tile" href="#/${id}">${lab}</a>`).join("");
  const wall = loadWall();
  const twoD = `<div class="blob"></div><p class="note">${t(TX.viewHint2d)}</p>
    <div class="pledge-wall" style="margin-top:.6rem">${HOME_NODES.map((n) => `<span class="chip">${t(n)}</span>`).join("")}</div>`;
  return `
    <section class="hero">
      <p class="kicker">${t(TX.homeKicker)}</p>
      <h1>${t(TX.brand)}</h1>
      <p class="lede" style="font-family:var(--font-display);font-size:1.35rem;color:var(--foam)">${TAGLINE}</p>
      <p class="lede">${t(TX.homeLead)}</p>
      <div class="row">
        <a class="btn" href="#/cycle">${t(TX.enterCycle)}</a>
        <a class="btn ghost glass glass-pill" href="#/quiz">${t(TX.takeQuiz)}</a>
        <a class="btn ghost glass glass-pill" href="#/map">${t(TX.openMap)}</a>
      </div>
    </section>
    <div class="wrap">
      ${sceneOr2d("home", twoD)}
      <p class="note" style="margin-top:.6rem">${state.view === "3d" ? t(TX.viewHint3d) : t(TX.viewHint2d)}</p>
      <div class="grid grid-3" style="margin-top:1rem">${dock}</div>
      <article class="glass glass-card pad" style="margin-top:1.1rem">
        <p class="kicker">${t(TX.pledgeWallK)}</p>
        <p class="stat" style="margin:.2rem 0">${wall.length.toLocaleString(state.lang === "hi" ? "hi-IN" : "en-IN")}</p>
        <p class="muted">${t(TX.pledgeWallL)}</p>
        <div class="pledge-wall" style="margin-top:.7rem">${
          wall.length
            ? wall.slice(0, 18).map((p) => `<span class="chip">${displayName(p.name)}</span>`).join("")
            : `<span class="muted">${t(TX.noPledges)}</span>`
        }</div>
        <p style="margin-top:.9rem"><a class="btn" href="#/pledge">${t(TX.iWill)}</a></p>
      </article>
      <div class="grid grid-2" style="margin-top:2rem">
        <article>
          <p class="kicker">${t(TX.mandate)}</p>
          <h2>${t(TX.mandateTitle)}</h2>
          <p class="muted">${t(TX.mandate1)}</p>
          <p class="muted">${t(TX.five)}</p>
          <p><a class="btn ghost glass glass-pill" href="#/about">${t(TX.aboutBoard)}</a></p>
        </article>
        <div class="glass glass-card pad" style="display:grid;place-items:center">
          <img src="brand/jal-shakti-logo.png" alt="${t(TX.brand)}" style="max-height:22rem">
        </div>
      </div>
      <h2 style="margin-top:2rem">${t(TX.factsTitle)}</h2>
      <div class="grid grid-4">
        ${FACTS.map((f) => `<article class="glass glass-card pad"><div class="stat">${f.stat}</div><p>${t(f)}</p></article>`).join("")}
      </div>
      <div class="glass glass-card pad" style="margin-top:1.4rem;display:flex;flex-wrap:wrap;gap:1rem;align-items:center;justify-content:space-between">
        <div><h2 style="margin:0">${t(TX.pledgeCta)}</h2><p class="muted">${TAGLINE}</p></div>
        <a class="btn" href="#/pledge">${t(TX.iWill)}</a>
      </div>
    </div>`;
}

function pageLearn() {
  const q = state.query.trim().toLowerCase();
  const list = AZ.filter((e) => !q || e.join(" ").toLowerCase().includes(q));
  const cur = AZ.find((e) => e[0] === state.letter) || AZ[0];
  const title = state.lang === "hi" ? cur[2] : cur[1];
  const body = state.lang === "hi" ? cur[4] : cur[3];
  return hero(TX.learnK, t(TX.learnT), TX.learnL) + `<div class="wrap">
    <input type="search" id="az-q" placeholder="${t(TX.search)}" value="${state.query.replace(/"/g, "&quot;")}">
    <div class="letters" style="margin-top:1rem">${AZ.map((e) => `<button type="button" data-letter="${e[0]}" aria-pressed="${e[0] === state.letter && !q}">${e[0]}</button>`).join("")}</div>
    ${q ? `<ul style="list-style:none;padding:0">${list.length ? list.map((e) => `<li class="glass glass-card pad" style="margin-top:.6rem"><strong>${e[0]} · ${state.lang === "hi" ? e[2] : e[1]}</strong><p class="muted">${state.lang === "hi" ? e[4] : e[3]}</p></li>`).join("") : `<li class="muted">${t(TX.none)}</li>`}</ul>`
      : `<article class="glass glass-card pad" style="margin-top:1.2rem"><p class="kicker">${cur[0]}</p><h2>${title}</h2><p class="muted">${body}</p></article>`}
  </div>`;
}

function pageCycle() {
  const st = CYCLE.find((c) => c.id === state.cycle) || CYCLE[0];
  const two = `<svg viewBox="0 0 320 240" width="100%" height="220">${CYCLE.map((c, i) => {
    const a = (i / CYCLE.length) * Math.PI * 2 - Math.PI / 2;
    const x = 160 + Math.cos(a) * 80;
    const y = 120 + Math.sin(a) * 70;
    return `<g data-cycle="${c.id}" class="hot"><circle cx="${x}" cy="${y}" r="${c.id === state.cycle ? 16 : 12}" fill="${c.id === state.cycle ? "#4ec4b0" : "#8ee0d0"}"/><text x="${x}" y="${y + 28}" text-anchor="middle" fill="#eef7f3" font-size="10">${t(c)}</text></g>`;
  }).join("")}<circle cx="160" cy="120" r="28" fill="#9ceef4" opacity=".85"/></svg>`;
  return hero(TX.cycleK, t(TX.cycleT), TX.cycleL) + `<div class="wrap grid grid-2">
    ${sceneOr2d("cycle", two)}
    <article class="glass glass-card pad">
      <p class="kicker">${t(TX.stage)}</p>
      <h2>${t(st)}</h2>
      <p class="muted">${t(st.body)}</p>
      <div style="margin-top:1rem;display:grid;gap:.4rem">${CYCLE.map((c) => `<button class="option ${c.id === state.cycle ? "correct" : ""}" data-cycle="${c.id}">${t(c)}</button>`).join("")}</div>
    </article>
  </div>`;
}

function pageSave() {
  const saved = SAVE.reduce((s, a) => s + (state.on[a.id] ? a.L : 0), 0);
  const acts = SAVE.filter((a) => a.room === state.room);
  const two = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;width:100%">${ROOMS.map((r) => `<button class="option ${r.id === state.room ? "correct" : ""}" data-room="${r.id}">${t(r)}</button>`).join("")}</div>`;
  return hero(TX.saveK, t(TX.saveT), TX.saveL) + `<div class="wrap">
    <p class="stat">${saved.toLocaleString(state.lang === "hi" ? "hi-IN" : "en-IN")} L <span class="muted" style="font-size:1rem">${t(TX.pledged)}</span></p>
    <div class="grid grid-2">
      ${sceneOr2d("save", two)}
      <div>
        <div class="row">${ROOMS.map((r) => `<button class="glass glass-pill" style="border:0;color:${r.id === state.room ? "var(--ink)" : "var(--foam)"};background:${r.id === state.room ? "var(--lagoon)" : "transparent"};padding:.45rem .8rem" data-room="${r.id}">${t(r)}</button>`).join("")}</div>
        ${acts.map((a) => `<button class="option" style="margin-top:.5rem" data-save="${a.id}"><strong>${t(a)}</strong> · ~${a.L.toLocaleString()} L</button>`).join("")}
      </div>
    </div>
  </div>`;
}

function pageLife() {
  const snap = DAYS[state.day] || DAYS[0];
  const two = BODY.map((b) => `<div style="width:100%;margin:.35rem 0"><div style="display:flex;justify-content:space-between"><span>${t(b)}</span><span>${b.pct}%</span></div><div class="progress"><span style="width:${b.pct}%"></span></div></div>`).join("");
  return hero(TX.lifeK, t(TX.lifeT), TX.lifeL) + `<div class="wrap grid grid-2">
    ${sceneOr2d("life", two)}
    <article class="glass glass-card pad">
      <h2>${state.lang === "hi" ? "जल कहाँ रहता है" : "Where the water sits"}</h2>
      ${BODY.map((b) => `<div style="margin:.5rem 0"><div style="display:flex;justify-content:space-between;font-size:.9rem"><span>${t(b)}</span><span style="color:var(--lagoon)">${b.pct}%</span></div><div class="progress"><span style="width:${b.pct}%"></span></div></div>`).join("")}
    </article>
    <article class="glass glass-card pad" style="grid-column:1/-1">
      <label>${t(TX.days)} · ${state.day}
        <input id="day" type="range" min="0" max="4" value="${state.day}" style="width:100%;accent-color:var(--lagoon)">
      </label>
      <h2>${t(snap)}</h2>
      <p class="muted">${t(snap.body)}</p>
    </article>
  </div>`;
}

function pageSdg() {
  return hero(TX.sdgK, t(TX.sdgT), TX.sdgL) + `<div class="wrap">
    <div class="grid grid-4">${FACTS.map((f) => `<article class="glass glass-card pad"><div class="stat">${f.stat}</div><p>${t(f)}</p></article>`).join("")}</div>
    <h2>${state.lang === "hi" ? "लक्ष्य" : "The targets"}</h2>
    ${SDG.map((s) => `<article class="glass glass-card pad" style="margin:.5rem 0"><p class="kicker">SDG ${s.id}</p><h3 style="margin:.2rem 0">${t(s)}</h3></article>`).join("")}
    <p><a class="btn ghost glass glass-pill" href="https://www.un.org/sustainabledevelopment/water-and-sanitation/" target="_blank" rel="noreferrer">UN</a>
    <a class="btn" href="#/sources">${state.lang === "hi" ? "सभी स्रोत" : "All sources"}</a></p>
  </div>`;
}

function pageQuiz() {
  if (!state.quiz) {
    state.quiz = { items: dealQuiz(), i: 0, picked: null, score: 0, done: false };
  }
  const Q = state.quiz;
  if (Q.done) {
    const rank = Q.score === 12 ? (state.lang === "hi" ? "जल रक्षक" : "Jal keeper")
      : Q.score >= 9 ? (state.lang === "hi" ? "जलग्रहण सेवक" : "Catchment steward")
      : Q.score >= 6 ? (state.lang === "hi" ? "मानसून सीख रहे हैं" : "Learning the monsoon")
      : (state.lang === "hi" ? "बूँद से शुरू करें" : "Begin at the drop");
    return hero(TX.quizK, rank, { en: `You scored ${Q.score} of 12. Enter again for a new shuffle.`, hi: `आपके ${Q.score} अंक 12 में से। फिर प्रवेश करें, नए प्रश्न मिलेंगे।` }) +
      `<div class="wrap"><button class="btn" id="quiz-reset">${t(TX.again)}</button> <a class="btn ghost glass glass-pill" href="#/pledge">${t(TX.iWill)}</a></div>`;
  }
  const item = Q.items[Q.i];
  const locked = Q.picked !== null;
  return hero(TX.quizK, t(TX.quizT), TX.quizL) + `<div class="wrap" style="max-width:44rem">
    <p class="muted">${Q.i + 1} / 12 · ${t(TX.score)} ${Q.score}</p>
    <div class="progress"><span style="width:${((Q.i + (locked ? 1 : 0)) / 12) * 100}%"></span></div>
    <h2>${t(item.q)}</h2>
    ${item.options.map((o, n) => {
      let cls = "option";
      if (locked && n === item.answer) cls += " correct";
      if (locked && n === Q.picked && n !== item.answer) cls += " wrong";
      return `<button class="${cls}" style="margin:.4rem 0" data-opt="${n}">${t(o)}</button>`;
    }).join("")}
    ${locked ? `<p class="muted">${t(item.why)}</p><button class="btn" id="quiz-next">${Q.i + 1 >= 12 ? t(TX.result) : t(TX.next)}</button>` : ""}
  </div>`;
}

function mapSvg() {
  const pins = CAMPUS.map((b) => {
    const on = b.id === state.pin;
    const label = t(b);
    const fs = label.length > 16 ? 9 : 11;
    return `<g class="hot ${on ? "active" : ""}" data-pin="${b.id}">
      <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="7" fill="${b.color}" opacity="${on ? 1 : 0.92}" stroke="${on ? "#eef7f3" : "rgba(255,255,255,.25)"}" stroke-width="${on ? 3 : 1}"/>
      <text x="${b.x + b.w / 2}" y="${b.y + b.h / 2 + 4}" text-anchor="middle" fill="#04182a" font-size="${fs}" font-weight="600">${label}</text>
    </g>`;
  }).join("");
  return `<svg class="map-svg" viewBox="0 0 1000 760">
    <defs>
      <linearGradient id="river" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#125a78"/><stop offset="1" stop-color="#1d7a92"/>
      </linearGradient>
      <pattern id="grass" width="18" height="18" patternUnits="userSpaceOnUse">
        <rect width="18" height="18" fill="#14362c"/><circle cx="3" cy="4" r="1.1" fill="#1d4a38"/>
      </pattern>
    </defs>
    <rect x="0" y="0" width="1000" height="760" rx="22" fill="url(#grass)"/>
    <path d="M-10 20 C160 0,280 70,420 28 S680 8,1010 55 L1010 168 C720 128,390 198,-10 150 Z" fill="url(#river)"/>
    <path d="M-10 62 C200 40,360 90,560 58 S820 42,1010 88" fill="none" stroke="#9fe7ff" stroke-width="2" opacity=".35"/>
    <text x="28" y="42" fill="#d7f6ff" font-size="13" font-weight="600">${state.lang === "hi" ? "महानदी / काठजोड़ी" : "Mahanadi–Kathajodi"}</text>
    <text x="28" y="60" fill="#9fd4e8" font-size="11">${state.lang === "hi" ? "नराज जलाशय की ओर" : "Toward Naraj Barrage"}</text>
    <path d="M40 710 C180 690,260 640,300 560 S340 430,360 300 S420 210,520 200" fill="none" stroke="#3a3f46" stroke-width="22" stroke-linecap="round"/>
    <path d="M40 710 C180 690,260 640,300 560 S340 430,360 300 S420 210,520 200" fill="none" stroke="#c9a46a" stroke-width="2" stroke-dasharray="10 12" opacity=".55"/>
    <path d="M360 360 H780" fill="none" stroke="#3a3f46" stroke-width="14"/>
    <path d="M160 220 V560" fill="none" stroke="#3a3f46" stroke-width="12"/>
    <circle cx="88" cy="88" r="26" fill="#1a6a88" opacity=".9"/>
    <text x="88" y="92" text-anchor="middle" fill="#eef7f3" font-size="10">N</text>
    <text x="22" y="742" fill="#b4cfc6" font-size="11">Naraj Road · CDA Sector 13</text>
    <text x="780" y="742" fill="#b4cfc6" font-size="11">${state.lang === "hi" ? "योजना · Google मानचित्र से अनुप्रेरित" : "Schematic · inspired by public campus plan"}</text>
    ${pins}
  </svg>`;
}

function pageMap() {
  const b = CAMPUS.find((x) => x.id === state.pin) || CAMPUS[2];
  return hero(TX.mapK, t(TX.mapT), TX.mapL) + `<div class="wrap">
    <p class="map-legend">
      <span><i class="swatch" style="background:#2a7d9b"></i>${state.lang === "hi" ? "जल शक्ति बिंदु" : "Jal Shakti pin"}</span>
      <span><i class="swatch" style="background:#1a6a88"></i>${state.lang === "hi" ? "नदी पट्टी" : "River belt"}</span>
    </p>
    <div class="grid grid-2" style="margin-top:.8rem">
      ${sceneOr2d("campus", mapSvg())}
      <article class="glass glass-card pad">
        <p class="kicker">${b.jal ? (state.lang === "hi" ? "जल बिंदु" : "Water pin") : (state.lang === "hi" ? "भवन" : "Building")}</p>
        <h2>${t(b)}</h2>
        <p class="muted">${t(b.note)}</p>
        <div style="margin-top:1rem;display:grid;gap:.35rem">
          ${CAMPUS.map((c) => `<button class="option ${c.id === state.pin ? "correct" : ""}" data-pin="${c.id}">${t(c)}</button>`).join("")}
        </div>
      </article>
    </div>
    <p class="note">${t(TX.mapNote)}</p>
    <h2 style="margin-top:1.6rem">${t(TX.liveMap)}</h2>
    <p class="muted">${t(TX.liveMapL)}</p>
    <div class="glass glass-card" style="margin-top:.6rem;padding:0">
      <iframe class="live-map" title="NLU Odisha on Google Maps" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
        src="https://maps.google.com/maps?q=National%20Law%20University%20Odisha%20Naraj%20Cuttack&z=16&hl=${state.lang === "hi" ? "hi" : "en"}&output=embed"></iframe>
    </div>
    <p style="margin-top:.7rem"><a class="btn ghost glass glass-pill" href="https://www.google.com/maps/search/?api=1&query=National+Law+University+Odisha+Naraj+Cuttack" target="_blank" rel="noreferrer">${t(TX.openGmaps)}</a></p>
  </div>`;
}

function pagePledge() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem("jal-shakti-pledge-v2") || "null"); } catch { /* ignore */ }
  const wall = loadWall();
  const wallHtml = `<article class="glass glass-card pad" style="margin-top:1rem">
      <p class="kicker">${t(TX.pledgeWallK)}</p>
      <p class="stat">${wall.length.toLocaleString(state.lang === "hi" ? "hi-IN" : "en-IN")}</p>
      <p class="muted">${t(TX.pledgeWallL)}</p>
      <div class="pledge-wall" style="margin-top:.7rem">${
        wall.length
          ? wall.slice(0, 40).map((p) => `<span class="chip">${displayName(p.name)}</span>`).join("")
          : `<span class="muted">${t(TX.noPledges)}</span>`
      }</div>
    </article>`;
  if (saved?.name) {
    return hero(TX.pledgeK, TAGLINE, TX.pledgeL) + `<div class="wrap" style="max-width:40rem">
      <article class="glass glass-card pad">
        <p class="kicker">${t(TX.recorded)}</p>
        <h2>${saved.name}</h2>
        <ul>${(saved.habits || []).map((id) => {
          const h = HABITS.find((x) => x.id === id);
          return h ? `<li>${t(h)}</li>` : "";
        }).join("")}</ul>
        <button class="btn ghost" id="pledge-clear">${t(TX.rewrite)}</button>
      </article>
      ${wallHtml}
    </div>`;
  }
  return hero(TX.pledgeK, TAGLINE, TX.pledgeL) + `<div class="wrap" style="max-width:40rem">
    <form class="glass glass-card pad" id="pledge-form">
      <label>${t(TX.yourName)}<input name="name" required></label>
      <fieldset style="border:0;padding:1rem 0 0">
        <legend>${t(TX.pickHabit)}</legend>
        ${HABITS.map((h) => `<label class="check"><input type="checkbox" name="habit" value="${h.id}"> ${t(h)}</label>`).join("")}
      </fieldset>
      <button class="btn" type="submit">${t(TX.iPledge)}</button>
    </form>
    ${wallHtml}
  </div>`;
}

function pageAbout() {
  return hero(TX.aboutK, t(TX.aboutT), TX.aboutL) + `<div class="wrap grid grid-2">
    <div class="glass glass-card pad" style="text-align:center">
      <img src="brand/jal-shakti-logo.png" alt="" style="max-width:20rem">
      <img src="brand/nluo-logo.png" alt="" style="width:7rem;margin-top:1rem">
      <p style="font-family:var(--font-display)">${TAGLINE}</p>
    </div>
    <div>
      <h2>${t(TX.riverCampus)}</h2>
      <p class="muted">${t(TX.riverBody)}</p>
      <h2>${state.lang === "hi" ? "पाँच हस्तक्षेप" : "Five interventions"}</h2>
      ${INTERVENTIONS.map((x) => `<div class="glass glass-card pad" style="margin:.4rem 0">${t(x)}</div>`).join("")}
      <h2>${t(TX.does)}</h2>
      <p class="muted">${t(TX.doesBody)}</p>
      <p class="muted">jsb@nluo.ac.in · <a href="https://nluo.ac.in/jal-shakti-board/">nluo.ac.in/jal-shakti-board</a></p>
      <p class="row">
        <a class="btn ghost glass glass-pill" href="#/team">${t(TX.teamT)}</a>
        <a class="btn ghost glass glass-pill" href="#/news">${t(TX.newsT)}</a>
      </p>
    </div>
  </div>`;
}

function pageSources() {
  return hero({ en: "Sources", hi: "स्रोत" }, t(TX.sourcesT), { en: "Tap a card to open the official page in a new tab.", hi: "आधिकारिक पृष्ठ नए टैब में खोलने के लिए कार्ड दबाएँ।" }) +
    `<div class="wrap grid grid-2">${RESOURCES.map((r) => {
      const name = Array.isArray(r) ? r[0] : r.name;
      const href = Array.isArray(r) ? r[1] : r.href;
      const about = Array.isArray(r) ? "" : t(r.about);
      let host = "";
      try { host = new URL(href).host.replace(/^www\./, ""); } catch { host = ""; }
      return `<a class="glass glass-card pad source-card" href="${href}" target="_blank" rel="noreferrer">
        <span class="src-host">${host}</span>
        <strong>${name}</strong>
        ${about ? `<span class="muted">${about}</span>` : ""}
        <span class="src-go">${t(TX.openSource)} →</span>
      </a>`;
    }).join("")}</div>`;
}

function pageTeam() {
  const { members } = loadContent();
  return hero(TX.teamK, t(TX.teamT), TX.teamL) + `<div class="wrap people">
    ${members.map((m) => `<article class="glass glass-card pad person">
      <div class="avatar">${m.photo ? `<img src="${m.photo}" alt="">` : initials(m.name)}</div>
      <div>
        <strong>${m.name}</strong>
        <p class="muted" style="margin:.2rem 0 0">${m.role}${m.year ? ` · ${m.year}` : ""}</p>
      </div>
    </article>`).join("")}
  </div>`;
}

function pageNews() {
  const news = loadContent().news.filter((n) => n.published !== false);
  news.sort((a, b) => (b.month || "").localeCompare(a.month || ""));
  return hero(TX.newsK, t(TX.newsT), TX.newsL) + `<div class="wrap">
    ${news.length ? news.map((n) => `<article class="glass glass-card pad" style="margin-bottom:.75rem">
      <p class="kicker">${n.month || ""}</p>
      <h2>${n.title}</h2>
      <p class="muted">${n.body || ""}</p>
      ${n.url ? `<p><a class="btn ghost glass glass-pill" href="${n.url}" target="_blank" rel="noreferrer">${t(TX.official)}</a></p>` : ""}
    </article>`).join("") : `<p class="muted">${t(TX.noNews)}</p>`}
  </div>`;
}

function pageEdit() {
  const role = deskRole();
  if (!role) {
    return hero(TX.desk, t(TX.desk), TX.deskL) + `<div class="wrap" style="max-width:28rem">
      <form class="glass glass-card pad" id="desk-form">
        <label>${t(TX.pass)}<input name="pass" type="password" required autocomplete="current-password"></label>
        <p class="err hidden" id="desk-err">${t(TX.locked)}</p>
        <p><button class="btn" type="submit">${t(TX.unlock)}</button></p>
      </form>
    </div>`;
  }
  const data = loadContent();
  return hero(TX.desk, t(TX.edit), TX.deskL) + `<div class="wrap">
    <div class="desk-bar">
      <span class="glass glass-pill" style="padding:.4rem .8rem">${role === "it" ? "IT" : "Editor"}</span>
      <button class="btn" id="desk-save">${t(TX.saveDesk)}</button>
      <button class="btn ghost" id="desk-download">${t(TX.downloadDesk)}</button>
      <button class="btn ghost" id="desk-out">${t(TX.signOutDesk)}</button>
      <span class="ok hidden" id="desk-ok">${t(TX.saved)}</span>
    </div>
    <div class="grid grid-2">
      <section class="glass glass-card pad">
        <h2>${t(TX.teamT)}</h2>
        <div id="member-list">${data.members.map((m, i) => memberForm(m, i)).join("")}</div>
        <button class="btn ghost" id="member-add" type="button">${t(TX.addMember)}</button>
      </section>
      <section class="glass glass-card pad">
        <h2>${t(TX.newsT)}</h2>
        <div id="news-list">${data.news.map((n, i) => newsForm(n, i)).join("")}</div>
        <button class="btn ghost" id="news-add" type="button">${t(TX.addNews)}</button>
      </section>
    </div>
  </div>`;
}

function memberForm(m, i) {
  return `<div class="member-edit glass glass-card pad" data-member="${i}" data-id="${esc(m.id || "")}" data-photo="${esc(m.photo || "")}">
    <label>${t(TX.name)}<input name="name" value="${esc(m.name)}"></label>
    <label>${t(TX.role)}<input name="role" value="${esc(m.role)}"></label>
    <label>${t(TX.year)}<input name="year" value="${esc(m.year || "")}"></label>
    <label>${t(TX.photo)}<input name="photo" type="file" accept="image/*"></label>
    ${m.photo ? `<img class="preview" src="${m.photo}" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:14px">` : `<img class="preview hidden" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:14px">`}
    <button type="button" class="btn ghost" data-remove-member>${t(TX.remove)}</button>
  </div>`;
}

function newsForm(n, i) {
  return `<div class="member-edit glass glass-card pad" data-news="${i}" data-id="${esc(n.id || "")}">
    <label>${t(TX.month)}<input name="month" type="month" value="${esc(n.month || "")}"></label>
    <label>${t(TX.title)}<input name="title" value="${esc(n.title || "")}"></label>
    <label>${t(TX.body)}<textarea name="body">${esc(n.body || "")}</textarea></label>
    <label>${t(TX.link)}<input name="url" value="${esc(n.url || "")}"></label>
    <button type="button" class="btn ghost" data-remove-news>${t(TX.remove)}</button>
  </div>`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function readDeskForms() {
  const members = [...document.querySelectorAll("[data-member]")].map((el) => ({
    id: el.dataset.id || "m-" + Math.random().toString(36).slice(2, 8),
    name: el.querySelector("[name=name]")?.value.trim() || "",
    role: el.querySelector("[name=role]")?.value.trim() || "",
    year: el.querySelector("[name=year]")?.value.trim() || "",
    photo: el.dataset.photo || "",
  })).filter((m) => m.name);
  const news = [...document.querySelectorAll("[data-news]")].map((el) => ({
    id: el.dataset.id || "n-" + Math.random().toString(36).slice(2, 8),
    month: el.querySelector("[name=month]")?.value || "",
    title: el.querySelector("[name=title]")?.value.trim() || "",
    body: el.querySelector("[name=body]")?.value.trim() || "",
    url: el.querySelector("[name=url]")?.value.trim() || "",
    published: true,
  })).filter((n) => n.title);
  return { members, news };
}

const pages = {
  home: pageHome, learn: pageLearn, cycle: pageCycle, save: pageSave, life: pageLife,
  sdg6: pageSdg, quiz: pageQuiz, map: pageMap, pledge: pagePledge, about: pageAbout, sources: pageSources,
  team: pageTeam, news: pageNews, edit: pageEdit,
};

async function mountScenes() {
  if (state.view !== "3d") return;
  const boxes = [...document.querySelectorAll("[data-scene]")];
  if (!boxes.length) return;
  const three = await getThree();
  const lang = state.lang;
  boxes.forEach((el) => {
    const id = el.dataset.scene;
    if (id === "home") three.homeScene(el, lang);
    if (id === "cycle") three.cycleScene(el, (sid) => { state.cycle = sid; paint(); }, lang);
    if (id === "life") three.lifeScene(el);
    if (id === "save") three.saveScene(el, (rid) => { state.room = rid; paint(); }, lang);
    if (id === "campus") three.campusScene(el, (pid) => { state.pin = pid; paint(); }, lang);
  });
}

export async function paint() {
  if (paintBusy) return;
  paintBusy = true;
  try {
    applyChrome();
    renderNav();
    const prev = hashRoute();
    if (prev === "quiz" && state.route !== "quiz") state.quiz = null;
    state.route = hashRoute();
    if (state.route === "quiz" && !state.quiz) state.quiz = { items: dealQuiz(), i: 0, picked: null, score: 0, done: false };
    $("#app").innerHTML = pages[state.route]();
    $("#foot-blurb").textContent = t(TX.footer);
    const editLink = $("#edit-link");
    if (editLink) editLink.textContent = t(TX.edit);
    try {
      if (state.view !== "3d" && threeMod) threeMod.killAll();
    } catch { /* three not loaded yet */ }
    await mountScenes();
  } finally {
    paintBusy = false;
  }
}

function onClick(e) {
  const letter = e.target.closest("[data-letter]");
  if (letter) { state.letter = letter.dataset.letter; state.query = ""; paint(); return; }
  const cy = e.target.closest("[data-cycle]");
  if (cy) { state.cycle = cy.dataset.cycle; paint(); return; }
  const rm = e.target.closest("[data-room]");
  if (rm) { state.room = rm.dataset.room; paint(); return; }
  const sv = e.target.closest("[data-save]");
  if (sv) { state.on[sv.dataset.save] = !state.on[sv.dataset.save]; paint(); return; }
  const pin = e.target.closest("[data-pin]");
  if (pin) { state.pin = pin.dataset.pin; paint(); return; }
  const opt = e.target.closest("[data-opt]");
  if (opt && state.quiz && state.quiz.picked === null) {
    const n = Number(opt.dataset.opt);
    state.quiz.picked = n;
    if (n === state.quiz.items[state.quiz.i].answer) state.quiz.score += 1;
    paint();
    return;
  }
  if (e.target.id === "quiz-next") {
    if (state.quiz.i + 1 >= 12) state.quiz.done = true;
    else { state.quiz.i += 1; state.quiz.picked = null; }
    paint();
    return;
  }
  if (e.target.id === "quiz-reset") { state.quiz = null; paint(); return; }
  if (e.target.id === "pledge-clear") { localStorage.removeItem("jal-shakti-pledge-v2"); paint(); return; }
  if (e.target.id === "desk-out") { sessionStorage.removeItem(DESK_KEY); paint(); return; }
  if (e.target.id === "desk-save") {
    saveContent(readDeskForms());
    const ok = $("#desk-ok");
    if (ok) ok.classList.remove("hidden");
    return;
  }
  if (e.target.id === "desk-download") {
    const blob = new Blob([JSON.stringify(readDeskForms(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "jal-shakti-published.json";
    a.click();
    return;
  }
  if (e.target.id === "member-add") {
    const data = readDeskForms();
    data.members.push({ id: "m-" + Date.now(), name: "", role: "Member", year: "", photo: "" });
    saveContent(data);
    paint();
    return;
  }
  if (e.target.id === "news-add") {
    const data = readDeskForms();
    const now = new Date();
    data.news.unshift({
      id: "n-" + Date.now(),
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      title: "",
      body: "",
      url: "",
      published: true,
    });
    saveContent(data);
    paint();
    return;
  }
  if (e.target.closest("[data-remove-member]")) {
    e.target.closest("[data-member]")?.remove();
    saveContent(readDeskForms());
    paint();
    return;
  }
  if (e.target.closest("[data-remove-news]")) {
    e.target.closest("[data-news]")?.remove();
    saveContent(readDeskForms());
    paint();
    return;
  }
}

function bind() {
  document.body.addEventListener("pointerdown", (e) => {
    const a = e.target.closest("a[href^='#/']");
    if (!a) return;
    a.classList.add("active");
    state.menu = false;
  }, { passive: true });
  document.body.addEventListener("click", onClick);
  document.body.addEventListener("input", (e) => {
    if (e.target.id === "az-q") { state.query = e.target.value; paint(); $("#az-q")?.focus(); }
    if (e.target.id === "day") { state.day = Number(e.target.value); paint(); }
  });
  document.body.addEventListener("change", async (e) => {
    if (e.target.name !== "photo" || !e.target.files?.[0]) return;
    const card = e.target.closest("[data-member]");
    if (!card) return;
    card.dataset.photo = await fileToPhoto(e.target.files[0]);
    const img = card.querySelector(".preview");
    if (img) {
      img.src = card.dataset.photo;
      img.classList.remove("hidden");
    }
  });
  document.body.addEventListener("submit", async (e) => {
    if (e.target.id === "desk-form") {
      e.preventDefault();
      const hash = await sha256(e.target.pass.value);
      const role = hash === ADMIN_HASHES.editor ? "editor" : hash === ADMIN_HASHES.it ? "it" : "";
      if (!role) {
        $("#desk-err")?.classList.remove("hidden");
        return;
      }
      sessionStorage.setItem(DESK_KEY, role);
      paint();
      return;
    }
    if (e.target.id !== "pledge-form") return;
    e.preventDefault();
    const name = e.target.name.value.trim();
    const habits = [...e.target.querySelectorAll("[name=habit]:checked")].map((i) => i.value);
    if (!name || !habits.length) return;
    localStorage.setItem("jal-shakti-pledge-v2", JSON.stringify({ name, habits, at: new Date().toISOString() }));
    addToWall(name, habits);
    paint();
  });
  $("[data-lang-en]").onclick = () => { state.lang = "en"; paint(); };
  $("[data-lang-hi]").onclick = () => { state.lang = "hi"; paint(); };
  $("[data-view-2d]").onclick = () => { state.view = "2d"; paint(); };
  $("[data-view-3d]").onclick = () => { state.view = "3d"; paint(); };
  $("#menu-btn").onclick = () => { state.menu = !state.menu; renderNav(); };
  window.addEventListener("hashchange", () => {
    const next = hashRoute();
    if (next === "quiz") state.quiz = null;
    state.menu = false;
    paint();
  });
}

applyChrome();
bind();
paint();
