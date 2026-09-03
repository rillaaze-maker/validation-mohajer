/* ═══════════════════════════════════════════════════════════════════
   سنجه · shared runtime

   ARCHITECTURE NOTE — read this before extending.
   The platform is deliberately static so it can live on GitHub Pages with
   no server, no database and no cost. That has one real consequence:
   nothing is written to a central store. A session is recorded in the
   participant's own browser and leaves as an export — a downloaded JSON
   file or a copied blob. The researcher imports those into نتایج.

   `settings.webhook` on a study is the upgrade path: point it at any
   endpoint that accepts a POST (Formspree, a Sheet script, your own API)
   and sessions post themselves automatically. Nothing else changes.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  const $  = (id) => document.getElementById(id);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  /* Persian digits everywhere except money and codes, matching how the
     rest of the team's material is written. */
  const FA = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  const fa = (v) => String(v).replace(/\d/g, d => FA[+d]);
  const pad = (n) => String(n).padStart(2, '0');
  const mmss = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    return fa(pad(Math.floor(s / 60)) + ':' + pad(s % 60));
  };
  const dateFa = (iso) => {
    try {
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(new Date(iso));
    } catch (e) { return iso; }
  };

  /* ── storage ───────────────────────────────────────────────────── */
  const NS = 'sanjeh.v1.';
  const store = {
    get(k, dflt) {
      try { const v = localStorage.getItem(NS + k); return v ? JSON.parse(v) : dflt; }
      catch (e) { return dflt; }
    },
    set(k, v) {
      try { localStorage.setItem(NS + k, JSON.stringify(v)); return true; }
      catch (e) { return false; }
    },
    del(k) { try { localStorage.removeItem(NS + k); } catch (e) {} },
    keys(prefix) {
      try {
        return Object.keys(localStorage)
          .filter(k => k.startsWith(NS + prefix))
          .map(k => k.slice(NS.length));
      } catch (e) { return []; }
    }
  };

  /* ── studies ───────────────────────────────────────────────────── */
  /* Bundled studies live in /studies as JSON so they are versioned in git
     and reviewable in a pull request. Studies made in the builder live in
     localStorage until exported. Both appear in the same list. */
  async function loadRegistry() {
    let bundled = [];
    try {
      const r = await fetch('./studies/index.json', { cache: 'no-store' });
      if (r.ok) bundled = await r.json();
    } catch (e) { /* opened from file:// — local studies still work */ }

    const out = [];
    for (const entry of bundled) {
      try {
        const r = await fetch('./studies/' + entry.file, { cache: 'no-store' });
        if (r.ok) { const s = await r.json(); s._source = 'bundled'; out.push(s); }
      } catch (e) {}
    }
    for (const k of store.keys('study.')) {
      const s = store.get(k); if (s) { s._source = 'local'; out.push(s); }
    }
    return out;
  }

  async function loadStudy(id) {
    const local = store.get('study.' + id);
    if (local) { local._source = 'local'; return local; }
    const all = await loadRegistry();
    return all.find(s => s.id === id) || null;
  }

  function saveStudy(s) {
    s.updatedAt = new Date().toISOString();
    return store.set('study.' + s.id, s);
  }

  function blankStudy() {
    return {
      id: 'study-' + Math.random().toString(36).slice(2, 8),
      name: '', product: '', prototypeUrl: '', icon: '◆',
      intro: '', createdAt: new Date().toISOString(),
      hypotheses: [], screener: { intro: '', questions: [] },
      tasks: [], postQuestions: [],
      settings: { webhook: '', deviceWidth: 390, deviceHeight: 844 }
    };
  }

  /* ── sessions ──────────────────────────────────────────────────── */
  const newCode = () =>
    'P-' + Math.random().toString(36).slice(2, 5).toUpperCase() +
    Math.floor(Math.random() * 90 + 10);

  function newSession(studyId, mode) {
    return {
      v: 1, studyId, mode: mode || 'unmoderated',
      code: newCode(), startedAt: new Date().toISOString(), endedAt: null,
      screener: { answers: {}, qualified: null, reasons: [] },
      tasks: [], answers: {}, notes: [], events: []
    };
  }
  const saveSession = (s) => store.set('session.' + s.studyId + '.' + s.code, s);
  function allSessions() {
    return store.keys('session.').map(k => store.get(k)).filter(Boolean);
  }

  /* ── export / import ───────────────────────────────────────────── */
  function download(name, text, type) {
    const blob = new Blob([text], { type: (type || 'application/json') + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const t = el('textarea'); t.value = text;
      t.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(t); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e2) {}
      t.remove(); return ok;
    }
  }
  /* Best-effort only: a webhook is optional and its failure must never
     cost the participant their session. The local copy is the record. */
  async function postWebhook(url, payload) {
    if (!url) return { sent: false, reason: 'no-webhook' };
    try {
      await fetch(url, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return { sent: true };
    } catch (e) { return { sent: false, reason: String(e) }; }
  }

  function toCSV(rows) {
    if (!rows.length) return '';
    const cols = [...rows.reduce((s, r) => { Object.keys(r).forEach(k => s.add(k)); return s; }, new Set())];
    const cell = (v) => {
      const s = v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return '﻿' + [cols.join(','), ...rows.map(r => cols.map(c => cell(r[c])).join(','))].join('\n');
  }

  /* ── theme ─────────────────────────────────────────────────────── */
  function initTheme() {
    const saved = store.get('theme');
    const sys = matchMedia('(prefers-color-scheme: dark)');
    const apply = (t) => {
      document.documentElement.setAttribute('data-theme', t);
      const b = $('theme-btn'); if (b) b.textContent = t === 'dark' ? '☾' : '☀';
    };
    apply(saved || (sys.matches ? 'dark' : 'light'));
    sys.addEventListener('change', e => { if (!store.get('theme')) apply(e.matches ? 'dark' : 'light'); });
    global.toggleTheme = () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      store.set('theme', next); apply(next);
    };
  }

  /* ── chrome ────────────────────────────────────────────────────── */
  function topbar(active) {
    const nav = [
      ['index.html', 'مطالعه‌ها'],
      ['builder.html', 'ساخت مطالعه'],
      ['console.html', 'کنسول جلسه'],
      ['results.html', 'نتایج'],
      ['guide.html', 'راهنما']
    ];
    return `<div class="topbar no-print"><div class="in">
      <a class="brand" href="index.html"><span class="mk">س</span>سنجه<small>پلتفرم تست</small></a>
      <nav class="topnav">${nav.map(([h, t]) =>
        `<a href="${h}"${h === active ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
      <button id="theme-btn" class="btn btn-ghost btn-sm" onclick="toggleTheme()" aria-label="تم">☀</button>
    </div></div>`;
  }
  function mountChrome(active) {
    document.body.insertAdjacentHTML('afterbegin', topbar(active));
    initTheme();
  }

  /* ── the layer model ────────────────────────────────────────────
     The question every round has to answer is not "did they like it" but
     WHICH LAYER stopped them. A stop caused by not understanding the point
     is a value problem; not knowing how is a usability problem; knowing how
     but not daring is trust; daring but not caring is motivation. They need
     completely different fixes, and averaging them together hides all four.

     These are asked after every task, in every study, identical wording —
     so answers stay comparable across tasks, studies and rounds. They are
     built in, not authored, which is also why making a study is now short. */
  const LAYERS = {
    value:      { label: 'ارزش',        color: '#7C4DBC', fix: 'پیام و جایگاه محصول' },
    usability:  { label: 'کاربردپذیری', color: '#2E7DD1', fix: 'جریان و رابط کاربری' },
    trust:      { label: 'اعتماد',      color: '#C4562B', fix: 'اثبات، کنترل و پشتوانه' },
    motivation: { label: 'انگیزه',      color: '#8A8F98', fix: 'انتخاب سگمنت یا wedge' }
  };

  const STOP_Q = {
    id: '_stop',
    text: 'اگر جایی مکث کردید، نزدیک‌ترین دلیلش کدام بود؟',
    options: [
      { label: 'جایی گیر نکردم',                     layer: null },
      { label: 'نفهمیدم اصلاً به چه دردم می‌خورد',    layer: 'value' },
      { label: 'فهمیدم، ولی نمی‌دانستم چطور انجامش دهم', layer: 'usability' },
      { label: 'بلد بودم، ولی مطمئن نبودم',           layer: 'trust' },
      { label: 'مطمئن بودم، ولی برایم مهم نبود',      layer: 'motivation' }
    ]
  };

  const GO_Q = {
    id: '_go',
    text: 'اگر واقعی بود، ادامه می‌دادید؟',
    options: [
      { label: 'بله', v: 'yes' },
      { label: 'شاید', v: 'maybe' },
      { label: 'نه', v: 'no' }
    ]
  };

  /* Counts stops by layer across every session, and names the bottleneck.
     Deliberately refuses to answer below three qualified sessions. */
  function layerTally(sessions){
    const t = { value: 0, usability: 0, trust: 0, motivation: 0, clean: 0 };
    let total = 0;
    sessions.forEach(s => (s.tasks || []).forEach(task => {
      if (!task.stop) return;
      total++;
      if (task.stop === 'none') t.clean++; else if (t[task.stop] != null) t[task.stop]++;
    }));
    const stops = total - t.clean;
    const ranked = Object.keys(LAYERS)
      .map(k => ({ k, n: t[k], pct: stops ? Math.round(t[k] / stops * 100) : 0 }))
      .sort((a, b) => b.n - a.n);
    return { t, total, stops, ranked, top: ranked[0] && ranked[0].n ? ranked[0] : null };
  }

  function goTally(sessions){
    const g = { yes: 0, maybe: 0, no: 0 };
    sessions.forEach(s => (s.tasks || []).forEach(t => { if (t.go && g[t.go] != null) g[t.go]++; }));
    return g;
  }

  const qs = (k) => new URLSearchParams(location.search).get(k);

  global.App = {
    $, $$, el, esc, fa, mmss, dateFa, store, qs,
    loadRegistry, loadStudy, saveStudy, blankStudy,
    newSession, saveSession, allSessions, newCode,
    download, copy, postWebhook, toCSV, mountChrome, initTheme,
    LAYERS, STOP_Q, GO_Q, layerTally, goTally
  };
})(window);
