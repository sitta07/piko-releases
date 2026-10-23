// Piko website: pixel sprites, the little desktop in the hero, the scroll
// runner, dress-up, and the small touches (reveal, pixel wipe, language).

const REPO = "sitta07/piko-releases";
const FRAME_W = 48;
const FRAME_H = 48;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const index = await fetch("sprites/index.json").then((r) => r.json());

// ---------- sprites ----------
// Every .sprite-el is a strip played frame by frame by one shared ticker.

const sprites = new Set();

function setPose(el, pose) {
  const char = index[el.dataset.char];
  const name = char.frames[pose] ? pose : "idle";
  const size = Number(el.dataset.size || 2);
  el.dataset.pose = name;
  el._frames = char.frames[name];
  el._fps = char.fps[name];
  el._frame = 0;
  el._clock = 0;
  el.style.width = `${FRAME_W * size}px`;
  el.style.height = `${FRAME_H * size}px`;
  el.style.backgroundImage = `url(sprites/${el.dataset.char}/${name}.png)`;
  el.style.backgroundSize = `${el._frames * FRAME_W * size}px ${FRAME_H * size}px`;
  el.style.backgroundPosition = "0 0";
}

// Sprites off screen don't need their frames turned (keeps scrolling smooth).
const onScreen = new IntersectionObserver((entries) => entries.forEach((e) => (e.target._hidden = !e.isIntersecting)), { rootMargin: "100px" });

function addSprite(el) {
  setPose(el, el.dataset.pose || "idle");
  sprites.add(el);
  onScreen.observe(el);
}

$$(".sprite-el").forEach(addSprite);

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  for (const el of sprites) {
    if (el._hidden) continue;
    el._clock += dt;
    if (el._clock >= 1 / el._fps) {
      el._clock = 0;
      el._frame = (el._frame + 1) % el._frames;
      const size = Number(el.dataset.size || 2);
      el.style.backgroundPosition = `${-el._frame * FRAME_W * size}px 0`;
    }
  }
  hero.step(dt);
  runner.step(dt);
  requestAnimationFrame(tick);
}

// ---------- language ----------

export const LANGUAGES = { th: "ไทย", en: "English", ja: "日本語", zh: "简体中文", ko: "한국어", vi: "Tiếng Việt", id: "Bahasa Indonesia", es: "Español" };

// Thai is the page as written; the other languages load when picked.
const TH = {
  t: Object.fromEntries($$("[data-t]").map((el) => [el.dataset.t, el.innerHTML])),
  lines: { hello: "สวัสดี! ฉันชื่อ Piko", pats: [":heart:", "เขิน >///<", "ฮื้อ~ ชอบ", "สู้ ๆ นะ!"], idle: ["อยู่ตรงนี้นะ~", "พักบ้างนะ~", "วันนี้ทำอะไรอยู่?", "zzZ… ไม่ได้หลับนะ!"], drop: "ว้าย!" },
  words: [],
  none: "ไม่ใส่",
  original: "สีเดิม",
};
Object.assign(TH.t, { "wall-you": "ที่ว่างสำหรับคุณ", "wall-first": "รอคนแรกอยู่นะ~", "wall-you-s": "สนับสนุนแล้วได้ขึ้นกำแพงพร้อมลิงก์ของคุณ", "tag-you": "ชื่อคุณตรงนี้?" });
const loaded = { th: TH };
let lang = "th";
let D = TH;

const heart = "<img class='ico' src='icons/heart.png' alt=''>";
const line = (s) => s.replace(":heart:", heart);
const savedLang = () => {
  try {
    return localStorage.getItem("lang");
  } catch {
    return null;
  }
};

