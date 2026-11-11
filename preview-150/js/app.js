/* Voxarc Feed: bundled native app UI. Reading needs no account; optional accounts and social features live in js/social.js (1.2.0). */
(function () {
  'use strict';
  var CFG = {
    remoteFeed: 'https://raw.githubusercontent.com/voxarclab-byte/voxarc-daily-media/main/app/feed.json', // live updates; bundled + cached content is used when unavailable
    privacyUrl: 'https://voxarclab-byte.github.io/voxarc-feed-web/privacy.html',
    contactUrl: 'https://voxarclab.io/contact',
    termsUrl: 'https://voxarclab.io/terms',
    guidelinesUrl: (window.VX_SUPABASE && window.VX_SUPABASE.guidelinesUrl) || 'https://voxarclab-byte.github.io/voxarc-feed-web/community-guidelines.html',
    webUrl: 'https://voxarclab.io',
    supportEmail: 'support@voxarc.io',
    maxAgeDays: 90, // Google Play News policy: show only content less than 3 months old
    siteUrl: 'https://voxarclab.io',
    feedbackEmail: 'support@voxarc.io',
    version: '1.5.0', // replaced on device by the native version (build) from App.getInfo()
    // Feature flags. marketOdds stays OFF until the Kalshi/Polymarket data-licence check, the Canadian legal review
    // and the App Store / Play age-rating re-check are done (first_run_spec.md, P1-9). Only a test or preview harness
    // can turn it on, through window.__VX_FLAGS set before this script runs; there is no user-facing switch.
    flags: { marketOdds: false, marketLinkOut: false, publicSocial: true },
    // 1.4.0: Stealth is the default. Public mode is opt-in per account; the server (RLS) enforces it for comments, citations and Tracked by.
    defaultVisibility: 'STEALTH'
  };
  (function () { var o = window.__VX_FLAGS; if (o && typeof o === 'object') for (var k in CFG.flags) if (typeof o[k] === 'boolean') CFG.flags[k] = o[k]; })();
  // First-run personalization choices. Stored on this device only (vx.profile); nothing is sent anywhere.
  var OB_TOPICS = [
    { id: 'arctic', label: 'Arctic', d: 'Sovereignty, shipping lanes, defence and northern infrastructure', ic: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9' },
    { id: 'ai', label: 'AI policy', d: 'Compute, export controls, sovereign AI and regulation', ic: 'M8 8h8v8H8zM10 4v4M14 4v4M10 16v4M14 16v4M4 10h4M4 14h4M16 10h4M16 14h4' },
    { id: 'minerals', label: 'Critical minerals', d: 'Rare earths, permitting, stockpiles and the midstream', ic: 'M12 3l7 5-2.7 9H7.7L5 8z' },
    { id: 'geo', label: 'Geoeconomics', d: 'Trade, chokepoints, sanctions and industrial policy', ic: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z' }
  ];
  var OB_REGIONS = [
    { id: 'canada', label: 'Canadian North', re: /\b(canad|ottawa|nunavut|yukon|northwest territories|inuit|quebec|ontario|manitoba|labrador)/i },
    { id: 'nordics', label: 'Greenland and Nordics', re: /\b(greenland|denmark|danish|norw|iceland|swed|finland|finnish|nordic|svalbard|faroe)/i },
    { id: 'us', label: 'Alaska and US', re: /\b(Alaska|United States|Washington|Congress|Pentagon|American|White House|US|U\.S\.)(?![a-z])/ },
    { id: 'eu', label: 'European Union', re: /\b(EU|european|brussels|commission|europe)\b/ },
    { id: 'global', label: 'Global', re: null }
  ];
  var OB_ROLES = [
    { id: 'procurement', label: 'Procurement' },
    { id: 'supply_chain', label: 'Supply chain' },
    { id: 'analyst', label: 'Analyst' },
    { id: 'legal', label: 'Legal' },
    { id: 'other', label: 'Other' },
    { id: 'investor', label: 'Investor' },
    { id: 'energy', label: 'Mining and energy' },
    { id: 'gov', label: 'Government' },
    { id: 'indigenous', label: 'Indigenous organization' },
    { id: 'research', label: 'Researcher or journalist' }
  ];
  // Topic chips. 'all' is the For you view: only the topics this device follows (Week 4).
  var TOPICS = [
    { id: 'all', label: 'For you', ic: 'M12 3.5l2.3 5.2 5.7.5-4.3 3.8 1.3 5.6L12 15.7l-5 2.9 1.3-5.6L4 9.2l5.7-.5z' },
    { id: 'arctic', label: 'Arctic', ic: OB_TOPICS[0].ic },
    { id: 'ai', label: 'AI policy', ic: OB_TOPICS[1].ic },
    { id: 'minerals', label: 'Critical minerals', ic: OB_TOPICS[2].ic },
    { id: 'geo', label: 'Geoeconomics', ic: OB_TOPICS[3].ic }
  ];
  // Week 4 topic desks: one factual focus line per desk, shown under its title.
  var DESK_FOCUS = {
    arctic: 'Sovereignty, shipping and subsea infrastructure',
    ai: 'Compute, export controls and AI regulation',
    minerals: 'Supply, prices, stockpiles and processing',
    geo: 'Sanctions, trade controls, energy and chokepoints'
  };
  // Why each desk's data card is there. Plain context, no figures: every number on a desk card comes from its source.
  var DESK_NOTE = {
    arctic: 'Sea-ice cover sets the length of the Arctic shipping season.',
    ai: 'Final rules from the US Bureau of Industry and Security, which sets chip and AI export controls.',
    minerals: 'Monthly average prices for three industrial metals used in grids, batteries and vehicles.',
    geo: 'US export-control rules decide who can buy chips, tools and dual-use goods.'
  };
  // Used only when a feed has no top-level dataCards (an older remote feed): the same mapping as scripts/vxcontent.py.
  var DESK_FALLBACK = { arctic: ['nsidc-ice'], minerals: ['wb-copper', 'wb-nickel', 'wb-aluminum'], ai: ['bis-rules'], geo: ['bis-rules'] };
  var DESK_TITLE = { minerals: 'Metal prices' };
  var TOPIC_LABEL = { arctic: 'Arctic', ai: 'AI policy', minerals: 'Critical minerals', geo: 'Geoeconomics' };
  var CATEGORIES = ['ai', 'arctic', 'minerals', 'geo']; // the only values allowed in a cover-* class name
  var NOTIF_ID = 1001;
  // On-device reactions only: stored with Preferences/localStorage, never sent anywhere.
  var REACTIONS = [
    { id: 'useful', emoji: '\uD83D\uDCA1', label: 'Useful' },
    { id: 'not_useful', emoji: '\uD83D\uDC4E', label: 'Not useful' }
  ];

  var Cap = window.Capacitor;
  var isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  var P = (Cap && Cap.Plugins) || {};
  function plugin(n) { return isNative && P[n] ? P[n] : null; }

  var S = {
    items: [], reposts: {}, sigSort: 'top', fImp: 'all', fHz: 'all', trends: null, tab: 'feed', topic: 'all', query: '', searchOpen: false,
    saved: [], read: {}, reactions: {}, signalFeedback: {}, watchlist: {}, watchRules: [], watchSeen: {}, privateNotes: {}, privacyPublicShare: false, visibilityMode: 'STEALTH', savedView: 'saved', current: null, online: true, dense: false, fJuris: 'all', fMineral: 'all', fStage: 'all', fImpact: 'all', fScore: 'all', fHorizon: 'all', fGeo: 'all', fIndustry: 'all', namedViews: [],
    subtopic: '', topicQuery: '', sigQuery: '', shareBusy: false,
    prefs: { fs: 17, notif: false, hour: 7, minute: 0 }, feedSource: 'bundled', updated: null,
    booting: true, loadError: false, onboarded: true, profile: null, ob: null, rendered: false,
    follow: ['arctic', 'ai', 'minerals', 'geo'], cards: [], setView: null, tipDone: false
  };

  /* ---------- storage (Preferences on device, localStorage on web) ---------- */
  var store = {
    get: function (k) {
      var pr = plugin('Preferences');
      if (pr) return pr.get({ key: k }).then(function (r) { return r && r.value ? JSON.parse(r.value) : null; }).catch(function () { return null; });
      try { var v = localStorage.getItem(k); return Promise.resolve(v ? JSON.parse(v) : null); } catch (e) { return Promise.resolve(null); }
    },
    set: function (k, v) {
      var s = JSON.stringify(v); var pr = plugin('Preferences');
      if (pr) return pr.set({ key: k, value: s }).catch(function () {});
      try { localStorage.setItem(k, s); } catch (e) {}
      return Promise.resolve();
    }
  };

  /* ---------- helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function markup(s) { return esc(s).replace(/\[\[(.+?)\]\]/g, '<em>$1</em>'); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function d(iso) { return new Date(iso); }
  function fmtDate(iso) {
    var x = d(iso), now = new Date();
    var day = new Date(x.getFullYear(), x.getMonth(), x.getDate()), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var diff = Math.round((today - day) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return MON[x.getMonth()] + ' ' + x.getDate() + (x.getFullYear() !== now.getFullYear() ? ', ' + x.getFullYear() : '');
  }
  function longDate(dt) { return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dt.getDay()] + ', ' + MON[dt.getMonth()] + ' ' + dt.getDate(); }
  function byId(id) { for (var i = 0; i < S.items.length; i++) if (S.items[i].id === id) return S.items[i]; return null; }
  function readMins(i) { return Math.max(1, parseInt(i.readMinutes, 10) || 1); }
  function category(i) {
    if (CATEGORIES.indexOf(i.primary) >= 0) return i.primary;
    var t = (i.topics || []).filter(function (x) { return CATEGORIES.indexOf(x) >= 0; })[0];
    return t || 'ai';
  }
  function isSaved(id) { return S.saved.indexOf(id) >= 0; }
  function reactionOf(id) { var r = S.reactions[id]; return r && r.r ? r.r : null; }
  function wide() { return window.matchMedia('(min-width: 900px)').matches; }
  function haptic(style) { var h = plugin('Haptics'); if (h) h.impact({ style: style || 'LIGHT' }).catch(function () {}); }
  function reducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  var toastT;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2200); }
  function safeUrl(url) { return typeof url === 'string' && /^https:\/\/[^\s]+$/i.test(url.trim()) ? url.trim() : null; }
  function openUrl(url) {
    url = safeUrl(url); if (!url) return; // only https:// links are opened; anything else is ignored
    var b = plugin('Browser');
    if (b) return b.open({ url: url, presentationStyle: 'popover', toolbarColor: '#E0541A' }).catch(function () {});
    window.open(url, '_blank', 'noopener');
  }
  var ICON = {
    cmt: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    repost: '<svg viewBox="0 0 24 24"><path d="M4 9V7a2 2 0 0 1 2-2h12l-3-3M20 15v2a2 2 0 0 1-2 2H6l3 3"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    bm: '<svg viewBox="0 0 24 24"><path d="M7 4h10v16l-5-3.5L7 20z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
    aa: '<svg viewBox="0 0 24 24"><path d="M3 19 8 6l5 13M4.8 15h6.4"/><path d="M14 19l3.5-8 3.5 8M15 16.5h5"/></svg>',
    saved: '<svg viewBox="0 0 24 24"><path d="M7 4h10v16l-5-3.5L7 20z"/></svg>',
    retry: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
    ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>',
    off: '<svg viewBox="0 0 24 24"><path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0"/><circle cx="12" cy="19" r="1"/></svg>'
  };

  /* ---------- content ---------- */
  function validFeed(f) { return f && Array.isArray(f.items) && f.items.length && f.items.every(function (i) { return i && i.id && i.title && i.body; }); }
  function mergeFeeds(a, b) {
    var m = {}; (a || []).concat(b || []).forEach(function (i) { m[i.id] = m[i.id] && m[i.id].signal && !i.signal ? m[i.id] : i; });
    return Object.keys(m).map(function (k) { return m[k]; }).filter(isFresh).sort(function (x, y) { return d(y.published) - d(x.published); });
  }
  function isFresh(i) { var t = d(i && i.published).getTime(); return isFinite(t) && Date.now() - t <= CFG.maxAgeDays * 86400000; }
  function loadBundled() {
    return fetch('data/feed.json').then(function (r) { return r.json(); }).catch(function () { return null; });
  }
  function refreshRemote(manual) {
    if (!S.online) { if (manual) toast('You are offline. Showing saved briefings.'); return Promise.resolve(false); }
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    return fetch(CFG.remoteFeed + '?t=' + Date.now(), { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (t) { return JSON.parse(t); })
      .then(function (f) {
        clearTimeout(t); if (!validFeed(f)) throw 0;
        var before = S.items.length, had = {}; S.items.forEach(function (x) { had[x.id] = 1; }); S.items = mergeFeeds(S.items, f.items).filter(isPublished);
        topicAlert(f.items.filter(function (x) { return x && !had[x.id] && inFollow(x); })); S.updated = new Date().toISOString(); if (f.generated && (!S.generated || f.generated > S.generated)) S.generated = f.generated; if (f.signalTrends) S.trends = f.signalTrends;
        if (Array.isArray(f.dataCards) && f.dataCards.length) S.cards = f.dataCards;
        syncTopicStatus();
        store.set('vx.feedCache', { items: S.items, updated: S.updated, dataCards: S.cards, generated: S.generated, signalTrends: S.trends });
        render(); var n = S.items.length - before;
        if (n > 0) spotlightIndex();
        if (manual) toast(n > 0 ? n + ' new briefing' + (n > 1 ? 's' : '') : 'You\u2019re up to date');
        var po = S.pendingOpen; S.pendingOpen = null;
        if (po && byId(po)) handleRoute({ route: 'open', id: po });
        return true;
      })
      .catch(function () { clearTimeout(t); S.pendingOpen = null; if (manual) toast('Showing the latest saved briefings'); return false; });
  }

  /* ---------- personalization ---------- */
  function hay(i) { return [i.title, i.kicker, i.summary, i.body].join(' '); }
  function quality(i) { return (i.stat && i.stat.value ? 1 : 0) + ((i.sources || []).length ? 1 : 0) + ((i.keyPoints || []).length ? 1 : 0); }
  function matchReasons(i) {
    var p = S.profile || {}, out = [];
    (followsAll() ? [] : S.follow).forEach(function (t) { if ((i.topics || []).indexOf(t) >= 0 && TOPIC_LABEL[t]) out.push(TOPIC_LABEL[t]); });
    var h = hay(i);
    (p.regions || []).forEach(function (r) { var R = OB_REGIONS.filter(function (x) { return x.id === r; })[0]; if (R && R.re && R.re.test(h)) out.push(R.label); });
    return out;
  }
  // Today's signals: ranked by match to the user's choices, briefing quality (stat, sources, key points) and recency.
  function topSignals(n) {
    var now = Date.now();
    var scored = S.items.filter(inFollow).map(function (i) {
      var age = Math.max(0, (now - d(i.published)) / 86400000);
      var m = matchReasons(i).length;
      return { i: i, s: Math.min(m, 2) * 2.5 + quality(i) * 1.5 + 8 * Math.exp(-age / 7) };
    }).filter(function (x) { return x.i.stat && x.i.stat.value; });
    var strong = scored.filter(function (x) { return (x.i.sources || []).length; });
    var pool = strong.length >= n ? strong : scored;
    pool.sort(function (a, b) { return b.s - a.s; });
    return pool.slice(0, n).map(function (x) { return x.i; });
  }

  /* ---------- Week 4: followed topics, freshness and desk data ---------- */
  // Followed topics live on this device only (vx.follow). Users may pin any number, from one to all 13.
  var DESK_ORDER = ['arctic', 'ai', 'minerals', 'geo'];
  var TAX = window.VX_TAXONOMY || [];
  var RECOMMENDED = window.VX_TOPIC_RECOMMENDED || ['arctic-security', 'ai-governance', 'critical-minerals'];
  function canonKey(id) {
    if (id === 'arctic' || id === 'arctic-security') return 'arctic';
    if (id === 'ai' || id === 'ai-governance') return 'ai';
    if (id === 'minerals' || id === 'critical-minerals') return 'minerals';
    if (id === 'geo') return 'geo';
    return id;
  }
  function taxGroup(id) {
    var i;
    for (i = 0; i < TAX.length; i++) if (TAX[i].id === id) return TAX[i];
    var mapped = { arctic: 'arctic-security', ai: 'ai-governance', minerals: 'critical-minerals' }[id];
    if (!mapped) return null;
    for (i = 0; i < TAX.length; i++) if (TAX[i].id === mapped) return TAX[i];
    return null;
  }
  function canonId(id) {
    if (id === 'arctic' || id === 'arctic-security') return 'arctic-security';
    if (id === 'ai' || id === 'ai-governance') return 'ai-governance';
    if (id === 'minerals' || id === 'critical-minerals') return 'critical-minerals';
    if (id === 'geo') return 'geo';
    var g = taxGroup(id);
    return g ? g.id : null; // active and Coming soon are both followable
  }
  function topicLabel(id) {
    if (id === 'all') return 'Overview';
    if (id === 'geo') return 'Geoeconomics';
    var g = taxGroup(id);
    if (g) return g.label;
    return TOPIC_LABEL[id] || id;
  }
  function cleanFollow(a) {
    var o = [], seen = {};
    (Array.isArray(a) ? a : []).forEach(function (t) {
      var id = canonId(t);
      if (!id || seen[id]) return;
      seen[id] = 1; o.push(id);
    });
    return o;
  }
  function catalogIds() { return TAX.map(function (g) { return g.id; }).concat(['geo']); }
  function followsAll() {
    var have = {};
    S.follow.forEach(function (t) { have[canonKey(t)] = 1; });
    return CATEGORIES.every(function (t) { return have[t]; });
  }
  function followsEveryTopic() { return catalogIds().every(function (id) { return isFollowed(id); }); }
  function isFollowed(t) { var k = canonKey(t); return S.follow.some(function (x) { return canonKey(x) === k; }); }
  function topicHit(i, id) {
    var topics = i.topics || [], k = canonKey(id);
    if (k === 'arctic' || k === 'ai' || k === 'minerals' || k === 'geo') return topics.indexOf(k) >= 0 || topics.indexOf(id) >= 0;
    return topics.indexOf(id) >= 0;
  }
  function subtopicOf(sid) {
    var found = null;
    TAX.forEach(function (g) { (g.subs || []).forEach(function (s) { if (s.id === sid) found = s; }); });
    return found;
  }
  function subtopicHit(i, sid) {
    var s = subtopicOf(sid); if (!s) return true;
    var terms = (s.terms && s.terms.length ? s.terms : [s.label]).map(function (t) { return String(t).toLowerCase(); });
    var g = i.signal || {};
    var hay = [i.title, i.summary, i.body, g.crux, g.signal_title, g.so_what].join(' ').toLowerCase();
    return terms.some(function (t) { return t && hay.indexOf(t) >= 0; });
  }
  // Following every legacy desk shows every briefing, including ones without a topic tag.
  function inFollow(i) { return followsAll() || S.follow.some(function (t) { return topicHit(i, t); }); }
  function setFollow(list) {
    var next = cleanFollow(list);
    if (!next.length) next = cleanFollow(DESK_ORDER);
    S.follow = next;
    store.set('vx.follow', { topics: S.follow, pins: S.follow.slice(), t: Date.now(), v: 2 });
  }
  function followLabel() { return followsEveryTopic() ? 'All ' + catalogIds().length + ' topics' : joinList(S.follow.map(function (t) { return topicLabel(t); })); }
  function agoText(ms) {
    var m = Math.floor(ms / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
    var dd = Math.floor(h / 24); if (dd < 7) return dd + 'd ago';
    return null;
  }
  // "3 new this week · updated 2h ago", from the real publication times. Future-dated items are not counted.
  function freshness(list, now) {
    now = now || Date.now();
    var times = list.map(function (i) { return d(i.published).getTime(); }).filter(function (t) { return isFinite(t) && t <= now + 300000; });
    var wk = times.filter(function (t) { return now - t < 7 * 86400000; }).length;
    var parts = [wk ? wk + ' new this week' : 'Nothing new this week'];
    if (times.length) { var last = Math.max.apply(null, times), a = agoText(Math.max(0, now - last)); parts.push('updated ' + (a || fmtDate(new Date(last).toISOString()))); }
    return { week: wk, text: parts.join(' \u00B7 ') };
  }
  function deskItems(t) { return S.items.filter(function (i) { return topicHit(i, t); }); }
  // Coverage status is data-driven: a Coming soon group goes live as soon as the feed carries a signal tagged with its id
  // (the signal pipeline tags items with taxonomy ids, Nov 10, 2026). No app release is needed when a topic goes live.
  function syncTopicStatus() {
    TAX.forEach(function (g) {
      if (g.status === 'active' && !g.liveFromFeed) return;
      var live = S.items.some(function (i) { return (i.topics || []).indexOf(g.id) >= 0; });
      if (live) { g.status = 'active'; g.liveFromFeed = true; } else if (g.liveFromFeed) { g.status = 'coming'; g.liveFromFeed = false; }
    });
  }
  // A desk's data cards: from the feed's dataCards (each lists its desks), else the same cards attached to briefings.
  function deskCards(t) {
    var key = canonKey(t);
    var src = S.cards.filter(function (c) { return c && Array.isArray(c.desks) && (c.desks.indexOf(t) >= 0 || c.desks.indexOf(key) >= 0); });
    if (!S.cards.length) {
      var by = {}; S.items.forEach(function (i) { var c = i.dataCard; if (c && typeof c === 'object' && c.id && !by[c.id]) by[c.id] = c; });
      src = (DESK_FALLBACK[t] || DESK_FALLBACK[key] || []).map(function (id) { return by[id]; }).filter(Boolean);
    }
    return src.map(function (c) { return cardOf({ dataCard: c }); }).filter(Boolean);
  }
  function deskHeroHTML(t) {
    var cs = deskCards(t); if (!cs.length) return '';
    var cites = [], links = [];
    cs.forEach(function (c) { var x = c.source + ' \u00B7 as of ' + c.asOf + (c.license ? ' \u00B7 ' + c.license : ''); if (cites.indexOf(x) < 0) cites.push(x); if (c.url && links.indexOf(c.url) < 0) links.push(c.url); });
    var cite = cites.map(function (x) { return esc('Source: ' + x); }).join('<br>');
    var h = '<section class="deskhero' + (S.rendered ? '' : ' in') + '" role="figure" aria-label="' + esc(topicLabel(t) + ' data. ' + cs.map(function (c) { return c.title + ': ' + c.value + ' ' + c.unit + (c.change ? ', ' + c.change : ''); }).join('. ') + '. ' + cites.map(function (x) { return 'Source: ' + x; }).join('. ')) + '">';
    if (cs.length === 1) {
      var c = cs[0];
      h += '<div class="dh-k">Desk data \u00B7 ' + esc(c.title) + '</div><div class="dh-main"><div class="dh-v"><b>' + esc(c.value) + '</b><span>' + esc(c.unit) + '</span></div>' +
        (c.change ? '<div class="dh-c">' + esc(c.change) + '</div>' : '') + '</div>' + chartSVG(c, 300, 64) + (c.seriesLabel ? '<div class="dh-sl">' + esc(c.seriesLabel) + '</div>' : '');
    } else {
      h += '<div class="dh-k">Desk data \u00B7 ' + esc(DESK_TITLE[t] || DESK_TITLE[canonKey(t)] || topicLabel(t)) + '</div><ul class="dh-rows">' + cs.map(function (c) {
        return '<li><span class="dh-rt">' + esc(c.title.replace(/\s+price$/i, '')) + '</span><span class="dh-rv"><b>' + esc(c.value) + '</b> ' + esc(c.unit) + '</span>' + chartSVG(c, 90, 26) + (c.change ? '<span class="dh-rc">' + esc(c.change) + '</span>' : '') + '</li>';
      }).join('') + '</ul>' + (cs[0].seriesLabel ? '<div class="dh-sl">' + esc(cs[0].seriesLabel) + '</div>' : '');
    }
    if (DESK_NOTE[t] || DESK_NOTE[canonKey(t)]) h += '<p class="dh-note">' + esc(DESK_NOTE[t] || DESK_NOTE[canonKey(t)]) + '</p>';
    h += '<div class="dc-src dh-src">' + cite + '</div>';
    if (links[0]) h += '<button class="dc-link" data-url="' + esc(links[0]) + '">Open the data source' + ICON.ext + '</button>';
    return h + '</section>';
  }
  function topicIcon(ic, cls) { return '<svg class="' + (cls || 'chip-ic') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + ic + '"/></svg>'; }

  /* ---------- market odds badge (feature flag, OFF by default) ---------- */
  // Data shape: item.market = { source: 'Kalshi'|'Polymarket', url, question, probability (0..1), updated (ISO), sensitive? }.
  // Shown only on geopolitical briefings with a matching, fresh (< 24 h), non-sensitive market. Display and link-out only:
  // no betting, no accounts, no affiliate links.
  var MARKET_SOURCES = { kalshi: 'Kalshi', polymarket: 'Polymarket' };
  function marketOf(i) {
    if (!CFG.flags.marketOdds || !i || (i.topics || []).indexOf('geo') < 0) return null;
    var m = i.market || (window.__VX_MARKETS && window.__VX_MARKETS[i.id]); // __VX_MARKETS: mock data injected by the test/preview harness only
    if (!m || typeof m !== 'object' || m.sensitive) return null;
    var src = MARKET_SOURCES[String(m.source || '').toLowerCase()]; var p = Number(m.probability); var up = d(m.updated);
    if (!src || !(p >= 0 && p <= 1) || isNaN(up) || Date.now() - up > 86400000 || Date.now() - up < -300000) return null;
    return { source: src, url: safeUrl(m.url), question: String(m.question || ''), pct: Math.round(p * 100), updated: up, mock: !!m.mock };
  }
  // Link-out is suppressed where trading on that venue is restricted. The app collects no location, so the device time
  // zone is used as a coarse, on-device signal: Canada (all provinces, conservatively) and, for Polymarket, the US.
  function marketRestricted(src) {
    var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    var ca = /^America\/(Toronto|Montreal|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Moncton|Whitehorse|Yellowknife|Iqaluit|Glace_Bay|Goose_Bay|Swift_Current|Dawson_Creek|Fort_Nelson|Creston|Cambridge_Bay|Rankin_Inlet|Resolute|Inuvik|Dawson|Atikokan|Blanc-Sablon|Nipigon|Thunder_Bay|Rainy_River|Pangnirtung)$|^Canada\//.test(tz);
    var us = /^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Juneau|Sitka|Nome|Adak|Boise|Detroit|Indiana\/.*|Kentucky\/.*|North_Dakota\/.*|Menominee|Metlakatla|Yakutat)$|^Pacific\/Honolulu$|^US\//.test(tz);
    return ca || (src === 'Polymarket' && us);
  }
  function fmtClock(dt) { return fmtTime(dt.getHours(), dt.getMinutes()); }
  function marketHTML(i, full) {
    var m = marketOf(i); if (!m) return '';
    var lbl = m.pct + '% yes';
    var h = '<div class="mkt' + (full ? ' full' : '') + '" aria-label="Market odds: ' + esc(lbl) + ' on ' + esc(m.source) + ', as of ' + esc(fmtClock(m.updated)) + '">' +
      '<div class="mkt-top"><span class="mkt-k">Market odds' + (m.mock ? ' \u00B7 sample' : '') + '</span><span class="mkt-p">' + esc(lbl) + '</span></div>' +
      '<div class="mkt-bar" aria-hidden="true"><i style="width:' + m.pct + '%"></i></div>' +
      '<div class="mkt-meta">' + esc(m.source) + ' \u00B7 as of ' + esc(fmtClock(m.updated)) + (fmtDate(m.updated.toISOString()) === 'Today' ? '' : ', ' + esc(fmtDate(m.updated.toISOString()))) + '</div>';
    if (full) {
      if (m.question) h += '<div class="mkt-q">' + esc(m.question) + '</div>';
      if (CFG.flags.marketLinkOut && m.url && !marketRestricted(m.source)) h += '<button class="mkt-link" data-url="' + esc(m.url) + '">View market on ' + esc(m.source) + ICON.ext + '</button>';
      h += '<div class="mkt-note">Market odds, not advice. Voxarc Lab has no affiliation with ' + esc(m.source) + '.</div>';
    }
    return h + '</div>';
  }

  /* ---------- Week 2: So what, deadlines, primary sources, data cards ---------- */
  // All of these come from the feed file (built by scripts/build_content.py); every value is escaped and checked here
  // because a remote feed is untrusted input.
  function soWhatOf(i) {
    var w = i && i.soWhat; if (!w || typeof w !== 'object') return null;
    var o = { changed: String(w.changed || '').trim(), who: String(w.who || '').trim(), watch: String(w.watch || '').trim() };
    return o.changed && o.who && o.watch ? o : null;
  }
  function soWhatHTML(i, full) {
    var w = soWhatOf(i); if (!w) return '';
    var rows = [['What changed', w.changed], ['Who it affects', w.who], ['What to watch', w.watch]];
    return '<div class="sowhat' + (full ? ' full' : '') + '" role="group" aria-label="So what">' + (full ? '<h5>Action</h5>' : '<div class="sw-k">Action</div>') +
      rows.map(function (r) { return '<div class="sw-row"><span class="sw-l">' + r[0] + '</span><span class="sw-t">' + esc(r[1]) + '</span></div>'; }).join('') + '</div>';
  }
  var DL_TYPES = { comment: 1, consultation: 1, funding: 1, deadline: 1 }; // event and effective dates are shown in the reader only
  function todayISO() { var n = new Date(); return n.getFullYear() + '-' + ('0' + (n.getMonth() + 1)).slice(-2) + '-' + ('0' + n.getDate()).slice(-2); }
  function validDl(x) { return x && typeof x === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(String(x.date || '')) && typeof x.label === 'string' && x.label.length < 60; }
  function deadlinesOf(i, all) {
    var t = todayISO();
    return (Array.isArray(i.deadlines) ? i.deadlines : []).filter(function (x) { return validDl(x) && (all || (DL_TYPES[x.type] && x.date >= t)); })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  function dlDate(iso) { var p = iso.split('-'); return MON[+p[1] - 1] + ' ' + (+p[2]) + (+p[0] !== new Date().getFullYear() ? ', ' + p[0] : ''); }
  function daysTo(iso) { var p = iso.split('-'), t = new Date(), a = new Date(+p[0], +p[1] - 1, +p[2]), b = new Date(t.getFullYear(), t.getMonth(), t.getDate()); return Math.round((a - b) / 86400000); }
  function inDays(iso) { var n = daysTo(iso); return n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days'; }
  function dlChipHTML(i) {
    var x = deadlinesOf(i)[0]; if (!x) return '';
    var soon = daysTo(x.date) <= 14;
    return '<div class="dl-chip' + (soon ? ' soon' : '') + '" aria-label="Deadline: ' + esc(x.label) + ' ' + esc(dlDate(x.date)) + ', ' + inDays(x.date) + '"><b>Deadline</b><span>' + esc(x.label) + ' ' + esc(dlDate(x.date)) + ' \u00B7 ' + inDays(x.date) + '</span></div>';
  }
  function upcomingDeadlines(n) {
    var out = [];
    S.items.forEach(function (i) { var x = deadlinesOf(i)[0]; if (x && inFollow(i)) out.push({ i: i, x: x }); });
    out.sort(function (a, b) { return a.x.date < b.x.date ? -1 : a.x.date > b.x.date ? 1 : 0; });
    return out.slice(0, n);
  }
  function deadlinesSectionHTML(n) {
    var list = upcomingDeadlines(n || 4); if (!list.length) return '';
    return '<section class="dlsec" aria-labelledby="dl-h"><div class="dl-head"><h2 id="dl-h">Upcoming deadlines</h2><span>Comment periods, consultations and funding calls</span></div><ul class="dl-list">' +
      list.map(function (r) {
        var p = r.x.date.split('-');
        return '<li><button class="dl-row" data-open="' + esc(r.i.id) + '"><span class="dl-date" aria-hidden="true"><b>' + (+p[2]) + '</b>' + MON[+p[1] - 1] + '</span><span class="dl-body"><span class="dl-l">' + esc(r.x.label) + ' \u00B7 ' + inDays(r.x.date) + '</span><span class="dl-t">' + esc(r.i.title) + '</span>' +
          (r.i.primarySource ? '<span class="dl-s">' + esc(primaryName(r.i)) + '</span>' : '') + '</span></button></li>';
      }).join('') + '</ul></section>';
  }
  function primaryName(i) { var p = i.primarySource; return p && typeof p === 'object' && p.name ? String(p.name).slice(0, 60) : ''; }
  function primaryChipHTML(i) { var n = primaryName(i); return n ? '<span class="ps-chip">Primary source \u00B7 ' + esc(n) + '</span>' : ''; }
  // Batch 1 trust row: source, publish date, original link, verified only for official government domains. Nothing is shown when data is missing.
  var OFFICIAL_RE = /(^|\.)(gov|gc\.ca|canada\.ca|europa\.eu|gov\.cn|gov\.au|gov\.uk|gouv\.fr|bund\.de)$/i;
  function hostOf(u) { var m = /^https:\/\/([^\/?#:]+)/i.exec(u || ''); return m ? m[1].toLowerCase() : ''; }
  function isOfficialHost(h) { return !!h && (OFFICIAL_RE.test(h) || /\.gov$/.test(h) || /\.gov\.[a-z]{2}$/.test(h)); }
  function trustOf(i) {
    var src = (Array.isArray(i.sources) ? i.sources : []).filter(function (x) { return x && safeUrl(x.url); });
    var s0 = src.filter(function (x) { return isOfficialHost(hostOf(x.url)); })[0] || src[0];
    if (!s0) return null;
    var name = primaryName(i) && isOfficialHost(hostOf(s0.url)) ? primaryName(i) : String(s0.publisher || '').slice(0, 60);
    var date = /^\d{4}-\d{2}-\d{2}/.test(String(s0.date || '')) ? s0.date.slice(0, 10) : '';
    return { name: name, date: date, url: safeUrl(s0.url), verified: isOfficialHost(hostOf(s0.url)) };
  }
  function trustHTML(i) {
    var t = trustOf(i); if (!t || !t.name) return '';
    return '<div class="trust">' + '<span class="tr-src">Source: ' + esc(t.name) + (t.verified ? '<span class="tr-ok" role="img" aria-label="Verified official source" title="Official government source">' + ICON.check + '</span>' : '') + '</span>' +
      (t.date ? '<span class="tr-date">' + esc(dlDate(t.date)) + '</span>' : '') +
      '<button class="tr-link" data-url="' + esc(t.url) + '" aria-label="Open original document from ' + esc(t.name) + '">Original \u2197</button></div>';
  }
  function cardOf(i) {
    var c = i && i.dataCard; if (!c || typeof c !== 'object' || !c.title || !c.value || !c.source || !c.asOfLabel) return null;
    var ser = (Array.isArray(c.series) ? c.series : []).map(Number).filter(function (v) { return isFinite(v); }).slice(-40);
    return { title: String(c.title), value: String(c.value), unit: String(c.unit || ''), change: String(c.change || ''), kind: c.kind === 'count' ? 'count' : 'line', series: ser,
      seriesLabel: String(c.seriesLabel || ''), asOf: String(c.asOfLabel), source: String(c.source), license: String(c.license || ''), url: safeUrl(c.url) };
  }
  function chartSVG(c, W, H) {
    var s = c.series; if (s.length < 2) return '';
    W = W || 120; H = H || 34; var mn = Math.min.apply(null, s), mx = Math.max.apply(null, s), r = mx - mn || 1;
    if (c.kind === 'count') {
      var bw = W / s.length;
      return '<svg class="dc-chart" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true" preserveAspectRatio="none">' + s.map(function (v, k) { var h = mx ? Math.max(1.5, v / mx * (H - 2)) : 1.5; return '<rect x="' + (k * bw + 1).toFixed(1) + '" y="' + (H - h).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + h.toFixed(1) + '"' + (k === s.length - 1 ? ' class="last"' : '') + '/>'; }).join('') + '</svg>';
    }
    var pts = s.map(function (v, k) { return (k / (s.length - 1) * W).toFixed(1) + ',' + (H - 3 - (v - mn) / r * (H - 6)).toFixed(1); });
    return '<svg class="dc-chart" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true" preserveAspectRatio="none"><polyline points="' + pts.join(' ') + '"/><circle cx="' + pts[pts.length - 1].split(',')[0] + '" cy="' + pts[pts.length - 1].split(',')[1] + '" r="2.6"/></svg>';
  }
  function dataCardHTML(i, full) {
    var c = cardOf(i); if (!c) return '';
    var cite = 'Source: ' + c.source + ' \u00B7 as of ' + c.asOf;
    return '<div class="dcard' + (full ? ' full' : '') + '" role="figure" aria-label="' + esc(c.title + ': ' + c.value + ' ' + c.unit + '. ' + c.change + '. ' + cite) + '">' +
      '<div class="dc-top"><span class="dc-k">Data \u00B7 ' + esc(c.title) + '</span></div><div class="dc-mid"><div><b class="dc-v">' + esc(c.value) + '</b> <span class="dc-u">' + esc(c.unit) + '</span>' +
      (c.change ? '<div class="dc-c">' + esc(c.change) + '</div>' : '') + '</div>' + chartSVG(c) + '</div>' +
      '<div class="dc-src">' + esc(cite) + (full && c.license ? ' \u00B7 ' + esc(c.license) : '') + (full && c.seriesLabel ? '<br>' + esc(c.seriesLabel) : '') + '</div>' +
      (full && c.url ? '<button class="dc-link" data-url="' + esc(c.url) + '">Open the data source' + ICON.ext + '</button>' : '') + '</div>';
  }

  /* ---------- rendering ---------- */
  function filtered(list) {
    list = (list || []).filter(isPublished);
    var q = S.query.trim().toLowerCase();
    return list.filter(function (i) {
      if (i.signal && i.signal.duplicate_of) return false;
      var g = i.signal;
      if (S.fImp !== 'all' && (!g || g.importance !== S.fImp)) return false;
      if (S.fImpact !== 'all' && (!g || g.importance !== S.fImpact)) return false;
      if (S.fHz !== 'all' && (!g || g.time_horizon !== S.fHz)) return false;
      var pol = (g && g.policy) || {};
      if (S.fJuris !== 'all' && pol.jurisdiction !== S.fJuris) return false;
      if (S.fStage !== 'all' && pol.procedural_stage !== S.fStage) return false;
      if (S.fMineral !== 'all') {
        var hay2 = [i.title, i.summary, i.body, (g && g.signal_title) || '', (pol && pol.body) || ''].join(' ').toLowerCase();
        if (hay2.indexOf(S.fMineral) < 0) return false;
      }
      var hz = (pol && pol.time_horizon) || (g && g.time_horizon) || '';
      if (S.fHorizon !== 'all' && hz !== S.fHorizon) return false;
      if (S.fHz !== 'all' && hz !== S.fHz) return false;
      if (S.fScore !== 'all') {
        var sc = (pol && pol.impact_score_10 != null) ? +pol.impact_score_10 : ((g && g.impact_score != null) ? +g.impact_score / 10 : null);
        if (sc == null || sc < +S.fScore) return false;
      }
      if (S.fGeo !== 'all') {
        var geos = (pol && pol.geo_impact) || (g && g.affected_regions) || [];
        if (geos.indexOf(S.fGeo) < 0) return false;
      }
      if (S.fIndustry !== 'all') {
        var inds = (pol && pol.industry_impact) || [];
        if (inds.indexOf(S.fIndustry) < 0) return false;
      }
      if (S.topic !== 'all' && !topicHit(i, S.topic)) return false;
      if (S.subtopic && !subtopicHit(i, S.subtopic)) return false;
      if (S.topic === 'all' && !q && !inFollow(i)) return false;
      if (!q) return true;
      var topicHay = (i.topics || []).map(function (t) { var id = canonId(t) || t, g = taxGroup(id); return topicLabel(id) + ' ' + (g && g.aliases ? g.aliases.join(' ') : ''); }).join(' ');
      var hay = [i.title, i.kicker, i.summary, i.body, topicHay, (i.sources || []).map(function (s) { return s.publisher + ' ' + s.title; }).join(' ')].join(' ').toLowerCase();
      return q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; });
    });
  }
  // A card is a plain container: the headline is the one button that opens the briefing, and the actions are sibling
  // buttons, so there are no nested interactive controls for VoiceOver and TalkBack. Tapping anywhere else still opens it.
  function cardHTML(i, hero, n) {
    var sel = S.current === i.id && wide() ? ' sel' : '';
    var unread = !S.read[i.id];
    var meta = '<div class="meta">' + (unread ? '<span class="dot" aria-hidden="true"></span>' : '') + '<span>' + esc(fmtDate(i.published)) + ' \u00B7 ' + readMins(i) + ' </span><span class="sp"></span>' +
      '<span class="acts">' +
      '<button class="bm' + (isSaved(i.id) || watchOf(i.id) ? ' on' : '') + '" data-watch="' + esc(i.id) + '" aria-pressed="' + !!(isSaved(i.id) || watchOf(i.id)) + '" aria-label="' + (watchOf(i.id) ? 'Remove from Watchlist' : 'Add to Watchlist') + '">' + ICON.bm + '</button></span></div>';
    var style = n != null && n < 12 && !S.rendered ? ' style="--i:' + n + '"' : '';
    var head = '<button class="open" data-open="' + esc(i.id) + '"' + (unread ? ' aria-describedby="unread-l"' : '') + '><span class="kicker">' + esc(kickerOf(i)) + '</span><h3>' + esc(i.title) + '</h3></button>';
    var chips = (dlChipHTML(i) ? '<div class="cchips">' + dlChipHTML(i) + '</div>' : '') + (trustHTML(i) || srcLineHTML(i));
    var extra = soWhatHTML(i, false) + dataCardHTML(i, false) + expertHTML(i);
    if (hero) return '<div class="card hero' + sel + (S.rendered ? '' : ' in') + '" data-open="' + esc(i.id) + '"' + style + '>' + coverHTML(i, S.sigIds && S.sigIds.indexOf(i.id) >= 0) +
      head + chips + '<p>' + esc(i.summary) + '</p>' + extra + marketHTML(i, false) + meta + '</div>';
    return '<div class="card' + sel + (S.rendered ? '' : ' in') + '" data-open="' + esc(i.id) + '"' + style + '><div class="row"><div class="txt">' + head + chips + '<p>' + esc(i.summary) + '</p></div>' +
      (i.stat && i.stat.value ? '<div class="thumb stat-thumb" aria-hidden="true"><b>' + esc(i.stat.value) + '</b></div>' : '') + '</div>' + extra + marketHTML(i, false) + meta + '</div>';
  }
  var HZ_SHORT = { 'Near term': 'Near term \u00B7 <3 mo', 'Medium term': 'Medium \u00B7 3 to 12 mo', 'Long term': 'Long term \u00B7 >1 yr' };
  function lvl(x) { return String(x || '').toLowerCase(); }
  function sigBadge(g) { return '<span class="sg-imp ' + lvl(g.importance) + '"><b>Impact: ' + esc(g.importance) + '</b><span>' + (+g.impact_score) + '</span></span>'; }
  var INFO_BTN = '<button class="info-btn" data-sinfo="1" aria-label="What do these labels mean?">i</button>';
  function indHTML(g) {
    var a = (g && g.affected_sectors) || []; if (!a.length) return '';
    return '<div class="ind"><span class="ind-l">Related industries:</span>' + a.slice(0, 3).map(function (x) { return '<span class="sg-sec">' + esc(x) + '</span>'; }).join('') + (a.length > 3 ? '<span class="sg-sec more">+' + (a.length - 3) + '</span>' : '') + '</div>';
  }
  function infoSheet() {
    sheet('<h3>Reading a signal</h3>' +
      '<p><b>Impact</b> How much this shift matters to policy, markets and industry. Score 0 to 100: High is 65 and up, Medium 40 to 64, Low under 40.</p>' +
      '<p><b>Horizon</b> When effects are likely. Near term: under 3 months. Medium term: 3 to 12 months. Long term: over 1 year.</p>' +
      '<p><b>Related industries</b> The allied sectors most exposed to the change, so you can see who feels it first.</p>' +
      '<p><b>Risk and Opportunity</b> Downside and upside for those industries, from Low to Medium, High and Critical.</p>' +
      '<p><b>Confidence</b> 0 to 100, based on how many sources back the signal and whether they are official.</p>' +
      '<p class="sd-note">Ratings are Voxarc Lab editorial judgment on the cited sources.</p><button class="btn primary" data-closesheet>Got it</button>');
  }
  function tipHTML() {
    if (S.tipDone) return '';
    return '<div class="ftip" role="note"><div><b>New: signal badges</b><p><span class="hb high">Impact: High</span> shows how much a story matters. Horizon is when it bites. Related industries are the sectors it touches. Tap <span class="info-btn sm">i</span> on any card for the full key.</p></div><button class="ftip-x" data-tipdone aria-label="Dismiss tip">\u00D7</button></div>';
  }
  function repostOf(id) { return S.reposts[id] || null; }
  function saveReposts() { store.set('vx.reposts', S.reposts); }
  function shareSignalBtn(i) {
    return '<button type="button" class="share-signal" data-sharesignal="' + esc(i.id) + '" aria-label="Share Signal"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg><span>Share Signal</span></button>';
  }
  function watchBtn(i) {
    var on = !!watchOf(i.id) || isSaved(i.id);
    return '<button type="button" class="bm' + (on ? ' on' : '') + '" data-watch="' + esc(i.id) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Remove from Watchlist' : 'Add to Watchlist') + '">' + ICON.bm + '</button>';
  }
  function actRowHTML(i) {
    // One Share Signal action. No reaction, comment, repost or social-network row.
    return '<div class="pi-tools" role="group" aria-label="Signal actions">' + watchBtn(i) + shareSignalBtn(i) + '</div>';
  }
  var TOPIC_ART = {
    minerals: '<rect width="120" height="150" fill="#3a2e24"/><path d="M0 70 30 50 55 64 85 40 120 58V150H0z" fill="#5a4636"/><path d="M0 100 40 84 80 98 120 82V150H0z" fill="#2a211a"/><rect x="40" y="88" width="34" height="26" fill="#6b6f73"/><rect x="48" y="70" width="6" height="20" fill="#8a8f94"/><rect x="62" y="76" width="5" height="14" fill="#8a8f94"/><circle cx="96" cy="28" r="10" fill="#FF6B35" opacity=".55"/>',
    arctic: '<rect width="120" height="150" fill="#8fb3cc"/><rect y="92" width="120" height="58" fill="#3d6a88"/><path d="M0 104h30l8 4H0zM70 112h50v6H62z" fill="#e8f1f6"/><path d="M22 88h66l-8 14H30z" fill="#1d2630"/><rect x="40" y="72" width="26" height="16" fill="#f1f1f1"/><rect x="50" y="62" width="6" height="10" fill="#FF6B35"/><path d="M22 99h66" stroke="#c0392b" stroke-width="2"/>',
    ai: '<rect width="120" height="150" fill="#111"/><g fill="#222"><rect x="10" y="20" width="28" height="120"/><rect x="46" y="20" width="28" height="120"/><rect x="82" y="20" width="28" height="120"/></g><g fill="#FF6B35"><circle cx="16" cy="34" r="2"/><circle cx="52" cy="54" r="2"/><circle cx="88" cy="40" r="2"/><circle cx="16" cy="80" r="2"/><circle cx="52" cy="104" r="2"/><circle cx="88" cy="92" r="2"/></g><g stroke="#333"><path d="M12 46h24M48 70h24M84 60h24M12 96h24M48 118h24M84 110h24"/></g>',
    geo: '<rect width="120" height="150" fill="#2b2f3a"/><rect y="100" width="120" height="50" fill="#1a2230"/><g><rect x="8" y="80" width="22" height="10" fill="#FF6B35"/><rect x="30" y="80" width="22" height="10" fill="#3b6e8f"/><rect x="8" y="90" width="22" height="10" fill="#8a8f94"/><rect x="30" y="90" width="22" height="10" fill="#c0392b"/><rect x="60" y="86" width="22" height="14" fill="#3b6e8f"/></g><path d="M90 100V30h4v70M70 34h40" stroke="#d0a040" stroke-width="3" fill="none"/><path d="M100 34v24" stroke="#999"/>'
  };
  function topicPhotoFor(i) {
    var ids = (i.topics || []).map(function (t) { return canonId(t) || t; });
    ids.push(category(i));
    for (var k = 0; k < ids.length; k++) if (TOPIC_PHOTO[ids[k]]) return TOPIC_PHOTO[ids[k]];
    return TOPIC_PHOTO.geo;
  }
  function thumbHTML(i) {
    if (i.image && safeUrl(i.image)) return '<img class="hthumb" src="' + esc(i.image) + '" alt="">';
    if (localPhoto(i)) return '<img class="hthumb" src="' + esc(i.photo.src) + '" alt="" loading="lazy" decoding="async">';
    var src = topicPhotoFor(i);
    return src ? '<img class="hthumb" src="' + esc(src) + '" alt="">' : '<svg class="hthumb" viewBox="0 0 120 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + (TOPIC_ART[category(i)] || TOPIC_ART.geo) + '</svg>';
  }
  function localPhoto(i) { return i.photo && /^img\/photos\/[a-z0-9-]+\.webp$/.test(i.photo.src || '') ? i.photo : null; }
  function photoHeroHTML(i) {
    var p = localPhoto(i); if (!p) return '';
    var u = safeUrl(p.url);
    return '<figure class="phero"><img src="' + esc(p.src) + '" alt=""><figcaption>' + (u ? '<button class="link-btn pcred" data-url="' + esc(u) + '">' + esc(p.credit) + '</button>' : esc(p.credit)) + '</figcaption></figure>';
  }
  function srcName(i, t) {
    t = t || trustOf(i); var g = i.signal || {}, s0 = (i.sources || []).filter(function (x) { return x && x.publisher; })[0];
    return String((t && t.name) || g.source_name || (s0 && s0.publisher) || primaryName(i) || '').slice(0, 80);
  }
  function srcLineHTML(i, t) {
    t = t || trustOf(i); var g = i.signal || {}, n = g.n_sources || (i.sources || []).length, nm = srcName(i, t);
    if (!nm) return '';
    return '<p class="srcl">Source: ' + esc(nm) + (t && t.verified ? ' <span class="vok" aria-label="Verified official source">\u2713</span>' : '') + ', ' + esc(i.title) + '</p>' +
      (n > 1 ? '<span class="xsrc">Extracted from ' + n + ' sources</span>' : '');
  }
  /* ---------- SIGNAL BRIEF home (1.2.0): three permanent tiers, deterministic mapping ---------- */
  var SUBSETS = ['Industry Impact', 'Geographic Impact', 'Supply Chain Alert', 'Market Impact', 'Policy Watch', 'Early Signal', 'Allied Exposure', 'Actionable Take', 'Source Strength'];
  var ALLIED = /canada|united kingdom|\buk\b|european union|\beu\b|germany|france|japan|australia|norway|denmark|greenland|finland|sweden|iceland|korea|nato/i;
  function sigOf(i) { return i.signal || {}; }
  function scoreOf(i) { var g = sigOf(i); return (+g.impact_score || 0) * 1000 + (+g.confidence_score || 0) * 10 + d(i.published).getTime() / 1e12; }
  function subsetsOf(i) {
    var g = sigOf(i), t = [g.signal_title, g.crux, g.so_what, i.title, i.summary].join(' '), out = [];
    var test = {
      'Industry Impact': (g.affected_sectors || []).length >= 3 && g.importance === 'High',
      'Geographic Impact': (g.affected_regions || []).length >= 3,
      'Supply Chain Alert': /supply|export control|import|sanction|tariff|chokepoint|shipping|entity list|processing|stockpile/i.test(t),
      'Market Impact': /price|market|invest|fund|\$|\u20AC|billion|million/i.test(t),
      'Policy Watch': deadlinesOf(i).length > 0 || /\brule\b|regulation|consultation|\bbill\b|act\b|directive|order/i.test(t),
      'Early Signal': g.time_horizon === 'Long term' || g.importance === 'Low',
      'Allied Exposure': (g.affected_regions || []).some(function (r) { return ALLIED.test(r); }),
      'Actionable Take': !!g.so_what,
      'Source Strength': (+g.confidence_score || 0) >= 70
    };
    SUBSETS.forEach(function (k) { if (test[k]) out.push(k); });
    return out;
  }
  function briefTiers(list) {
    var sig = list.filter(function (i) { return i.signal; }).slice().sort(function (a, b) { return scoreOf(b) - scoreOf(a); });
    var intel = sig.filter(function (i) { return sigOf(i).importance === 'High'; })[0] || sig[0];
    var rest = sig.filter(function (i) { return i !== intel; });
    var crit = rest.filter(function (i) { return sigOf(i).importance === 'High' && sigOf(i).time_horizon === 'Near term'; }).slice(0, 5);
    var radar = rest.filter(function (i) { return crit.indexOf(i) < 0 && (sigOf(i).time_horizon !== 'Near term' || sigOf(i).importance === 'Low' || deadlinesOf(i).length); })
      .sort(function (a, b) { var x = (deadlinesOf(a)[0] || {}).date || '9', y = (deadlinesOf(b)[0] || {}).date || '9'; return x < y ? -1 : x > y ? 1 : scoreOf(b) - scoreOf(a); }).slice(0, 8);
    return { crit: crit, intel: intel, radar: radar };
  }
  // Pipeline fields (key_number, primary_source, reported_by): from the item, else the local backfill overlay.
  function kf(i, k) { var g = sigOf(i); if (g[k] !== undefined) return g[k]; var o = S.sigFields && S.sigFields[i.id]; return o ? o[k] : undefined; }
  function keyFact(i) {
    var k = kf(i, 'key_number');
    if (k && k.value) return { v: k.value + (k.unit ? ' ' + k.unit : ''), l: k.label || '' };
    var g = sigOf(i); // no valid figure: the core fact as text, never a made-up number
    return { v: String(g.crux || i.summary || g.signal_title || '').replace(/\s*[\u2014\u2013]\s*/g, ', '), l: '', fact: true };
  }
  function fresh(i) { return fmtDate(i.published); }
  function pillHTML(i, tier) { var s0 = subsetsOf(i)[0]; return '<span class="bp">' + esc(tier) + '</span>' + (s0 ? '<span class="bp sub">' + esc(s0) + '</span>' : '') + '<span class="bp ai" title="Summary and ratings are AI-assisted and checked against the linked sources">AI-assisted</span>'; }
  function hasTables(i) { var ts = Array.isArray(i.tables) ? i.tables : (S.tablesById && S.tablesById[i.id]) || []; return ts.some(function (t) { return t && Array.isArray(t.columns) && Array.isArray(t.rows) && t.rows.length > 0; }); }

  function isPublished(i) {
    var p = polOf(i);
    // Publish gate: only published signals appear on the desk. Held / quarantined stay out.
    if (p && p.publish_status) return p.publish_status === 'published';
    // Legacy rows without publish_status: treat as published only if not flagged for review.
    if (p && p.review_status === 'needs_human_review') return false;
    return true;
  }
  function polOf(i) { var g = sigOf(i); return (g && g.policy) || {}; }
  function anchorsOf(i) {
    var p = polOf(i), a = p.quantitative_anchors;
    if (Array.isArray(a) && a.length) return a.slice(0, 2);
    var k = keyFact(i); if (k && !k.fact && k.v) return [{ value: k.v, label: k.l || '', unit: '' }];
    return [];
  }
  function hasPaidDetail(i) {
    var p = polOf(i);
    if (hasTables(i)) return true;
    if (p.history_table && (p.history_table.rows || []).length) return true;
    var rich = [p.instrument_type, p.procedural_stage, p.hs_code, p.eccn, p.effective_date, p.compliance_window, p.docket_url].filter(Boolean);
    return rich.length >= 2;
  }
  function stageHTML(p) {
    if (!p || !p.procedural_stage) return '';
    return '<span class="pi-stage ' + esc(p.procedural_stage) + '">' + esc(p.procedural_stage) + '</span>';
  }
  function anchorChange(x) {
    var lab = String((x && (x.label || x.change)) || '');
    var m = lab.match(/([+\-]?\d+(?:\.\d+)?)\s*%/);
    if (m) { var n = parseFloat(m[1]); return { arrow: n < 0 ? '\u2193' : n > 0 ? '\u2191' : '\u2192', cls: n < 0 ? 'neg' : n > 0 ? 'pos' : '', text: m[0] }; }
    if (/down|fell|decline|drop/i.test(lab)) return { arrow: '\u2193', cls: 'neg', text: '' };
    if (/up|rose|rise|growth|increase/i.test(lab)) return { arrow: '\u2191', cls: 'pos', text: '' };
    return null;
  }
  function seriesFor(i) {
    var p = polOf(i), ht = p.history_table;
    if (ht && Array.isArray(ht.rows) && ht.rows.length >= 2) {
      return ht.rows.map(function (r) { var c = (r.cells || [])[1]; var n = parseFloat(String(c || '').replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : null; }).filter(function (n) { return n != null; });
    }
    var ts = Array.isArray(i.tables) ? i.tables : [];
    for (var t = 0; t < ts.length; t++) {
      var rows = ts[t].rows || []; if (rows.length < 2) continue;
      var ser = rows.map(function (r) { var c = (r.cells || [])[1]; var n = parseFloat(String(c || '').replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : null; }).filter(function (n) { return n != null; });
      if (ser.length >= 2) return ser;
    }
    return [];
  }
  function anchorsHTML(i) {
    var a = anchorsOf(i); if (!a.length) return '';
    var ser = seriesFor(i);
    return '<div class="pi-anch" aria-label="Key figures">' + a.slice(0, 2).map(function (x, idx) {
      var ch = anchorChange(x);
      var spark = (idx === 0 && ser.length >= 2) ? sparkSVG(ser) : '';
      return '<div class="pi-a"><div class="pi-a-top"><b class="tabnum">' + esc(String(x.value || '') + (x.unit ? ' ' + x.unit : '')) + '</b>' +
        (ch ? '<span class="pi-arr ' + ch.cls + '" aria-hidden="true">' + ch.arrow + '</span>' : '') + '</div>' +
        (ch && ch.text ? '<span class="pi-ch ' + ch.cls + '">' + esc(ch.text) + '</span>' : (x.label ? '<span class="pi-ch">' + esc(String(x.label).slice(0, 48)) + '</span>' : '')) +
        spark + '</div>';
    }).join('') + '</div>';
  }
  function jurisFlag(j) {
    j = String(j || '');
    var map = { 'United States': '\uD83C\uDDFA\uD83C\uDDF8', 'China': '\uD83C\uDDE8\uD83C\uDDF3', 'European Union': '\uD83C\uDDEA\uD83C\uDDFA', 'Canada': '\uD83C\uDDE8\uD83C\uDDE6', 'Japan': '\uD83C\uDDEF\uD83C\uDDF5', 'United Kingdom': '\uD83C\uDDEC\uD83C\uDDE7', 'Australia': '\uD83C\uDDE6\uD83C\uDDFA', 'India': '\uD83C\uDDEE\uD83C\uDDF3', 'Russia': '\uD83C\uDDF7\uD83C\uDDFA', 'Greenland': '\uD83C\uDDEC\uD83C\uDDF1', 'Hong Kong': '\uD83C\uDDED\uD83C\uDDF0' };
    return map[j] || '\uD83C\uDF0D';
  }
  function sourceAgo(i) {
    var p = polOf(i), iso = p.source_published_at || i.published;
    var t = d(iso).getTime(); if (!isFinite(t)) return '';
    var ms = Date.now() - t; if (ms < 0) ms = 0;
    var h = Math.floor(ms / 3600000), day = Math.floor(ms / 86400000);
    if (h < 1) return 'Source published just now';
    if (h < 48) return 'Source published ' + h + 'h ago';
    if (day < 14) return 'Source published ' + day + 'd ago';
    return 'Source published ' + fmtDate(iso);
  }
  function impactBadge(i) {
    var p = polOf(i), g = sigOf(i);
    var imp = p.importance_tier || g.importance || '';
    var sc = p.impact_score_10; if (sc == null && g.impact_score != null) sc = (+g.impact_score) / 10;
    if (!imp && (sc == null || !isFinite(+sc))) return '<span class="pi-badge na">Score unavailable</span>';
    var label = imp ? esc(imp) : '';
    if (sc != null && isFinite(+sc)) label += (label ? ' ' : '') + (+sc).toFixed(1) + '/10';
    return '<span class="pi-badge ' + esc((imp || '').toLowerCase()) + ' tabnum" title="Importance band and impact score /10 (separate from instrument tier 1-4)">' + label + '</span>';
  }
  function horizonOf(i) {
    var p = polOf(i), g = sigOf(i);
    return p.time_horizon || g.time_horizon || '';
  }
  function scoreOf10(i) {
    var p = polOf(i), g = sigOf(i);
    if (p.impact_score_10 != null) return +p.impact_score_10;
    if (g.impact_score != null) return +g.impact_score / 10;
    return null;
  }
  function statusStripHTML(i) {
    var p = polOf(i), bits = [];
    if (p.jurisdiction) bits.push('<span class="pi-st-j" title="' + esc(p.jurisdiction) + '">' + jurisFlag(p.jurisdiction) + '</span>');
    if (p.procedural_stage) bits.push(stageHTML(p));
    var hz = horizonOf(i); if (hz) bits.push('<span class="pi-st-h">' + esc(hz) + '</span>');
    if (p.effective_date) {
      var ed = p.effective_date.length === 10 ? p.effective_date + 'T12:00:00Z' : p.effective_date;
      bits.push('<span class="pi-st-e tabnum">Effective ' + esc(fmtDate(ed)) + '</span>');
    }
    var ago = sourceAgo(i); if (ago) bits.push('<span class="pi-st-a">' + esc(ago) + '</span>');
    var official = p.primary_source_type && String(p.primary_source_type).indexOf('Secondary') < 0;
    if (official) bits.push('<span class="vok" aria-label="Verified official source">\u2713</span>');
    var srcN = p.primary_source_type || srcName(i);
    if (srcN && String(srcN).indexOf('Secondary') < 0) bits.push('<span class="pi-st-src">' + esc(srcN) + '</span>');
    return bits.length ? '<div class="pi-strip">' + bits.join('') + '</div>' : '';
  }
  function sublineOf(i) {
    var p = polOf(i); return p.impact_subline || impactLine(i);
  }
  function primaryCueHTML(i) {
    var p = polOf(i), g = sigOf(i), ps = kf(i, 'primary_source') || g.primary_source || {};
    var name = p.primary_source_type || (ps && ps.name) || srcName(i);
    if (!name) return '';
    var official = name && String(name).indexOf('Secondary') < 0;
    return '<p class="pi-src">Primary source: ' + esc(name) + (official ? ' <span class="vok" aria-label="Verified official source">\u2713</span>' : '') + '</p>';
  }
  function mechTitle(i) {
    var p = polOf(i), g = sigOf(i);
    return p.mechanism_headline || g.signal_title || i.title;
  }
  function impactLine(i) {
    var g = sigOf(i), p = polOf(i);
    return g.so_what || p.body || g.crux || i.summary || '';
  }
  function watchOf(id) { return (S.watchlist || {})[id] || null; }
  function saveWatch() { store.set('vx.watchlist', S.watchlist || {}); }
  function saveWatchRules() { store.set('vx.watchRules', S.watchRules || []); }
  function addWatchRule(rule) {
    S.watchRules = S.watchRules || [];
    var id = 'wr_' + Date.now();
    var row = { id: id, kind: rule.kind, value: String(rule.value || '').trim(), label: rule.label || '', alerts: rule.alerts !== false, createdAt: new Date().toISOString(), private: true };
    if (!row.value) { toast('Enter a value to watch'); return; }
    S.watchRules.push(row); saveWatchRules(); toast('Private watch rule saved'); render();
  }
  function removeWatchRule(id) {
    S.watchRules = (S.watchRules || []).filter(function (r) { return r.id !== id; }); saveWatchRules(); toast('Watch rule removed'); render();
  }
  function matchWatchRules(item) {
    var p = polOf(item), hits = [];
    (S.watchRules || []).forEach(function (r) {
      var v = (r.value || '').toLowerCase(); if (!v) return;
      if (r.kind === 'hs' && String(p.hs_code || '').toLowerCase().indexOf(v) >= 0) hits.push(r);
      else if (r.kind === 'material') {
        var blob = ((p.industry_impact || []).join(' ') + ' ' + (item.title || '') + ' ' + (item.summary || '')).toLowerCase();
        if (blob.indexOf(v) >= 0) hits.push(r);
      } else if (r.kind === 'country') {
        var geo = ((p.geo_impact || []).join(' ') + ' ' + (p.jurisdiction || '') + ' ' + (item.title || '')).toLowerCase();
        if (geo.indexOf(v) >= 0) hits.push(r);
      }
    });
    return hits;
  }
  function watchRulesHTML() {
    var rows = S.watchRules || [];
    var h = '<div class="section-h"><h2>Watch rules</h2><span>Private · HS / material / country</span></div>';
    h += '<p class="sd-note">Local alerts on this device. Rules stay on this device. Never public, in any mode.</p>';
    h += '<div class="wr-add group">' +
      '<label class="l">Add rule</label>' +
      '<select id="wrKind" aria-label="Watch rule type"><option value="hs">HS code</option><option value="material">Material</option><option value="country">Country / jurisdiction</option></select>' +
      '<input id="wrVal" type="text" placeholder="e.g. 8542, lithium, Canada" aria-label="Watch rule value" />' +
      '<button type="button" class="btn primary sm" data-wradd>Add private rule</button></div>';
    if (!rows.length) h += '<p class="sd-note">No watch rules yet.</p>';
    else h += '<div class="group">' + rows.map(function (r) {
      return '<div class="cell"><div class="l">' + esc((r.kind || '').toUpperCase()) + ' · ' + esc(r.value) + '<small>Alerts ' + (r.alerts === false ? 'off' : 'on') + ' · private</small></div>' +
        '<button class="btn ghost sm" data-wrdel="' + esc(r.id) + '">Remove</button></div>';
    }).join('') + '</div>';
    return h;
  }

  function noteOf(id) { return (S.privateNotes || {})[id] || null; }
  function saveNotes() { store.set('vx.privateNotes', S.privateNotes || {}); }
  function provenanceLabel(i) {
    var p = polOf(i), st = p.provenance_status || '';
    if (st === 'OFFICIAL_GAZETTE_VERIFIED') return 'Official gazette verified';
    if (st === 'OFFICIAL_NON_GAZETTE') return 'Official source';
    if (st === 'SECONDARY_REPORTING_PRIMARY_PENDING' || (p.primary_source_type && String(p.primary_source_type).indexOf('Secondary') >= 0)) return 'Secondary reporting, primary pending';
    return '';
  }
  function confBadge(i) {
    var p = polOf(i), c = (p.confidence_rating || confLabel(p.confidence) || '').toUpperCase();
    if (!c) return '';
    return '<span class="pi-conf ' + esc(c.toLowerCase()) + '" title="' + esc(c.charAt(0) + c.slice(1).toLowerCase()) + ' confidence">' + esc(c.charAt(0) + c.slice(1).toLowerCase()) + ' conf.</span>';
  }
  function tierBadge(i) {
    var p = polOf(i), t = p.impact_tier;
    if (t == null) return '';
    var names = {1:'Monitoring',2:'Proposal',3:'Direct restriction',4:'Systemic disruption'};
    return '<span class="pi-tier t' + (+t) + '" title="' + esc(p.tier_rationale || '') + '">Tier ' + (+t) + ' · ' + esc(names[t] || '') + '</span>';
  }
  function hsCue(i) {
    var p = polOf(i);
    if (p.hs_code) return '<span class="pi-hs">HS ' + esc(p.hs_code) + '</span>';
    return '<span class="pi-hs unver">HS Unverified</span>';
  }
  function metricTilesHTML(i) {
    var g = sigOf(i), p = polOf(i), tiles = [];
    var sc = scoreOf10(i);
    if (sc != null && isFinite(+sc)) tiles.push({ k: 'Impact', v: (+sc).toFixed(1) + '/10', c: 'impact' });
    var risk = g.risk_level || p.risk_level;
    if (risk) tiles.push({ k: 'Risk', v: risk, c: lvl(risk) });
    if (g.opportunity_level) tiles.push({ k: 'Opportunity', v: g.opportunity_level, c: lvl(g.opportunity_level) });
    if (p.jurisdiction) tiles.push({ k: 'Region', v: jurisFlag(p.jurisdiction) + ' ' + p.jurisdiction, c: '' });
    if (!tiles.length) return '';
    return '<div class="metric-row" aria-label="Signal measures">' + tiles.map(function (t) {
      return '<div class="metric ' + t.c + '"><span>' + esc(t.k) + '</span><b>' + esc(t.v) + '</b></div>';
    }).join('') + '</div>';
  }
  function policyFieldsHTML(i) {
    var p = polOf(i); if (!p || !Object.keys(p).length) return '';
    function row(l, v) { if (v == null || v === '') return ''; return '<div class="pi-row"><span class="pi-l">' + l + '</span><span class="pi-v tabnum">' + v + '</span></div>'; }
    var srcName = p.primary_source_type || '';
    var docketLabel = 'View on ' + (srcName && srcName.indexOf('Secondary') < 0 ? srcName : 'source');
    var docket = p.docket_url && safeUrl(p.docket_url) ? '<button class="link-btn docket" data-url="' + esc(p.docket_url) + '">' + esc(docketLabel) + '</button>' : '';
    var h = '<section class="sd pi-exp" aria-label="Signal"><div class="sd-hero">' + thumbHTML(i) + '<div class="sd-hero-b"><div class="sd-h"><span>Signal</span>' + stageHTML(p) + '</div>' +
      '<h2 class="sd-t">' + esc(mechTitle(i)) + '</h2>' +
      (i.summary ? '<p class="sd-sub">' + esc(String(i.summary).slice(0, 180)) + '</p>' : '') +
      '</div></div><div class="pi-grid">' +
        row('Body', esc((srcName && srcName.indexOf('Secondary') < 0 ? srcName : '') || p.jurisdiction || '')) +
        row('Instrument', esc(p.instrument_type || '')) +
        row('Stage', esc(p.procedural_stage || '')) +
        row('HS', esc(p.hs_code || '')) +
        row('ECCN', esc(p.eccn || '')) +
        row('Effective', esc(p.effective_date || '')) +
      '</div>' + (docket ? '<div class="pi-docket">' + docket + '</div>' : '') +
      stageTimelineHTML(i) +
      (p.key_clause ? '<blockquote class="pi-clause">\u201C' + esc(p.key_clause) + '\u201D</blockquote>' : '') +
      historyChartHTML(i) +
      policyAuditHTML(i) + '</section>';
    return h;
  }
  function stageTimelineHTML(i) {
    var p = polOf(i), stages = ['draft', 'consultation', 'enacted', 'enforcement'];
    var cur = (p.procedural_stage || '').toLowerCase();
    var idx = stages.indexOf(cur);
    var eff = p.effective_date ? fmtDate(p.effective_date.length === 10 ? p.effective_date + 'T12:00:00Z' : p.effective_date) : '';
    var pub = p.source_published_at ? fmtDate(p.source_published_at) : fmtDate(i.published);
    return '<div class="pi-tl" role="list" aria-label="Stage timeline">' + stages.map(function (s, n) {
      var on = n === idx, done = idx >= 0 && n < idx;
      var date = '';
      if (s === 'consultation' && on) date = pub;
      if (s === 'enacted' && (on || done) && eff) date = eff;
      if (s === cur && !date) date = pub;
      return '<div class="pi-tl-s' + (on ? ' on' : '') + (done ? ' done' : '') + '" role="listitem"><span class="pi-tl-dot"></span><span class="pi-tl-l">' + esc(s) + '</span>' + (date ? '<span class="pi-tl-d tabnum">' + esc(date) + '</span>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function historyChartHTML(i) {
    var ser = seriesFor(i); if (ser.length < 2) return '';
    var p = polOf(i), title = (p.history_table && p.history_table.title) || 'History';
    return '<div class="pi-hist"><h5>' + esc(title) + '</h5>' + sparkSVG(ser) + '</div>';
  }
  function confLabel(c) {
    c = +c; if (!isFinite(c)) return '';
    if (c >= 75) return 'High'; if (c >= 50) return 'Medium'; return 'Low';
  }
  function policyAuditHTML(i) {
    var p = polOf(i), g = sigOf(i);
    var conf = p.confidence != null ? p.confidence : g.confidence_score;
    var verified = p.source_published_at || i.published;
    var nCorr = (p.corrections_log || []).length;
    var sc = p.impact_score_10, rubric = p.impact_rubric || {}, scConf = p.impact_score_confidence || confLabel(conf);
    var prov = provenanceLabel(i);
    var h = '<div class="pi-audit" aria-label="Audit trail"><span class="pi-au-line">' +
      (prov ? esc(prov) + ' \u00B7 ' : '') +
      'Confidence: ' + esc((p.confidence_rating || confLabel(conf) || 'n/a')) +
      (p.impact_tier != null ? ' \u00B7 Tier ' + (+p.impact_tier) : '') +
      (p.review_status ? ' \u00B7 Review: ' + esc(p.review_status) : '') +
      (p.source_hash ? ' \u00B7 Hash ' + esc(String(p.source_hash).slice(0, 10)) : (p.source_hash_status === 'unverified_migrated' ? ' \u00B7 Hash unverified (migrated)' : '')) + (p.source_hash_basis ? ' \u00B7 ' + esc(p.source_hash_basis) : '') +
      ' \u00B7 Last verified ' + esc(fmtDate(verified)) +
      ' \u00B7 ' + nCorr + ' correction' + (nCorr === 1 ? '' : 's') + '</span>';
    if (sc != null) {
      h += '<div class="pi-rubric"><div class="pi-rubric-h">Impact score <b class="tabnum">' + (+sc).toFixed(1) + '/10</b> <span class="pi-rubric-c">(' + esc(scConf) + ' confidence)</span></div><ul>';
      var labels = { severity: 'Severity', geo_breadth: 'Countries affected', industry_breadth: 'Industries affected', proximity: 'Effective-date proximity', stage: 'Procedural stage' };
      Object.keys(labels).forEach(function (k) {
        var v = rubric[k];
        h += '<li><span>' + labels[k] + '</span><b class="tabnum">' + (v == null ? 'n/a' : (+v).toFixed(2)) + '</b></li>';
      });
      h += '</ul><p class="sd-note">High 7 to 10 \u00B7 Medium 4 to 6.9 \u00B7 Low under 4. Missing inputs lower confidence.</p></div>';
    }
    h += '<p class="sd-note">For information only. Not legal advice. No warranty or obligation; non-binding.</p></div>';
    return h;
  }
  function policyActionsHTML(i) {
    var on = !!watchOf(i.id);
    return '<div class="pi-actions pinbar" role="toolbar" aria-label="Desk actions">' +
      '<button type="button" class="btn orange" data-pdf="' + esc(i.id) + '">Export PDF</button>' +
      '<button type="button" class="btn ghost' + (on ? ' wl-on' : '') + '" data-watch="' + esc(i.id) + '" aria-pressed="' + on + '">' + (on ? 'Watching' : 'Watch') + '</button>' +
      '<button type="button" class="btn ghost" data-moredesk="' + esc(i.id) + '" aria-haspopup="dialog">More</button></div>';
  }
  function moreDeskSheet(id) {
    var i = byId(id); if (!i) return;
    var hasNote = !!noteOf(id);
    var fb = (S.signalFeedback || {})[id] || {};
    var publicSocial = !!(CFG.flags && CFG.flags.publicSocial);
    var h = '<h3>More actions</h3><p class="sd-note">Private desk tools. Watchlists, notes, forwards and Helpful/Not Relevant stay private in every mode.</p>' +
      '<button type="button" class="btn ghost block" data-flag="' + esc(id) + '">Flag to Legal / Procurement</button>' +
      '<button type="button" class="btn ghost block" data-forward="' + esc(id) + '">Forward to Team</button>' +
      '<button type="button" class="btn ghost block" data-privnote="' + esc(id) + '">' + (hasNote ? 'Edit Private Note' : 'Private Note') + '</button>' +
      '<button type="button" class="btn ghost block' + (fb.v === 'helpful' ? ' on' : '') + '" data-sigfb="helpful" data-id="' + esc(id) + '" aria-pressed="' + (fb.v === 'helpful') + '">Helpful Signal' + (fb.v === 'helpful' ? ' · saved privately' : '') + '</button>' +
      '<button type="button" class="btn ghost block' + (fb.v === 'not_relevant' ? ' on' : '') + '" data-sigfb="not_relevant" data-id="' + esc(id) + '" aria-pressed="' + (fb.v === 'not_relevant') + '">Not Relevant' + (fb.v === 'not_relevant' ? ' · saved privately' : '') + '</button>';
    if (publicSocial) {
      h += '<button type="button" class="btn ghost block" data-citepub="' + esc(id) + '">Cite &amp; Annotate publicly' + (window.VXSocial && window.VXSocial.isPublic() ? '' : ' \u00B7 Public mode') + '</button>' +
        '<button type="button" class="btn ghost block" data-citepriv="' + esc(id) + '">Cite &amp; Annotate (Private Desk)</button>';
    } else {
      h += '<button type="button" class="btn ghost block" data-citepriv="' + esc(id) + '">Cite &amp; Annotate (Private Desk)</button>' +
        '<p class="sd-note">Public Comment &amp; Annotate, public citations and Track Analyst stay off until server visibility checks ship (Part E order).</p>';
    }
    h += '<button type="button" class="btn ghost" data-closesheet>Cancel</button>';
    sheet(h);
  }
  function setSignalFeedback(id, val) {
    if (!S.signalFeedback) S.signalFeedback = {};
    if (S.signalFeedback[id] && S.signalFeedback[id].v === val) delete S.signalFeedback[id];
    else S.signalFeedback[id] = { v: val, at: Date.now(), private: true };
    store.set('vx.signalFeedback', S.signalFeedback);
    toast(val === 'helpful' ? 'Marked Helpful Signal (private)' : 'Marked Not Relevant (private)');
    closeSheet();
  }
  function citePrivate(id) {
    // Private Desk path only: opens Private Note — never publishes, never team delivery
    S._citePrefill = true;
    privateNoteSheet(id);
  }
  function impactChipsHTML(i) {
    var p = polOf(i), h = '';
    var geos = p.geo_impact || [];
    var inds = p.industry_impact || [];
    if (geos.length) {
      h += '<div class="pi-chips" aria-label="Geographic impact"><h5>Geographic impact</h5><div class="pi-chiprow">' +
        geos.map(function (g) { return '<span class="pi-chip">' + jurisFlag(g) + ' ' + esc(g) + '</span>'; }).join('') + '</div></div>';
    }
    if (inds.length) {
      h += '<div class="pi-chips" aria-label="Industry impact"><h5>Industry impact</h5><div class="pi-chiprow">' +
        inds.map(function (g) { return '<span class="pi-chip">' + esc(g) + '</span>'; }).join('') + '</div></div>';
    }
    return h;
  }
  function detailSocialHTML(i) {
    // 1.3.2: duplicate desk row removed; Export PDF / Watch / More live in the fixed dock.
    return '';
  }


  function forwardTeam(id, note) {
    var i = byId(id); if (!i) return;
    var p = polOf(i);
    var text = (note ? note + '\n\n' : '') + 'Forward to Team (private)\n\n' + mechTitle(i) + '\n' +
      (p.operational_directive || impactLine(i) || '') + '\n' +
      (p.docket_url ? 'Docket: ' + p.docket_url + '\n' : '') +
      (p.provenance_status ? 'Provenance: ' + provenanceLabel(i) + '\n' : '') +
      '\nInformational only. Not legal or trade-compliance advice.\n— Voxarc Lab Signal Desk';
    if (!(S.privacyPublicShare)) {
      // private default: share sheet / mail only, never auto-post
    }
    if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Share) {
      Capacitor.Plugins.Share.share({ title: 'Voxarc Lab: ' + mechTitle(i), text: text, dialogTitle: 'Forward to Team' });
    } else if (navigator.share) {
      navigator.share({ title: 'Voxarc Lab', text: text }).catch(function () {});
    } else {
      window.open('mailto:?subject=' + encodeURIComponent('Voxarc Lab: ' + mechTitle(i)) + '&body=' + encodeURIComponent(text));
    }
    toast('Share sheet opened — choose a recipient. Nothing was auto-sent.');
  }
  function privateNoteSheet(id) {
    var cur = noteOf(id);
    var cite = !!S._citePrefill; S._citePrefill = false;
    var seed = S._noteSeed || ''; S._noteSeed = '';
    var title = cite ? 'Cite &amp; Annotate (Private Desk)' : 'Private Note';
    var blurb = cite
      ? 'Saves a citation note to your Private Desk on this device. Not sent to a team and not published.'
      : 'Private in every mode. Stored on this device only. Not a team-visible comment and never public.';
    sheet('<h3>' + title + '</h3><p>' + blurb + '</p>' +
      '<textarea id="privNote" class="repc" maxlength="2000" placeholder="Private analysis note">' + esc((cur && cur.body) || seed || '') + '</textarea>' +
      '<button class="btn primary" data-notesave="' + esc(id) + '">' + (cite ? 'Save to Private Desk' : 'Save Private Note') + '</button><button class="btn ghost" data-closesheet>Cancel</button>');
  }
  function savePrivateNote(id) {
    var body = (($('#privNote') || {}).value || '').replace(/\s*[\u2014\u2013]\s*/g, ', ').trim().slice(0, 2000);
    S.privateNotes = S.privateNotes || {};
    if (!body) { delete S.privateNotes[id]; saveNotes(); closeSheet(); toast('Private note cleared'); render(); if (S.current === id) refreshReader(); return; }
    S.privateNotes[id] = { body: body, updatedAt: new Date().toISOString() };
    saveNotes(); closeSheet(); toast('Saved to Private Desk on this device — not sent to a team'); haptic(); render(); if (S.current === id) refreshReader();
  }

  function pdfStamp() { return 'Generated ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'; }
  function signalSections(i) {
    var p = polOf(i), g = sigOf(i), w = soWhatOf(i);
    var fields = [
      ['Instrument', p.instrument_type], ['Stage', p.procedural_stage], ['Jurisdiction', p.jurisdiction],
      ['HS code', p.hs_code], ['ECCN', p.eccn], ['Effective', p.effective_date],
      ['Primary source', p.primary_source_type], ['Docket', p.docket_url]
    ].filter(function (x) { return x[1]; }).map(function (x) { return x[0] + ': ' + x[1]; }).join('. ');
    var sources = (i.sources || []).map(function (s) {
      return [s.publisher, s.date, s.title, s.url].filter(Boolean).join(' | ');
    }).join(' ');
    return [
      { h: 'What changed', body: (w && w.changed) || p.body || g.crux || i.summary || '' },
      { h: 'Why it matters', body: (g.so_what || i.summary || '') },
      { h: 'Who it affects', body: (w && w.who) || '' },
      { h: 'What to watch', body: (w && w.watch) || g.watch_next || '' },
      { h: 'Record', body: fields },
      { h: 'Sources', body: sources }
    ];
  }
  function exportPdf(id) {
    var i = byId(id); if (!i || !window.VXPdf) return;
    var p = polOf(i);
    var title = mechTitle(i);
    var pages = window.VXPdf.paginate('Signal brief', title, [{ h: 'Published', body: fmtDate(i.published) + (p.jurisdiction ? ' | ' + p.jurisdiction : '') }].concat(signalSections(i)), pdfStamp());
    var name = 'voxarc-' + String(id).replace(/[^a-z0-9-]+/gi, '').slice(0, 40) + '.pdf';
    window.VXPdf.deliver(window.VXPdf.build(pages), name, title);
    toast('PDF ready to save or share');
  }
  function exportBrief() {
    if (!window.VXPdf) return;
    var savedQ = S.query, savedTopic = S.topic;
    if (S.tab === 'signals') S.query = '';
    var list = filtered(S.items);
    S.query = savedQ; S.topic = savedTopic;
    if (S.tab === 'signals' && S.sigQuery) {
      var sq = S.sigQuery.trim().toLowerCase();
      list = list.filter(function (i) {
        var p = polOf(i);
        var hay = [i.title, i.summary, p.jurisdiction || '', (i.topics || []).join(' ')].join(' ').toLowerCase();
        return sq.split(/\s+/).every(function (w) { return w && hay.indexOf(w) >= 0; });
      });
    }
    list = list.slice(0, 20);
    var title = S.topic && S.topic !== 'all' ? topicLabel(S.topic) : (S.tab === 'signals' ? 'Signals' : 'Your desk');
    var sections = [{ h: 'As of', body: asOfText() + '. ' + list.length + ' signal' + (list.length === 1 ? '' : 's') + ' from the current feed.' }];
    list.forEach(function (i, n) {
      var p = polOf(i), src = (i.sources || [])[0];
      sections.push({ h: (n + 1) + '. ' + mechTitle(i), body: [fmtDate(i.published), p.jurisdiction, i.summary, src ? ('Source: ' + src.publisher + (src.date ? ', ' + src.date : '')) : ''].filter(Boolean).join(' | ') });
    });
    var pages = window.VXPdf.paginate('Desk brief', title, sections, pdfStamp());
    window.VXPdf.deliver(window.VXPdf.build(pages), 'voxarc-desk.pdf', title);
    toast('Desk PDF ready to save or share');
  }
  function flagLegal(id) {
    var i = byId(id); if (!i) return;
    var p = polOf(i);
    sheet('<h3>Flag to Legal / Procurement</h3><p>Add a short note. We open your mail or share sheet with the signal summary.</p>' +
      '<textarea id="flagNote" class="repc" maxlength="500" placeholder="Why this matters for Legal or Procurement"></textarea>' +
      '<button class="btn primary" data-flaggo="' + esc(id) + '">Share flag</button><button class="btn ghost" data-closesheet>Cancel</button>');
  }
  function flagGo(id) {
    var i = byId(id); if (!i) return;
    var note = (($('#flagNote') || {}).value || '').replace(/\s*[\u2014\u2013]\s*/g, ', ').trim().slice(0, 500);
    var p = polOf(i);
    var text = 'Flag for Legal / Procurement\n\n' + mechTitle(i) + '\n' + (p.jurisdiction ? 'Jurisdiction: ' + p.jurisdiction + '\n' : '') +
      (p.hs_code ? 'HS: ' + p.hs_code + '\n' : '') + (p.eccn ? 'ECCN: ' + p.eccn + '\n' : '') +
      (p.docket_url ? 'Docket: ' + p.docket_url + '\n' : '') + '\nNote: ' + (note || '(none)') +
      '\n\nFor information only. Not legal advice. No warranty or obligation; non-binding.\nVoxarc Lab';
    closeSheet();
    if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Share) {
      Capacitor.Plugins.Share.share({ title: 'Voxarc Lab flag: ' + mechTitle(i), text: text, dialogTitle: 'Flag to Legal / Procurement' });
    } else if (navigator.share) {
      navigator.share({ title: 'Voxarc Lab flag', text: text }).catch(function () {});
    } else {
      var mail = 'mailto:?subject=' + encodeURIComponent('Voxarc Lab flag: ' + mechTitle(i)) + '&body=' + encodeURIComponent(text);
      window.open(mail);
    }
    toast('Flag ready to send');
  }
  function needAccount(why, fn) {
    if (window.VXSocial && !window.VXSocial.user()) return window.VXSocial.requireAuth(why, fn);
    fn();
  }
  function toggleWatch(id) {
    S.watchlist = S.watchlist || {};
    if (window.VXSocial && !window.VXSocial.user()) {
      return needAccount('Sign in or create a free account to save this signal. Reading stays free without an account.', function () { toggleWatch(id); });
    }
    var i = byId(id), p = polOf(i || {});
    if (S.watchlist[id]) { delete S.watchlist[id]; saveWatch(); if (window.VXSocial && window.VXSocial.onWatch) window.VXSocial.onWatch(id, false); if (window.VXSocial && window.VXSocial.onSave) window.VXSocial.onSave(id, false); toast('Removed from Watchlist'); render(); if (S.current === id) refreshReader(); return; }
    S.watchlist[id] = {
      v: 1, storyId: id, hs_code: p.hs_code || null, eccn: p.eccn || null, jurisdiction: p.jurisdiction || null,
      title: mechTitle(i), createdAt: new Date().toISOString()
    };
    saveWatch();
    // Reuse local notification path when permission already granted / via Daily Brief settings
    try {
      if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.LocalNotifications && (p.hs_code || p.eccn || p.jurisdiction)) {
        var body = 'Watching ' + [p.hs_code && ('HS ' + p.hs_code), p.eccn && ('ECCN ' + p.eccn), p.jurisdiction].filter(Boolean).join(', ');
        Capacitor.Plugins.LocalNotifications.schedule({ notifications: [{ id: Math.abs(hashCode(id)) % 100000 + 20000, title: 'Voxarc Lab Watchlist', body: body, schedule: { at: new Date(Date.now() + 1500) } }] });
      }
    } catch (e) {}
    if (window.VXSocial && window.VXSocial.onWatch) window.VXSocial.onWatch(id, true, S.watchlist[id]);
    if (window.VXSocial && window.VXSocial.onSave) window.VXSocial.onSave(id, true);
    toast('Added to Watchlist'); haptic(); render(); if (S.current === id) refreshReader();
  }
  function hashCode(str) { var h = 0; for (var i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0; return h; }
  function briefRowHTML(i) {
    var on = !!watchOf(i.id);
    return '<div class="bfoot"><span class="bfresh">' + esc(fresh(i)) + '</span>' + (hasPaidDetail(i) ? '<button class="bunlock" data-dossier="' + esc(i.id) + '" aria-label="Open Full Dossier"><span>Full Dossier</span><small>Regulatory Dossier</small></button>' : '') + '</div>' +
      '<div class="arow" role="group" aria-label="Actions">' +
      '<button class="bm' + (on ? ' on' : '') + '" data-watch="' + esc(i.id) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Remove from Watchlist' : 'Add to Watchlist') + '">' + ICON.bm + '</button>' +
      '<button class="act more" data-sx="sigmenu" data-id="' + esc(i.id) + '" aria-label="More options">\u22EF</button></div>';
  }
  function piCardHTML(i, tier) {
    var p = polOf(i);
    var action = p.operational_directive || sublineOf(i);
    var impact = sublineOf(i);
    var prov = provenanceLabel(i);
    var same = impact && action && String(impact).slice(0,120) === String(action).slice(0,120);
    var variant = tier === 'lead' || tier === 'next' ? tier : '';
    var idx = tier === 'next' ? '<span class="pi-idx" aria-hidden="true">02</span>' : '';
    var whySrc = impact || i.summary || '';
    var why = whySrc ? '<p class="pi-impact"><b>Why it matters:</b> ' + esc(String(whySrc).slice(0, 220)) + '</p>' : '';
    var topicId = (i.topics || []).map(canonId).filter(Boolean)[0] || category(i);
    var tchip = topicId ? '<span class="topic-chip">' + esc(topicLabel(topicId)) + '</span>' : '';
    var jur = p.jurisdiction ? '<span class="region-chip">' + jurisFlag(p.jurisdiction) + ' ' + esc(p.jurisdiction) + '</span>' : '';
    // 1.3.8: always render the full card. Dense only tightens spacing (CSS), it never hides detail.
    // 1.5.0: thumbnail and why-it-matters sit above the same summary, price, source check and bookmark.
    return '<article class="bcard pi' + (S.dense ? ' dense' : '') + (variant ? ' pi-' + variant : '') + '" data-open="' + esc(i.id) + '">' +
      '<div class="pi-card-top" role="group" aria-label="Signal badges"><div class="pi-badges">' + impactBadge(i) + tierBadge(i) + confBadge(i) + '<span class="bp ai pi-checked" title="Extraction is checked against linked sources; missing fields stay empty">Checked</span></div>' + watchBtn(i) + '</div>' +
      idx +
      '<div class="sig-face"><div class="sig-thumb">' + thumbHTML(i) + '</div><div class="sig-face-b">' +
      '<button class="open" data-open="' + esc(i.id) + '"><h3 class="bwhat">' + esc(mechTitle(i)) + '</h3></button>' +
      why +
      '<div class="sig-meta-row">' + jur + tchip + '<span class="sig-when">' + esc(fmtDate(i.published)) + '</span></div></div>' +
      '<span class="sig-chev" aria-hidden="true">' + ICON.chev + '</span></div>' +
      ((!same && action) ? '<p class="bimp"><b>Directive:</b> ' + esc(String(action).slice(0, 160)) + '</p>' : '') +
      anchorsHTML(i) +
      '<div class="pi-cues">' + hsCue(i) + (prov ? '<span class="pi-prov">' + esc(prov) + '</span>' : '') + primaryCueHTML(i) + '</div>' +
      statusStripHTML(i) +
      (hasPaidDetail(i) ? '<div class="bfoot"><button class="bunlock" data-dossier="' + esc(i.id) + '" aria-label="Open Full Dossier"><span>Full Dossier</span><small>Regulatory Dossier</small></button></div>' : '') +
      '<div class="pi-tools">' + shareSignalBtn(i) + '</div>' +
      '</article>';
  }
  function critCardHTML(i) { return piCardHTML(i, 'crit'); }
  function intelCardHTML(i) { return piCardHTML(i, 'intel'); }
  function radarCardHTML(i) { return piCardHTML(i, 'radar'); }
  function filterDefs() {
    return [
      { k: 'fImpact', label: 'Importance' },
      { k: 'fHorizon', label: 'Horizon' },
      { k: 'fScore', label: 'Score' },
      { k: 'fJuris', label: 'Jurisdiction' },
      { k: 'fGeo', label: 'Geography' },
      { k: 'fIndustry', label: 'Industry' },
      { k: 'fMineral', label: 'Mineral' },
      { k: 'fStage', label: 'Stage' }
    ];
  }
  function activeFilterCount() {
    return filterDefs().filter(function (d) { return S[d.k] && S[d.k] !== 'all'; }).length;
  }
  function filterValLabel(key, val) {
    if (key === 'fScore') return val + '+';
    if (key === 'fHorizon') return ({ 'Near term': 'Near', 'Medium term': 'Medium', 'Long term': 'Long' })[val] || val;
    if (key === 'fJuris' || key === 'fGeo') return String(val).replace('United States', 'US').replace('European Union', 'EU').replace('United Kingdom', 'UK');
    if (key === 'fMineral') return val.charAt(0).toUpperCase() + val.slice(1);
    return val;
  }
  function persistFilters() {
    store.set('vx.filters', { fJuris: S.fJuris, fMineral: S.fMineral, fStage: S.fStage, fImpact: S.fImpact, fScore: S.fScore, fHorizon: S.fHorizon, fGeo: S.fGeo, fIndustry: S.fIndustry, dense: S.dense });
  }
  function resetAllFilters() {
    filterDefs().forEach(function (d) { S[d.k] = 'all'; });
    persistFilters();
  }
  function filterChip(key, val, label) {
    var on = S[key] === val;
    return '<button type="button" class="fchip' + (on ? ' on' : '') + '" data-ff="' + key + '" data-fv="' + esc(val) + '" aria-pressed="' + on + '">' + esc(label) + '</button>';
  }
  function filterOptionsHTML() {
    var juris = {}, geos = {}, inds = {}, stages = {};
    S.items.forEach(function (i) {
      var p = polOf(i);
      if (p.jurisdiction) juris[p.jurisdiction] = 1;
      (p.geo_impact || []).forEach(function (g) { geos[g] = 1; });
      (p.industry_impact || []).forEach(function (g) { inds[g] = 1; });
      if (p.procedural_stage) stages[p.procedural_stage] = 1;
    });
    var minerals = ['lithium', 'rare earth', 'copper', 'gallium', 'nickel', 'helium', 'cobalt', 'graphite'];
    function row(label, body) { return '<div class="ff-row"><span class="ff-l">' + label + '</span>' + body + '</div>'; }
    return row('Importance', filterChip('fImpact', 'all', 'All') + filterChip('fImpact', 'High', 'High') + filterChip('fImpact', 'Medium', 'Medium') + filterChip('fImpact', 'Low', 'Low')) +
      row('Horizon', filterChip('fHorizon', 'all', 'All') + filterChip('fHorizon', 'Near term', 'Near') + filterChip('fHorizon', 'Medium term', 'Medium') + filterChip('fHorizon', 'Long term', 'Long')) +
      row('Score', filterChip('fScore', 'all', 'All') + filterChip('fScore', '7', '7+') + filterChip('fScore', '4', '4+')) +
      row('Jurisdiction', filterChip('fJuris', 'all', 'All') + Object.keys(juris).sort().map(function (j) { return filterChip('fJuris', j, filterValLabel('fJuris', j)); }).join('')) +
      row('Geography', filterChip('fGeo', 'all', 'All') + Object.keys(geos).sort().map(function (j) { return filterChip('fGeo', j, filterValLabel('fGeo', j)); }).join('')) +
      row('Industry', filterChip('fIndustry', 'all', 'All') + Object.keys(inds).sort().map(function (j) { return filterChip('fIndustry', j, j); }).join('')) +
      row('Mineral', filterChip('fMineral', 'all', 'All') + minerals.map(function (m) { return filterChip('fMineral', m, filterValLabel('fMineral', m)); }).join('')) +
      row('Stage', filterChip('fStage', 'all', 'All') + ['draft', 'consultation', 'enacted', 'enforcement'].filter(function (s) { return stages[s]; }).map(function (s) { return filterChip('fStage', s, s); }).join(''));
  }
  function openFiltersSheet() {
    var n = activeFilterCount();
    sheet('<div class="ff-sheet"><h3 id="ff-sheet-title">Filters' + (n ? ' · ' + n + ' active' : '') + '</h3>' +
      '<div class="ff-sheet-body" role="group" aria-labelledby="ff-sheet-title">' + filterOptionsHTML() + '</div>' +
      '<div class="ff-sheet-actions">' +
      '<button type="button" class="btn ghost" data-ffreset="1"' + (n ? '' : ' disabled') + '>Reset</button>' +
      '<button type="button" class="btn primary" data-closesheet>Done</button>' +
      '<button type="button" class="btn ghost" data-dense="1" aria-pressed="' + !!S.dense + '">' + (S.dense ? 'Comfortable density' : 'Dense list') + '</button>' +
      '<button type="button" class="btn ghost" data-saveview="1">Save view</button></div></div>');
    var card = document.querySelector('#sheet .sheet-card'); if (card) try { card.focus({ preventScroll: true }); } catch (e) {}
  }
  function filterBarHTML() {
    var n = activeFilterCount();
    var active = filterDefs().filter(function (d) { return S[d.k] && S[d.k] !== 'all'; });
    var chips = active.map(function (d) {
      return '<button type="button" class="fchip on ff-active" data-ff="' + d.k + '" data-fv="all" aria-label="Clear ' + esc(d.label) + ' filter">' + esc(d.label) + ': ' + esc(filterValLabel(d.k, S[d.k])) + ' ×</button>';
    }).join('');
    var h = '<div class="ffilters ff-compact" role="toolbar" aria-label="Filters">' +
      '<div class="ff-compact-row">' + chips +
      '<button type="button" class="fchip ff-open' + (n ? ' on' : '') + '" data-opensfilters="1" aria-haspopup="dialog" aria-expanded="false">Filters' + (n ? ' (' + n + ')' : '') + '</button>' +
      '<button type="button" class="fchip densetog' + (S.dense ? ' on' : '') + '" data-dense="1" aria-pressed="' + !!S.dense + '">' + (S.dense ? 'Comfortable' : 'Dense') + '</button>' +
      '<button type="button" class="fchip" data-saveview="1">Save view</button></div>';
    if ((S.namedViews || []).length) {
      h += '<div class="ff-compact-row ff-saved"><span class="ff-l">Saved</span>' + S.namedViews.map(function (v, idx) {
        return '<button type="button" class="fchip" data-loadview="' + idx + '">' + esc(v.name) + '</button>';
      }).join('') + '</div>';
    }
    return h + '</div>';
  }
  function applyPiFilters(list) {
    return list.filter(function (i) {
      var p = polOf(i), g = sigOf(i);
      if (S.fJuris !== 'all' && p.jurisdiction !== S.fJuris) return false;
      if (S.fStage !== 'all' && p.procedural_stage !== S.fStage) return false;
      if (S.fImpact !== 'all' && (p.importance_tier || g.importance) !== S.fImpact) return false;
      if (S.fHorizon !== 'all' && (p.time_horizon || g.time_horizon) !== S.fHorizon) return false;
      if (S.fScore !== 'all') {
        var sc = scoreOf10(i); if (sc == null || sc < +S.fScore) return false;
      }
      if (S.fGeo !== 'all' && (p.geo_impact || []).indexOf(S.fGeo) < 0) return false;
      if (S.fIndustry !== 'all' && (p.industry_impact || []).indexOf(S.fIndustry) < 0) return false;
      if (S.fMineral !== 'all') {
        var hay = [mechTitle(i), p.body, i.title, i.summary, i.body].join(' ').toLowerCase();
        if (hay.indexOf(S.fMineral) < 0) return false;
      }
      return true;
    });
  }
  var TOPIC_PHOTO = {
    'arctic-security': 'img/photos/arctic-sea-ice.webp',
    arctic: 'img/photos/arctic-sea-ice.webp',
    'ai-governance': 'img/photos/ai-chip.webp',
    ai: 'img/photos/ai-chip.webp',
    'critical-minerals': 'img/photos/minerals-rare-earth.webp',
    minerals: 'img/photos/minerals-rare-earth.webp',
    'ai-investment-infrastructure': 'img/photos/ai-datacenter.webp',
    'energy-power': 'img/photos/grid-power.webp',
    'trade-sanctions': 'img/photos/geo-tanker.webp',
    'strategic-supply-chains': 'img/photos/geo-port.webp',
    semiconductors: 'img/photos/ai-chip.webp',
    'economic-security': 'img/photos/geo-capitol.webp',
    geo: 'img/photos/geo-eu.webp',
    'defense-technology': 'img/photos/defense-technology.webp',
    'cyber-digital-sovereignty': 'img/photos/cyber-sovereignty.webp',
    'space-satellites': 'img/photos/space-satellites.webp'
  };
  function globeSVG() {
    return '<div class="hh-globe" aria-hidden="true"><svg viewBox="0 0 120 120"><defs><radialGradient id="hg" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#FFB088"/><stop offset=".45" stop-color="#E0541A"/><stop offset="1" stop-color="#7A240C"/></radialGradient></defs>' +
      '<circle cx="60" cy="60" r="46" fill="url(#hg)"/><g fill="none" stroke="#FFE2D2" stroke-width="1" opacity=".75"><ellipse cx="60" cy="60" rx="46" ry="18"/><ellipse cx="60" cy="60" rx="18" ry="46"/><path d="M14 60h92M60 14v92"/></g>' +
      '<g fill="#FFF6F1"><circle cx="78" cy="36" r="2"/><circle cx="42" cy="48" r="1.6"/><circle cx="70" cy="72" r="1.8"/><circle cx="50" cy="28" r="1.4"/></g></svg></div>';
  }
  function homeHeroHTML() {
    var n = S.items.filter(inFollow).length;
    return '<section class="home-hero"><div class="hh-copy"><h1>Structured intelligence<br><em>for a clearer tomorrow</em></h1>' +
      '<p>' + esc(asOfText()) + '. ' + n + ' signal' + (n === 1 ? '' : 's') + ' in your feed. ' + catalogIds().length + ' topics.</p></div>' + globeSVG() + '</section>';
  }
  function homeStatHTML() {
    var list = S.items.filter(inFollow);
    var hi = list.filter(function (i) { return (polOf(i).importance_tier || sigOf(i).importance) === 'High'; }).length;
    var wk = list.filter(function (i) { return Date.now() - d(i.published) < 7 * 86400000; }).length;
    function tile(n, l) { return '<div class="hstat"><b class="tabnum">' + n + '</b><span>' + esc(l) + '</span></div>'; }
    return '<div class="hstats" aria-label="Counts from the feed">' + tile(list.length, 'In your feed') + tile(hi, 'High impact') + tile(S.follow.length, 'Topics pinned') + tile(wk, 'New this week') + '</div>';
  }
  function topicsGridHTML() {
    var ids = catalogIds();
    var cards = ids.map(function (id) {
      var g = taxGroup(id), coming = !!(g && g.status !== 'active');
      var label = topicLabel(id), focus = (g && g.focus) || DESK_FOCUS[canonKey(id)] || '';
      var photo = TOPIC_PHOTO[id] || TOPIC_PHOTO[canonKey(id)];
      var art = photo ? '<img src="' + esc(photo) + '" alt="">' : '<div class="tmono" aria-hidden="true">' + esc(label.slice(0, 1)) + '</div>';
      return '<button type="button" class="tcard" data-topic="' + esc(id) + '">' + art + '<span class="tbx"><b>' + esc(label) + '</b><small>' + esc(focus) + '</small>' +
        (coming ? '<em class="chip-soon">Coming soon</em>' : '') + '</span></button>';
    }).join('');
    return '<div class="section-h"><h2>Topics</h2><button type="button" class="sec-link" data-managetopics>Manage &gt;</button></div><div class="topic-grid">' + cards + '</div>';
  }
  function briefHTML(list) {
    list = applyPiFilters(list);
    var T = briefTiers(list);
    function sec(id, title, sub, body) { return '<section class="btier" aria-labelledby="bt-' + id + '"><div class="bth"><h2 id="bt-' + id + '">' + title + '</h2><span>' + sub + '</span></div>' + body + '</section>'; }
    var cards = [].concat(T.crit || [], T.intel ? [T.intel] : [], T.radar || []);
    // Deduplicate while preserving order
    var seen = {}, flat = [];
    cards.forEach(function (i) { if (i && !seen[i.id]) { seen[i.id] = 1; flat.push(i); } });
    flat.sort(function (a, b) { var sb = scoreOf10(b), sa = scoreOf10(a); if (sb == null) sb = -1; if (sa == null) sa = -1; if (sb !== sa) return sb - sa; return d(b.published) - d(a.published); });
    return homeHeroHTML() + homeStatHTML() + homeChipsHTML() +
      '<div class="desk-tools"><button type="button" class="link-btn" data-managetopics>Manage topics</button></div>' +
      '<header class="tb brief-h"><div class="bk">Your desk</div><h1 id="sig-h" tabindex="-1">Intelligence desk</h1><p>' + esc(asOfText()) + '</p></header>' +
      '<div class="searchwrap"><label class="search">' + ICON.search + '<input id="q" type="search" placeholder="Search topics, signals, sources" aria-label="Search" value="' + esc(S.query) + '" autocomplete="off" enterkeyhint="search"></label></div>' +
      filterBarHTML() +
      '<section class="btier" aria-labelledby="bt-feed"><div class="bth"><h2 id="bt-feed">Signals</h2><button type="button" class="sec-link" data-pdfbrief="1">Export PDF</button></div>' +
      (flat.length ? flat.map(function (i, n) { return piCardHTML(i, n === 0 ? 'lead' : (n === 1 ? 'next' : '')); }).join('') : '<p class="bempty">No signals match these filters.</p>') +
      '</section>' + topicsGridHTML() + coverageHTML() + '<button class="bmore" data-tab="signals">All signals</button>';
  }

  // Detail: audit trail and social summary (one tap deeper than the home card)
  function auditHTML(i) { return policyAuditHTML(i); }
  function homeCardHTML(i, n) {
    var g = i.signal || {}, t = trustOf(i), x = expertNoteOf(i);
    var style = n != null && n < 12 && !S.rendered ? ' style="--i:' + n + '"' : '';
    return '<div class="card hc' + (S.rendered ? '' : ' in') + '" data-open="' + esc(i.id) + '"' + style + '><div class="hc-row">' + thumbHTML(i) + '<div class="hc-b">' +
      '<button class="open" data-open="' + esc(i.id) + '"><h3>' + esc(mechTitle(i)) + '</h3></button>' +
      (g.importance ? '<div class="smeta"><span class="hb ' + lvl(g.importance) + '">Impact: ' + esc(g.importance) + '</span><span class="sm-t">\u00B7 ' + esc(g.time_horizon) + ' \u00B7 Risk: ' + esc(g.risk_level) + '</span>' + INFO_BTN + '</div>' : '') +
      '<p class="hc-why"><b>Action:</b> ' + esc(g.so_what || g.crux || i.summary) + '</p>' +
      srcLineHTML(i, t) +
      (x ? '<span class="vchip xn">Expert note</span>' : '') + marketHTML(i, false) +
      '</div></div>' + indHTML(g) + actRowHTML(i) + '</div>';
  }
  function sparkSVG(ser) {
    ser = (ser || []).map(Number).filter(isFinite); if (ser.length < 2) return '';
    var mn = Math.min.apply(0, ser), mx = Math.max.apply(0, ser), r = mx - mn || 1, W = 100, Hh = 28;
    var pts = ser.map(function (v, k) { return (k / (ser.length - 1) * W).toFixed(1) + ',' + (Hh - 2 - (v - mn) / r * (Hh - 4)).toFixed(1); });
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + Hh + '" preserveAspectRatio="none" aria-hidden="true"><path d="M0,' + Hh + ' L' + pts.join(' L') + ' L' + W + ',' + Hh + 'Z" fill="rgba(255,107,53,.15)"/><polyline points="' + pts.join(' ') + '" fill="none" stroke="#FF6B35" stroke-width="1.6"/></svg>';
  }
  // Home data cards: built from the feed's dataCards (refreshed by the pipeline in the remote feed, bundled as fallback).
  // Every point is a published official value; nothing is interpolated. Granularity is printed on each card.
  function cardById(id) { return (S.cards || []).filter(function (x) { return x && x.id === id; })[0] || null; }
  function shortDay(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? MON[+p[1] - 1] + ' ' + (+p[2]) : String(iso || ''); }
  function barsSVG(ser) {
    var mx = Math.max.apply(0, ser.concat([1])), W = 100, Hh = 28, bw = W / ser.length;
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + Hh + '" preserveAspectRatio="none" aria-hidden="true"><path d="M0,' + (Hh - .5) + 'H' + W + '" stroke="#333" stroke-width=".6"/>' + ser.map(function (v, k) { return v ? '<rect x="' + (k * bw + .2).toFixed(2) + '" y="' + (Hh - v / mx * (Hh - 2)).toFixed(2) + '" width="' + Math.max(.6, bw - .5).toFixed(2) + '" height="' + (v / mx * (Hh - 2)).toFixed(2) + '" fill="#FF6B35"/>' : ''; }).join('') + '</svg>';
  }
  function homeCards() {
    var out = [], li = cardById('usgs-lithium'), bis = cardById('bis-rules'), ice = cardById('nsidc-ice');
    var ls = li && li.series && li.series.length > 1 ? li.series : [11700, 63700, 39000, 11800, 9000];
    var lc = Math.round((ls[ls.length - 1] / ls[ls.length - 2] - 1) * 100);
    out.push({ k: 'Lithium', v: '$' + Math.round(ls[ls.length - 1]).toLocaleString('en-US'), u: '/t', ch: (lc > 0 ? '+' : '') + lc + '% vs prior year', g: 'Annual avg, 2021 to 2025', src: 'USGS MCS 2026', spark: sparkSVG(ls), url: 'https://pubs.usgs.gov/periodicals/mcs2026/mcs2026-lithium.pdf' });
    if (bis && bis.weekly && bis.weekly.length) {
      var w4 = bis.weekly.slice(-4).reduce(function (a, b) { return a + b; }, 0), yr = bis.weekly.reduce(function (a, b) { return a + b; }, 0);
      out.push({ k: 'Export controls', v: String(w4), u: ' new', ch: 'BIS rules, last 4 wks (' + yr + ' in 52)', g: 'Weekly, 52 weeks', src: 'Federal Register, ' + shortDay(bis.asOf), spark: barsSVG(bis.weekly), url: bis.url });
    } else if (bis) out.push({ k: 'Export controls', v: String((bis.series || []).slice(-1)[0]), u: ' new', ch: 'BIS rules, last month', g: 'Monthly, 12 months', src: 'Federal Register, ' + shortDay(bis.asOf), spark: barsSVG(bis.series || []), url: bis.url });
    out.push({ k: 'Arctic shipping', v: '104', u: ' transits', ch: 'NSR, Jan 1 to Sep 30, 2026', g: '2025 full year: 103', src: 'CHNL, Oct 9', spark: '<div class="nospark">No open time series</div>', url: 'https://chnl.no/news/overview-of-nsr-transit-voyages-as-of-september-30-2026/' });
    if (ice) {
      var d90 = (ice.daily90 || []).map(function (x) { return x[1]; }), sr = d90.length > 1 ? d90 : ice.series;
      out.push({ k: 'Arctic sea ice', v: ice.value.replace(/ km\u00B2$/, ''), u: ' km\u00B2', ch: String(ice.change || '').replace(/ vs the 1981\u20132010 average for the date/, ' vs 1981 to 2010 avg'), g: d90.length > 1 ? 'Daily, last 90 days' : 'Daily, last 30 days', src: 'NSIDC, ' + shortDay(ice.asOf), spark: sparkSVG(sr), url: ice.url });
    }
    return out;
  }
  function homeDataHTML() {
    return '<div class="hdata">' + homeCards().map(function (d) {
      var neg = /^-/.test(d.ch);
      return '<button class="hd" data-url="' + esc(d.url) + '" aria-label="' + esc(d.k + ': ' + d.v + d.u + ', ' + d.ch + '. ' + d.g + '. Source ' + d.src) + '"><span class="hd-k">' + esc(d.k) + '</span><span class="hd-v">' + esc(d.v) + '<small>' + esc(d.u) + '</small></span>' +
        '<span class="hd-c' + (neg ? ' neg' : '') + '">' + esc(d.ch) + '</span>' + d.spark + '<span class="hd-g">' + esc(d.g) + '</span><span class="hd-s">' + esc(d.src) + '</span></button>';
    }).join('') + '</div>';
  }
  function highStripHTML(list) {
    var g0 = S.generated ? new Date(S.generated) : new Date();
    var hi = list.filter(function (i) { return i.signal && i.signal.importance === 'High'; });
    var day = hi.filter(function (i) { return g0 - d(i.published) < 86400000; }).length, wk = hi.filter(function (i) { return g0 - d(i.published) < 7 * 86400000; }).length;
    var txt = day ? day + ' High-impact signal' + (day === 1 ? '' : 's') + ' today' : wk + ' High-impact signal' + (wk === 1 ? '' : 's') + ' this week';
    return '<button class="hstrip" data-tab="signals"><span class="hs-dot"></span>' + esc(txt) + '<span class="sp"></span>View \u203A</button>';
  }
  function asOfText() {
    var g = S.generated ? new Date(S.generated) : new Date();
    try { return 'As of ' + g.toLocaleString('en-US', { timeZone: 'America/Toronto', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET'; } catch (e) { return 'As of ' + fmtDate(g.toISOString()); }
  }
  function sigCardHTML(i, n) {
    var g = i.signal, unread = !S.read[i.id];
    var style = n != null && n < 12 && !S.rendered ? ' style="--i:' + n + '"' : '';
    return '<div class="card sgc' + (S.rendered ? '' : ' in') + '" data-open="' + esc(i.id) + '"' + style + '>' +
      '<div class="sg-top">' + sigBadge(g) + '<span class="sg-hz">Horizon: ' + esc(g.time_horizon) + '</span>' + INFO_BTN + '<span class="sp"></span><span class="sg-date">' + (unread ? '<span class="dot" aria-hidden="true"></span>' : '') + esc(fmtDate(i.published)) + '</span></div>' +
      '<button class="open" data-open="' + esc(i.id) + '"><span class="kicker">' + esc(kickerOf(i)) + '</span><h3>' + esc(mechTitle(i)) + '</h3></button>' +
      '<p class="sg-crux">' + esc(g.crux) + '</p>' + (g.so_what ? '<p class="hc-why"><b>Action:</b> ' + esc(g.so_what) + '</p>' : '') + srcLineHTML(i) +
      indHTML(g) +
      '<div class="sg-ro"><span class="sg-l">Risk:</span><span class="sg-lv ' + lvl(g.risk_level) + '">' + esc(g.risk_level) + '</span><span class="sg-l">Opportunity:</span><span class="sg-lv opp ' + lvl(g.opportunity_level) + '">' + esc(g.opportunity_level) + '</span></div>' + actRowHTML(i) + '</div>';
  }
  var TREND_ARROW = { up: '\u2191', down: '\u2193', steady: '\u2192' };
  function trendHTML() {
    var t = S.trends; if (!t || !t.topics) return '';
    var cells = Object.keys(t.topics).filter(function (k) { return TOPIC_LABEL[k]; }).map(function (k) {
      var w = t.topics[k], wins = ['7', '30', '90'].map(function (n) {
        var x = w[n]; if (!x) return '';
        return x.reliable ? '<span class="tr-w ' + x.dir + '" aria-label="' + n + ' days ' + x.dir + '">' + n + 'd ' + TREND_ARROW[x.dir] + '</span>' : '<span class="tr-w na" aria-label="' + n + ' days not enough history">' + n + 'd n/a</span>';
      }).join('');
      return '<div class="tr-row"><span class="tr-t">' + esc(TOPIC_LABEL[k]) + '</span>' + wins + '</div>';
    }).join('');
    return '<div class="trend"><div class="tr-h">Topic momentum<span>story volume vs prior window</span></div>' + cells + '<p class="tr-n">30d and 90d show n/a until the feed holds enough history to compare.</p></div>';
  }
  function sigControlsHTML() {
    function seg(key, val, label) { var on = S[key] === val; return '<button class="chip sm' + (on ? ' active' : '') + '" aria-pressed="' + on + '" data-sf="' + key + '" data-sv="' + esc(val) + '">' + esc(label) + '</button>'; }
    return '<div class="sg-ctl"><div class="sg-ctl-r"><span class="sg-cl">Sort</span>' + seg('sigSort', 'top', 'Importance') + seg('sigSort', 'latest', 'Freshness') + seg('sigSort', 'score', 'Score') + '</div>' +
      '<div class="sg-ctl-r"><span class="sg-cl">Importance</span>' + ['all', 'High', 'Medium', 'Low'].map(function (v) { return seg('fImpact', v, v === 'all' ? 'All' : v); }).join('') + '</div>' +
      '<div class="sg-ctl-r"><span class="sg-cl">Horizon</span>' + [['all', 'All'], ['Near term', 'Near'], ['Medium term', 'Medium'], ['Long term', 'Long']].map(function (v) { return seg('fHz', v[0], v[1]); }).join('') + '</div>' +
      '<div class="sg-ctl-r"><span class="sg-cl">Score</span>' + [['all', 'All'], ['7', '7+'], ['4', '4+'], ['0', 'Any']].map(function (v) { return seg('fScore', v[0], v[1]); }).join('') + '</div></div>';
  }
  function signalDetailHTML(i) {
    var g = i.signal; if (!g) return '';
    function row(l, v) { return '<div class="sd-row"><span class="sd-l">' + l + '</span><span class="sd-v">' + v + '</span></div>'; }
    var rel = g.related_signals.map(byId).filter(Boolean);
    var u = safeUrl(g.source_url);
    return '<section class="sd" aria-label="Signal">' +
      '<div class="sd-h"><span>Signal</span><span class="sd-hb">' + sigBadge(g) + INFO_BTN + '</span></div><h2 class="sd-t">' + esc(g.signal_title) + '</h2>' +
      '<p class="sd-crux"><b>What changed</b>' + esc(g.crux) + '</p>' +
      '<div class="sd-grid">' + row('Time horizon', esc(g.time_horizon)) + row('Risk', '<span class="sg-lv ' + lvl(g.risk_level) + '">' + esc(g.risk_level) + '</span>') +
      row('Opportunity', '<span class="sg-lv opp ' + lvl(g.opportunity_level) + '">' + esc(g.opportunity_level) + '</span>') + row('Confidence', (+g.confidence_score) + ' / 100') +
      row('Published', esc(g.published_date)) + row('Source', u ? '<button class="link-btn" data-url="' + esc(u) + '">' + esc(g.source_name) + '</button>' : esc(g.source_name)) + '</div>' +
      '<h5>Related industries</h5><div class="sg-chips">' + g.affected_sectors.map(function (x) { return '<span class="sg-sec">' + esc(x) + '</span>'; }).join('') + '</div>' +
      '<h5>Regions affected</h5><div class="sg-chips">' + g.affected_regions.map(function (x) { return '<span class="sg-sec rg">' + esc(x) + '</span>'; }).join('') + '</div>' +
      '<div class="sd-watch"><h5>Watch next</h5><p>' + esc(g.watch_next) + '</p></div>' +
      (rel.length ? '<h5>Related signals</h5><div class="sd-rel">' + rel.map(function (r) { return '<button class="sd-rb" data-open="' + esc(r.id) + '">' + sigBadge(r.signal) + '<span>' + esc(r.signal.signal_title) + '</span></button>'; }).join('') + '</div>' : '') +
      '<p class="sd-note">Signal fields are Voxarc Lab editorial judgment on the sources below.</p></section>';
  }
  // Full analysis (paid layer, free during early access): optional i.tables, or the local sample keyed by id.
  function tablesHTML(i) {
    var ts = Array.isArray(i.tables) ? i.tables : (S.tablesById && S.tablesById[i.id]) || [];
    ts = ts.filter(function (t) { return t && Array.isArray(t.columns) && Array.isArray(t.rows) && t.rows.length; });
    if (!ts.length) return '';
    function na(v) { v = v == null || v === '' ? 'n/a' : String(v).replace(/\s*[\u2014\u2013]\s*/g, ', '); return v === '\u2014' ? 'n/a' : v; }
    return '<section class="fa" aria-label="Full analysis"><div class="fa-h"><h5>Full analysis</h5><span class="fa-pill">Regulatory Dossier</span></div><p class="fa-note">Full analysis is free for a limited time during early access.</p>' + ts.map(function (t) {
      var n = t.columns.length - 1, k = t.keyCol;
      return '<div class="fa-t"><div class="fa-tt">' + esc(t.title) + (t.subset ? '<span class="fa-sub">' + esc(t.subset) + '</span>' : '') + '</div>' +
        '<div class="fa-scroll" tabindex="0" role="region" aria-label="' + esc(t.title) + ', scroll sideways"><table><thead><tr>' + t.columns.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        t.rows.map(function (r) { var c = Array.isArray(r.cells) ? r.cells : [];
          var cells = []; for (var j = 0; j < n; j++) cells.push(j === 0 ? '<th scope="row">' + esc(na(c[0])) + '</th>' : '<td' + (j === k ? ' class="key"' : '') + '>' + esc(na(c[j])) + '</td>');
          return '<tr>' + cells.join('') + '<td class="fa-src">' + esc(na(r.source)) + (r.date ? '<small>' + esc(r.date) + '</small>' : '') + '</td></tr>'; }).join('') +
        '</tbody></table></div>' + (t.value ? '<p class="fa-v"><b>Value</b> ' + esc(na(t.value)) + '</p>' : '') +
        (safeUrl(t.url) ? '<button class="fa-link" data-url="' + esc(t.url) + '">Open source document</button>' : '') + '</div>';
    }).join('') + '</section>';
  }
  function kickerOf(i) { return String(i.kicker || TOPIC_LABEL[category(i)] || '').replace(/\s*\u00B7\s*Policy Signal$/i, ''); }
  function reactHTML(id, labels) {
    var cur = reactionOf(id);
    return REACTIONS.map(function (r) {
      var on = cur === r.id;
      var a = ' data-react="' + r.id + '" data-rid="' + esc(id) + '" aria-pressed="' + on + '" aria-label="' + r.label + (on ? ', selected' : '') + '"';
      return labels ? '<button class="rx' + (on ? ' on' : '') + '"' + a + '><span class="em" aria-hidden="true">' + r.emoji + '</span>' + r.label + '</button>'
        : '<button class="react' + (on ? ' on' : '') + '"' + a + '><span class="em" aria-hidden="true">' + r.emoji + '</span></button>';
    }).join('');
  }
  // noStat: the briefing's number is already on screen in Your 3 signals, so the cover does not repeat it.
  function coverHTML(i, noStat) {
    var t = category(i);
    return '<div class="cover cover-' + t + '" aria-hidden="true"><div class="cover-k">' + esc(TOPIC_LABEL[t] || 'Policy signal') + '<span>' + esc(fmtDate(i.published)) + '</span></div>' +
      (i.stat && i.stat.value && !noStat ? '<div class="cover-v">' + esc(i.stat.value) + '</div><div class="cover-l">' + esc(i.stat.label) + '</div>' : (S.tab === 'feed' ? '<div class="cover-art">' + POLAR_SVG(false) + '</div>' : '')) + '</div>';
  }
  // North-polar mark: latitude rings, meridians, the Arctic Circle in orange and three pinned places
  // (Greenland, the Northern Sea Route and a Canadian North mine site). Drawn in on first run unless reduced motion is on.
  function POLAR_SVG(animated) {
    var mer = ''; for (var k = 0; k < 12; k++) { var a = k * Math.PI / 6; mer += '<path d="M' + (100 + 14 * Math.cos(a)).toFixed(1) + ' ' + (100 + 14 * Math.sin(a)).toFixed(1) + 'L' + (100 + 92 * Math.cos(a)).toFixed(1) + ' ' + (100 + 92 * Math.sin(a)).toFixed(1) + '"/>'; }
    return '<svg class="polar' + (animated ? ' draw' : '') + '" viewBox="0 0 200 200" aria-hidden="true"><g class="grid">' +
      '<circle cx="100" cy="100" r="92"/><circle cx="100" cy="100" r="52"/><circle cx="100" cy="100" r="30"/><circle cx="100" cy="100" r="14"/>' + mer + '</g>' +
      '<circle class="circle" cx="100" cy="100" r="72"/>' +
      '<path class="route" d="M164 112A66 66 0 0 0 126 42"/>' +
      '<g class="pins"><circle class="pin p1" cx="70" cy="50" r="4.5"/><circle class="pin p2" cx="152" cy="74" r="4.5"/><circle class="pin p3" cx="44" cy="138" r="4.5"/></g></svg>';
  }
  function skeletonHTML(n) {
    var h = '<div class="skel-wrap" aria-hidden="true"><div class="sk sk-cover"></div>';
    for (var k = 0; k < (n || 4); k++) h += '<div class="sk-card"><div class="sk sk-k"></div><div class="sk sk-t"></div><div class="sk sk-t short"></div><div class="sk sk-p"></div></div>';
    return h + '</div>';
  }
  function signalsHTML() {
    if (!S.onboarded || S.query || S.topic !== 'all' || S.searchOpen) return '';
    var list = topSignals(3); if (!list.length) return '';
    S.sigIds = list.map(function (i) { return i.id; });
    var picked = followsAll() ? [] : S.follow.map(function (t) { return TOPIC_LABEL[t]; });
    var sub = picked.length ? 'Picked for you from ' + joinList(picked) + ', ranked by fit, evidence and recency.' : 'The briefings with the strongest numbers and sources right now.';
    var h = '<section class="signals" aria-labelledby="sig-h"><div class="sig-head"><div class="brief-date">' + esc(longDate(new Date())) + '</div><h2 id="sig-h">Your 3 signals</h2><p>' + esc(sub) + '</p></div><ol class="sig-list">';
    list.forEach(function (i, n) {
      var why = matchReasons(i);
      h += '<li class="sig' + (S.rendered ? '' : ' in') + '" style="--i:' + n + '"><button class="sig-btn" data-open="' + esc(i.id) + '"><span class="sig-n" aria-hidden="true">' + (n + 1) + '</span><span class="sig-body">' +
        '<span class="kicker">' + esc(TOPIC_LABEL[category(i)]) + ' \u00B7 ' + esc(fmtDate(i.published)) + '</span>' +
        '<span class="sig-v">' + esc(i.stat.value) + '</span><span class="sig-t">' + esc(i.title) + '</span>' +
        (why.length ? '<span class="sig-why">' + ICON.check + 'Matches ' + esc(joinList(why.slice(0, 3))) + '</span>' : '') + '</span></button>' + marketHTML(i, false) + '</li>';
    });
    return h + '</ol></section>';
  }
  function joinList(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function homeChipsHTML() {
    var chips = [{ id: 'all', label: 'Overview' }];
    S.follow.forEach(function (id) { chips.push({ id: id, label: topicLabel(id) }); });
    return '<div class="chips-wrap"><div class="chips" role="tablist" aria-label="Your topics">' + chips.map(function (t) {
      var on = S.topic === t.id;
      var g = t.id === 'all' ? null : taxGroup(t.id);
      var coming = !!(g && g.status !== 'active');
      return '<button role="tab" aria-selected="' + on + '" class="chip' + (on ? ' active' : '') + (coming ? ' soon' : '') + '" data-topic="' + esc(t.id) + '"><span>' + esc(t.label) + '</span>' + (coming ? '<em class="chip-soon">Coming soon</em>' : '') + '</button>';
    }).join('') + '</div></div>';
  }
  function subtopicBarHTML(id) {
    var g = taxGroup(id); if (!g || !(g.subs || []).length) return '';
    return '<div class="chips subtopics" role="group" aria-label="Subtopics, search only">' + g.subs.map(function (s) {
      var on = S.subtopic === s.id;
      return '<button type="button" class="chip' + (on ? ' active' : '') + '" data-subtopic="' + esc(s.id) + '" aria-pressed="' + on + '">' + esc(s.label) + '</button>';
    }).join('') + '</div><p class="sub-note">Subtopics only narrow this desk. They are not separate follows.</p>';
  }
  function coverageHTML() {
    var rows = S.follow.map(function (id) {
      var g = taxGroup(id), n = deskItems(id).length, coming = !!(g && g.status !== 'active');
      var meta = coming ? 'Not live coverage' : (n + ' signal' + (n === 1 ? '' : 's') + ' in the feed');
      return '<button type="button" class="cov-row" data-topic="' + esc(id) + '"><span class="cov-mark" aria-hidden="true"></span><span class="cov-l"><b>' + esc(topicLabel(id)) + '</b><small>' + esc(meta) + '</small></span><span class="cov-s">' + (coming ? 'Coming soon' : 'Following') + '</span></button>';
    }).join('');
    return '<section class="coverage" aria-label="Your coverage"><div class="cov-h"><h2>Your coverage</h2><button type="button" class="link-btn" data-managetopics>Manage</button></div>' +
      (rows || '<p class="bempty">No topics pinned.</p>') + '</section>';
  }
  function renderFeed() {
    var h = '<div class="ptr" id="ptr"><span class="spin"></span><span class="ptr-l">Pull to refresh</span></div>';
    if (S.booting) return h + skeletonHTML(4);
    if (!S.items.length) return h + '<div class="empty err" role="alert">' + ICON.off + '<h3>Could not load briefings</h3><p>Check your connection and try again. Briefings you open are kept on this device for offline reading.</p><button class="btn primary sm" data-retry>' + ICON.retry + 'Retry</button></div>';
    var list = filtered(S.items);
    if (S.searchOpen || S.query) h += '<div class="searchwrap"><label class="search">' + ICON.search + '<input id="q" type="search" placeholder="Search briefings, places, sources" aria-label="Search briefings" value="' + esc(S.query) + '" autocomplete="off" enterkeyhint="search">' + (S.query ? '<button class="clear" data-clear>Clear</button>' : '') + '</label></div>';
    h += homeChipsHTML();
    if (!S.query && !S.searchOpen && S.topic === 'all') {
      var hl = focusOrder(list);
      return h.replace(/<div class="chips-wrap">[\s\S]*?<\/div><\/div>/, '') + briefHTML(hl);
    }
    var desk = !S.query && S.topic !== 'all';
    if (desk) {
      // Topic desk: title, focus line, freshness, then the desk's live data card (no hero when the topic has no real data).
      var fr = freshness(list), dg = taxGroup(S.topic);
      var focus = (dg && dg.focus) || DESK_FOCUS[canonKey(S.topic)] || DESK_FOCUS[S.topic] || '';
      h += '<header class="desk-h"><h2>' + esc(topicLabel(S.topic)) + '</h2><p class="desk-focus">' + esc(focus) + '</p>' +
        (dg && dg.status !== 'active' ? '<p class="sub-note">Coming soon. Signals will appear here when coverage goes live.</p>' : '') +
        '<div class="fresh' + (fr.week ? ' live' : '') + '"><span class="fresh-dot" aria-hidden="true"></span>' + esc(fr.text) + '</div></header>';
      h += subtopicBarHTML(S.topic);
      if (!S.subtopic) h += deskHeroHTML(S.topic); // a chosen subtopic shows its signals first
      h += '<div class="section-h"><h2>Briefings</h2><span>' + list.length + ' on this desk</span></div><span id="unread-l" hidden>Unread</span>';
    } else {
      S.sigIds = null; h += signalsHTML();
      if (!S.query && !S.searchOpen) h += deadlinesSectionHTML(4);
      var title = S.query ? 'Results' : S.sigSort === 'top' ? 'Top Signals' : 'Latest signals';
      var sub = S.query ? list.length + ' briefing' + (list.length === 1 ? '' : 's') : freshness(list).text;
      h += '<div class="section-h"><h2>' + esc(title) + '</h2><span>' + esc(sub) + '</span></div>';
      if (!S.query) h += '<div class="following"><span>Following ' + esc(followsAll() ? 'all ' + CATEGORIES.length + ' topics' : followLabel()) + '</span><button class="link-btn" data-managetopics>Manage topics</button></div>';
      h += '<span id="unread-l" hidden>Unread</span>';
    }
    if (!list.length) {
      var comingDesk = desk && taxGroup(S.topic) && taxGroup(S.topic).status !== 'active';
      if (comingDesk) h += '<div class="empty coming-empty" role="status">' + ICON.spark + '<h3>Coverage coming soon</h3><p>Coverage for this topic is coming soon. You\u2019ll see signals here as soon as it goes live.</p><button type="button" class="btn ghost sm" data-managetopics>Manage topics</button></div>';
      else h += '<div class="empty">' + ICON.search + '<h3>' + (S.subtopic ? 'Coverage coming soon' : 'No signals found') + '</h3><p>' + (S.subtopic ? 'Dedicated coverage of ' + esc((subtopicOf(S.subtopic) || {}).label || 'this subtopic') + ' is coming soon. Nothing in the current feed mentions it yet.' : (S.query ? 'Nothing matches \u201C' + esc(S.query.trim()) + '\u201D. Try a place, a mineral or a policy name.' : 'Try another topic, or open Manage topics.')) + '</p>' +
        (S.query ? '<div class="sugg">' + ['Greenland', 'Rare earths', 'Export controls', 'Northern Sea Route'].map(function (w) { return '<button class="chip" data-suggest="' + esc(w) + '">' + esc(w) + '</button>'; }).join('') + '</div>' : '') +
        (S.subtopic ? '<div class="empty-acts"><button type="button" class="btn ghost sm" data-subtopic="' + esc(S.subtopic) + '">Show all ' + esc(topicLabel(S.topic)) + '</button><button type="button" class="btn ghost sm" data-managetopics>Manage topics</button></div>' : '') + '</div>';
    }
    if (!desk && !S.query) list = S.sigSort === 'top' ? list.slice().sort(function (a, b) { var sb = scoreOf10(b), sa = scoreOf10(a); if (sb == null) sb = -1; if (sa == null) sa = -1; if (sb !== sa) return sb - sa; return d(b.published) - d(a.published); }) : focusOrder(list);
    list.forEach(function (i, n) { h += i.signal ? piCardHTML(i, n === 0 ? 'lead' : '') : cardHTML(i, n === 0 && !S.query && !desk, n); });
    return h;
  }
  function renderSaved() {
    var notes = S.savedView === 'notes', list;
    if (notes) {
      list = S.items.filter(function (i) { return noteOf(i.id); });
      list.sort(function (a, b) { return ((noteOf(b.id) || {}).updatedAt || '') < ((noteOf(a.id) || {}).updatedAt || '') ? -1 : 1; });
    } else {
      list = S.items.filter(function (i) { return isSaved(i.id) || watchOf(i.id); });
      list.sort(function (a, b) {
        var wa = watchOf(a.id), wb = watchOf(b.id);
        if (wa && wb) return (wb.createdAt || '') < (wa.createdAt || '') ? -1 : 1;
        if (wa) return -1; if (wb) return 1;
        return S.saved.indexOf(b.id) - S.saved.indexOf(a.id);
      });
    }
    var h = '<section class="home-hero"><div class="hh-copy"><h1>Stay ahead<br><em>of what matters.</em></h1><p>Your watchlist is private to your account. It is not public. Topics you follow stay on this device.</p></div>' + globeSVG() + '</section>' +
      topicsGridHTML().replace('>Topics<', '>My watchlist<') +
      '<div class="section-h"><h2>Watchlist' + (notes ? ' \u00B7 Private Notes' : '') + '</h2><span>' + list.length + ' private to your account</span></div>';
        h += '<div class="segbar" role="tablist"><button role="tab" data-savedview="saved" aria-selected="' + (!notes) + '" class="' + (notes ? '' : 'on') + '">Watching \u00B7 ' + Object.keys(S.watchlist || {}).length + '</button>' +
      '<button role="tab" data-savedview="notes" aria-selected="' + notes + '" class="' + (notes ? 'on' : '') + '">Private Notes \u00B7 ' + Object.keys(S.privateNotes || {}).length + '</button></div>';
    if (!notes) h += watchRulesHTML();
    if (notes) return h + (list.length ? list.map(function (i) { var n = noteOf(i.id); return '<div class="rp-h"><span>Private Note \u00B7 ' + esc(fmtDate(n.updatedAt)) + '</span></div><p class="rp-c">' + esc(n.body) + '</p>' + (i.signal ? piCardHTML(i) : cardHTML(i, false)); }).join('')
      : '<div class="empty"><h3>No private notes yet</h3><p>Add a Private Note from a Regulatory Dossier. Stored on this device, never a public comment.</p><button class="btn ghost sm" data-tab="feed">Browse Signal Desk</button></div>');
    if (!list.length) return h + '<div class="empty">' + ICON.saved + '<h3>Nothing watched yet</h3><p>Tap Watch on a dossier to keep it here. Watchlists are private by default.</p><button class="btn ghost sm" data-tab="feed">Browse Signal Desk</button></div>';
    return h + list.map(function (i) {
      var seen = (S.watchSeen || {})[i.id];
      var changed = seen && d(i.published).getTime() > seen;
      var tag = changed ? '<p class="wl-chg"><span class="wl-dot"></span>New change detected</p>' : '';
      return tag + (i.signal ? piCardHTML(i) : cardHTML(i, false));
    }).join('');
  }
  function switchHTML(on, label) { return '<button class="switch' + (on ? ' on' : '') + '" data-notif role="switch" aria-checked="' + on + '" aria-label="' + esc(label) + '"></button>'; }
  function renderBrief() {
    if (S.booting) return skeletonHTML(3);
    var now = new Date(); var latest = S.items[0];
    var week = S.items.filter(function (i) { return now - d(i.published) < 7 * 86400000; }).length;
    var unread = S.items.filter(function (i) { return !S.read[i.id]; }).length;
    var h = '<div class="brief-top"><div class="brief-date">' + esc(longDate(now)) + '</div><h2>Dashboard</h2><p>The latest Voxarc Lab signal in each topic, with the number that matters.</p></div>';
    h += '<div class="stats"><div class="stat"><b>' + week + '</b><span>new this week</span></div><div class="stat"><b>' + unread + '</b><span>unread</span></div><div class="stat"><b>' + S.saved.length + '</b><span>saved</span></div></div>';
    if (S.tab === 'brief') h += dashCardsHTML();
    if (!S.prefs.notif) h += '<div class="remind">' + ICON.bell + '<div class="t"><b>Get the brief every morning</b>A local reminder at ' + fmtTime(S.prefs.hour, S.prefs.minute) + ' on this device.</div>' + switchHTML(false, 'Morning reminder') + '</div>';
    ['ai', 'arctic', 'minerals', 'geo'].filter(isFollowed).forEach(function (t) {
      var i = S.items.filter(function (x) { return x.primary === t; })[0] || S.items.filter(function (x) { return (x.topics || []).indexOf(t) >= 0; })[0];
      if (!i) return;
      h += '<button class="tile" data-open="' + esc(i.id) + '"><div class="kicker">' + esc(TOPIC_LABEL[t]) + ' \u00B7 ' + esc(fmtDate(i.published)) + '</div>' +
        (i.stat && i.stat.value ? '<div class="bignum">' + esc(i.stat.value) + '</div><div class="numlabel">' + esc(i.stat.label) + '</div>' : '') +
        '<h4>' + esc(i.title) + '</h4></button>';
    });
    h += deadlinesSectionHTML(3);
    if (latest) h += '<div class="foot">Briefings are cached on this device for offline reading.</div>';
    return h;
  }
  function fmtTime(h, m) { var ap = h >= 12 ? 'PM' : 'AM'; var hh = h % 12 || 12; return hh + ':' + (m < 10 ? '0' : '') + m + ' ' + ap; }
  function profileSummary() {
    var p = S.profile; if (!p || (!(p.regions || []).length && !(p.roles || []).length)) return 'Not set. Regions weight your 3 signals';
    var parts = (p.regions || []).map(function (r) { var R = OB_REGIONS.filter(function (x) { return x.id === r; })[0]; return R ? R.label : ''; })
      .concat((p.roles || []).map(function (r) { var R = OB_ROLES.filter(function (x) { return x.id === r; })[0]; return R ? R.label : ''; })).filter(Boolean);
    return parts.length ? parts.join(', ') : 'All regions';
  }
  function taxMatch(g, q) {
    if (!q) return true;
    var blob = [g.id, g.label, g.focus].concat(g.aliases || []);
    (g.subs || []).forEach(function (s) { blob.push(s.id, s.label); (s.aliases || []).forEach(function (a) { blob.push(a); }); });
    var text = blob.join(' ').toLowerCase();
    return q.split(/\s+/).filter(Boolean).every(function (w) { return text.indexOf(w) >= 0; });
  }
  function renderSettingsTopics() {
    var q = (S.topicQuery || '').trim().toLowerCase();
    var shown = 0;
    var h = '<div class="settings-inner"><div class="subbar"><button class="back" data-setback>' + ICON.back + '<span>Settings</span></button></div>' +
      '<div class="section-h"><h2 id="st-h" tabindex="-1">Manage topics</h2><span>' + S.follow.length + ' pinned</span></div>' +
      '<p class="set-sub">Home shows the topics you pin. Most people start with 3 to 5, and you can pin any or all of them. Coming soon topics can be followed and show an empty desk until coverage goes live. Tap a subtopic to see its signals. Subtopics refine a topic and are not separate follows. Choices stay on this device.</p>' +
      '<div class="searchwrap topic-search"><label class="search">' + ICON.search + '<input id="topicQ" type="search" placeholder="Search topics and subtopics" aria-label="Search topics" value="' + esc(S.topicQuery || '') + '" autocomplete="off"></label></div>';
    TAX.forEach(function (g) {
      if (!taxMatch(g, q)) return;
      shown++;
      var live = g.status === 'active', on = isFollowed(g.id), n = deskItems(g.id).length;
      h += '<section class="topic-block"><div class="cell tcell"><div class="l" id="tl-' + g.id + '"><h3>' + esc(g.label) + '</h3><small>' + esc(g.focus) + '</small><small class="tf">' +
        (live ? (n + ' signal' + (n === 1 ? '' : 's') + ' in the feed') : 'Coming soon') + '</small></div>' +
        '<button class="switch' + (on ? ' on' : '') + '" data-follow="' + g.id + '" role="switch" aria-checked="' + on + '" aria-labelledby="tl-' + g.id + '"></button>' +
        '</div><ul class="sub-list">' + (g.subs || []).map(function (s) {
          var sn = live ? S.items.filter(function (i) { return topicHit(i, g.id) && subtopicHit(i, s.id); }).length : 0;
          var meta = !live ? 'Coming soon' : sn ? sn + ' signal' + (sn === 1 ? '' : 's') : 'No signals yet';
          return '<li><button type="button" class="sub-go" data-subgo="' + esc(s.id) + '" data-group="' + esc(g.id) + '" aria-label="' + esc(s.label + ', ' + meta + ', view signals') + '"><span class="sub-l">' + esc(s.label) + '</span><span class="soon-tag' + (live && sn ? ' live' : '') + '">' + esc(meta) + '</span>' + ICON.chev + '</button></li>';
        }).join('') + '</ul></section>';
    });
    var geoQ = !q || 'geoeconomics'.indexOf(q) >= 0 || 'geo'.indexOf(q) >= 0 || q.indexOf('saved') >= 0;
    if (geoQ) {
      shown++;
      var onG = isFollowed('geo'), nG = deskItems('geo').length;
      h += '<section class="topic-block"><div class="cell tcell"><div class="l" id="tl-geo"><h3>Geoeconomics</h3><small>Saved desk from the previous catalog. Not merged into a new group.</small><small class="tf">' + nG + ' signals in the feed</small></div>' +
        '<button class="switch' + (onG ? ' on' : '') + '" data-follow="geo" role="switch" aria-checked="' + onG + '" aria-labelledby="tl-geo"></button></div></section>';
    }
    if (!shown) h += '<p class="bempty">No topics match that search.</p>';
    h += '<div class="set-actions"><button class="btn ghost sm" data-followall>Pin the live desks</button><button class="btn ghost sm" data-followevery>Pin all ' + catalogIds().length + ' topics</button></div></div>';
    return h;
  }
  function renderContact() {
    return '<div class="settings-inner contact-page"><div class="subbar"><button class="back" data-setback>' + ICON.back + '<span>Settings</span></button></div>' +
      '<div class="section-h"><h2 id="ct-h" tabindex="-1">Contact us</h2></div>' +
      '<div class="group"><div class="about"><img src="img/mark.png" alt=""><div><b>Voxarc Lab</b><p>Publisher of Voxarc Feed, policy intelligence on the Arctic, AI and critical minerals.</p></div></div>' +
      '<div class="cell ct-row"><div class="l">Email<small><a class="ct-a" href="mailto:' + CFG.supportEmail + '">' + esc(CFG.supportEmail) + '</a></small></div></div>' +
      '<div class="cell ct-row"><div class="l">Website<small><a class="ct-a" href="' + CFG.webUrl + '" data-url="' + CFG.webUrl + '">' + esc(CFG.webUrl) + '</a></small></div></div></div>' +
      '<p class="ct-note">Questions, corrections or support: email us and we usually reply within two business days.</p>' +
      '<p class="ct-note"><b>Publishers:</b> to ask for your content to be corrected or removed from Voxarc Feed, email ' + esc(CFG.supportEmail) + ' with a link to the item.</p>' +
      '<div class="foot">Every briefing names its original source and links to it.</div></div>';
  }
  function openContact() { if (!wide() && S.current) closeArticle(); S.tab = 'settings'; S.setView = 'contact'; render(); $('#main').scrollTop = 0; var ch = $('#ct-h'); if (ch) try { ch.focus({ preventScroll: true }); } catch (er) {} }
  window.addEventListener('hashchange', function () { if (location.hash === '#contact') openContact(); });
  function trustPageHTML(view) {
    var disc = '<p class="sd-note">Informational only, not legal or trade-compliance advice.</p>';
    if (view === 'methodology') return trustHead('Methodology', 'How Voxarc Lab turns public sources into signals.') + '<div class="group trust-body">' +
      '<div class="tr-sec"><h3>Sources first</h3><p>Every signal starts from a primary source: a law, regulation, docket, agency notice or official dataset. Each briefing names its source and links to it.</p></div>' +
      '<div class="tr-sec"><h3>Identifiers</h3><p>HS codes, ECCNs and docket numbers appear only when the source itself quotes them. Voxarc Lab does not infer them.</p></div>' +
      '<div class="tr-sec"><h3>Ratings</h3><p>Impact tier (1 to 4) rates the instrument itself. Importance (High, Medium, Low) and the score out of 10 are separate editorial judgments on the cited sources.</p></div>' +
      '<div class="tr-sec"><h3>Checks</h3><p>Ingestion, drafting and validation are separate steps, and a signal is published only after its source check passes. Corrections are logged with a date and linked to the original signal.</p></div>' +
      '<div class="tr-sec"><h3>Not in this build</h3><p>Slack, Teams or email brief delivery, and calls to external AI models.</p></div></div>' + disc;
    if (view === 'corrections') {
      var rows = []; S.items.forEach(function (i) { var p = polOf(i); (p.corrections_log || []).forEach(function (c) { rows.push({ i: i, c: c }); }); });
      return trustHead('Corrections log', 'Dated fixes linked to the original signal.') + '<div class="set-block">' +
        (rows.length ? '<ul>' + rows.map(function (r) { return '<li><button data-open="' + esc(r.i.id) + '">' + esc(mechTitle(r.i)) + '</button> \u00B7 ' + esc(JSON.stringify(r.c)) + '</li>'; }).join('') + '</ul>'
          : '<p>No corrections published yet. Any fix creates a dated entry linked to the original signal.</p>') + disc + '</div>';
    }
    if (view === 'track') {
      var calls = S.items.filter(function (i) { return polOf(i).impact_tier >= 3; }).slice(0, 12);
      return trustHead('Track record', 'Published calls with hits and misses.') + '<div class="set-block"><p>Timestamped published calls. Outcomes are appended as separate records; published calls are never edited.</p><ul>' +
        (calls.length ? calls.map(function (i) { var p = polOf(i); return '<li><span class="tabnum">' + esc(fmtDate(p.ingested_at || i.published)) + '</span> Tier ' + esc(String(p.impact_tier)) + ' \u00B7 ' + esc(mechTitle(i)) + ' \u00B7 ' + esc(p.confidence_rating || '') + '</li>'; }).join('')
          : '<li>No tier 3+ calls in the current desk.</li>') + '</ul>' + disc + '</div>';
    }
    return '';
  }
  function trustHead(title, sub) {
    return '<div class="settings-inner trust-page"><div class="subbar"><button class="back" data-backset>' + ICON.back + '<span>Settings</span></button></div>' +
      '<div class="section-h"><h2 id="tr-h" tabindex="-1">' + esc(title) + '</h2></div><p class="set-sub">' + esc(sub) + '</p>';
  }
  function renderSettings() {
    var times = []; for (var hh = 5; hh <= 21; hh++) times.push(hh);
    if (S.setView === 'topics') return renderSettingsTopics();
    if (S.setView === 'methodology' || S.setView === 'corrections' || S.setView === 'track') return trustPageHTML(S.setView) + '</div>';
    if (S.setView === 'contact') return renderContact();
    var h = '<div class="settings-inner"><div class="section-h"><h2>Settings</h2></div>' + (window.VXSocial ? window.VXSocial.settingsHTML() : '');
    h += '<div class="group-h">Help</div><div class="group"><button class="cell" data-contact><div class="l">Contact us<small>Voxarc Lab support: ' + esc(CFG.supportEmail) + '</small></div>' + ICON.chev + '</button></div>';
    h += '<div class="group-h">Your desk</div><div class="group">' +
      '<button class="cell" data-settopics><div class="l">Manage topics<small>' + esc(followLabel()) + '</small></div><div class="r">' + S.follow.length + ' pinned</div>' + ICON.chev + '</button>' +
      '<button class="cell" data-editprofile><div class="l">Regions and role<small>' + esc(profileSummary()) + '</small></div>' + ICON.chev + '</button></div>';
    h += '<div class="group-h">Reading</div><div class="group">' +
      '<div class="cell"><div class="l" id="fs-l">Text size</div><div class="seg" role="group" aria-labelledby="fs-l">' + [15, 17, 19, 21].map(function (f, n) { return '<button data-fs="' + f + '" aria-pressed="' + (S.prefs.fs === f) + '" aria-label="' + ['Small', 'Medium', 'Large', 'Extra large'][n] + '" class="' + (S.prefs.fs === f ? 'on' : '') + '">' + ['S', 'M', 'L', 'XL'][n] + '</button>'; }).join('') + '</div></div>' +
      '<div class="cell"><div class="l">Offline library<small>' + S.items.length + ' briefings stored on this device' + (S.updated ? ', checked ' + (fmtDate(S.updated) === 'Today' ? 'today' : fmtDate(S.updated) === 'Yesterday' ? 'yesterday' : fmtDate(S.updated)) : '') + '</small></div><div class="r">' + (S.online ? 'Ready' : 'Offline') + '</div></div>' +
      '<button class="cell" data-refresh aria-live="polite"><div class="l">' + (S.refreshing ? 'Checking for new briefings\u2026' : 'Check for new briefings') + '<small>' + esc(S.refreshing ? 'Contacting the Voxarc feed' : (S.lastCheck ? S.lastCheck : 'Downloads any briefings published since your last check')) + '</small></div>' + (S.refreshing ? '<span class="cell-spin" aria-hidden="true"></span>' : ICON.chev) + '</button></div>';
    var nNotes = Object.keys(S.privateNotes || {}).length, nFb = Object.keys(S.signalFeedback || {}).length;
    var SX = window.VXSocial, pubOn = !!(SX && SX.isPublic()), meU = SX && SX.user(), nTr = (meU && meU.tracked_by_count) || 0;
    h += '<div class="group-h">Visibility</div><div class="group">' +
      (pubOn ? '<button class="cell" data-vis="stealth"><div class="l">Public mode<small>Public as @' + esc(meU.handle) + '. Tap to switch back to Stealth.</small></div><div class="r on">Public</div>' + ICON.chev + '</button>'
        : '<button class="cell" data-vis="stealth"><div class="l">Stealth Corporate Mode<small>On by default. Nothing you do in Voxarc Feed is published.</small></div><div class="r">On</div>' + ICON.chev + '</button>') +
      '<button class="cell" data-vis="comment"><div class="l">Comment &amp; Annotate<small>' + (pubOn ? 'Public comments under your name. ' : '') + nNotes + ' Private Note' + (nNotes === 1 ? '' : 's') + ' on this device.</small></div><div class="r' + (pubOn ? ' on' : '') + '">' + (pubOn ? 'Public' : 'Private') + '</div>' + ICON.chev + '</button>' +
      '<button class="cell" data-vis="cite"><div class="l">Cite &amp; Annotate<small>' + (pubOn ? 'Public citations under your name, plus your Private Desk.' : 'Private Desk on this device. Public citations need Public mode.') + '</small></div><div class="r' + (pubOn ? ' on' : '') + '">' + (pubOn ? 'Public' : 'Private') + '</div>' + ICON.chev + '</button>' +
      '<button class="cell" data-vis="tracked"><div class="l">Tracked by<small>' + (pubOn ? 'Your public analyst profile. Tap to see who tracks you.' : 'Public analyst profile others can track. Needs Public mode.') + '</small></div><div class="r' + (pubOn ? ' on' : '') + '">' + (pubOn ? nTr : 'Off') + '</div>' + ICON.chev + '</button>' +
      '<button class="cell" data-vis="feedback"><div class="l">Helpful Signal / Not Relevant<small>' + nFb + ' mark' + (nFb === 1 ? '' : 's') + ', kept private on this device</small></div><div class="r">Private</div>' + ICON.chev + '</button>' +
      '<p class="set-sub" style="padding:8px 16px 12px">Never public: Watchlists, Private Notes, Forward to Team, Helpful/Not Relevant, Ask history, and whom you track. If you use a company email, your employer policy may restrict public activity.</p></div>';
    h += '<div class="group-h">Trust</div><div class="group">' +
      '<button class="cell" data-trust="methodology"><div class="l">Methodology<small>How tiers, provenance and scores work</small></div><div class="r">\u203A</div></button>' +
      '<button class="cell" data-trust="corrections"><div class="l">Corrections log<small>Dated fixes linked to original signals</small></div><div class="r">\u203A</div></button>' +
      '<button class="cell" data-trust="track"><div class="l">Track record<small>Published calls with hits and misses</small></div><div class="r">\u203A</div></button></div>';
    h += '<div class="group-h">Daily brief</div><div class="group">' +
      '<div class="cell"><div class="l">Morning reminder<small>A local notification on this device</small></div>' + switchHTML(S.prefs.notif, 'Morning reminder') + '</div>' +
      '<div class="cell"><label class="l" for="notifTime">Time</label><select id="notifTime">' + times.map(function (t) { return '<option value="' + t + '"' + (S.prefs.hour === t ? ' selected' : '') + '>' + fmtTime(t, 0) + '</option>'; }).join('') + '</select></div></div>';
    h += '<div class="group-h">Your data</div><div class="group">' +
      '<button class="cell" data-clearsaved><div class="l">Clear saved briefings<small>' + S.saved.length + ' saved on this device</small></div>' + ICON.chev + '</button>' +
      '<button class="cell" data-clearread><div class="l">Clear reading history<small>Marks every briefing as unread</small></div>' + ICON.chev + '</button></div>';
    h += '<div class="group-h">About</div><div class="group">' +
      '<div class="about"><img src="img/mark.png" alt=""><div><b>Voxarc Signal Desk</b><p>Policy intelligence from Voxarc Lab. Private team workspace by default. Stealth by default. Optional accounts can turn on Public mode for comments, citations and a public analyst profile.</p></div></div>' +
      '<button class="cell" data-url="' + CFG.siteUrl + '"><div class="l">About Voxarc Lab</div>' + ICON.chev + '</button>' +
      '<button class="cell" data-url="' + CFG.privacyUrl + '"><div class="l">Privacy Policy</div>' + ICON.chev + '</button>' +
      '<button class="cell" data-url="' + CFG.termsUrl + '"><div class="l">Terms of Use</div>' + ICON.chev + '</button>' +
      '<button class="cell" data-url="' + CFG.guidelinesUrl + '"><div class="l">Community Guidelines</div>' + ICON.chev + '</button>' +
      '<button class="cell" data-mail="Voxarc Feed feedback"><div class="l">Send feedback</div><div class="r">' + esc(CFG.feedbackEmail) + '</div></button>' +
      '<div class="cell"><div class="l">Version</div><div class="r" id="appVersion">' + esc(CFG.version) + '</div></div></div>';
    h += '<div class="foot">Voxarc Signal Desk by Voxarc Lab. Checked extraction from public sources, linked in every dossier. Informational only. Not legal or trade-compliance advice.</div></div>';
    return h;
  }
  // Batch 2: Dashboard data cards (official free sources only, each with source, as-of date and link)
  function dashCardsHTML() {
    var seen = {}, cs = (S.cards || []).filter(function (c) { if (!c || !c.id || seen[c.id]) return false; seen[c.id] = 1; return true; })
      .map(function (c) { var o = cardOf({ dataCard: c }); if (o) { o.url = safeUrl(c.url); o.desk = (c.desks || [])[0]; } return o; }).filter(Boolean);
    if (!cs.length) return '';
    return '<div class="section-h"><h2>Data</h2><span>Official sources</span></div><div class="dgrid">' + cs.map(function (c) {
      return '<div class="dcell"><div class="dc-t">' + esc(c.title) + '</div><div class="dc-v">' + esc(c.value) + ' <small>' + esc(c.unit) + '</small></div>' +
        (c.change ? '<div class="dc-c">' + esc(c.change) + '</div>' : '') + (c.series.length > 2 ? chartSVG(c, 140, 34) : '') +
        '<div class="dc-s">' + esc(c.source) + ' \u00B7 ' + esc(c.asOfLabel || c.asOf) + '</div>' + (c.url ? '<button class="tr-link" data-url="' + esc(c.url) + '">Source \u2197</button>' : '') + '</div>';
    }).join('') + '</div><p class="dc-gap">Arctic shipping transits and lithium price: no free official feed wired yet, so no card is shown.</p>';
  }
  // Batch 2: expert notes. Only notes with approved:true and a named author render; otherwise an honest placeholder.
  function expertNoteOf(i) { var n = i && i.expertNote; return n && n.approved === true && n.author && n.text ? n : null; }
  function expertHTML(i) { var n = expertNoteOf(i); return n ? '<div class="xnote"><div class="xn-k">Expert note \u00B7 ' + esc(n.author) + (n.role ? ', ' + esc(n.role) : '') + '</div><p>' + esc(n.text) + '</p></div>' : ''; }
  function expertSectionHTML() {
    var list = S.items.filter(expertNoteOf);
    return '<div class="section-h"><h2>Expert notes</h2><span>' + list.length + ' published</span></div>' + (list.length ? list.slice(0, 3).map(function (i) { return '<button class="tile" data-open="' + esc(i.id) + '">' + expertHTML(i) + '<h4>' + esc(i.title) + '</h4></button>'; }).join('')
      : '<div class="empty sm"><p>No expert notes are published yet. Bylined notes appear here once an expert has written and approved them.</p></div>');
  }
  // Batch 2: Ask answers only from bundled briefings, with numbered citations and an as-of date; refuses when nothing matches.
  function askAnswerHTML(list) {
    // Part B grounded Copilot: every factual claim carries [Sn] + source date. No outside knowledge / LLM.
    if (!list.length) return '<div class="ask-ans refuse" role="status"><b>Not in provided sources.</b><p>No sourced signal covers \u201C' + esc(S.query.trim()) + '\u201D. A primary gazette, register or docket filing on this topic would answer it. Nothing is guessed.</p></div>';
    var top = list.slice(0, 3), asOf = '', oldest = '';
    var action = [], material = [], mitigate = [], sources = [], conflicts = [], claims = [];
    function claimLine(text, tag, dt) {
      if (!text) return '';
      var line = esc(text) + ' <sup>[' + tag + ']</sup>' + (dt ? ' <span class="ask-d">' + esc(dlDate(dt)) + '</span>' : ' <span class="ask-d">date not in source</span>');
      claims.push({ text: String(text), tag: tag, dt: dt || '' });
      return '<li>' + line + '</li>';
    }
    top.forEach(function (i, k) {
      var p = polOf(i), g = sigOf(i), tag = 'S' + (k + 1);
      var t = trustOf(i); var dt = (t && t.date) || String(p.source_published_at || i.published || '').slice(0, 10);
      if (dt && dt > asOf) asOf = dt;
      if (dt && (!oldest || dt < oldest)) oldest = dt;
      var dir = p.operational_directive || g.so_what || '';
      if (dir) action.push(claimLine(dir, tag, dt));
      var stage = p.procedural_stage || p.stage || '';
      if (stage) action.push(claimLine('Procedural stage: ' + stage, tag, dt));
      if (p.effective_date) action.push(claimLine('Effective date: ' + p.effective_date, tag, dt));
      // MATERIAL AND VOLUME DELTA: only quantified price/volume/tariff/lead-time changes — never geo/industry tags
      function isQuantifiedDelta(a) {
        if (!a) return false;
        var blob = [a.value, a.unit, a.label, a.kind, a.excerpt].map(function (x) { return String(x || ''); }).join(' ');
        var cat = /\b(price|prices|volume|volumes|tariff|tariffs|duty|duties|lead[\-\s]?time|quota|tonnage|throughput)\b/i.test(blob);
        var chg = /(%|\bpercent\b|[+\-]\d|\bincrease\b|\bdecrease\b|\bup\b|\bdown\b|\brise\b|\bfell\b|\bdrop\b|\bgrew\b|\byear over year\b|\byoy\b|\bvs\.?\s*prior)/i.test(blob);
        return cat && chg;
      }
      (Array.isArray(p.quantitative_anchors) ? p.quantitative_anchors : anchorsOf(i)).forEach(function (a) {
        if (!isQuantifiedDelta(a)) return;
        material.push(claimLine(String(a.value || '') + (a.unit ? ' ' + a.unit : '') + (a.label ? ' \u00B7 ' + a.label : ''), tag, dt));
      });
      ['volume_delta', 'price_delta', 'tariff_delta', 'lead_time_delta', 'lead_time'].forEach(function (k) {
        if (p[k]) material.push(claimLine(k.replace(/_/g, ' ') + ': ' + p[k], tag, dt));
      });
      // MITIGATION PATHWAYS: only supported alternatives/exemptions — never compliance windows, HS/ECCN, or notice quotes
      function pushPath(txt) { if (txt) mitigate.push(claimLine(String(txt), tag, dt)); }
      (Array.isArray(p.mitigation_pathways) ? p.mitigation_pathways : []).forEach(pushPath);
      (Array.isArray(p.exemptions) ? p.exemptions : []).forEach(pushPath);
      (Array.isArray(p.alternatives) ? p.alternatives : []).forEach(pushPath);
      (Array.isArray(p.license_exceptions) ? p.license_exceptions : []).forEach(pushPath);
      if (p.supported_pathway) pushPath(p.supported_pathway);
      if (p.exemption) pushPath(p.exemption);
      if (p.alternative) pushPath(p.alternative);
      sources.push('<li>[' + tag + '] ' + esc(provenanceLabel(i) || p.primary_source_type || srcName(i) || 'Source') +
        (p.document_identifier ? ' \u00B7 ' + esc(p.document_identifier) : '') +
        (dt ? ' \u00B7 ' + esc(dlDate(dt)) : ' \u00B7 date not in source') +
        (t && t.url ? ' <button class="tr-link" data-url="' + esc(t.url) + '">Open \u2197</button>' : '') + '</li>');
    });
    // Conflict detection: same claim family (effective date / HS / stage) with disagreeing values across sources
    function vals(re) {
      var out = [];
      claims.forEach(function (c) { if (re.test(c.text)) out.push(c); });
      return out;
    }
    [['Effective date', /^Effective date:/i], ['HS code', /^HS code/i], ['Procedural stage', /^Procedural stage:/i]].forEach(function (pair) {
      var rows = vals(pair[1]);
      var uniq = {};
      rows.forEach(function (r) { uniq[r.text] = (uniq[r.text] || []); uniq[r.text].push(r); });
      var keys = Object.keys(uniq);
      if (keys.length > 1) {
        conflicts.push('<li><b>Conflict on ' + esc(pair[0]) + ':</b> ' + keys.map(function (k) {
          var rs = uniq[k];
          return esc(k.replace(/^[^:]+:\s*/, '')) + ' [' + rs.map(function (x) { return x.tag; }).join(', ') + ']' + (rs[0].dt ? ' (' + esc(dlDate(rs[0].dt)) + ')' : '');
        }).join(' vs ') + '. Official gazette / register entries are preferred; both shown — nothing picked silently.</li>');
      }
    });
    if (!material.length) material.push('<li>Not in provided sources.</li>');
    if (!mitigate.length) mitigate.push('<li>No supported pathway in provided sources.</li>');
    if (!action.length) action.push('<li>Not in provided sources.</li>');
    var stale = oldest && ((Date.now() - d(oldest + 'T12:00:00Z').getTime()) > 30 * 86400000);
    return '<div class="ask-ans copilot" role="status">' +
      '<div class="xn-k">Policy Intelligence Copilot \u00B7 grounded in ' + top.length + ' retrieved source' + (top.length > 1 ? 's' : '') + (asOf ? ' \u00B7 as of ' + esc(dlDate(asOf)) : '') + '</div>' +
      (stale ? '<p class="ask-stale">Stale flag: at least one retrieved source is older than 30 days' + (oldest ? ' (oldest ' + esc(dlDate(oldest)) + ')' : '') + '. Topic may have moved; verify the live docket.</p>' : '') +
      (conflicts.length ? '<div class="ask-conflict"><h4>SOURCE CONFLICTS</h4><ul>' + conflicts.join('') + '</ul></div>' : '') +
      '<h4>ACTION DIRECTIVE</h4><ul>' + action.join('') + '</ul>' +
      '<h4>MATERIAL AND VOLUME DELTA</h4><ul>' + material.join('') + '</ul>' +
      '<h4>MITIGATION PATHWAYS</h4><ul>' + mitigate.join('') + '</ul>' +
      '<h4>SOURCES</h4><ol class="ask-cites">' + sources.join('') + '</ol>' +
      '<p class="sd-note">Informational only. Not legal or trade-compliance advice. Every factual line above carries a source tag and date from retrieved desk fields only.</p>' +
      '<div class="pi-desk" role="group">' +
      '<button class="rx" data-privnote="' + esc(top[0].id) + '">Save to Private Desk</button>' +
      '<button class="rx" data-forward="' + esc(top[0].id) + '">Route to Team</button>' +
      '<button class="rx" data-flag="' + esc(top[0].id) + '">Flag to Legal</button>' +
      '<button class="rx" data-citepriv="' + esc(top[0].id) + '">Cite &amp; Annotate</button></div>' +
      '<p class="sd-note">Save to Private Desk and Cite open a Private Note on this device (account-private if signed in). They do not send to teammates. Route to Team opens your device share sheet — you choose the recipient; nothing is auto-sent. No external model call and no Slack/Teams/email delivery in this build.</p></div>';
  }
  // Batch 2 focus: keep For you ~80% Arctic, AI and critical minerals (at most 1 in 5 Geoeconomics-only items near the top).
  function focusOrder(list) {
    var core = [], geo = [], out = [];
    list.forEach(function (i) { ((i.topics || []).some(function (t) { return t !== 'geo'; }) ? core : geo).push(i); });
    while (core.length || geo.length) { for (var k = 0; k < 4 && core.length; k++) out.push(core.shift()); if (geo.length) out.push(geo.shift()); }
    return out;
  }
  // Batch 3 policy trackers: items with real dated milestones (published, then each deadline), status from today's date.
  function trackersHTML() {
    var t = todayISO(), rows = S.items.filter(function (i) { return inFollow(i) && deadlinesOf(i, true).length; }).slice(0, 4);
    if (!rows.length) return '';
    return '<div class="section-h"><h2>Policy trackers</h2><span>' + rows.length + ' tracked</span></div>' + rows.map(function (i) {
      var steps = [{ date: String(i.published).slice(0, 10), label: 'Published' }].concat(deadlinesOf(i, true));
      var open = steps.some(function (x) { return x.date >= t; });
      return '<button class="tile trk" data-open="' + esc(i.id) + '"><div class="kicker">' + esc(TOPIC_LABEL[category(i)]) + ' \u00B7 ' + (open ? 'Open' : 'Closed') + '</div><h4>' + esc(i.title) + '</h4><ol class="tl">' +
        steps.map(function (x) { return '<li class="' + (x.date < t ? 'done' : 'next') + '"><span class="tl-d">' + esc(dlDate(x.date)) + '</span><span>' + esc(x.label) + '</span></li>'; }).join('') + '</ol></button>';
    }).join('');
  }
  function renderSignals() {
    if (S.booting) return skeletonHTML(4);
    var q = S.query, tp = S.topic, so = S.searchOpen; S.query = ''; S.topic = 'all'; S.searchOpen = false;
    S.query = q; S.topic = tp; S.searchOpen = so;
    var q2 = S.query; S.query = ''; var list = filtered(S.items); S.query = q2;
    if (S.sigSort === 'top') list = list.slice().sort(function (a, b) { var sb = scoreOf10(b), sa = scoreOf10(a); if (sb == null) sb = -1; if (sa == null) sa = -1; if (sb !== sa) return sb - sa; return d(b.published) - d(a.published); });
    if (S.sigQuery) {
      var sq = S.sigQuery.trim().toLowerCase();
      list = list.filter(function (i) {
        var p = polOf(i);
        var topicHay = (i.topics || []).map(function (t) { return topicLabel(canonId(t) || t); }).join(' ');
        var hay = [i.title, i.summary, i.body, topicHay, p.jurisdiction || '', (p.geo_impact || []).join(' '), (p.industry_impact || []).join(' ')].join(' ').toLowerCase();
        return sq.split(/\s+/).every(function (w) { return w && hay.indexOf(w) >= 0; });
      });
    }
    var allOn = S.fImpact === 'all' && S.fJuris === 'all' && S.fIndustry === 'all' && !S.sigQuery;
    function qchip(attrs, label, on) { return '<button type="button" class="chip' + (on ? ' active' : '') + '" ' + attrs + '>' + label + '</button>'; }
    var quick = '<div class="chips sig-quick" role="toolbar" aria-label="Signal filters">' +
      qchip('data-sigclear="1"', 'All', allOn) +
      qchip('data-ff="fImpact" data-fv="' + (S.fImpact === 'High' ? 'all' : 'High') + '"', 'High Impact', S.fImpact === 'High') +
      qchip('data-ff="fJuris" data-fv="' + (S.fJuris === 'Canada' ? 'all' : 'Canada') + '"', 'Canada', S.fJuris === 'Canada') +
      qchip('data-ff="fIndustry" data-fv="' + (S.fIndustry === 'semiconductors' ? 'all' : 'semiconductors') + '"', 'Semiconductors', S.fIndustry === 'semiconductors') +
      '<button type="button" class="chip icon-chip' + (activeFilterCount() ? ' active' : '') + '" data-opensfilters="1" aria-label="All filters"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6 7v6l-4 2v-8z"/></svg></button></div>';
    var h = '<header class="tb"><h1>Signals</h1><p>' + list.length + ' signals \u00B7 ' + esc(asOfText()) + '</p></header>' +
      '<div class="searchwrap"><label class="search">' + ICON.search + '<input id="sigQ" type="search" placeholder="Search signals, topics, regions" aria-label="Search signals, topics, regions" value="' + esc(S.sigQuery) + '" autocomplete="off" enterkeyhint="search"></label></div>' +
      quick + sigControlsHTML() + trendHTML() +
      '<div class="section-h"><h2>' + (S.sigSort === 'top' ? 'Top Signals' : 'Latest signals') + '</h2><button type="button" class="sec-link" data-pdfbrief="1">Export PDF</button></div><span id="unread-l" hidden>Unread</span>';
    return h + (list.length ? list.map(function (i, n) { return i.signal ? piCardHTML(i, n === 0 ? 'lead' : '') : cardHTML(i, false); }).join('') : '<div class="empty"><h3>No signals match</h3><p>Try another importance or horizon.</p></div>');
  }
  function todayTile(n, label) {
    return '<div class="ttile"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V10M10 19V5M16 19v-7M21 19H3"/></svg><b class="tabnum">' + n + '</b><span>' + esc(label) + '</span></div>';
  }
  function trendCounts() {
    var t = S.trends; if (!t || !t.topics) return null;
    var c = { up: 0, down: 0, steady: 0, n: 0 };
    Object.keys(t.topics).forEach(function (k) {
      var x = t.topics[k] && t.topics[k]['7'];
      if (!x || !x.reliable) return;
      c.n++;
      if (x.dir === 'up') c.up++;
      else if (x.dir === 'down') c.down++;
      else c.steady++;
    });
    return c.n ? c : null;
  }
  function renderDashboard() {
    if (S.booting) return '<div class="skel-wrap" aria-hidden="true"><div class="sk-card"><div class="sk sk-t"></div><div class="sk sk-t short"></div></div></div>';
    var stages = ['draft', 'consultation', 'enacted', 'enforcement'];
    var jurisOrder = ['China', 'United States', 'European Union', 'Canada', 'Japan'];
    var counts = {}, max = 1;
    var byImp = { High: 0, Medium: 0, Low: 0 }, byHz = { 'Near term': 0, 'Medium term': 0, 'Long term': 0 };
    var byGeo = {}, byInd = {};
    S.items.forEach(function (i) {
      var p = polOf(i), g = sigOf(i);
      if (p.jurisdiction && p.procedural_stage) {
        var k = p.jurisdiction + '|' + p.procedural_stage;
        counts[k] = (counts[k] || 0) + 1; if (counts[k] > max) max = counts[k];
      }
      var tier = p.importance_tier || g.importance; if (byImp[tier] != null) byImp[tier]++;
      var hz = p.time_horizon || g.time_horizon; if (byHz[hz] != null) byHz[hz]++;
      (p.geo_impact || []).forEach(function (c) { byGeo[c] = (byGeo[c] || 0) + 1; });
      (p.industry_impact || []).forEach(function (c) { byInd[c] = (byInd[c] || 0) + 1; });
    });
    S.items.forEach(function (i) {
      var j = polOf(i).jurisdiction;
      if (j && jurisOrder.indexOf(j) < 0) jurisOrder.push(j);
    });
    jurisOrder = jurisOrder.filter(function (j) {
      return stages.some(function (s) { return counts[j + '|' + s]; });
    }).slice(0, 8);
    var heat = '<div class="heat" role="table" aria-label="Jurisdiction by stage"><div class="heat-h"><span></span>' +
      stages.map(function (s) { return '<span>' + esc(s) + '</span>'; }).join('') + '</div>';
    jurisOrder.forEach(function (j) {
      heat += '<div class="heat-r"><span class="heat-j">' + esc(j.replace('United States', 'US').replace('European Union', 'EU')) + '</span>';
      stages.forEach(function (s) {
        var n = counts[j + '|' + s] || 0;
        var inten = n ? Math.max(0.15, n / max) : 0;
        heat += '<button class="heat-c" data-heatj="' + esc(j) + '" data-heats="' + esc(s) + '" style="--i:' + inten.toFixed(2) + '" aria-label="' + esc(j + ', ' + s + ': ' + n) + '">' +
          (n ? '<span class="tabnum">' + n + '</span>' : '') + '</button>';
      });
      heat += '</div>';
    });
    heat += '</div>';
    function barBlock(title, obj, filterKey) {
      var keys = Object.keys(obj).sort(function (a, b) { return obj[b] - obj[a]; });
      if (!keys.length) return '<p class="bempty">No data yet.</p>';
      var mx = obj[keys[0]] || 1;
      return '<div class="dash-bars" aria-label="' + esc(title) + '">' + keys.slice(0, 10).map(function (k) {
        return '<button class="dash-bar" data-ff="' + filterKey + '" data-fv="' + esc(k) + '"><span class="db-l">' + (filterKey === 'fGeo' ? jurisFlag(k) + ' ' : '') + esc(k) + '</span>' +
          '<span class="db-t"><i style="width:' + Math.round(obj[k] / mx * 100) + '%"></i></span><span class="db-n tabnum">' + obj[k] + '</span></button>';
      }).join('') + '</div>';
    }
    function countPills(obj, filterKey) {
      return '<div class="dash-pills">' + Object.keys(obj).map(function (k) {
        return '<button class="fchip" data-ff="' + filterKey + '" data-fv="' + esc(k) + '">' + esc(k) + ' <b class="tabnum">' + obj[k] + '</b></button>';
      }).join('') + '</div>';
    }
    var upcoming = [];
    S.items.forEach(function (i) {
      var p = polOf(i); if (!p.effective_date) return;
      upcoming.push({ i: i, d: p.effective_date });
    });
    upcoming.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
    upcoming = upcoming.filter(function (x) { return x.d >= todayISO(); }).slice(0, 8);
    var upHTML = upcoming.length ? '<ul class="up-list">' + upcoming.map(function (x) {
      return '<li><button data-open="' + esc(x.i.id) + '"><span class="tabnum">' + esc(dlDate(x.d)) + '</span><span>' + esc(mechTitle(x.i)) + '</span></button></li>';
    }).join('') + '</ul>' : '<p class="bempty">No upcoming effective dates in the current feed.</p>';
    var wl = Object.keys(S.watchlist || {});
    var wlHTML = '';
    if (wl.length) {
      wlHTML = '<ul class="wl-dash">' + wl.map(function (id) {
        var i = byId(id), seen = (S.watchSeen || {})[id];
        if (!i) return '';
        var changed = !seen || (d(i.published).getTime() > (seen || 0));
        return '<li class="' + (changed ? 'chg' : '') + '"><button data-open="' + esc(id) + '">' +
          (changed ? '<span class="wl-dot"></span><span class="wl-chg">Changed since last visit</span>' : '') +
          '<span class="wl-t">' + esc(mechTitle(i)) + '</span></button></li>';
      }).join('') + '</ul>';
      wl.forEach(function (id) { var i = byId(id); if (i) S.watchSeen[id] = Date.now(); });
      store.set('vx.watchSeen', S.watchSeen);
    } else {
      wlHTML = '<p class="bempty">Watch signals from a detail page to track them here.</p>';
    }
    var tc = trendCounts();
    var today = '<div class="today-row" aria-label="Today, counted from the feed">' +
      todayTile(byImp.High, 'High impact') + todayTile(byImp.Medium, 'Medium') + todayTile(byImp.Low, 'Low') +
      todayTile(S.items.filter(function (i) { return !S.read[i.id]; }).length, 'Unread') + '</div>';
    var trend = tc ? '<div class="section-h"><h2>Trending</h2><span>7-day volume vs prior week</span></div><div class="trend-row">' +
      '<div class="ttile"><b class="up tabnum">' + tc.up + '</b><span>Up</span></div>' +
      '<div class="ttile"><b class="tabnum">' + tc.steady + '</b><span>Steady</span></div>' +
      '<div class="ttile"><b class="down tabnum">' + tc.down + '</b><span>Down</span></div></div>' : '';
    return '<div class="brief-top"><div class="brief-date">' + esc(longDate(new Date())) + '</div><h2>Dashboard</h2><p>Counts from the live feed. Tap a cell or bar to filter Signals. No estimated percent change.</p></div>' +
      homeHeroHTML().replace('Structured intelligence<br><em>for a clearer tomorrow</em>', 'The live feed<br><em>at a glance</em>') +
      today + trend +
      '<section class="dash-sec"><h3>Importance</h3>' + countPills(byImp, 'fImpact') + '</section>' +
      '<section class="dash-sec"><h3>Time horizon</h3>' + countPills(byHz, 'fHorizon') + '</section>' +
      '<section class="dash-sec"><h3>Jurisdiction by stage</h3>' + heat + '</section>' +
      '<section class="dash-sec"><h3>Impact by country</h3>' + barBlock('Impact by country', byGeo, 'fGeo') + '</section>' +
      '<section class="dash-sec"><h3>Impact by industry</h3>' + barBlock('Impact by industry', byInd, 'fIndustry') + '</section>' +
      '<section class="dash-sec"><h3>Upcoming effective dates</h3>' + upHTML + '</section>' +
      '<section class="dash-sec"><h3>Watchlist</h3>' + wlHTML + '</section>';
  }

  function renderAsk() {
    var q = S.query || '';
    var h = '<div class="brief-top"><h2>Your AI intelligence assistant.</h2><p>Answers are built only from signals already on this desk, with source tags. Nothing is guessed and no outside model is called.</p></div>' +
      '<div class="searchwrap ask-wrap"><label class="search" for="askQ">' + ICON.search +
      '<input id="askQ" type="search" placeholder="Ask about a docket, mineral, HS code or filing" aria-label="Ask Signal Desk" value="' + esc(q) + '" autocomplete="off" enterkeyhint="search">' +
      (q ? '<button type="button" class="clear" data-clear aria-label="Clear">Clear</button>' : '') +
      '<button type="button" class="ask-send" data-asksend aria-label="Ask"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6"/></svg><span>Ask</span></button></label></div>';
    if (!q) return h + '<div class="sugg ask-sugg" role="list">' + ['Greenland', 'Rare earths', 'Export controls', 'Northern Sea Route'].map(function (w) {
      return '<button type="button" class="chip" data-suggest="' + esc(w) + '">' + esc(w) + '</button>';
    }).join('') + '</div>';
    var tq = S.topic; S.topic = 'all';
    h += askAnswerHTML(filtered(S.items));
    var list = filtered(S.items); S.topic = tq;
    h += '<div class="section-h"><h2>Results</h2><span>' + list.length + ' briefing' + (list.length === 1 ? '' : 's') + '</span></div>';
    if (!list.length) h += '<div class="empty">' + ICON.search + '<h3>No signals found</h3><p>Nothing matches \u201C' + esc(q.trim()) + '\u201D.</p></div>';
    return h + list.map(function (i) { return cardHTML(i, false); }).join('');
  }
  function submitAsk(raw) {
    var v = String(raw == null ? ((($('#askQ') || {}).value) || '') : raw).replace(/\s+/g, ' ').trim();
    S.query = v; S.searchOpen = !!v; haptic('LIGHT'); render();
    var el = $('#askQ'); if (el && v) { try { el.blur(); } catch (err) {} }
  }
  function render() {
    document.body.classList.toggle('full', S.tab === 'settings');
    var m = $('#main'), y = m.scrollTop;
    var oc = $('#main .chips'), cx = oc ? oc.scrollLeft : 0;
    m.innerHTML = S.tab === 'feed' ? renderFeed() : S.tab === 'signals' ? renderSignals() : S.tab === 'saved' ? renderSaved() : S.tab === 'brief' ? renderDashboard() : S.tab === 'ask' ? renderAsk() : renderSettings();
    m.scrollTop = y;
    chipsSync(cx);
    m.setAttribute('aria-busy', S.booting ? 'true' : 'false');
    var tabs = document.querySelectorAll('#tabbar button');
    for (var i = 0; i < tabs.length; i++) { var on = tabs[i].dataset.tab === S.tab; tabs[i].classList.toggle('active', on); if (on) tabs[i].setAttribute('aria-current', 'page'); else tabs[i].removeAttribute('aria-current'); }
    $('#btnSearch').classList.toggle('on', S.searchOpen);
    $('#btnSearch').setAttribute('aria-expanded', String(!!S.searchOpen));
    $('#offlineBar').hidden = S.online;
    if (!S.booting) S.rendered = true;
    if (wide() && S.tab !== 'settings' && !S.current && S.items[0] && !S.booting && (!S.ob)) openArticle(S.items[0].id, true);
  }

  // The topic row scrolls sideways: keep its position across renders, bring the active chip into view and fade the
  // edge that has more chips behind it, so it is clear the row scrolls.
  function chipsSync(x) {
    var c = $('#main .chips'); if (!c) return;
    c.scrollLeft = x || 0;
    var a = $('.chip.active', c);
    if (a) { var l = a.offsetLeft - c.offsetLeft, r = l + a.offsetWidth; if (l < c.scrollLeft + 8) c.scrollLeft = Math.max(0, l - 20); else if (r > c.scrollLeft + c.clientWidth - 40) c.scrollLeft = r - c.clientWidth + 48; }
    chipsEdge(c);
    if (!c.__vx) { c.__vx = 1; c.addEventListener('scroll', function () { chipsEdge(c); }, { passive: true }); }
  }
  function chipsEdge(c) {
    var w = c.parentNode; if (!w) return;
    var more = c.scrollWidth - c.clientWidth - c.scrollLeft > 2;
    w.classList.toggle('more-r', more); w.classList.toggle('more-l', c.scrollLeft > 2);
  }

  function bodyHTML(text) {
    var paras = text.split(/\n\s*\n/);
    return paras.map(function (p, n) {
      p = p.trim(); if (!p) return '';
      var lines = p.split('\n');
      return lines.map(function (l) {
        l = l.trim(); if (!l) return '';
        var m = l.match(/^(\d+)[.)]\s+(.*)$/);
        if (m) return '<p class="n"><b class="num">' + m[1] + '</b>' + linkify(m[2]) + '</p>';
        if (/^[^.!?]{2,60}:$/.test(l)) return '<p class="h">' + esc(l.replace(/:$/, '')) + '</p>';
        var lm = l.match(/^(Why it matters|Caveat|Bottom line|What to watch):\s*(.*)$/i);
        if (lm) return '<p><b style="color:var(--orange)">' + esc(lm[1]) + ':</b> ' + linkify(lm[2]) + '</p>';
        return '<p' + (n === 0 ? ' class="lead"' : '') + '>' + linkify(l) + '</p>';
      }).join('');
    }).join('');
  }
  function linkify(s) { return esc(s); }

  function articleHTML(i) {
    var p = polOf(i), hasPol = i.signal && Object.keys(p).length;
    var h = '<div class="rbar"><button class="back" data-back>' + ICON.back + '<span>Back</span></button><span class="rbar-title">Signal</span><span class="sp"></span>' +
      '<button class="icon-btn" data-textsize aria-label="Text size">' + ICON.aa + '</button>' +
      '<button class="icon-btn save-pill' + (isSaved(i.id) || watchOf(i.id) ? ' on' : '') + '" data-watch="' + esc(i.id) + '" aria-label="' + (watchOf(i.id) ? 'Remove from Watchlist' : 'Save signal') + '">' + ICON.bm + '<span>Save</span></button></div><div class="rprog" id="rprog"></div>';
    h += '<div class="rscroll" id="rscroll"><article>';
    // Terminal: no hero image. Instrument summary leads for policy signals.
    if (hasPol) {
      h += '<div class="pi-detail-head">' + impactBadge(i) + '</div>';
      h += policyFieldsHTML(i);
      h += impactChipsHTML(i);
    } else {
      h += '<div class="kicker">' + esc(kickerOf(i)) + '</div><h1 tabindex="-1" id="rtitle">' + markup(i.titleMarkup || i.title) + '</h1>';
    }
    h += '<h1 class="visually-hidden" tabindex="-1" id="rtitle">' + esc(hasPol ? mechTitle(i) : (i.title || '')) + '</h1>';
    // Source + freshness only (no byline, no )
    h += '<div class="ameta signal-meta">' + primaryCueHTML(i) + '<span class="pi-st-a">' + esc(sourceAgo(i) || fmtDate(i.published)) + '</span><span class="bp ai">AI-assisted</span></div>';
    h += '<div class="pi-tools detail">' + shareSignalBtn(i) + '</div>';
    h += metricTilesHTML(i);
    if (i.signal && !p.instrument_type) h += signalDetailHTML(i);
    h += tablesHTML(i);
    if (i.stat && i.stat.value) h += '<div class="statbox"><b class="tabnum">' + esc(i.stat.value) + '</b><span>' + esc(i.stat.label) + '</span></div>';
    // Action (was So what)
    var act = (i.signal && i.signal.so_what) || (p && p.impact_subline) || '';
    if (act) h += '<p class="hc-why big"><b>Action:</b> ' + esc(act) + '</p>';
    h += soWhatHTML(i, true);
    var dls = deadlinesOf(i, true);
    if (dls.length) h += '<div class="kdates"><h5>Key dates</h5>' + dls.map(function (x) {
      var past = x.date < todayISO(), dl = DL_TYPES[x.type] && !past;
      return '<div class="kd' + (past ? ' past' : '') + '">' + (dl ? '<span class="dl-chip"><b>Deadline</b></span>' : '') + '<span class="kd-l">' + esc(x.label) + '</span><span class="kd-d tabnum">' + esc(dlDate(x.date)) + (past ? ' (passed)' : ' \u00B7 ' + inDays(x.date)) + '</span></div>';
    }).join('') + '</div>';
    h += dataCardHTML(i, true);
    h += marketHTML(i, true);
    if (i.keyPoints && i.keyPoints.length) h += '<div class="kp"><h5>At a glance</h5><ul>' + i.keyPoints.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></div>';
    h += '<div class="body">' + bodyHTML(i.body) + '</div>';
    if (i.sources && i.sources.length) h += '<div class="sources"><h5>Sources</h5>' + i.sources.map(function (s) {
      var u = safeUrl(s.url);
      return (u ? '<button class="src" data-url="' + esc(u) + '">' : '<div class="src">') + '<span class="pub">Source: ' + esc(s.publisher) + '</span> · ' + esc(s.title) + '<small class="tabnum">' + esc(s.date || '') + '</small>' + (u ? '</button>' : '</div>'); }).join('') + '</div>';
    if (window.VXSocial && CFG.flags.publicSocial) h += window.VXSocial.commentsHTML(i);
    h += '<p class="disclaimer"><b>AI-assisted.</b> Summary, impact and horizon ratings are drafted with AI from the linked public sources and reviewed by Voxarc Lab. Check the originals before acting. For information only. Not legal advice. No warranty or obligation; non-binding.</p>' +
      '<button class="btn ghost sm" data-sx="sigreport" data-id="' + esc(i.id) + '">Report inaccurate or misleading signal</button>' +
      detailSocialHTML(i) +
      '</article></div>';
    if (hasPol) h += policyActionsHTML(i);
    return h;
  }

  function openArticle(id, silent) {
    var i = byId(id); if (!i) return;
    S.current = id; var r = $('#reader');
    r.innerHTML = articleHTML(i); r.classList.add('open'); r.setAttribute('aria-hidden', 'false');
    var sc = $('#rscroll'); sc.scrollTop = 0;
    sc.addEventListener('scroll', function () { var p = sc.scrollTop / Math.max(1, sc.scrollHeight - sc.clientHeight); $('#rprog').style.width = Math.min(100, p * 100) + '%'; }, { passive: true });
    if (!silent) { S.read[id] = Date.now(); store.set('vx.read', S.read); }
    if (wide()) { var cards = document.querySelectorAll('.card'); for (var k = 0; k < cards.length; k++) cards[k].classList.toggle('sel', cards[k].dataset.open === id); }
    document.body.classList.add('reading');
    if (!silent && !wide()) {
      history.pushState({ a: id }, '');
      S.returnFocus = document.activeElement && document.activeElement.closest ? document.activeElement.closest('[data-open]') : null;
      $('#main').setAttribute('aria-hidden', 'true'); $('#tabbar').setAttribute('aria-hidden', 'true');
      var t = $('#rtitle'); if (t) setTimeout(function () { try { t.focus({ preventScroll: true }); } catch (e) {} }, 30);
    }
  }
  function closeArticle() {
    var r = $('#reader'); r.classList.remove('open'); r.setAttribute('aria-hidden', 'true'); S.current = null;
    document.body.classList.remove('reading');
    $('#main').removeAttribute('aria-hidden'); $('#tabbar').removeAttribute('aria-hidden');
    if (!wide()) setTimeout(function () { if (!S.current) r.innerHTML = ''; }, 300);
    var back = S.returnFocus && S.returnFocus.dataset ? S.returnFocus.dataset.open : null;
    var fromSig = !!(S.returnFocus && S.returnFocus.classList && S.returnFocus.classList.contains('sig-btn')); S.returnFocus = null;
    render();
    if (back) {  // return focus to the control that opened the briefing (a briefing can be both a signal and a card)
      var q = back.replace(/"/g, ''), card = '#main .open[data-open="' + q + '"]', sig = '#main .sig-btn[data-open="' + q + '"]';
      var e = document.querySelector(fromSig ? sig : card) || document.querySelector(fromSig ? card : sig); if (e) try { e.focus({ preventScroll: true }); } catch (x) {}
    }
  }

  /* ---------- first-run onboarding ---------- */
  // First run is light: the intro, then one screen to pick any of the 13 topics (3 live desks are suggested).
  // Skip is always visible and follows everything. Regions and role are optional and live in Settings.
  // Every choice is stored on this device only; nothing is sent anywhere and there is no account.
  var OB_FIRST = ['intro', 'follow', 'regions', 'role', 'stealth'], OB_EDIT = ['regions', 'role', 'stealth'];
  function startOnboarding(edit) {
    var p = S.profile || {};
    S.ob = { steps: edit ? OB_EDIT : OB_FIRST, step: 0, topics: edit ? S.follow.slice() : RECOMMENDED.slice(), regions: (p.regions || []).slice(), roles: (p.roles || []).slice(), visibility: S.visibilityMode || 'STEALTH', edit: !!edit };
    renderOnboarding(0);
  }
  function obChoice(kind, o, on, extra) {
    return '<button class="ob-opt' + (extra ? ' big' : '') + (on ? ' on' : '') + '" data-ob="' + kind + '" data-v="' + o.id + '" aria-pressed="' + on + '">' +
      (extra ? '<span class="ob-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="' + o.ic + '"/></svg></span><span class="ob-tx"><b>' + esc(o.label) + '</b><small>' + esc(o.d) + '</small><em>' + extra + '</em></span>' : esc(o.label)) +
      '<span class="ob-tick" aria-hidden="true">' + ICON.check + '</span></button>';
  }
  function countTopic(t) { return S.items.filter(function (i) { return (i.topics || []).indexOf(t) >= 0; }).length; }
  function renderOnboarding(dir) {
    var o = S.ob, el = $('#onboard'); if (!o) { el.hidden = true; el.innerHTML = ''; return; }
    var step = o.steps[o.step], h = '';
    var top = '<div class="ob-top">' + (o.step > 0 ? '<button class="ob-back" data-obback aria-label="Back">' + ICON.back + '</button>' : '<span></span>') +
      (o.edit ? '<div class="ob-prog" aria-label="Step ' + (o.step + 1) + ' of 2">' + [0, 1].map(function (n) { return '<i class="' + (n <= o.step ? 'on' : '') + '"></i>'; }).join('') + '</div>' : '<span></span>') +
      '<button class="ob-skip" data-obskip>' + (o.edit ? 'Cancel' : 'Skip') + '</button></div>';
    if (step === 'intro') {
      h = '<div class="ob-body intro"><div class="ob-hero">' + POLAR_SVG(!reducedMotion()) + '<div class="ob-pinlabels" aria-hidden="true"><span class="l1">Greenland</span><span class="l2">Northern Sea Route</span><span class="l3">Canadian North</span></div></div>' +
        '<div class="ob-copy"><div class="ob-brand"><img src="img/mark.png" alt=""><span>Voxarc Lab</span></div><h1 id="ob-h" tabindex="-1">Policy signals for the North.</h1>' +
        '<p>Arctic, AI and critical-minerals policy, distilled into sourced briefings you can read in three minutes.</p>' +
        '<ul class="ob-points"><li>' + ICON.spark + '<span><b>Your 3 signals, every morning</b>Ranked by what you follow, with the number that matters.</span></li>' +
        '<li>' + ICON.check + '<span><b>Sources one tap away</b>Every claim links to the original document.</span></li>' +
        '<li>' + ICON.saved + '<span><b>No sign-up, no tracking</b>Your choices stay on this device.</span></li></ul></div></div>' +
        '<div class="ob-cta"><button class="btn primary" data-obnext>Choose my topics</button></div>';
    } else if (step === 'follow') {
      var picks = TAX.map(function (g) {
        var live = g.status === 'active';
        var meta = live ? (deskItems(g.id).length + ' signals in the feed') : 'Coming soon';
        return obChoice('topics', { id: g.id, label: g.label, ic: 'M4 7h16M4 12h16M4 17h10', d: g.focus }, o.topics.indexOf(g.id) >= 0, meta);
      }).join('') + obChoice('topics', { id: 'geo', label: 'Geoeconomics', ic: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18', d: 'Saved desk. Not a new topic.' }, o.topics.indexOf('geo') >= 0, deskItems('geo').length + ' signals in the feed');
      h = '<div class="ob-body"><div class="ob-k">Your desk</div><h1 id="ob-h" tabindex="-1">Choose the topics you want to follow</h1><p class="ob-sub">Most people start with 3 to 5. You can follow any or all of them, including Coming soon topics; their desks stay empty until coverage goes live. Change this any time in Manage topics.</p><div class="ob-list">' +
        picks + '</div></div>' +
        '<div class="ob-cta"><button class="btn primary" data-obdone>' + followCta(o.topics.length) + '</button></div>';
    } else if (step === 'regions') {
      h = '<div class="ob-body"><div class="ob-k">Step 1 of 2</div><h1 id="ob-h" tabindex="-1">Which regions matter to you?</h1><p class="ob-sub">We weight your 3 signals toward briefings that name these places.</p><div class="ob-chips">' +
        OB_REGIONS.map(function (r) { return obChoice('regions', r, o.regions.indexOf(r.id) >= 0); }).join('') + '</div></div>' +
        '<div class="ob-cta"><button class="btn primary" data-obnext>' + (o.regions.length ? 'Continue' : 'Continue with all regions') + '</button></div>';
    } else if (step === 'role') {
      var ri = o.steps.indexOf('role') + 1, rn = o.steps.length;
      h = '<div class="ob-body"><div class="ob-k">Step ' + ri + ' of ' + rn + '</div><h1 id="ob-h" tabindex="-1">What best describes you?</h1><p class="ob-sub">Role picker for your Signal Desk. Optional. Choices stay on this device unless you sync an account later.</p><div class="ob-chips">' +
        OB_ROLES.map(function (r) { return obChoice('roles', r, o.roles.indexOf(r.id) >= 0); }).join('') + '</div></div>' +
        '<div class="ob-cta"><button class="btn primary" data-obnext>Continue</button></div>';
    } else if (step === 'stealth') {
      var vis = o.visibility || 'STEALTH';
      h = '<div class="ob-body"><div class="ob-k">Visibility</div><h1 id="ob-h" tabindex="-1">Stealth or Public</h1><p class="ob-sub">Stealth is on by default. Choose Public to post comments and citations under your name and get a public analyst profile others can track. Watchlists, Private Notes, Forward and Helpful/Not Relevant are never public.</p><div class="ob-chips">' +
        '<button class="ob-opt' + (vis === 'STEALTH' ? ' on' : '') + '" data-ob="visibility" data-v="STEALTH" aria-pressed="' + (vis === 'STEALTH') + '">Stealth (recommended)<span class="ob-tick" aria-hidden="true">' + ICON.check + '</span></button>' +
        '<button class="ob-opt' + (vis === 'PUBLIC' ? ' on' : '') + '" data-ob="visibility" data-v="PUBLIC" aria-pressed="' + (vis === 'PUBLIC') + '" aria-describedby="obVisNote">Public<span class="ob-tick" aria-hidden="true">' + ICON.check + '</span></button>' +
        '</div><p class="ob-note" id="obVisNote" role="status" aria-live="polite" hidden></p><p class="ob-sub">If you later use a company email, your employer policy may restrict public activity.</p></div>' +
        '<div class="ob-cta"><button class="btn primary" data-obdone>Save desk preferences</button></div>';
    } else {
      h = '<div class="ob-body"><h1 id="ob-h">Continue</h1></div><div class="ob-cta"><button class="btn primary" data-obdone>Done</button></div>';
    }
    el.innerHTML = '<div class="ob-screen ' + (dir > 0 ? 'fwd' : dir < 0 ? 'rev' : '') + '" data-step="' + step + '">' + top + h + '</div>';
    el.hidden = false; document.body.classList.add('ob-open');
    var hd = $('#ob-h'); if (hd) setTimeout(function () { try { hd.focus({ preventScroll: true }); } catch (e) {} }, 40);
  }
  function obToggle(kind, v) {
    if (kind === 'visibility') {
      S.ob.visibility = v === 'PUBLIC' ? 'PUBLIC' : 'STEALTH';
      var nt = document.getElementById('obVisNote');
      if (nt) { nt.textContent = S.ob.visibility === 'PUBLIC' ? 'Next you sign in or create a free account and choose your public handle. You stay in Stealth until you confirm.' : ''; nt.hidden = S.ob.visibility !== 'PUBLIC'; }
      var opts = document.querySelectorAll('#onboard [data-ob="visibility"]');
      for (var n = 0; n < opts.length; n++) { var on = opts[n].dataset.v === S.ob.visibility; opts[n].classList.toggle('on', on); opts[n].setAttribute('aria-pressed', String(on)); }
      haptic('LIGHT'); return;
    }
    var a = S.ob[kind], k = a.indexOf(v);
    if (kind === 'roles') S.ob.roles = k >= 0 ? [] : [v];
    else if (k >= 0) a.splice(k, 1);
    else {
      if (kind === 'topics' && !canonId(v)) { toast('That topic is not available'); return; }
      a.push(v);
    }
    haptic('LIGHT');
    var btn = document.querySelector('#onboard [data-ob="' + kind + '"][data-v="' + v + '"]');
    // update in place so the screen does not re-animate on every tap
    var opts = document.querySelectorAll('#onboard [data-ob="' + kind + '"]');
    for (var n = 0; n < opts.length; n++) { var on = S.ob[kind].indexOf(opts[n].dataset.v) >= 0; opts[n].classList.toggle('on', on); opts[n].setAttribute('aria-pressed', String(on)); }
    var step = S.ob.steps[S.ob.step];
    if (step === 'follow') { var fc = $('#onboard [data-obdone]'); if (fc) fc.textContent = followCta(S.ob.topics.length); }
    var cta = $('#onboard [data-obnext]');
    if (cta && step === 'regions') cta.textContent = S.ob.regions.length ? 'Continue' : 'Continue with all regions';
    if (btn) { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
  }
  function followCta(n) { return n ? 'Follow ' + n + ' topic' + (n === 1 ? '' : 's') : 'Choose at least one'; }
  function finishOnboarding(skipped) {
    var o = S.ob, first = !S.onboarded;
    if (!o.edit) setFollow(o.topics.length ? o.topics : RECOMMENDED); // skip keeps the suggestion; it does not follow every topic
    else if (!skipped) {
      S.profile = { topics: S.follow.slice(), regions: o.regions, roles: o.roles, t: Date.now() };
      store.set('vx.profile', S.profile);
    }
    if (!skipped) {
      // PUBLIC is only real once the account switch succeeds on the server, so open the Public mode setup after the desk is built.
      var wantPublic = o.visibility === 'PUBLIC' && window.VXSocial && !window.VXSocial.isPublic();
      if (o.visibility !== 'PUBLIC' && window.VXSocial && window.VXSocial.isPublic()) setTimeout(function () { window.VXSocial.modeSheet(); }, o.edit ? 50 : 1700);
      if (wantPublic) setTimeout(function () { window.VXSocial.publicSheet(); }, o.edit ? 50 : 1700);
      if (!window.VXSocial) { S.visibilityMode = 'STEALTH'; store.set('vx.visibilityMode', S.visibilityMode); }
    }
    if (o.edit) {
      S.ob = null; document.body.classList.remove('ob-open'); var ee = $('#onboard'); ee.hidden = true; ee.innerHTML = '';
      render(); if (!skipped) toast('Desk preferences saved'); return;
    }
    S.onboarded = true; store.set('vx.onboarded', { t: Date.now(), v: 1 });
    if (first) {
      // Day one should feel like today, not homework: briefings older than 7 days start as read.
      var now = Date.now(), changed = false;
      S.items.forEach(function (i) { if (!S.read[i.id] && now - d(i.published) > 7 * 86400000) { S.read[i.id] = 1; changed = true; } });
      if (changed) store.set('vx.read', S.read);
    }
    S.ob = null; document.body.classList.remove('ob-open');
    var el = $('#onboard');
    if (skipped) { el.hidden = true; el.innerHTML = ''; S.tab = 'feed'; S.topic = 'all'; S.rendered = false; render(); return; }
    haptic('MEDIUM');
    el.innerHTML = '<div class="ob-screen building" role="status"><div class="ob-build">' + POLAR_SVG(!reducedMotion()) + '<h2>Building your feed</h2><p>Ranking ' + S.items.filter(inFollow).length + ' briefings from ' + esc(followsEveryTopic() ? 'all ' + S.follow.length + ' desks' : joinList(S.follow.map(function (t) { return topicLabel(t); }))) + '\u2026</p></div>' + skeletonHTML(2) + '</div>';
    setTimeout(function () {
      el.classList.add('out');
      S.tab = 'feed'; S.topic = 'all'; S.query = ''; S.searchOpen = false; S.rendered = false; render(); $('#main').scrollTop = 0;
      setTimeout(function () { el.hidden = true; el.innerHTML = ''; el.classList.remove('out'); var sh = $('#sig-h'); if (sh) { sh.setAttribute('tabindex', '-1'); try { sh.focus({ preventScroll: true }); } catch (e) {} } }, reducedMotion() ? 0 : 320);
    }, reducedMotion() ? 200 : 1100);
  }

  /* ---------- actions ---------- */
  function toggleFollow(t) {
    var id = canonId(t);
    if (!id) { toast('That topic is not available'); return; }
    if (isFollowed(id) && S.follow.length === 1) { toast('Follow at least one topic'); return; }
    var on = !isFollowed(id);
    setFollow(on ? S.follow.concat([id]) : S.follow.filter(function (x) { return canonKey(x) !== canonKey(id); }));
    haptic(); render(); toast((on ? 'Following ' : 'Stopped following ') + topicLabel(id));
  }
  function toggleSave(id) {
    if (window.VXSocial && !window.VXSocial.user()) {
      return needAccount('Sign in or create a free account to bookmark this signal. Reading stays free without an account.', function () { toggleSave(id); });
    }
    var k = S.saved.indexOf(id);
    if (k >= 0) S.saved.splice(k, 1); else S.saved.push(id);
    store.set('vx.saved', S.saved); haptic(); if (window.VXSocial) window.VXSocial.onSave(id, k < 0); toast(k >= 0 ? 'Removed from Saved' : 'Saved to your account');
    render(); refreshReader();
  }
  function refreshReader() { if (S.current) { var sc = $('#rscroll'), y = sc ? sc.scrollTop : 0; openArticle(S.current, true); if ($('#rscroll')) $('#rscroll').scrollTop = y; } }
  function toggleReact(id, r) {
    if (!byId(id)) return;
    var off = reactionOf(id) === r;
    if (off) delete S.reactions[id]; else S.reactions[id] = { r: r, t: Date.now() };
    store.set('vx.reactions', S.reactions); haptic(); if (window.VXSocial) window.VXSocial.onReact(id, off ? null : r);
    var m = $('#main'), y = m.scrollTop; render(); m.scrollTop = y; refreshReader();
  }
  function linkOf(i) { return safeUrl(i.signal && i.signal.source_url) || (trustOf(i) || {}).url || CFG.siteUrl; }
  function shareSignalSheet(id) {
    var i = byId(id); if (!i) return;
    // Sharing requires an account (Apple: reading stays free). Resume this sheet after sign-in/sign-up.
    if (window.VXSocial && !window.VXSocial.user()) {
      return window.VXSocial.requireAuth('Sign in or create a free account to share a signal. Reading stays free without an account.', function () { shareSignalSheet(id); });
    }
    sheet('<h3>Share Signal</h3><p>Choose one destination. Nothing is posted until you confirm.</p>' +
      '<label class="share-note-l" for="shareNote">Comment, optional</label><textarea id="shareNote" class="repc" maxlength="280" placeholder="Optional note"></textarea>' +
      '<button type="button" class="btn primary" data-sharego="team" data-id="' + esc(id) + '">Team Desk</button>' +
      '<button type="button" class="btn ghost" data-sharego="private" data-id="' + esc(id) + '">Private Desk</button>' +
      '<button type="button" class="btn ghost" data-sharego="public" data-id="' + esc(id) + '">Public comment on this signal' + (window.VXSocial && window.VXSocial.isPublic() ? '' : ' \u00B7 Public mode') + '</button>' +
      '<button type="button" class="btn ghost" data-sharego="os" data-id="' + esc(id) + '">Share outside the app</button>' +
      '<button type="button" class="btn ghost" data-closesheet>Cancel</button>');
  }
  function repostSheet(id) { shareSignalSheet(id); }
  function shareGo(kind, id) {
    if (S.shareBusy) return;
    S.shareBusy = true;
    var note = (($('#shareNote') || {}).value || '').replace(/\s+/g, ' ').trim().slice(0, 280);
    closeSheet();
    if (kind === 'team') forwardTeam(id, note);
    else if (kind === 'private') { S._noteSeed = note; privateNoteSheet(id); }
    else if (kind === 'public') { if (window.VXSocial) window.VXSocial.postFromShare(id, note); }
    else shareItem(id, note);
    setTimeout(function () { S.shareBusy = false; }, 700);
  }
  function shareItem(id, comment) {
    var i = byId(id); if (!i) return;
    var lead = (i.stat && i.stat.value ? i.stat.value + ': ' + i.stat.label : (i.summary || '')).replace(/\s+/g, ' ');
    if (lead.length > 180) lead = lead.slice(0, 177).replace(/\s+\S*$/, '') + '...';
    var text = (comment ? comment + '\n\n' : '') + (i.signal && i.signal.crux ? String(i.signal.crux).replace(/\s*[\u2014\u2013]\s*/g, ', ') : i.title + '\n\n' + lead) + '\n\nVoxarc Lab policy signal, read more in Voxarc Feed.';
    haptic();
    var sh = plugin('Share');
    if (sh) return sh.share({ title: i.title, text: text, url: linkOf(i), dialogTitle: 'Share signal' }).catch(function () {});
    if (navigator.share) return navigator.share({ title: i.title, text: text, url: linkOf(i) }).catch(function () {});
    if (navigator.clipboard) navigator.clipboard.writeText(text + '\n' + linkOf(i)).then(function () { toast('Copied to clipboard'); });
  }
  function setNotif(on) {
    var ln = plugin('LocalNotifications');
    if (!on) {
      S.prefs.notif = false; store.set('vx.prefs', S.prefs);
      if (ln) ln.cancel({ notifications: [{ id: NOTIF_ID }] }).catch(function () {});
      render(); toast('Daily brief reminder off'); return;
    }
    if (!ln) { S.prefs.notif = true; store.set('vx.prefs', S.prefs); render(); toast('Daily brief at ' + fmtTime(S.prefs.hour, S.prefs.minute)); return; }
    ln.requestPermissions().then(function (p) {
      if (p.display !== 'granted') { toast(Cap && typeof Cap.getPlatform === 'function' && Cap.getPlatform() === 'android' ? 'Allow notifications in Settings to get the brief' : 'Allow notifications in iOS Settings to get the brief'); return; }
      S.prefs.notif = true; store.set('vx.prefs', S.prefs); scheduleNotif().then(function () { toast('Daily brief at ' + fmtTime(S.prefs.hour, S.prefs.minute)); }); render();
    }).catch(function () { toast('Notifications are unavailable'); });
  }
  // Batch 3 smart alert: when a refresh brings new briefings in a followed topic, one local notification (only if reminders are on).
  function topicAlert(fresh) {
    var ln = plugin('LocalNotifications'); if (!ln || !S.prefs.notif || !fresh.length) return;
    var t = TOPIC_LABEL[category(fresh[0])] || 'your topics';
    ln.schedule({ notifications: [{ id: NOTIF_ID + 1, title: fresh.length + ' new in ' + t, body: fresh[0].title, extra: { tab: 'feed' } }] }).catch(function () {});
  }
  function scheduleNotif() {
    var ln = plugin('LocalNotifications'); if (!ln || !S.prefs.notif) return Promise.resolve();
    var next = S.items.filter(function (i) { return !S.read[i.id]; })[0] || S.items[0];
    return ln.cancel({ notifications: [{ id: NOTIF_ID }] }).catch(function () {}).then(function () {
      return ln.schedule({ notifications: [{ id: NOTIF_ID, title: 'Your Voxarc daily brief', body: next ? 'Catch up: ' + next.title : 'Open Voxarc Feed for the latest policy signals.',
        schedule: { on: { hour: S.prefs.hour, minute: S.prefs.minute }, allowWhileIdle: true }, extra: { tab: 'brief' } }] });
    }).catch(function () {});
  }
  function sheet(html) { var s = $('#sheet'); $('.sheet-card', s).innerHTML = html; s.hidden = false; s.removeAttribute('hidden'); s.style.display = 'flex'; }
  function closeSheet() { var s = $('#sheet'); if (!s) return; s.hidden = true; s.setAttribute('hidden', ''); s.style.display = 'none'; }
  function visSheet(kind) {
    var nNotes = Object.keys(S.privateNotes || {}).length, fb = S.signalFeedback || {}, nH = 0, nN = 0;
    Object.keys(fb).forEach(function (k) { if (fb[k] && fb[k].v === 'helpful') nH++; else nN++; });
    var ok = '<button class="btn ghost" data-closesheet>Done</button>';
    // 1.4.0: every Visibility control is live. Mode, public comments, public citations and Tracked by run on the account backend (js/social.js).
    var SX = window.VXSocial;
    if (SX && kind === 'stealth') { SX.modeSheet(); return; }
    if (SX && (kind === 'comment' || kind === 'cite')) { SX.annotateSheet(kind); return; }
    if (SX && kind === 'tracked') { SX.trackedSheet(); return; }
    if (kind === 'feedback') {
      sheet('<h3>Helpful Signal / Not Relevant</h3><p class="vis-p">Mark a signal from its dossier. Marks stay on this device and are never shown to anyone.</p>' +
        '<div class="vis-state"><span class="vis-dot on" aria-hidden="true"></span><div><b class="vis-b">' + nH + ' Helpful \u00B7 ' + nN + ' Not Relevant</b><span>Stored privately on this device.</span></div></div>' +
        (nH + nN ? '<button class="btn ghost" data-visclear="feedback">Clear my marks</button>' : '') + ok);
      return;
    }
  }
  function visClear(what, confirmed) {
    if (what === 'notes') {
      var n = Object.keys(S.privateNotes || {}).length;
      if (!confirmed) { sheet('<h3>Delete all Private Notes?</h3><p class="vis-p">This deletes ' + n + ' Private Note' + (n === 1 ? '' : 's') + ' from this device. It cannot be undone.</p><button class="btn primary" data-visclearok="notes">Delete notes</button><button class="btn ghost" data-vis="comment">Cancel</button>'); return; }
      S.privateNotes = {}; saveNotes(); closeSheet(); render(); toast('Private Notes deleted from this device'); return;
    }
    if (what === 'feedback') { S.signalFeedback = {}; store.set('vx.signalFeedback', S.signalFeedback); closeSheet(); render(); toast('Helpful / Not Relevant marks cleared'); }
  }
  function manualRefresh() {
    if (S.refreshing) return;
    S.refreshing = true; render();
    var started = Date.now();
    refreshRemote(true).then(function (okR) {
      setTimeout(function () {
        S.refreshing = false;
        var now = new Date();
        S.lastCheck = (okR ? 'Checked at ' : 'Could not reach the feed at ') + fmtTime(now.getHours(), now.getMinutes()) + (okR ? '' : '. Showing saved briefings');
        render();
      }, Math.max(0, 500 - (Date.now() - started)));
    });
  }
  function confirmClearSaved() {
    if (!S.saved.length) { toast('No saved briefings to clear'); return; }
    sheet('<h3>Clear saved briefings?</h3><p>This removes all ' + S.saved.length + ' saved briefing' + (S.saved.length === 1 ? '' : 's') + ' from this device. The briefings stay in the feed.</p>' +
      '<button class="btn primary" data-clearsavedok>Clear saved briefings</button><button class="btn ghost" data-closesheet>Cancel</button>');
  }
  function mail(subject) { var url = 'mailto:' + CFG.feedbackEmail + '?subject=' + encodeURIComponent(subject); window.location.href = url; }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var ct = e.target.closest('[data-contact]'); if (ct) { e.preventDefault(); openContact(); return; }
    if (e.target.closest('a.ct-a[href^="mailto:"]')) return;
    var ob = e.target.closest('[data-ob],[data-obnext],[data-obback],[data-obskip],[data-obdone]');
    if (ob && S.ob) {
      if (ob.dataset.ob) { obToggle(ob.dataset.ob, ob.dataset.v); return; }
      if (ob.hasAttribute('data-obnext')) { haptic('LIGHT'); S.ob.step = Math.min(S.ob.steps.length - 1, S.ob.step + 1); renderOnboarding(1); return; }
      if (ob.hasAttribute('data-obback')) { S.ob.step = Math.max(0, S.ob.step - 1); renderOnboarding(-1); return; }
      if (ob.hasAttribute('data-obskip')) { finishOnboarding(true); return; }
      if (ob.hasAttribute('data-obdone')) { finishOnboarding(false); return; }
    }
    var vz = e.target.closest('[data-vis],[data-visnotes],[data-visclear],[data-visclearok],[data-subgo]');
    if (vz) {
      if (vz.dataset.vis) { visSheet(vz.dataset.vis); haptic('LIGHT'); return; }
      if (vz.hasAttribute('data-visnotes')) { closeSheet(); S.tab = 'saved'; S.savedView = 'notes'; S.setView = null; render(); $('#main').scrollTop = 0; return; }
      if (vz.dataset.visclear) { visClear(vz.dataset.visclear, false); return; }
      if (vz.dataset.visclearok) { visClear(vz.dataset.visclearok, true); return; }
      if (vz.dataset.subgo) {
        if (!wide() && S.current) closeArticle();
        S.tab = 'feed'; S.setView = null; S.query = ''; S.searchOpen = false; S.topicQuery = '';
        S.topic = vz.dataset.group; S.subtopic = vz.dataset.subgo; haptic(); render(); $('#main').scrollTop = 0;
        var ac = document.querySelector('#main .chips.subtopics .chip.active'); if (ac && ac.parentNode) ac.parentNode.scrollLeft = Math.max(0, ac.offsetLeft - 16);
        return;
      }
    }
    var x = e.target.closest('[data-retry],[data-suggest],[data-asksend],[data-editprofile],[data-settopics],[data-setback],[data-follow],[data-followall],[data-followevery],[data-managetopics]');
    if (x) {
      if (x.hasAttribute('data-retry')) { S.booting = true; render(); loadAll(); return; }
      if (x.dataset.suggest) {
        if (S.tab === 'ask') { submitAsk(x.dataset.suggest); return; }
        S.query = x.dataset.suggest; S.searchOpen = true; render(); return;
      }
      if (x.hasAttribute('data-asksend')) { submitAsk(); return; }
      if (x.hasAttribute('data-editprofile')) { startOnboarding(true); return; }
      if (x.hasAttribute('data-settopics') || x.hasAttribute('data-managetopics')) { if (!wide() && S.current) closeArticle(); S.tab = 'settings'; S.setView = 'topics'; haptic(); render(); $('#main').scrollTop = 0; var sh = $('#st-h'); if (sh) try { sh.focus({ preventScroll: true }); } catch (er) {} return; }
      if (x.hasAttribute('data-setback')) { S.setView = null; render(); $('#main').scrollTop = 0; return; }
      if (x.dataset.follow) { toggleFollow(x.dataset.follow); return; }
      if (x.hasAttribute('data-followall')) { setFollow(['arctic-security', 'ai-governance', 'critical-minerals', 'geo']); haptic(); render(); toast('Pinned the live desks'); return; }
      if (x.hasAttribute('data-followevery')) { setFollow(catalogIds()); haptic(); render(); toast('Pinned all ' + S.follow.length + ' topics'); return; }
    }
    var t = e.target.closest('[data-react],[data-savedview],[data-bm],[data-open],[data-topic],[data-tab],[data-share],[data-back],[data-url],[data-notif],[data-fs],[data-clearsaved],[data-clearsavedok],[data-closesheet],[data-mail],[data-refresh],[data-clearread],[data-clear],[data-textsize],[data-sf],[data-repost],[data-sinfo],[data-tipdone],[data-repin],[data-repundo],[data-repurl],[data-repshare],[data-dossier],[data-forward],[data-privnote],[data-notesave],[data-cm],[data-pdf],[data-pdfbrief],[data-flag],[data-flaggo],[data-watch],[data-ff],[data-sigclear],[data-opensfilters],[data-ffreset],[data-moredesk],[data-trust],[data-backset],[data-dense],[data-saveview],[data-loadview],[data-heatj],[data-sigfb],[data-citepriv],[data-citepub],[data-wradd],[data-wrdel],[data-sharesignal],[data-sharego],[data-subtopic],#btnSearch,#sheet');
    if (!t) return;
    if (t.dataset.cm) { e.stopPropagation(); openArticle(t.dataset.cm); setTimeout(function () { var c = document.querySelector('#rscroll .sx-cm'); if (c) c.scrollIntoView({ block: 'start' }); }, 120); return; }
    if (t.dataset.dossier) { e.stopPropagation(); openArticle(t.dataset.dossier); setTimeout(function () { var fa = document.querySelector('#rscroll .fa') || document.querySelector('#rscroll .pi-exp') || document.querySelector('#rscroll .audit') || document.querySelector('#rscroll .pi-audit'); if (fa) fa.scrollIntoView({ block: 'start' }); }, 80); return; }
    if (t.dataset.pdf) { e.stopPropagation(); exportPdf(t.dataset.pdf); return; }
    if (t.dataset.pdfbrief) { e.stopPropagation(); exportBrief(); return; }
    if (t.dataset.opensfilters) { e.stopPropagation(); openFiltersSheet(); return; }
    if (t.dataset.ffreset) { e.stopPropagation(); resetAllFilters(); openFiltersSheet(); render(); return; }
    if (t.dataset.moredesk) { e.stopPropagation(); moreDeskSheet(t.dataset.moredesk); return; }
    if (t.dataset.sigfb) { e.stopPropagation(); setSignalFeedback(t.dataset.id, t.dataset.sigfb); return; }
    if (t.dataset.citepriv) { e.stopPropagation(); citePrivate(t.dataset.citepriv); return; }
    if (t.dataset.citepub) { e.stopPropagation(); closeSheet(); if (window.VXSocial) window.VXSocial.cite(t.dataset.citepub); return; }
    if (t.hasAttribute('data-wradd')) {
      e.stopPropagation();
      var kind = (($('#wrKind') || {}).value) || 'hs';
      var val = (($('#wrVal') || {}).value) || '';
      addWatchRule({ kind: kind, value: val }); return;
    }
    if (t.dataset.wrdel) { e.stopPropagation(); removeWatchRule(t.dataset.wrdel); return; }
    if (t.dataset.sigclear != null) { e.stopPropagation(); resetAllFilters(); S.sigQuery = ''; render(); return; }
    if (t.dataset.ff) {
      e.stopPropagation();
      S[t.dataset.ff] = t.dataset.fv;
      if (S.tab === 'brief') S.tab = 'signals';
      persistFilters();
      // Keep filter sheet open when choosing options inside it
      if (document.querySelector('#sheet .ff-sheet')) { openFiltersSheet(); render(); return; }
      render(); return;
    }
    if (t.dataset.dense) { e.stopPropagation(); S.dense = !S.dense; persistFilters(); if (document.querySelector('#sheet .ff-sheet') && !$('#sheet').hidden) openFiltersSheet(); render(); return; }
    if (t.dataset.saveview) {
      e.stopPropagation();
      needAccount('Sign in or create a free account to save this view. Reading stays free without an account.', function () {
        var name = 'View ' + ((S.namedViews || []).length + 1);
        try { name = window.prompt('Name this view', name) || ''; } catch (err) { name = ''; }
        name = String(name).replace(/\s*[\u2014\u2013]\s*/g, ', ').trim().slice(0, 40);
        if (!name) return;
        var filters = { fJuris: S.fJuris, fMineral: S.fMineral, fStage: S.fStage, fImpact: S.fImpact, fScore: S.fScore, fHorizon: S.fHorizon, fGeo: S.fGeo, fIndustry: S.fIndustry, dense: S.dense };
        S.namedViews = S.namedViews || [];
        S.namedViews.push({ name: name, fJuris: filters.fJuris, fMineral: filters.fMineral, fStage: filters.fStage, fImpact: filters.fImpact, fScore: filters.fScore, fHorizon: filters.fHorizon, fGeo: filters.fGeo, fIndustry: filters.fIndustry, dense: filters.dense });
        store.set('vx.namedViews', S.namedViews);
        if (window.VXSocial && window.VXSocial.onView) window.VXSocial.onView(name, filters);
        toast('Saved view: ' + name); render();
      });
      return;
    }
    if (t.dataset.loadview != null && t.dataset.loadview !== '') {
      e.stopPropagation();
      var v = (S.namedViews || [])[+t.dataset.loadview]; if (!v) return;
      S.fJuris = v.fJuris || 'all'; S.fMineral = v.fMineral || 'all'; S.fStage = v.fStage || 'all'; S.fImpact = v.fImpact || 'all'; S.fScore = v.fScore || 'all'; S.fHorizon = v.fHorizon || 'all'; S.fGeo = v.fGeo || 'all'; S.fIndustry = v.fIndustry || 'all'; S.dense = !!v.dense;
      persistFilters();
      render(); return;
    }
    if (t.dataset.heatj) {
      e.stopPropagation();
      S.fJuris = t.dataset.heatj; S.fStage = t.dataset.heats || 'all'; S.tab = 'signals';
      persistFilters();
      render(); return;
    }
    if (t.dataset.flag) { e.stopPropagation(); flagLegal(t.dataset.flag); return; }
    if (t.dataset.flaggo) { e.stopPropagation(); flagGo(t.dataset.flaggo); return; }
    if (t.dataset.forward) { e.stopPropagation(); forwardTeam(t.dataset.forward); return; }
    if (t.dataset.privnote) { e.stopPropagation(); privateNoteSheet(t.dataset.privnote); return; }
    if (t.dataset.notesave) { e.stopPropagation(); savePrivateNote(t.dataset.notesave); return; }
    if (t.dataset.trust) { e.stopPropagation(); S.setView = t.dataset.trust; S.tab = 'settings'; render(); $('#main').scrollTop = 0; var trh = $('#tr-h'); if (trh) try { trh.focus({ preventScroll: true }); } catch (er) {} return; }
    if (t.hasAttribute('data-backset')) { e.stopPropagation(); S.setView = null; render(); $('#main').scrollTop = 0; return; }
    if (t.dataset.watch) { e.stopPropagation(); toggleWatch(t.dataset.watch); return; }
    if (t.dataset.sinfo) { e.stopPropagation(); infoSheet(); return; }
    if (t.hasAttribute('data-tipdone')) { e.stopPropagation(); S.tipDone = true; store.set('vx.tipSignals', 1); render(); return; }
    if (t.dataset.repin) { var cm = ($('#repc') || {}).value || ''; cm = cm.replace(/\s*[\u2014\u2013]\s*/g, ', ').trim().slice(0, 280);
      // Local-only for now. Shape mirrors a future shared reposts table: one row per user and story.
      S.reposts[t.dataset.repin] = { v: 1, storyId: t.dataset.repin, comment: cm, createdAt: new Date().toISOString(), userId: 'local', synced: false };
      saveReposts(); if (window.VXSocial) window.VXSocial.onRepost(t.dataset.repin, S.reposts[t.dataset.repin]); closeSheet(); haptic(); render(); refreshReader(); toast('Reposted in Voxarc'); return; }
    if (t.dataset.repundo) { delete S.reposts[t.dataset.repundo]; saveReposts(); if (window.VXSocial) window.VXSocial.onRepost(t.dataset.repundo, null); closeSheet(); render(); refreshReader(); toast('Repost removed'); return; }
    if (t.dataset.repost) { e.stopPropagation(); repostSheet(t.dataset.repost); return; }
    if (t.dataset.repurl) { closeSheet(); openUrl(t.dataset.repurl); return; }
    if (t.dataset.repshare) { var rc = (($('#repc') || {}).value || '').replace(/\s*[\u2014\u2013]\s*/g, ', ').trim().slice(0, 280), rid = t.dataset.repshare; closeSheet(); if (!S.reposts[rid]) { S.reposts[rid] = { v: 1, storyId: rid, comment: rc, createdAt: new Date().toISOString(), userId: 'local', synced: false, via: 'share' }; saveReposts(); if (window.VXSocial) window.VXSocial.onRepost(rid, S.reposts[rid]); render(); } shareItem(rid, rc); return; }
    if (t.dataset.sf) { S[t.dataset.sf] = t.dataset.sv; haptic(); render(); return; }
    if (t.id === 'sheet') { if (e.target === t) closeSheet(); return; }
    if (t.dataset.react) { e.stopPropagation(); toggleReact(t.dataset.rid, t.dataset.react); return; }
    if (t.dataset.savedview) { S.savedView = t.dataset.savedview; haptic(); render(); $('#main').scrollTop = 0; return; }
    if (t.dataset.bm) { e.stopPropagation(); toggleSave(t.dataset.bm); return; }
    if (t.dataset.open) { openArticle(t.dataset.open); return; }
    if (t.dataset.sharesignal) { e.stopPropagation(); shareSignalSheet(t.dataset.sharesignal); return; }
    if (t.dataset.sharego) { e.stopPropagation(); shareGo(t.dataset.sharego, t.dataset.id); return; }
    if (t.dataset.subtopic) { e.stopPropagation(); S.subtopic = S.subtopic === t.dataset.subtopic ? '' : t.dataset.subtopic; haptic(); render(); return; }
    if (t.dataset.topic) {
      if (S.topic !== t.dataset.topic) S.subtopic = '';
      S.topic = t.dataset.topic; haptic(); render(); $('#main').scrollTop = 0;
      if (wide()) { var f0 = filtered(S.items)[0]; if (f0) openArticle(f0.id, true); } // the side reader follows the desk on iPad
      return;
    }
    if (t.dataset.tab) { if (S.tab === t.dataset.tab) { $('#main').scrollTop = 0; } S.tab = t.dataset.tab; S.setView = null; if (!wide() && S.current) closeArticle(); render(); return; }
    if (t.dataset.share) { e.stopPropagation(); shareItem(t.dataset.share); return; }
    if (t.hasAttribute('data-back')) { if (history.state && history.state.a) history.back(); else closeArticle(); return; }
    if (t.dataset.url) { if (t.tagName === 'A') e.preventDefault(); openUrl(t.dataset.url); return; }
    if (t.hasAttribute('data-notif')) { setNotif(!S.prefs.notif); return; }
    if (t.dataset.fs) { S.prefs.fs = +t.dataset.fs; applyFs(); store.set('vx.prefs', S.prefs); render(); return; }
    if (t.hasAttribute('data-clearsaved')) { confirmClearSaved(); return; }
    if (t.hasAttribute('data-clearsavedok')) { closeSheet(); S.saved = []; store.set('vx.saved', S.saved); haptic(); render(); toast('Saved briefings cleared'); return; }
    if (t.hasAttribute('data-closesheet')) { closeSheet(); return; }
    if (t.dataset.mail) { closeSheet(); mail(t.dataset.mail); return; }
    if (t.hasAttribute('data-refresh')) { if (S.tab === 'settings') manualRefresh(); else refreshRemote(true); return; }
    if (t.hasAttribute('data-clearread')) { S.read = {}; store.set('vx.read', S.read); render(); toast('Reading history cleared. All briefings are unread'); return; }
    if (t.hasAttribute('data-clear')) { S.query = ''; render(); return; }
    if (t.hasAttribute('data-textsize')) { var o = [15, 17, 19, 21]; S.prefs.fs = o[(o.indexOf(S.prefs.fs) + 1) % o.length]; applyFs(); store.set('vx.prefs', S.prefs); return; }
    if (t.id === 'btnSearch') { S.tab = 'feed'; S.searchOpen = !S.searchOpen; if (!S.searchOpen) S.query = ''; if (!wide() && S.current) closeArticle(); render(); if (S.searchOpen) { var q = $('#q'); if (q) q.focus(); } return; }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute && e.target.getAttribute('role') === 'button' && e.target.tagName === 'SPAN') { e.preventDefault(); e.target.click(); }
    if (e.key === 'Enter' && e.target && e.target.id === 'askQ') { e.preventDefault(); submitAsk(e.target.value); return; }
    if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet();
  });
  var qT;
  document.addEventListener('input', function (e) {
    if (e.target.id === 'topicQ') { S.topicQuery = e.target.value; var tp = S.topicQuery.length; render(); var tq = $('#topicQ'); if (tq) { tq.focus(); try { tq.setSelectionRange(tp, tp); } catch (err) {} } return; }
    // Ask: keep the field editable; results update only on Ask / Enter / suggestion chip (avoids Android keyboard dismiss).
    if (e.target.id === 'askQ') return;
    if (e.target.id === 'sigQ') { var sv = e.target.value; clearTimeout(qT); qT = setTimeout(function () { S.sigQuery = sv; var pos = sv.length; render(); var q = $('#sigQ'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (err) {} } }, 220); return; }
    if (e.target.id === 'q') { var v = e.target.value; clearTimeout(qT); qT = setTimeout(function () { S.query = v; var pos = v.length; render(); var q = $('#q'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (err) {} } }, 220); }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'notifTime') { S.prefs.hour = +e.target.value; S.prefs.minute = 0; store.set('vx.prefs', S.prefs); scheduleNotif(); if (S.prefs.notif) toast('Daily brief at ' + fmtTime(S.prefs.hour, 0)); }
  });
  window.addEventListener('popstate', function () { if (S.current && !wide()) closeArticle(); });
  var rzT; window.addEventListener('resize', function () {
    clearTimeout(rzT);
    rzT = setTimeout(function () {
      // Android opens the keyboard via resize; re-rendering here destroys the focused input and dismisses the keyboard.
      var ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
      render();
    }, 60);
  });
  function applyFs() { document.documentElement.style.setProperty('--fs', S.prefs.fs + 'px'); }

  // pull to refresh on the feed
  (function () {
    var m = $('#main'), y0 = null, dy = 0, busy = false;
    function ptr() { return $('#ptr'); }
    m.addEventListener('touchstart', function (e) { y0 = (!busy && m.scrollTop <= 0 && S.tab === 'feed') ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
    m.addEventListener('touchmove', function (e) {
      if (y0 == null) return; dy = e.touches[0].clientY - y0; var p = ptr(); if (!p) return;
      if (dy <= 0) { p.style.height = '0px'; return; }
      p.style.transition = 'none'; p.style.height = Math.min(64, dy / 2) + 'px';
      var was = p.classList.contains('armed'); var armed = dy > 110;
      p.classList.toggle('armed', armed); p.querySelector('.ptr-l').textContent = armed ? 'Release to refresh' : 'Pull to refresh';
      if (armed && !was) haptic();
    }, { passive: true });
    m.addEventListener('touchend', function () {
      var p = ptr(); if (y0 == null || !p) { y0 = null; return; }
      p.style.transition = '';
      if (dy > 110) {
        busy = true; p.style.height = '48px'; p.classList.add('loading'); p.querySelector('.ptr-l').textContent = 'Checking for new briefings…';
        refreshRemote(true).then(function () { busy = false; var q = ptr(); if (q) { q.classList.remove('loading', 'armed'); q.style.height = '0px'; } });
      } else { p.style.height = '0px'; p.classList.remove('armed'); }
      y0 = null; dy = 0;
    });
  })();

  /* ---------- iOS extras: Spotlight search and home-screen quick actions ---------- */
  // VoxarcNative is a small plugin compiled into the iOS app. On the web and Android it is absent and these are no-ops.
  function spotlightIndex() {
    var nx = plugin('VoxarcNative'); if (!nx || typeof nx.indexBriefings !== 'function') return;
    var items = S.items.slice(0, 200).map(function (i) {
      return { id: String(i.id), title: String(i.title || ''), summary: String(i.summary || ''), topic: TOPIC_LABEL[category(i)] || '' };
    });
    try { var pr = nx.indexBriefings({ items: items }); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
  }
  var ROUTES = { latest: 1, saved: 1, search: 1, brief: 1, open: 1 };
  function handleRoute(r) {
    if (!r || typeof r.route !== 'string' || !ROUTES[r.route]) return;
    // A widget, quick action or Spotlight launch goes straight to its target; first-run onboarding counts as skipped.
    if (S.ob) { if (S.ob.edit) { S.ob = null; renderOnboarding(0); document.body.classList.remove('ob-open'); } else finishOnboarding(true); }
    if (!$('#sheet').hidden) closeSheet();
    S.pendingOpen = null;
    if (r.route === 'open') {
      if (!r.id) return;
      // A home-screen widget can show a briefing this device has not downloaded yet: open it once the refresh brings it in.
      if (!byId(String(r.id))) { S.pendingOpen = String(r.id); return; }
      if (S.tab === 'settings') { S.tab = 'feed'; render(); }
      openArticle(String(r.id)); return;
    }
    if (S.current && !wide()) closeArticle();
    if (r.route === 'latest') {
      S.tab = 'feed'; S.topic = 'all'; S.query = ''; S.searchOpen = false; render(); $('#main').scrollTop = 0;
      if (S.items[0]) openArticle(S.items[0].id);
    } else if (r.route === 'saved') {
      S.tab = 'saved'; S.savedView = 'saved'; render(); $('#main').scrollTop = 0;
    } else if (r.route === 'brief') {
      S.tab = 'brief'; render(); $('#main').scrollTop = 0;
    } else if (r.route === 'search') {
      S.tab = 'feed'; S.searchOpen = true; render(); $('#main').scrollTop = 0; var q = $('#q'); if (q) q.focus();
    }
  }
  window.addEventListener('voxarc:route', function (e) { handleRoute(e && e.detail); });

  /* ---------- boot ---------- */
  function initNative() {
    var sb = plugin('StatusBar'); if (sb) { sb.setStyle({ style: 'DARK' }).catch(function () {}); sb.setBackgroundColor && sb.setBackgroundColor({ color: '#0A0A0A' }).catch(function () {}); }
    var net = plugin('Network');
    if (net) {
      net.getStatus().then(function (s) { S.online = s.connected; render(); }).catch(function () {});
      net.addListener('networkStatusChange', function (s) { var was = S.online; S.online = s.connected; render(); if (s.connected && !was) refreshRemote(false); });
    } else {
      S.online = navigator.onLine !== false;
      window.addEventListener('online', function () { S.online = true; render(); refreshRemote(false); });
      window.addEventListener('offline', function () { S.online = false; render(); });
    }
    var ln = plugin('LocalNotifications');
    if (ln) ln.addListener('localNotificationActionPerformed', function () { S.tab = 'brief'; if (S.current && !wide()) closeArticle(); render(); });
    var nx = plugin('VoxarcNative');
    if (nx && typeof nx.addListener === 'function') { try { nx.addListener('route', handleRoute); } catch (e) {} }
    var app = plugin('App');
    if (app) {
      app.getInfo().then(function (i) { if (i && i.version) { CFG.version = i.version + (i.build ? ' (' + i.build + ')' : ''); var v = $('#appVersion'); if (v) v.textContent = CFG.version; } }).catch(function () {});
      app.addListener('backButton', function () { if (S.ob) { if (S.ob.step > 0) { S.ob.step--; renderOnboarding(-1); } else if (S.ob.edit) finishOnboarding(true); return; } if (!$('#sheet').hidden) closeSheet(); else if (S.current && !wide()) closeArticle(); else if (S.setView) { S.setView = null; render(); } else if (S.tab !== 'feed') { S.tab = 'feed'; render(); } else app.exitApp(); });
      app.addListener('resume', function () { refreshRemote(false); scheduleNotif(); });
    }
  }
  var booted = false;
  function loadAll() {
    return Promise.all([loadBundled(), store.get('vx.feedCache'), store.get('vx.saved'), store.get('vx.read'), store.get('vx.prefs'), store.get('vx.reactions'), store.get('vx.onboarded'), store.get('vx.profile'), store.get('vx.follow'), store.get('vx.watchlist'), store.get('vx.namedViews'), store.get('vx.watchSeen'), store.get('vx.filters'), store.get('vx.signalFeedback')]).then(function (r) {
      var bundled = r[0], cache = r[1];
      var bc = validFeed(bundled) && Array.isArray(bundled.dataCards) ? bundled.dataCards : [], cc = cache && Array.isArray(cache.dataCards) ? cache.dataCards : [];
      S.cards = cc.length ? cc : bc;
      store.get('vx.tipSignals').then(function (v) { if (v) { S.tipDone = true; render(); } });
      store.get('vx.reposts').then(function (v) { if (v && typeof v === 'object') { S.reposts = v; render(); } });
      store.get('vx.privateNotes').then(function (v) { if (v && typeof v === 'object') { S.privateNotes = v; render(); } });
      S.generated = validFeed(bundled) ? bundled.generated : null; if (cache && cache.generated && (!S.generated || cache.generated > S.generated)) S.generated = cache.generated;
      S.trends = validFeed(bundled) && bundled.signalTrends ? bundled.signalTrends : null;
      S.items = mergeFeeds(validFeed(bundled) ? bundled.items : [], cache && Array.isArray(cache.items) ? cache.items : []).filter(isPublished);
      syncTopicStatus();
      S.saved = Array.isArray(r[2]) ? r[2] : []; S.read = r[3] || {}; if (cache && cache.updated) S.updated = cache.updated;
      if (r[4]) for (var k in r[4]) S.prefs[k] = r[4][k];
      S.reactions = r[5] && typeof r[5] === 'object' ? r[5] : {}; Object.keys(S.reactions).forEach(function (k) { var v = S.reactions[k]; if (v === 'amused' || v === 'like') S.reactions[k] = typeof v === 'object' ? v : { r: 'useful', t: Date.now() }; if (v && v.r === 'amused') v.r = 'useful'; if (v && v.r === 'like') v.r = 'useful'; }); Object.keys(S.reactions).forEach(function (k) { if (S.reactions[k] === 'amused') S.reactions[k] = 'useful'; });
      S.watchlist = r[9] && typeof r[9] === 'object' ? r[9] : {};
      S.namedViews = Array.isArray(r[10]) ? r[10] : [];
      S.watchSeen = r[11] && typeof r[11] === 'object' ? r[11] : {};
      if (r[12] && typeof r[12] === 'object') {
        S.fJuris = r[12].fJuris || 'all'; S.fMineral = r[12].fMineral || 'all'; S.fStage = r[12].fStage || 'all'; S.fImpact = r[12].fImpact || 'all'; S.fScore = r[12].fScore || 'all'; S.fHorizon = r[12].fHorizon || 'all'; S.fGeo = r[12].fGeo || 'all'; S.fIndustry = r[12].fIndustry || 'all'; S.dense = !!r[12].dense;
      }
      // 1.3.8: Dense used to strip cards to title+meta only. Restore full cards as default once.
      if (!S.prefs.cardFull138) {
        S.dense = false;
        S.prefs.cardFull138 = 1;
        store.set('vx.prefs', S.prefs);
        persistFilters();
      }
      S.signalFeedback = r[13] && typeof r[13] === 'object' ? r[13] : {};
      S.onboarded = !!r[6];
      var pf = r[7], fw = r[8] && typeof r[8] === 'object' ? cleanFollow(r[8].topics) : [];
      // Followed topics: the saved choice, else the profile topics, else the four live desks.
      S.follow = fw.length ? fw : (pf && Array.isArray(pf.topics) && cleanFollow(pf.topics).length ? cleanFollow(pf.topics) : cleanFollow(DESK_ORDER));
      S.profile = pf && typeof pf === 'object' && Array.isArray(pf.topics) ? { topics: pf.topics.filter(function (t) { return TOPIC_LABEL[t]; }), regions: (pf.regions || []).filter(function (x) { return typeof x === 'string'; }), roles: (pf.roles || []).filter(function (x) { return typeof x === 'string'; }) } : null;
      fetch('data/signal_fields_local.json').then(function (x) { return x.json(); }).then(function (j) { S.sigFields = j && j.items || {}; render(); if (S.current) refreshReader(); }).catch(function () {});
      fetch('data/tables_sample.json').then(function (x) { return x.json(); }).then(function (j) { S.tablesById = j && j.items || {}; render(); if (S.current) refreshReader(); }).catch(function () {});
      S.booting = false;
      if (!booted) { booted = true; applyFs(); initNative(); }
      var wantContact = location.hash === '#contact';
      if (!S.onboarded && S.items.length && !wantContact) startOnboarding(false);
      if (wantContact) { S.tab = 'settings'; S.setView = 'contact'; }
      render();
      var ss = plugin('SplashScreen'); if (ss) requestAnimationFrame(function () { setTimeout(function () {
        var hid = ss.hide({ fadeOutDuration: 200 });
        if (hid && hid.then) hid.then(function () { armWelcome(1100); }, function () { armWelcome(400); });
        else armWelcome(1100);
      }, 50); });
      spotlightIndex();
      var nx = plugin('VoxarcNative'); // a quick action or Spotlight result that launched the app
      if (nx && typeof nx.takePendingRoute === 'function') { try { nx.takePendingRoute().then(handleRoute).catch(function () {}); } catch (e) {} }
      if (!S.items.length) { S.booting = true; render(); return refreshRemote(false).then(function () { S.booting = false; if (!S.onboarded && S.items.length) startOnboarding(false); render(); }); }
      refreshRemote(false); scheduleNotif();
    });
  }
  function applyAccount(payload) {
    payload = payload || {};
    (payload.saves || []).forEach(function (s) { if (s && s.story_id && S.saved.indexOf(s.story_id) < 0) S.saved.push(s.story_id); });
    (payload.watches || []).forEach(function (w) {
      if (!w || !w.story_id || S.watchlist[w.story_id]) return;
      S.watchlist[w.story_id] = { v: 1, storyId: w.story_id, hs_code: w.hs_code || null, eccn: w.eccn || null, jurisdiction: w.jurisdiction || null, createdAt: w.created_at, synced: true };
    });
    if ((payload.views || []).length && !(S.namedViews || []).length) {
      S.namedViews = payload.views.map(function (v) {
        var f = v.filters || {};
        return { name: v.name, fJuris: f.fJuris || 'all', fMineral: f.fMineral || 'all', fStage: f.fStage || 'all', fImpact: f.fImpact || 'all', fScore: f.fScore || 'all', fHorizon: f.fHorizon || 'all', fGeo: f.fGeo || 'all', fIndustry: f.fIndustry || 'all', dense: !!f.dense };
      });
    }
    store.set('vx.saved', S.saved); store.set('vx.watchlist', S.watchlist); store.set('vx.namedViews', S.namedViews || []);
    if (!S.booting) render();
  }
  window.__vx = { openArticle: function (id) { closeSheet(); if (S.tab === 'settings') { S.tab = 'feed'; render(); } openArticle(id); }, byId: byId, S: S, CFG: CFG, render: render, refreshReader: refreshReader, toast: toast, sheet: sheet, closeSheet: closeSheet, saveReposts: saveReposts, openUrl: openUrl, mail: mail, applyAccount: applyAccount, exportPdf: exportPdf, exportBrief: exportBrief };
  var welcomeArmed = false;
  function dismissWelcome() {
    var w = document.getElementById('welcome');
    if (!w || w.dataset.bye) return;
    w.dataset.bye = '1'; w.classList.add('out');
    setTimeout(function () { w.hidden = true; }, reducedMotion() ? 0 : 320);
  }
  function armWelcome(delay) {
    if (welcomeArmed || window.__VX_HOLD_WELCOME) return;
    welcomeArmed = true;
    setTimeout(dismissWelcome, delay);
  }
  (function scheduleWelcome() {
    var w = document.getElementById('welcome');
    if (w && window.__VX_HOLD_WELCOME) { w.classList.add('hold'); return; }
    if (plugin('SplashScreen')) setTimeout(function () { armWelcome(400); }, 2600);
    else armWelcome(reducedMotion() ? 160 : 720);
  })();
  loadAll();
})();
