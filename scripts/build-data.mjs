/* Générateur de data.json — Briefing du Matin
   Exécuté par GitHub Actions (Node 20, aucune dépendance).
   Récupère les flux RSS des rubriques par défaut, les normalise et écrit
   data.json à la racine du dépôt, servi ensuite par GitHub Pages.
   Schéma : { updatedAt: <ms>, sections: { <id>: { items:[{title,link,source,date,feed}], errors:<n> } } } */

const MAX_ITEMS = 12;

const gn = (q, lang) => lang === "en"
  ? `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`
  : `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=fr&gl=FR&ceid=FR:fr`;

const SECTIONS = [
  { id: "politique", feeds: [
      { label: "FR", url: gn("politique française") },
      { label: "EN", url: gn("French politics government France", "en") },
  ]},
  { id: "monde", feeds: [
      { label: "France 24", url: "https://www.france24.com/fr/rss" },
      { label: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  ]},
  { id: "deces", feeds: [
      { label: "FR", url: gn('("est décédé" OR "est morte" OR "nous a quittés") when:3d') },
      { label: "EN", url: gn('("has died" OR "dies at" OR obituary) when:3d', "en") },
  ]},
  { id: "cinema", feeds: [
      { label: "FR", url: gn('("sortie cinéma" OR "en salles" OR "nouveau film") when:7d') },
      { label: "EN", url: gn('("box office" OR "movie release" OR "in theaters") when:7d', "en") },
  ]},
  { id: "musique", feeds: [
      { label: "FR", url: gn('("nouvel album" OR "nouveau single") when:7d') },
      { label: "EN", url: gn('("new album" OR "album release") when:7d', "en") },
  ]},
  { id: "expos", feeds: [
      { label: "Lyon", url: gn("(exposition OR vernissage OR biennale OR festival) Lyon when:14d") },
      { label: "Paris", url: gn("(exposition OR vernissage OR biennale OR festival) Paris when:14d") },
  ]},
  { id: "tech", feeds: [
      { label: "FR", url: gn("(intelligence artificielle OR découverte scientifique OR innovation) when:2d") },
      { label: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  ]},
  { id: "eco", feeds: [
      { label: "FR", url: gn("(économie OR inflation OR bourse) France when:2d") },
      { label: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  ]},
];

/* ── Utilitaires ── */

const clean = (s) => String(s || "")
  .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
  .replace(/<[^>]+>/g, "")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&")
  .trim();

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? clean(m[1]) : "";
}

function parseFeed(xml) {
  const blocks = [...xml.matchAll(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi)].map((m) => m[0]);
  return blocks.map((b) => {
    let link = tag(b, "link");
    if (!link) {
      const alt = [...b.matchAll(/<link[^>]*href=["']([^"']+)["'][^>]*>/gi)]
        .find((m) => /rel=["']alternate["']|href=/.test(m[0]) && m[1].startsWith("http"));
      link = alt ? alt[1] : "";
    }
    const dRaw = tag(b, "pubDate") || tag(b, "published") || tag(b, "updated");
    return {
      title: tag(b, "title"),
      link,
      source: tag(b, "source"),
      date: dRaw ? (Date.parse(dRaw.replace(/\s+([+-]\d{2})(\d{2})/, " GMT$1:$2")) || 0) : 0,
    };
  }).filter((i) => i.title && i.link);
}

function splitSource(item) {
  if (item.source) return item;
  const m = item.title.match(/^(.*)\s+-\s+([^-]{2,40})$/);
  if (m) { item.title = m[1].trim(); item.source = m[2].trim(); }
  return item;
}

async function fetchFeed(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { "user-agent": "Mozilla/5.0 (briefing-matin feed fetcher)" },
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    if (!text || text.length < 40) throw new Error("Réponse vide");
    const items = parseFeed(text);
    if (!items.length) throw new Error("Aucun élément");
    return items;
  } finally { clearTimeout(t); }
}

async function pool(tasks, limit) {
  const results = new Array(tasks.length); let i = 0;
  async function run() { while (i < tasks.length) { const idx = i++; results[idx] = await tasks[idx](); } }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, run));
  return results;
}

/* ── Main ── */

const entries = await pool(SECTIONS.map((s) => async () => {
  let items = [], errors = 0;
  for (let i = 0; i < s.feeds.length; i++) {
    try {
      const got = await fetchFeed(s.feeds[i].url);
      got.map(splitSource).forEach((it) => { it.feed = s.feeds[i].label; items.push(it); });
    } catch (e) { console.error(s.id, s.feeds[i].label, e.message); errors++; }
  }
  const seen = new Set();
  items = items.filter((it) => {
    const k = it.title.toLowerCase();
    if (seen.has(k)) return false; seen.add(k); return true;
  });
  items.sort((a, b) => b.date - a.date);
  return [s.id, { items: items.slice(0, MAX_ITEMS), errors }];
}), 4);

const sections = {}; entries.forEach(([id, r]) => { sections[id] = r; });
const out = { updatedAt: Date.now(), sections };

const fs = await import("node:fs");
fs.writeFileSync("data.json", JSON.stringify(out));
console.log("data.json généré :",
  Object.entries(sections).map(([k, v]) => `${k}=${v.items.length}(${v.errors}err)`).join(" "), out.updatedAt);