async function setLang(id) {
  if (!(id in LANGUAGES)) id = "en";
  D = loaded[id] ??= (await import(`./lang/${id}.js`)).default;
  lang = id;
  $$("[data-t]").forEach((el) => (el.innerHTML = D.t[el.dataset.t] ?? TH.t[el.dataset.t] ?? el.innerHTML));
  $("#lang").value = id;
  document.documentElement.lang = id;
  try {
    localStorage.setItem("lang", id);
  } catch {}
  buildFamily();
  buildDressUp();
}

$("#lang").replaceChildren(...Object.entries(LANGUAGES).map(([id, name]) => Object.assign(document.createElement("option"), { value: id, textContent: name })));
$("#lang").addEventListener("change", (e) => void setLang(e.target.value));

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// ---------- the hero desktop ----------

const hero = (() => {
  // Piko on its cloud by the side of the little screen. Type anything and it types
  // along; leave it a while and it naps; pat it, or carry it somewhere else.
  const screen = $("#screen");
  const ride = $("#hero-ride");
  const pet = $("#hero-pet");
  const bubble = $("#hero-bubble");
  const typed = $("#typed");
  const RW = 168; // the cloud, 56 art pixels at 3×
  const RH = 183;
  const FLOOR = 30; // taskbar height
  let x = 0;
  let y = 60; // height above the taskbar
  let holdPose = null;
  let holdUntil = 0;
  let bubbleUntil = 0;
  let typingUntil = 0;
  let lastInput = performance.now();
  let napping = false;
  let nextAct = performance.now() + 5000;
  let text = "";

  const width = () => screen.clientWidth;

  function say(t, seconds = 3) {
    bubble.innerHTML = t;
    bubble.classList.add("show");
    bubbleUntil = performance.now() + seconds * 1000;
  }

  function pose(name, seconds) {
    holdPose = name;
    holdUntil = performance.now() + seconds * 1000;
    if (pet.dataset.pose !== name) setPose(pet, name);
  }

  function hearts() {
    for (let i = 0; i < 4; i++) {
      const h = document.createElement("span");
      h.className = "heart";
      h.style.left = `${x + RW / 2 - 30 + Math.random() * 40}px`;
      h.style.bottom = `${FLOOR + y + RH - 20 + Math.random() * 20}px`;
      h.style.animationDelay = `${i * 0.08}s`;
      $("#hearts").append(h);
      setTimeout(() => h.remove(), 1400);
    }
  }

  function place() {
    ride.style.transform = `translate(${x}px, ${-y}px)`;
    // on the right half it looks in towards the middle, the cloud's tail trailing behind
    ride.classList.toggle("facing-left", x + RW / 2 > width() / 2);
    bubble.style.left = `${Math.max(6, Math.min(width() - bubble.offsetWidth - 6, x + RW / 2 - 12 - bubble.offsetWidth / 2))}px`;
    bubble.style.bottom = `${FLOOR + y + RH + 6}px`;
  }

  function wake() {
    lastInput = performance.now();
    if (!napping) return;
    napping = false;
    pose("stretch", 1.5);
    say(heart, 1.5);
  }

  // you type, it types: whatever's typed on the page shows up in the little window
  document.addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, select, textarea") || e.metaKey || e.ctrlKey) return;
    // the space bar types a space here while the little screen is in view, rather than scrolling away from it
    if (e.key === " " && screen.getBoundingClientRect().bottom > 0 && screen.getBoundingClientRect().top < innerHeight) e.preventDefault();
    wake();
    typingUntil = performance.now() + 1400;
    // typing wins over a little act on the spot (not over being carried)
    if (!press) holdPose = null;
    if (e.key.length === 1) text = (text + e.key).slice(-28);
    else if (e.key === "Backspace") text = text.slice(0, -1);
    else if (e.key === "Enter") text = "";
    typed.textContent = text;
  });
  window.addEventListener("pointermove", wake, { passive: true });

  // pat it, or carry it somewhere else: it stays where it's let go
  let press = null;
  ride.addEventListener("pointerdown", (e) => {
    ride.setPointerCapture(e.pointerId);
    press = { x: e.clientX, y: e.clientY, dragging: false };
  });
  ride.addEventListener("pointermove", (e) => {
    if (!press) return;
    if (!press.dragging && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5) {
      press.dragging = true;
      pose("fall", 60);
    }
    if (press.dragging) {
      const r = screen.getBoundingClientRect();
      x = Math.max(0, Math.min(width() - RW, e.clientX - r.left - RW / 2));
      y = Math.max(0, Math.min(r.height - FLOOR - RH, r.bottom - FLOOR - e.clientY - RH * 0.5));
    }
  });
  ride.addEventListener("pointerup", () => {
    if (!press) return;
    if (press.dragging) pose("happy", 1.2);
    else {
      pose("happy", 1.6);
      say(line(pick(D.lines.pats)), 2);
      hearts();
    }
    press = null;
  });

  const ACTS = [["stretch", 2.5], ["read", 3], ["dance", 3], ["drink", 2.5], ["wave", 2], ["happy", 1.6], ["think", 2.5]];

  function start() {
    x = Math.max(0, width() - RW - 24);
    place();
    if (reduced) return;
    screen.classList.add("booting");
    setTimeout(() => {
      pose("wave", 2.6);
      say(line(D.lines.hello), 3);
      hero.greeted = true;
    }, 950);
  }

  function step() {
    const now = performance.now();
    if (bubbleUntil && now > bubbleUntil) {
      bubble.classList.remove("show");
      bubbleUntil = 0;
    }
    if (holdPose && now > holdUntil) holdPose = null;
    if (!napping && now - lastInput > 15000 && !press) {
      napping = true;
      say("zzZ", 4);
    }
    let want = "idle";
    if (holdPose) want = holdPose;
    else if (now < typingUntil) want = "type";
    else if (napping) want = "lie";
    else if (!reduced && now > nextAct) {
      const [name, seconds] = pick(ACTS);
      pose(name, seconds);
      want = name;
      nextAct = now + seconds * 1000 + 4000 + Math.random() * 4000;
      if (Math.random() < 0.3) say(line(pick(D.lines.idle)), 2.2);
    }
    if (pet.dataset.pose !== want) setPose(pet, want);
    place();
  }

  return { start, step, say, pose, greeted: false };
})();

// taskbar clock
const clock = () => ($("#clock").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
clock();
setInterval(clock, 30_000);

// ---------- the scroll runner ----------

const runner = (() => {
  const el = $("#runner");
  const W = FRAME_W * 2;
  let x = 0;
  let lastScroll = window.scrollY;
  let movingUntil = 0;
  let hold = null;
  let holdUntil = 0;
  // measured on resize, not every frame: reading it forces a layout
  let max = 0;
  const measure = () => (max = document.documentElement.scrollHeight - innerHeight);
  measure();
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);

  window.addEventListener(
    "scroll",
    () => {
      const dir = Math.sign(window.scrollY - lastScroll);
      lastScroll = window.scrollY;
      movingUntil = performance.now() + 350;
      if (dir) el.classList.toggle("flip", dir < 0);
    },
    { passive: true },
  );

  return {
    pose(name, seconds) {
      hold = name;
      holdUntil = performance.now() + seconds * 1000;
    },
    step() {
      if (reduced) return;
      const now = performance.now();
      const goal = (max > 0 ? Math.min(1, scrollY / max) : 0) * (innerWidth - W - 16) + 8;
      if (Math.abs(goal - x) > 0.3) {
        x += (goal - x) * 0.15;
        el.style.translate = `${x}px 0`;
      }
      let want = now < movingUntil ? "walk" : "sit";
      if (hold && now < holdUntil) want = hold;
      else hold = null;
      if (el.dataset.pose !== want) setPose(el, want);
    },
  };
})();

// ---------- reveal on scroll ----------

const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("seen"), io.unobserve(e.target))),
  { threshold: 0.15 },
);
$$(".reveal").forEach((el) => io.observe(el));

// ---------- pixel wipe for menu jumps ----------

const wipe = $(".wipe");
for (let i = 0; i < 96; i++) {
  const cell = document.createElement("i");
  const col = i % 12;
  const row = Math.floor(i / 12);
  cell.style.setProperty("--d", `${(col + row) * 0.018}s`);
  wipe.append(cell);
}
$$('a[href^="#"]').forEach((a) =>
  a.addEventListener("click", (e) => {
    const target = $(a.getAttribute("href"));
    if (!target || reduced) return;
    e.preventDefault();
    wipe.className = "wipe in";
    setTimeout(() => {
      target.scrollIntoView({ behavior: "instant", block: "start" });
      wipe.className = "wipe out";
      setTimeout(() => (wipe.className = "wipe"), 600);
    }, 520);
  }),
);

// ---------- dress-up ----------

const colorways = await fetch("sprites/colorways.json").then((r) => r.json());
const look = { accessory: null, fur: null };
const canvas = $("#dress-canvas");
const ctx = canvas.getContext("2d");
const images = new Map();
const load = (src) => {
  if (!images.has(src)) {
    images.set(
      src,
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
      }),
    );
  }
  return images.get(src);
};

const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const shade = (c) => c.map((v) => Math.trunc(v * 0.88));
const light = (c) => c.map((v) => Math.min(255, Math.trunc(v + (255 - v) * 0.6)));

let dressFrame = 0;
async function drawDress() {
  const piko = index.piko;
  const strip = await load("sprites/piko/idle.png");
  const acc = look.accessory ? await load(`sprites/piko/acc-${look.accessory}-idle.png`) : null;
  ctx.clearRect(0, 0, FRAME_W, FRAME_H);
  ctx.drawImage(strip, dressFrame * FRAME_W, 0, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
  if (look.fur) {
    const data = ctx.getImageData(0, 0, FRAME_W, FRAME_H);
    const from = [piko.colors.fur, piko.colors.shade, piko.colors.light].map(hexRGB);
    const fur = hexRGB(look.fur);
    const to = [fur, shade(fur), light(fur)];
    for (let p = 0; p < data.data.length; p += 4) {
      for (let k = 0; k < 3; k++) {
        const f = from[k];
        if (data.data[p] === f[0] && data.data[p + 1] === f[1] && data.data[p + 2] === f[2]) {
          [data.data[p], data.data[p + 1], data.data[p + 2]] = to[k];
          break;
        }
      }
    }
    ctx.putImageData(data, 0, 0);
  }
  if (acc) ctx.drawImage(acc, dressFrame * FRAME_W, 0, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
  dressFrame = (dressFrame + 1) % piko.frames.idle;
}
setInterval(drawDress, 260);

function buildDressUp() {
  const accChips = $("#acc-chips");
  accChips.replaceChildren();
  for (const [key, name] of [[null, D.none], ...Object.entries(index.piko.accessories).map(([k, thai]) => [k, D.accessories?.[k] ?? thai])]) {
    const chip = document.createElement("button");
    chip.className = `chip${look.accessory === key ? " on" : ""}`;
    chip.textContent = name;
    chip.onclick = () => {
      look.accessory = key;
      buildDressUp();
      drawDress();
    };
    accChips.append(chip);
  }
  const furChips = $("#fur-chips");
  furChips.replaceChildren();
  for (const c of [{ name: D.original, fur: null }, ...colorways.colorways]) {
    const chip = document.createElement("button");
    chip.className = `chip swatch${look.fur === c.fur ? " on" : ""}`;
    chip.title = c.name;
    chip.style.background = c.fur ?? "repeating-linear-gradient(45deg, #fff 0 4px, #f3d4bf 4px 8px)";
    chip.onclick = () => {
      look.fur = c.fur;
      buildDressUp();
      drawDress();
    };
    furChips.append(chip);
  }
}

// ---------- the family ----------

function buildFamily() {
  const grid = $("#family-grid");
  grid.replaceChildren();
  const order = ["piko", "shiba", "bunny", "hippo", "capy", "duck"];
  const keys = [...order, ...Object.keys(index).filter((k) => !order.includes(k))];
  for (const key of keys) {
    const c = index[key];
    const tile = document.createElement("button");
    tile.className = "pal";
    const sprite = document.createElement("span");
    sprite.className = "sprite-el";
    sprite.dataset.char = key;
    sprite.dataset.pose = "idle";
    sprite.dataset.size = "2";
    tile.append(sprite);
    tile.insertAdjacentHTML("beforeend", `<b>${lang === "th" ? c.nameTh : c.name}</b><small>${lang === "th" ? c.speciesTh : D.species?.[c.species] ?? c.species}</small>`);
    tile.addEventListener("mouseenter", () => setPose(sprite, "cheer"));
    tile.addEventListener("mouseleave", () => setPose(sprite, "idle"));
    tile.addEventListener("click", () => setPose(sprite, sprite.dataset.pose === "walk" ? "idle" : "walk"));
    grid.append(tile);
    addSprite(sprite);
  }
  for (const el of sprites) if (!el.isConnected) sprites.delete(el);
}

// ---------- downloads ----------

const isWin = /Windows/i.test(navigator.userAgent);
const os = isWin ? "win" : "mac";
$("#dl-os-icon").innerHTML = '<img class="ico" src="icons/download.png" alt="">';
function showOs(which) {
  $$(".tab").forEach((t) => t.classList.toggle("on", t.dataset.os === which));
  $$(".steps").forEach((s) => (s.hidden = s.dataset.os !== which));
}
$$(".tab").forEach((t) => t.addEventListener("click", () => showOs(t.dataset.os)));
showOs(os);

fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then((release) => {
    const find = (re) => release.assets.find((a) => re.test(a.name));
    const mac = find(/\.dmg$/i);
    const win = find(/setup\.exe$/i) || find(/\.msi$/i);
    if (mac) $("#dl-mac").href = mac.browser_download_url;
    if (win) $("#dl-win").href = win.browser_download_url;
    $("#version").textContent = `${release.tag_name} · ${new Date(release.published_at).toLocaleDateString()}`;
  })
  .catch(() => {});

// ---------- support goal and the supporters wall ----------
// supporters.json, edited by hand when someone chips in (see SUPPORTERS.md).
const { goal: GOAL, supporters } = await fetch("supporters.json")
  .then((r) => r.json())
  .catch(() => ({ goal: 99, supporters: [] }));
// the top three are the main supporters: up in the hero with their link, and walking in the parade with a name tag
const TOP = [...supporters].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0)).slice(0, 3);
const linkOf = (s) => (/^https:\/\//.test(s.link ?? "") ? s.link : null);
const RAISED = supporters.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
$("#goal-num").textContent = `$${RAISED} / $${GOAL}`;
new IntersectionObserver((entries, obs) => {
  if (entries[0].isIntersecting) {
    $("#goal-fill").style.width = `${Math.max(3, Math.min(100, (RAISED / GOAL) * 100))}%`;
    obs.disconnect();
  }
}).observe($(".goal"));

/** Each supporter gets a little friend of their own, the same one every visit. */
function friendFor(name) {
  const chars = Object.keys(index);
  let h = 0;
  for (const c of name) h = (h * 31 + c.codePointAt(0)) >>> 0;
  return chars[h % chars.length];
}

function buildWall() {
  const wall = $("#wall");
  const ranked = [...supporters].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
  const medals = ["coin", "star", "heart"];
  ranked.forEach((s, i) => {
    const li = document.createElement("li");
    li.className = `wall-card${i < 3 ? ` top top-${i + 1}` : ""}`;
    const pet = document.createElement("span");
    pet.className = "sprite-el";
    pet.dataset.char = friendFor(String(s.name));
    pet.dataset.pose = i === 0 ? "cheer" : "happy";
    pet.dataset.size = "2";
    const who = document.createElement(/^https:\/\//.test(s.link ?? "") ? "a" : "b");
    who.className = "wall-name";
    who.textContent = String(s.name);
    if (who.tagName === "A") Object.assign(who, { href: s.link, target: "_blank", rel: "nofollow ugc noopener" });
    const meta = document.createElement("small");
    meta.textContent = `$${Number(s.amount) || 0}${s.via ? ` · ${s.via}` : ""}`;
    if (i < 3) {
      const medal = document.createElement("img");
      Object.assign(medal, { className: "ico medal", src: `icons/${medals[i]}.png`, alt: `#${i + 1}` });
      li.append(medal);
    }
    li.append(pet, who, meta);
    if (s.message) {
      const said = document.createElement("q");
      said.textContent = String(s.message).slice(0, 120);
      li.append(said);
    }
    wall.append(li);
    addSprite(pet);
  });
  // room for the next kind soul
  const next = document.createElement("li");
  next.className = "wall-card empty";
  // its words switch with the language like the rest of the page
  const invite = ranked.length ? "wall-you" : "wall-first";
  next.innerHTML = `<span class="sprite-el" data-char="piko" data-pose="wave" data-size="2"></span><b data-t="${invite}">${D.t[invite]}</b><small data-t="wall-you-s">${D.t["wall-you-s"]}</small>`;
  wall.append(next);
  addSprite($(".sprite-el", next));
}

/** The hero's strip of main supporters, the top three, each with their link. */

function buildBackers() {
  const free = $("#backer-free");
  TOP.forEach((s, i) => {
    const link = linkOf(s);
    const el = document.createElement(link ? "a" : "div");
    el.className = `backer top-${i + 1}`;
    if (link) Object.assign(el, { href: link, target: "_blank", rel: "nofollow ugc noopener" });
    const pet = document.createElement("span");
    pet.className = "backer-pet sprite-el";
    Object.assign(pet.dataset, { char: friendFor(String(s.name)), pose: "happy", size: "1" });
    const words = document.createElement("span");
    const name = document.createElement("b");
    name.textContent = String(s.name);
    words.append(name);
    if (s.message || link) {
      const note = document.createElement("small");
      note.textContent = s.message ? String(s.message).slice(0, 60) : link.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "");
      words.append(note);
    }
    el.append(pet, words);
    free.before(el);
    addSprite(pet);
  });
  // there's always a seat left for the next one, until all three are taken
  if (TOP.length >= 3) free.remove();
}

// ---------- go ----------

buildFamily();
buildDressUp();
buildWall();
buildBackers();
drawDress();
hero.start();
requestAnimationFrame(tick);

// ---------- always something moving ----------

if (!reduced) {
  // Pixel stickers drifting in the hero, leaning away from the mouse a little.
  const STICKERS = ["heart", "star", "sparkle", "music", "coffee", "tomato", "drop", "book", "chat", "sun"];
  const box = $("#stickers");
  // only in the margins and the gap between the columns, never over the words
  const spots = [[-3, 6], [47, 4], [99, 6], [-4, 58], [47, 40], [100, 52], [18, 99], [62, 101], [84, -4], [47, 82]];
  STICKERS.forEach((name, i) => {
    const img = document.createElement("img");
    img.src = `icons/${name}.png`;
    img.alt = "";
    img.className = "sticker";
    img.style.left = `${spots[i][0]}%`;
    img.style.top = `${spots[i][1]}%`;
    img.style.setProperty("--d", `${3 + (i % 4)}s`);
    img.style.setProperty("--delay", `${-i * 0.7}s`);
    img.style.setProperty("--r", `${(i % 2 ? 1 : -1) * (6 + (i % 3) * 4)}deg`);
    img.dataset.depth = String(6 + (i % 3) * 6);
    box.append(img);
  });
  window.addEventListener("pointermove", (e) => {
    const cx = e.clientX / innerWidth - 0.5;
    const cy = e.clientY / innerHeight - 0.5;
    for (const img of box.children) img.style.translate = `${-cx * img.dataset.depth}px ${-cy * img.dataset.depth}px`;
  });

  // The headline's last words take turns.
  let word = 0;
  setInterval(() => {
    const el = $("#rotating");
    if (!el) return;
    word = (word + 1) % D.words.length;
    el.textContent = D.words[word];
    el.classList.remove("swap");
    void el.offsetWidth;
    el.classList.add("swap");
  }, 2600);

  // Every few seconds one of the family wiggles, and the download button gives a nudge.
  setInterval(() => {
    const tiles = $$(".pal");
    const tile = tiles[Math.floor(Math.random() * tiles.length)];
    if (!tile || tile.matches(":hover")) return;
    const sprite = $(".sprite-el", tile);
    tile.classList.add("wiggle");
    setPose(sprite, Math.random() < 0.5 ? "cheer" : "dance");
    setTimeout(() => {
      tile.classList.remove("wiggle");
      if (!tile.matches(":hover")) setPose(sprite, "idle");
    }, 1800);
  }, 2400);
  setInterval(() => {
    const b = $("#dl-main");
    b.classList.remove("nudge");
    void b.offsetWidth;
    b.classList.add("nudge");
  }, 6000);
}

// The whole family walking past, twice over so the loop has no seam.
{
  const track = $("#parade-track");
  const keys = Object.keys(index);
  for (const copy of [0, 1]) {
    for (const key of keys) {
      const el = document.createElement("span");
      el.className = "sprite-el";
      el.dataset.char = key;
      el.dataset.pose = reduced ? "idle" : "walk";
      el.dataset.size = "2";
      el.title = lang === "th" ? index[key].nameTh : index[key].name;
      el.addEventListener("click", () => {
        el.classList.add("hop");
        setPose(el, "cheer");
        setTimeout(() => {
          el.classList.remove("hop");
          setPose(el, reduced ? "idle" : "walk");
        }, 900);
      });
      track.append(el);
      addSprite(el);
    }
    // the main supporters walk along too, each with a name tag; while there are none, Piko holds up an empty one
    const walkers = TOP.length ? TOP : [null];
    walkers.forEach((s, i) => {
      const walker = document.createElement("span");
      walker.className = "walker";
      const link = s ? linkOf(s) : "#support";
      const tag = document.createElement(link ? "a" : "b");
      tag.className = `tag${s ? ` top-${i + 1}` : " free"}`;
      tag.tabIndex = -1; // the hero's strip carries the same links for keyboards and screen readers
      if (s) tag.textContent = String(s.name);
      else Object.assign(tag, { innerHTML: `<span data-t="tag-you">${D.t["tag-you"]}</span>` });
      if (link) Object.assign(tag, { href: link }, s ? { target: "_blank", rel: "nofollow ugc noopener" } : {});
      const el = document.createElement("span");
      el.className = "sprite-el";
      Object.assign(el.dataset, { char: s ? friendFor(String(s.name)) : "piko", pose: reduced ? "idle" : "walk", size: "2" });
      walker.append(tag, el);
      track.insertBefore(walker, track.children[copy * (keys.length + walkers.length) + 2 + i * 5] ?? null);
      addSprite(el);
    });
  }
}

// a visitor sees their own language when the site speaks it
const firstLang = savedLang() ?? (navigator.languages ?? [navigator.language]).map((tag) => tag.toLowerCase().split("-")[0]).find((id) => id in LANGUAGES) ?? "en";
if (firstLang !== "th") void setLang(firstLang);
