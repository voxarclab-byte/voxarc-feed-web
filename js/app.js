/* Voxarc Feed: bundled native app UI. Everything runs on the device; no sign-up of any kind. */
(function () {
  'use strict';
  var CFG = {
    remoteFeed: 'https://raw.githubusercontent.com/voxarclab-byte/voxarc-daily-media/main/app/feed.json', // live updates; bundled + cached content is used when unavailable
    privacyUrl: 'https://voxarclab.io/privacy',
    contactUrl: 'https://voxarclab.io/contact',
    siteUrl: 'https://voxarclab.io',
    feedbackEmail: 'hello@voxarc.io',
    version: '1.0.0', // replaced on device by the native version (build) from App.getInfo()
    // Feature flags. marketOdds stays OFF until the Kalshi/Polymarket data-licence check, the Canadian legal review
    // and the App Store / Play age-rating re-check are done (first_run_spec.md, P1-9). Only a test or preview harness
    // can turn it on, through window.__VX_FLAGS set before this script runs; there is no user-facing switch.
    flags: { marketOdds: false, marketLinkOut: false }
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
    { id: 'investor', label: 'Investor' }, { id: 'energy', label: 'Mining and energy' }, { id: 'gov', label: 'Government' },
    { id: 'indigenous', label: 'Indigenous organization' }, { id: 'analyst', label: 'Consultant or analyst' }, { id: 'research', label: 'Researcher or journalist' }
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
    { id: 'like', emoji: '\uD83D\uDC4D', label: 'Like' },
    { id: 'dislike', emoji: '\uD83D\uDC4E', label: 'Dislike' },
    { id: 'amused', emoji: '\uD83D\uDE02', label: 'Amused' }
  ];

  var Cap = window.Capacitor;
  var isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  var P = (Cap && Cap.Plugins) || {};
  function plugin(n) { return isNative && P[n] ? P[n] : null; }

  var S = {
    items: [], reposts: {}, sigSort: 'latest', fImp: 'all', fHz: 'all', trends: null, tab: 'feed', topic: 'all', query: '', searchOpen: false,
    saved: [], read: {}, reactions: {}, savedView: 'saved', current: null, online: true,
    prefs: { fs: 17, notif: false, hour: 7, minute: 0 }, feedSource: 'bundled', updated: null,
    booting: true, loadError: false, onboarded: true, profile: null, ob: null, rendered: false,
    follow: ['arctic', 'ai', 'minerals', 'geo'], cards: [], setView: null
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
    if (b) return b.open({ url: url, presentationStyle: 'popover', toolbarColor: '#0A0A0A' }).catch(function () {});
    window.open(url, '_blank', 'noopener');
  }
  var ICON = {
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
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (x, y) { return d(y.published) - d(x.published); });
  }
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
        var before = S.items.length, had = {}; S.items.forEach(function (x) { had[x.id] = 1; }); S.items = mergeFeeds(S.items, f.items);
        topicAlert(f.items.filter(function (x) { return x && !had[x.id] && inFollow(x); })); S.updated = new Date().toISOString(); if (f.generated && (!S.generated || f.generated > S.generated)) S.generated = f.generated; if (f.signalTrends) S.trends = f.signalTrends;
        if (Array.isArray(f.dataCards) && f.dataCards.length) S.cards = f.dataCards;
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
  // Followed topics live on this device only (vx.follow). All four are followed until the user changes that.
  function cleanFollow(a) { var o = []; (Array.isArray(a) ? a : []).forEach(function (t) { if (CATEGORIES.indexOf(t) >= 0 && o.indexOf(t) < 0) o.push(t); }); return DESK_ORDER.filter(function (t) { return o.indexOf(t) >= 0; }); }
  var DESK_ORDER = ['arctic', 'ai', 'minerals', 'geo'];
  function followsAll() { return S.follow.length >= CATEGORIES.length; }
  function isFollowed(t) { return S.follow.indexOf(t) >= 0; }
  // Following everything shows everything, including briefings without a topic tag.
  function inFollow(i) { return followsAll() || (i.topics || []).some(function (t) { return isFollowed(t); }); }
  function setFollow(list) { S.follow = cleanFollow(list); if (!S.follow.length) S.follow = DESK_ORDER.slice(); store.set('vx.follow', { topics: S.follow, t: Date.now(), v: 1 }); }
  function followLabel() { return followsAll() ? 'All ' + CATEGORIES.length + ' topics' : joinList(S.follow.map(function (t) { return TOPIC_LABEL[t]; })); }
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
  function deskItems(t) { return S.items.filter(function (i) { return (i.topics || []).indexOf(t) >= 0; }); }
  // A desk's data cards: from the feed's dataCards (each lists its desks), else the same cards attached to briefings.
  function deskCards(t) {
    var src = S.cards.filter(function (c) { return c && Array.isArray(c.desks) && c.desks.indexOf(t) >= 0; });
    if (!S.cards.length) {
      var by = {}; S.items.forEach(function (i) { var c = i.dataCard; if (c && typeof c === 'object' && c.id && !by[c.id]) by[c.id] = c; });
      src = (DESK_FALLBACK[t] || []).map(function (id) { return by[id]; }).filter(Boolean);
    }
    return src.map(function (c) { return cardOf({ dataCard: c }); }).filter(Boolean);
  }
  function deskHeroHTML(t) {
    var cs = deskCards(t); if (!cs.length) return '';
    var cites = [], links = [];
    cs.forEach(function (c) { var x = c.source + ' \u00B7 as of ' + c.asOf + (c.license ? ' \u00B7 ' + c.license : ''); if (cites.indexOf(x) < 0) cites.push(x); if (c.url && links.indexOf(c.url) < 0) links.push(c.url); });
    var cite = cites.map(function (x) { return esc('Source: ' + x); }).join('<br>');
    var h = '<section class="deskhero' + (S.rendered ? '' : ' in') + '" role="figure" aria-label="' + esc(TOPIC_LABEL[t] + ' data. ' + cs.map(function (c) { return c.title + ': ' + c.value + ' ' + c.unit + (c.change ? ', ' + c.change : ''); }).join('. ') + '. ' + cites.map(function (x) { return 'Source: ' + x; }).join('. ')) + '">';
    if (cs.length === 1) {
      var c = cs[0];
      h += '<div class="dh-k">Desk data \u00B7 ' + esc(c.title) + '</div><div class="dh-main"><div class="dh-v"><b>' + esc(c.value) + '</b><span>' + esc(c.unit) + '</span></div>' +
        (c.change ? '<div class="dh-c">' + esc(c.change) + '</div>' : '') + '</div>' + chartSVG(c, 300, 64) + (c.seriesLabel ? '<div class="dh-sl">' + esc(c.seriesLabel) + '</div>' : '');
    } else {
      h += '<div class="dh-k">Desk data \u00B7 ' + esc(DESK_TITLE[t] || TOPIC_LABEL[t]) + '</div><ul class="dh-rows">' + cs.map(function (c) {
        return '<li><span class="dh-rt">' + esc(c.title.replace(/\s+price$/i, '')) + '</span><span class="dh-rv"><b>' + esc(c.value) + '</b> ' + esc(c.unit) + '</span>' + chartSVG(c, 90, 26) + (c.change ? '<span class="dh-rc">' + esc(c.change) + '</span>' : '') + '</li>';
      }).join('') + '</ul>' + (cs[0].seriesLabel ? '<div class="dh-sl">' + esc(cs[0].seriesLabel) + '</div>' : '');
    }
    if (DESK_NOTE[t]) h += '<p class="dh-note">' + esc(DESK_NOTE[t]) + '</p>';
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
    return '<div class="sowhat' + (full ? ' full' : '') + '" role="group" aria-label="So what">' + (full ? '<h5>So what</h5>' : '<div class="sw-k">So what</div>') +
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
    return '<div class="trust">' + '<span class="tr-src">' + esc(t.name) + (t.verified ? '<span class="tr-ok" role="img" aria-label="Verified official source" title="Official government source">' + ICON.check + '</span>' : '') + '</span>' +
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
    var q = S.query.trim().toLowerCase();
    return list.filter(function (i) {
      if (i.signal && i.signal.duplicate_of) return false;
      var g = i.signal;
      if (S.fImp !== 'all' && (!g || g.importance !== S.fImp)) return false;
      if (S.fHz !== 'all' && (!g || g.time_horizon !== S.fHz)) return false;
      if (S.topic !== 'all' && (i.topics || []).indexOf(S.topic) < 0) return false;
      if (S.topic === 'all' && !q && !inFollow(i)) return false;
      if (!q) return true;
      var hay = [i.title, i.kicker, i.summary, i.body, (i.sources || []).map(function (s) { return s.publisher + ' ' + s.title; }).join(' ')].join(' ').toLowerCase();
      return q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; });
    });
  }
  // A card is a plain container: the headline is the one button that opens the briefing, and the actions are sibling
  // buttons, so there are no nested interactive controls for VoiceOver and TalkBack. Tapping anywhere else still opens it.
  function cardHTML(i, hero, n) {
    var sel = S.current === i.id && wide() ? ' sel' : '';
    var unread = !S.read[i.id];
    var meta = '<div class="meta">' + (unread ? '<span class="dot" aria-hidden="true"></span>' : '') + '<span>' + esc(fmtDate(i.published)) + ' \u00B7 ' + readMins(i) + ' min read</span><span class="sp"></span>' +
      '<span class="acts">' + reactHTML(i.id, false) +
      '<button class="act" data-share="' + esc(i.id) + '" aria-label="Share briefing">' + ICON.share + '</button>' +
      '<button class="bm' + (isSaved(i.id) ? ' on' : '') + '" data-bm="' + esc(i.id) + '" aria-pressed="' + isSaved(i.id) + '" aria-label="' + (isSaved(i.id) ? 'Remove from saved' : 'Save') + '">' + ICON.bm + '</button></span></div>';
    var style = n != null && n < 12 && !S.rendered ? ' style="--i:' + n + '"' : '';
    var head = '<button class="open" data-open="' + esc(i.id) + '"' + (unread ? ' aria-describedby="unread-l"' : '') + '><span class="kicker">' + esc(kickerOf(i)) + '</span><h3>' + esc(i.title) + '</h3></button>';
    var chips = (dlChipHTML(i) ? '<div class="cchips">' + dlChipHTML(i) + '</div>' : '') + trustHTML(i);
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
  function actRowHTML(i) {
    return '<div class="arow" role="group" aria-label="Actions">' + reactHTML(i.id, false) +
      '<button class="act" data-share="' + esc(i.id) + '" aria-label="Share">' + ICON.share + '</button>' +
      '<button class="act' + (repostOf(i.id) ? ' on' : '') + '" data-repost="' + esc(i.id) + '" aria-pressed="' + !!repostOf(i.id) + '" aria-label="Repost">' + ICON.repost + '</button>' +
      '<button class="bm' + (isSaved(i.id) ? ' on' : '') + '" data-bm="' + esc(i.id) + '" aria-pressed="' + isSaved(i.id) + '" aria-label="' + (isSaved(i.id) ? 'Remove from Watchlist' : 'Save to Watchlist') + '">' + ICON.bm + '</button></div>';
  }
  var TOPIC_ART = {
    minerals: '<rect width="120" height="150" fill="#3a2e24"/><path d="M0 70 30 50 55 64 85 40 120 58V150H0z" fill="#5a4636"/><path d="M0 100 40 84 80 98 120 82V150H0z" fill="#2a211a"/><rect x="40" y="88" width="34" height="26" fill="#6b6f73"/><rect x="48" y="70" width="6" height="20" fill="#8a8f94"/><rect x="62" y="76" width="5" height="14" fill="#8a8f94"/><circle cx="96" cy="28" r="10" fill="#FF6B35" opacity=".55"/>',
    arctic: '<rect width="120" height="150" fill="#8fb3cc"/><rect y="92" width="120" height="58" fill="#3d6a88"/><path d="M0 104h30l8 4H0zM70 112h50v6H62z" fill="#e8f1f6"/><path d="M22 88h66l-8 14H30z" fill="#1d2630"/><rect x="40" y="72" width="26" height="16" fill="#f1f1f1"/><rect x="50" y="62" width="6" height="10" fill="#FF6B35"/><path d="M22 99h66" stroke="#c0392b" stroke-width="2"/>',
    ai: '<rect width="120" height="150" fill="#111"/><g fill="#222"><rect x="10" y="20" width="28" height="120"/><rect x="46" y="20" width="28" height="120"/><rect x="82" y="20" width="28" height="120"/></g><g fill="#FF6B35"><circle cx="16" cy="34" r="2"/><circle cx="52" cy="54" r="2"/><circle cx="88" cy="40" r="2"/><circle cx="16" cy="80" r="2"/><circle cx="52" cy="104" r="2"/><circle cx="88" cy="92" r="2"/></g><g stroke="#333"><path d="M12 46h24M48 70h24M84 60h24M12 96h24M48 118h24M84 110h24"/></g>',
    geo: '<rect width="120" height="150" fill="#2b2f3a"/><rect y="100" width="120" height="50" fill="#1a2230"/><g><rect x="8" y="80" width="22" height="10" fill="#FF6B35"/><rect x="30" y="80" width="22" height="10" fill="#3b6e8f"/><rect x="8" y="90" width="22" height="10" fill="#8a8f94"/><rect x="30" y="90" width="22" height="10" fill="#c0392b"/><rect x="60" y="86" width="22" height="14" fill="#3b6e8f"/></g><path d="M90 100V30h4v70M70 34h40" stroke="#d0a040" stroke-width="3" fill="none"/><path d="M100 34v24" stroke="#999"/>'
  };
  function thumbHTML(i) {
    if (i.image && safeUrl(i.image)) return '<img class="hthumb" src="' + esc(i.image) + '" alt="">';
    if (localPhoto(i)) return '<img class="hthumb" src="' + esc(i.photo.src) + '" alt="" loading="lazy" decoding="async">';
    return '<svg class="hthumb" viewBox="0 0 120 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + (TOPIC_ART[category(i)] || TOPIC_ART.geo) + '</svg>';
  }
  function localPhoto(i) { return i.photo && /^img\/photos\/[a-z0-9-]+\.webp$/.test(i.photo.src || '') ? i.photo : null; }
  function photoHeroHTML(i) {
    var p = localPhoto(i); if (!p) return '';
    var u = safeUrl(p.url);
    return '<figure class="phero"><img src="' + esc(p.src) + '" alt=""><figcaption>' + (u ? '<button class="link-btn pcred" data-url="' + esc(u) + '">' + esc(p.credit) + '</button>' : esc(p.credit)) + '</figcaption></figure>';
  }
  function srcLineHTML(i, t) {
    t = t || trustOf(i); var g = i.signal || {}, n = g.n_sources || (i.sources || []).length;
    return '<p class="srcl">Source: ' + esc((t && t.name) || g.source_name || '') + (t && t.verified ? ' <span class="vok" aria-label="Verified official source">\u2713</span>' : '') + ', ' + esc(i.title) + '</p>' +
      (n > 1 ? '<span class="xsrc">Extracted from ' + n + ' sources</span>' : '');
  }
  function homeCardHTML(i, n) {
    var g = i.signal || {}, t = trustOf(i), x = expertNoteOf(i);
    var style = n != null && n < 12 && !S.rendered ? ' style="--i:' + n + '"' : '';
    return '<div class="card hc' + (S.rendered ? '' : ' in') + '" data-open="' + esc(i.id) + '"' + style + '><div class="hc-row">' + thumbHTML(i) + '<div class="hc-b">' +
      '<button class="open" data-open="' + esc(i.id) + '"><h3>' + esc(g.signal_title || i.title) + '</h3></button>' +
      (g.importance ? '<div class="smeta"><span class="hb ' + lvl(g.importance) + '">Impact: ' + esc(g.importance) + '</span><span class="sm-t">\u00B7 ' + esc(g.time_horizon) + ' \u00B7 Risk: ' + esc(g.risk_level) + '</span>' + INFO_BTN + '</div>' : '') +
      '<p class="hc-why"><b>So what:</b> ' + esc(g.so_what || g.crux || i.summary) + '</p>' +
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
      '<button class="open" data-open="' + esc(i.id) + '"><span class="kicker">' + esc(kickerOf(i)) + '</span><h3>' + esc(g.signal_title) + '</h3></button>' +
      '<p class="sg-crux">' + esc(g.crux) + '</p>' + (g.so_what ? '<p class="hc-why"><b>So what:</b> ' + esc(g.so_what) + '</p>' : '') + srcLineHTML(i) +
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
    return '<div class="sg-ctl"><div class="sg-ctl-r"><span class="sg-cl">Sort</span>' + seg('sigSort', 'latest', 'Latest') + seg('sigSort', 'top', 'Top Signals') + '</div>' +
      '<div class="sg-ctl-r"><span class="sg-cl">Impact</span>' + ['all', 'High', 'Medium', 'Low'].map(function (v) { return seg('fImp', v, v === 'all' ? 'All' : v); }).join('') + '</div>' +
      '<div class="sg-ctl-r"><span class="sg-cl">Horizon</span>' + [['all', 'All'], ['Near term', 'Near'], ['Medium term', 'Medium'], ['Long term', 'Long']].map(function (v) { return seg('fHz', v[0], v[1]); }).join('') + '</div></div>';
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
  function renderFeed() {
    var h = '<div class="ptr" id="ptr"><span class="spin"></span><span class="ptr-l">Pull to refresh</span></div>';
    if (S.booting) return h + skeletonHTML(4);
    if (!S.items.length) return h + '<div class="empty err" role="alert">' + ICON.off + '<h3>Could not load briefings</h3><p>Check your connection and try again. Briefings you open are kept on this device for offline reading.</p><button class="btn primary sm" data-retry>' + ICON.retry + 'Retry</button></div>';
    var list = filtered(S.items);
    if (S.searchOpen || S.query) h += '<div class="searchwrap"><label class="search">' + ICON.search + '<input id="q" type="search" placeholder="Search briefings, places, sources" aria-label="Search briefings" value="' + esc(S.query) + '" autocomplete="off" enterkeyhint="search">' + (S.query ? '<button class="clear" data-clear>Clear</button>' : '') + '</label></div>';
    h += '<div class="chips-wrap"><div class="chips" role="tablist" aria-label="Topics">' + TOPICS.map(function (t) { var on = S.topic === t.id; return '<button role="tab" aria-selected="' + on + '" class="chip' + (on ? ' active' : '') + '" data-topic="' + t.id + '">' + topicIcon(t.ic) + '<span>' + esc(t.label) + '</span></button>'; }).join('') + '</div></div>';
    if (!S.query && !S.searchOpen && S.topic === 'all') {
      var hl = focusOrder(list);
      return h.replace(/<div class="chips-wrap">[\s\S]*?<\/div><\/div>/, '') + '<header class="tb"><h1>Today\u2019s Signals</h1><p>' + esc(asOfText()) + '</p>' + highStripHTML(hl) + '</header>' + tipHTML() + homeDataHTML() + hl.map(function (i, n) { return homeCardHTML(i, n); }).join('');
    }
    var desk = !S.query && S.topic !== 'all';
    if (desk) {
      // Topic desk: title, focus line, freshness, then the desk's live data card (no hero when the topic has no real data).
      var fr = freshness(list);
      h += '<header class="desk-h"><h2>' + esc(TOPIC_LABEL[S.topic]) + '</h2><p class="desk-focus">' + esc(DESK_FOCUS[S.topic] || '') + '</p>' +
        '<div class="fresh' + (fr.week ? ' live' : '') + '"><span class="fresh-dot" aria-hidden="true"></span>' + esc(fr.text) + '</div></header>';
      h += deskHeroHTML(S.topic);
      h += '<div class="section-h"><h2>Briefings</h2><span>' + list.length + ' on this desk</span></div><span id="unread-l" hidden>Unread</span>';
    } else {
      S.sigIds = null; h += signalsHTML();
      if (!S.query && !S.searchOpen) h += deadlinesSectionHTML(4);
      var title = S.query ? 'Results' : S.sigSort === 'top' ? 'Top Signals' : 'Latest signals';
      var sub = S.query ? list.length + ' briefing' + (list.length === 1 ? '' : 's') : freshness(list).text;
      h += '<div class="section-h"><h2>' + esc(title) + '</h2><span>' + esc(sub) + '</span></div>';
      if (!S.query) h += '<div class="following"><span>Following ' + esc(followsAll() ? 'all ' + CATEGORIES.length + ' topics' : followLabel()) + '</span><button class="link-btn" data-managetopics>Edit topics</button></div>';
      h += '<span id="unread-l" hidden>Unread</span>';
    }
    if (!list.length) h += '<div class="empty">' + ICON.search + '<h3>No briefings found</h3><p>' + (S.query ? 'Nothing matches \u201C' + esc(S.query.trim()) + '\u201D. Try a place, a mineral or a policy name.' : 'Try another topic, or follow more topics in Settings.') + '</p>' +
      (S.query ? '<div class="sugg">' + ['Greenland', 'Rare earths', 'Export controls', 'Northern Sea Route'].map(function (w) { return '<button class="chip" data-suggest="' + esc(w) + '">' + esc(w) + '</button>'; }).join('') + '</div>' : '') + '</div>';
    if (!desk && !S.query) list = S.sigSort === 'top' ? list.slice().sort(function (a, b) { return ((b.signal || {}).impact_score || 0) - ((a.signal || {}).impact_score || 0); }) : focusOrder(list);
    list.forEach(function (i, n) { h += i.signal ? sigCardHTML(i, n) : cardHTML(i, n === 0 && !S.query && !desk, n); });
    return h;
  }
  function renderSaved() {
    var liked = S.savedView === 'liked', reps = S.savedView === 'reposts', list;
    if (reps) {
      list = S.items.filter(function (i) { return repostOf(i.id); });
      list.sort(function (a, b) { return repostOf(b.id).createdAt < repostOf(a.id).createdAt ? -1 : 1; });
    } else if (liked) {
      list = S.items.filter(function (i) { return reactionOf(i.id) === 'like'; });
      list.sort(function (a, b) { return (S.reactions[b.id].t || 0) - (S.reactions[a.id].t || 0); });
    } else {
      list = S.items.filter(function (i) { return isSaved(i.id); });
      list.sort(function (a, b) { return S.saved.indexOf(b.id) - S.saved.indexOf(a.id); });
    }
    var nLiked = S.items.filter(function (i) { return reactionOf(i.id) === 'like'; }).length;
    var h = '<div class="section-h"><h2>Watchlist' + (liked ? ' \u00B7 Liked' : '') + '</h2><span>' + list.length + ' on this device</span></div>';
    h += '<div class="segbar" role="tablist"><button role="tab" data-savedview="saved" aria-selected="' + !liked + '" class="' + (liked ? '' : 'on') + '">Saved \u00B7 ' + S.saved.length + '</button>' +
      '<button role="tab" data-savedview="liked" aria-selected="' + liked + '" class="' + (liked ? 'on' : '') + '">\uD83D\uDC4D Liked \u00B7 ' + nLiked + '</button><button role="tab" data-savedview="reposts" aria-selected="' + reps + '" class="' + (reps ? 'on' : '') + '">My Reposts \u00B7 ' + Object.keys(S.reposts).length + '</button></div>';
    if (reps) return h + (list.length ? list.map(function (i) { var r = repostOf(i.id); return '<div class="rp-h">' + ICON.repost + '<span>You reposted \u00B7 ' + esc(fmtDate(r.createdAt)) + '</span></div>' + (r.comment ? '<p class="rp-c">' + esc(r.comment) + '</p>' : '') + (i.signal ? sigCardHTML(i) : cardHTML(i, false)); }).join('')
      : '<div class="empty"><h3>No reposts yet</h3><p>Tap Repost on any story and choose Repost in Voxarc. Reposts are kept on this device for now.</p></div>');
    if (!list.length) return h + (liked
      ? '<div class="empty"><div class="em-big">\uD83D\uDC4D</div><h3>No liked briefings yet</h3><p>Tap Like on any briefing to find it here. Reactions are stored only on this device.</p><button class="btn ghost sm" data-tab="feed">Browse the feed</button></div>'
      : '<div class="empty">' + ICON.saved + '<h3>Nothing saved yet</h3><p>Tap the bookmark on any briefing to keep it here. Saved briefings are stored on this device and work offline.</p><button class="btn ghost sm" data-tab="feed">Browse the feed</button></div>');
    return h + list.map(function (i) { return cardHTML(i, false); }).join('');
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
  function renderSettingsTopics() {
    var h = '<div class="settings-inner"><div class="subbar"><button class="back" data-setback>' + ICON.back + '<span>Settings</span></button></div>' +
      '<div class="section-h"><h2 id="st-h" tabindex="-1">Topics you follow</h2><span>' + S.follow.length + ' of ' + CATEGORIES.length + '</span></div>' +
      '<p class="set-sub">For you shows briefings, deadlines and signals from these topics. Every desk stays one tap away in the topic row. Your choices stay on this device.</p><div class="group">';
    OB_TOPICS.forEach(function (t) {
      var on = isFollowed(t.id), list = deskItems(t.id), fr = freshness(list);
      h += '<div class="cell tcell"><span class="t-ic' + (on ? ' on' : '') + '" aria-hidden="true">' + topicIcon(t.ic, 'ti') + '</span><div class="l" id="tl-' + t.id + '">' + esc(t.label) + '<small>' + esc(DESK_FOCUS[t.id]) + '</small><small class="tf">' + list.length + ' briefings \u00B7 ' + esc(fr.week ? fr.week + ' new this week' : 'nothing new this week') + '</small></div>' +
        '<button class="switch' + (on ? ' on' : '') + '" data-follow="' + t.id + '" role="switch" aria-checked="' + on + '" aria-labelledby="tl-' + t.id + '"></button></div>';
    });
    h += '</div>' + (followsAll() ? '' : '<div class="set-actions"><button class="btn ghost sm" data-followall>Follow all topics</button></div>') + '</div>';
    return h;
  }
  function renderSettings() {
    var times = []; for (var hh = 5; hh <= 21; hh++) times.push(hh);
    if (S.setView === 'topics') return renderSettingsTopics();
    var h = '<div class="settings-inner"><div class="section-h"><h2>Settings</h2></div>';
    h += '<div class="group-h">Your feed</div><div class="group">' +
      '<button class="cell" data-settopics><div class="l">Topics you follow<small>' + esc(followLabel()) + '</small></div><div class="r">' + S.follow.length + ' of ' + CATEGORIES.length + '</div>' + ICON.chev + '</button>' +
      '<button class="cell" data-editprofile><div class="l">Regions and role<small>' + esc(profileSummary()) + '</small></div>' + ICON.chev + '</button></div>';
    h += '<div class="group-h">Reading</div><div class="group">' +
      '<div class="cell"><div class="l" id="fs-l">Text size</div><div class="seg" role="group" aria-labelledby="fs-l">' + [15, 17, 19, 21].map(function (f, n) { return '<button data-fs="' + f + '" aria-pressed="' + (S.prefs.fs === f) + '" aria-label="' + ['Small', 'Medium', 'Large', 'Extra large'][n] + '" class="' + (S.prefs.fs === f ? 'on' : '') + '">' + ['S', 'M', 'L', 'XL'][n] + '</button>'; }).join('') + '</div></div>' +
      '<div class="cell"><div class="l">Offline library<small>' + S.items.length + ' briefings stored on this device' + (S.updated ? ', checked ' + (fmtDate(S.updated) === 'Today' ? 'today' : fmtDate(S.updated) === 'Yesterday' ? 'yesterday' : fmtDate(S.updated)) : '') + '</small></div><div class="r">' + (S.online ? 'Ready' : 'Offline') + '</div></div>' +
      '<button class="cell" data-refresh><div class="l">Check for new briefings</div>' + ICON.chev + '</button></div>';
    h += '<div class="group-h">Daily brief</div><div class="group">' +
      '<div class="cell"><div class="l">Morning reminder<small>A local notification on this device</small></div>' + switchHTML(S.prefs.notif, 'Morning reminder') + '</div>' +
      '<div class="cell"><label class="l" for="notifTime">Time</label><select id="notifTime">' + times.map(function (t) { return '<option value="' + t + '"' + (S.prefs.hour === t ? ' selected' : '') + '>' + fmtTime(t, 0) + '</option>'; }).join('') + '</select></div></div>';
    h += '<div class="group-h">Your data</div><div class="group">' +
      '<button class="cell" data-clearsaved><div class="l">Clear saved briefings<small>' + S.saved.length + ' saved on this device</small></div>' + ICON.chev + '</button>' +
      '<button class="cell" data-clearread><div class="l">Clear reading history<small>Marks every briefing as unread</small></div>' + ICON.chev + '</button></div>';
    h += '<div class="group-h">About</div><div class="group">' +
      '<div class="about"><img src="img/mark.png" alt=""><div><b>Voxarc Feed</b><p>Policy intelligence from Voxarc Lab. Free to read, with your saved briefings and settings kept on this device.</p></div></div>' +
      '<button class="cell" data-url="' + CFG.siteUrl + '"><div class="l">About Voxarc Lab</div>' + ICON.chev + '</button>' +
      '<button class="cell" data-url="' + CFG.privacyUrl + '"><div class="l">Privacy Policy</div>' + ICON.chev + '</button>' +
      '<button class="cell" data-url="' + CFG.contactUrl + '"><div class="l">Contact and Support</div>' + ICON.chev + '</button>' +
      '<button class="cell" data-mail="Voxarc Feed feedback"><div class="l">Send feedback</div><div class="r">' + esc(CFG.feedbackEmail) + '</div></button>' +
      '<div class="cell"><div class="l">Version</div><div class="r" id="appVersion">' + esc(CFG.version) + '</div></div></div>';
    h += '<div class="foot">Voxarc Feed by Voxarc Lab. Analysis summarizes public sources, which are linked in every briefing. Not legal or investment advice.</div></div>';
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
    if (!list.length) return '<div class="ask-ans refuse" role="status"><b>I can\u2019t answer that from Voxarc sources yet.</b><p>No sourced briefing covers \u201C' + esc(S.query.trim()) + '\u201D. Nothing is guessed.</p></div>';
    var top = list.slice(0, 3), cites = [], asOf = '';
    var lines = top.map(function (i, k) {
      var t = trustOf(i); if (t) cites.push(t); var dt = t && t.date ? t.date : String(i.published || '').slice(0, 10); if (dt > asOf) asOf = dt;
      var sent = String(i.summary || '').split(/(?<=[.!?])\s/)[0].replace(/\u2026$/, '');
      return '<li>' + esc(sent) + ' <sup>[' + (k + 1) + ']</sup></li>';
    });
    return '<div class="ask-ans" role="status"><div class="xn-k">Answer from ' + top.length + ' sourced briefing' + (top.length > 1 ? 's' : '') + (asOf ? ' \u00B7 as of ' + esc(dlDate(asOf)) : '') + '</div><ul>' + lines.join('') + '</ul><ol class="ask-cites">' +
      top.map(function (i, k) { var t = trustOf(i); return '<li>[' + (k + 1) + '] ' + (t ? '<button class="tr-link" data-url="' + esc(t.url) + '">' + esc(t.name) + (t.date ? ', ' + esc(dlDate(t.date)) : '') + ' \u2197</button>' : esc(i.title)) + '</li>'; }).join('') + '</ol></div>';
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
    if (S.sigSort === 'top') list = list.slice().sort(function (a, b) { return ((b.signal || {}).impact_score || 0) - ((a.signal || {}).impact_score || 0); });
    var h = '<header class="tb"><h1>Signals</h1><p>' + list.length + ' signals \u00B7 ' + esc(asOfText()) + '</p></header>' + sigControlsHTML() + trendHTML() +
      '<div class="section-h"><h2>' + (S.sigSort === 'top' ? 'Top Signals' : 'Latest signals') + '</h2><span>' + list.length + ' shown</span></div><span id="unread-l" hidden>Unread</span>';
    return h + (list.length ? list.map(function (i, n) { return i.signal ? sigCardHTML(i, n) : cardHTML(i, false); }).join('') : '<div class="empty"><h3>No signals match</h3><p>Try another importance or horizon.</p></div>');
  }
  function renderDashboard() {
    var h = renderBrief();
    if (S.booting) return h;
    h += trackersHTML() + expertSectionHTML();
    return h;
  }
  function renderAsk() {
    var h = '<div class="brief-top"><h2>Ask</h2><p>Search every briefing and its sources. Each result links to the original document.</p></div>' +
      '<div class="searchwrap"><label class="search">' + ICON.search + '<input id="q" type="search" placeholder="Ask about a place, mineral or policy" aria-label="Ask Voxarc Feed" value="' + esc(S.query) + '" autocomplete="off" enterkeyhint="search">' + (S.query ? '<button class="clear" data-clear>Clear</button>' : '') + '</label></div>';
    if (S.query) { var tq = S.topic; S.topic = 'all'; h += askAnswerHTML(filtered(S.items)); S.topic = tq; }
    if (!S.query) return h + '<div class="sugg">' + ['Greenland', 'Rare earths', 'Export controls', 'Northern Sea Route'].map(function (w) { return '<button class="chip" data-suggest="' + esc(w) + '">' + esc(w) + '</button>'; }).join('') + '</div>';
    var tp = S.topic; S.topic = 'all'; var list = filtered(S.items); S.topic = tp;
    h += '<div class="section-h"><h2>Results</h2><span>' + list.length + ' briefing' + (list.length === 1 ? '' : 's') + '</span></div>';
    if (!list.length) h += '<div class="empty">' + ICON.search + '<h3>No briefings found</h3><p>Nothing matches \u201C' + esc(S.query.trim()) + '\u201D.</p></div>';
    return h + list.map(function (i) { return cardHTML(i, false); }).join('');
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
    var h = '<div class="rbar"><button class="back" data-back>' + ICON.back + '<span>Back</span></button><span class="sp"></span>' +
      '<button class="icon-btn" data-textsize aria-label="Text size">' + ICON.aa + '</button>' +
      '<button class="icon-btn' + (isSaved(i.id) ? ' on' : '') + '" data-bm="' + esc(i.id) + '" aria-label="Save">' + ICON.bm + '</button>' +
      '<button class="icon-btn" data-share="' + esc(i.id) + '" aria-label="Share">' + ICON.share + '</button></div><div class="rprog" id="rprog"></div>';
    h += '<div class="rscroll" id="rscroll"><article>' +
      photoHeroHTML(i) + '<div class="kicker">' + esc(kickerOf(i)) + '</div><h1 tabindex="-1" id="rtitle">' + (i.signal ? esc(i.signal.signal_title) : markup(i.titleMarkup || i.title)) + '</h1>' +
      (i.signal ? '<div class="smeta"><span class="hb ' + lvl(i.signal.importance) + '">Impact: ' + esc(i.signal.importance) + '</span><span class="sm-t">\u00B7 ' + esc(i.signal.time_horizon) + ' \u00B7 Risk: ' + esc(i.signal.risk_level) + '</span>' + INFO_BTN + '</div>' +
        (i.signal.so_what ? '<p class="hc-why big"><b>So what:</b> ' + esc(i.signal.so_what) + '</p>' : '') + srcLineHTML(i) : '') +
      (primaryName(i) ? '<div class="ps-line">' + primaryChipHTML(i) + '<span>Official document, summarized by Voxarc Lab</span></div>' : '') +
      '<div class="ameta"><span>Voxarc Lab</span><span>·</span><span>' + esc(fmtDate(i.published)) + '</span><span>·</span><span>' + readMins(i) + ' min read</span></div>' +
      '<div class="tagrow">' + (i.topics || []).map(function (t) { return '<span class="tag">' + esc(TOPIC_LABEL[t] || t) + '</span>'; }).join('') + '</div>' +
      '<div class="ractions" role="group" aria-label="React or share">' + reactHTML(i.id, true) + '<span class="sp"></span><button class="rx" data-share="' + esc(i.id) + '" aria-label="Share briefing">' + ICON.share + 'Share</button><button class="rx' + (repostOf(i.id) ? ' on' : '') + '" data-repost="' + esc(i.id) + '" aria-label="Repost">' + ICON.repost + (repostOf(i.id) ? 'Reposted' : 'Repost') + '</button></div>' + signalDetailHTML(i);
    if (i.stat && i.stat.value) h += '<div class="statbox"><b>' + esc(i.stat.value) + '</b><span>' + esc(i.stat.label) + '</span></div>';
    h += soWhatHTML(i, true);
    var dls = deadlinesOf(i, true);
    if (dls.length) h += '<div class="kdates"><h5>Key dates</h5>' + dls.map(function (x) {
      var past = x.date < todayISO(), dl = DL_TYPES[x.type] && !past;
      return '<div class="kd' + (past ? ' past' : '') + '">' + (dl ? '<span class="dl-chip"><b>Deadline</b></span>' : '') + '<span class="kd-l">' + esc(x.label) + '</span><span class="kd-d">' + esc(dlDate(x.date)) + (past ? ' (passed)' : ' \u00B7 ' + inDays(x.date)) + '</span></div>';
    }).join('') + '</div>';
    h += dataCardHTML(i, true);
    h += marketHTML(i, true);
    if (i.keyPoints && i.keyPoints.length) h += '<div class="kp"><h5>At a glance</h5><ul>' + i.keyPoints.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></div>';
    h += '<div class="body">' + bodyHTML(i.body) + '</div>';
    if (i.sources && i.sources.length) h += '<div class="sources"><h5>Sources</h5>' + i.sources.map(function (s) {
      var u = safeUrl(s.url);
      return (u ? '<button class="src" data-url="' + esc(u) + '">' : '<div class="src">') + '<span class="pub">' + esc(s.publisher) + '</span> · ' + esc(s.title) + '<small>' + esc(s.date || '') + '</small>' + (u ? '</button>' : '</div>'); }).join('') + '</div>';
    h += '<div class="share-cta"><button class="btn primary" data-share="' + esc(i.id) + '">Share briefing</button><button class="btn ghost" data-bm="' + esc(i.id) + '">' + (isSaved(i.id) ? 'Saved' : 'Save for later') + '</button></div>';
    h += '<p class="disclaimer">Voxarc Lab analysis of public sources. Check the linked originals before acting. Not legal or investment advice.</p></article></div>';
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
    if (!silent && !wide()) {
      history.pushState({ a: id }, '');
      S.returnFocus = document.activeElement && document.activeElement.closest ? document.activeElement.closest('[data-open]') : null;
      $('#main').setAttribute('aria-hidden', 'true'); $('#tabbar').setAttribute('aria-hidden', 'true');
      var t = $('#rtitle'); if (t) setTimeout(function () { try { t.focus({ preventScroll: true }); } catch (e) {} }, 30);
    }
  }
  function closeArticle() {
    var r = $('#reader'); r.classList.remove('open'); r.setAttribute('aria-hidden', 'true'); S.current = null;
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
  // Week 4 first run is light: the intro, then one screen to pick the topics to follow (all four on by default).
  // Skip is always visible and follows everything. Regions and role are optional and live in Settings.
  // Every choice is stored on this device only; nothing is sent anywhere and there is no account.
  var OB_FIRST = ['intro', 'follow'], OB_EDIT = ['regions', 'role'];
  function startOnboarding(edit) {
    var p = S.profile || {};
    S.ob = { steps: edit ? OB_EDIT : OB_FIRST, step: 0, topics: S.follow.slice(), regions: (p.regions || []).slice(), roles: (p.roles || []).slice(), edit: !!edit };
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
      h = '<div class="ob-body"><div class="ob-k">Your desks</div><h1 id="ob-h" tabindex="-1">Follow your topics</h1><p class="ob-sub">All four are on. Turn off any you do not need. Your For you feed shows only what you follow, and you can change it any time in Settings.</p><div class="ob-list">' +
        OB_TOPICS.map(function (t) { var fr = freshness(deskItems(t.id)); return obChoice('topics', { id: t.id, label: t.label, ic: t.ic, d: DESK_FOCUS[t.id] }, o.topics.indexOf(t.id) >= 0, countTopic(t.id) + ' briefings \u00B7 ' + (fr.week ? fr.week + ' new this week' : 'nothing new this week')); }).join('') + '</div></div>' +
        '<div class="ob-cta"><button class="btn primary" data-obdone>' + followCta(o.topics.length) + '</button></div>';
    } else if (step === 'regions') {
      h = '<div class="ob-body"><div class="ob-k">Step 1 of 2</div><h1 id="ob-h" tabindex="-1">Which regions matter to you?</h1><p class="ob-sub">We weight your 3 signals toward briefings that name these places.</p><div class="ob-chips">' +
        OB_REGIONS.map(function (r) { return obChoice('regions', r, o.regions.indexOf(r.id) >= 0); }).join('') + '</div></div>' +
        '<div class="ob-cta"><button class="btn primary" data-obnext>' + (o.regions.length ? 'Continue' : 'Continue with all regions') + '</button></div>';
    } else {
      h = '<div class="ob-body"><div class="ob-k">Step 2 of 2</div><h1 id="ob-h" tabindex="-1">What best describes you?</h1><p class="ob-sub">Optional. It helps us decide what to build next, and never leaves this device.</p><div class="ob-chips">' +
        OB_ROLES.map(function (r) { return obChoice('roles', r, o.roles.indexOf(r.id) >= 0); }).join('') + '</div></div>' +
        '<div class="ob-cta"><button class="btn primary" data-obdone>Save</button></div>';
    }
    el.innerHTML = '<div class="ob-screen ' + (dir > 0 ? 'fwd' : dir < 0 ? 'rev' : '') + '" data-step="' + step + '">' + top + h + '</div>';
    el.hidden = false; document.body.classList.add('ob-open');
    var hd = $('#ob-h'); if (hd) setTimeout(function () { try { hd.focus({ preventScroll: true }); } catch (e) {} }, 40);
  }
  function obToggle(kind, v) {
    var a = S.ob[kind], k = a.indexOf(v);
    if (kind === 'roles') S.ob.roles = k >= 0 ? [] : [v]; else if (k >= 0) a.splice(k, 1); else a.push(v);
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
  function followCta(n) { return n && n < CATEGORIES.length ? 'Follow ' + n + ' topic' + (n === 1 ? '' : 's') : 'Follow all topics'; }
  function finishOnboarding(skipped) {
    var o = S.ob, first = !S.onboarded;
    if (!o.edit) setFollow(skipped ? CATEGORIES : o.topics); // skipping, or turning every topic off, follows all four
    else if (!skipped) {
      S.profile = { topics: S.follow.slice(), regions: o.regions, roles: o.roles, t: Date.now() };
      store.set('vx.profile', S.profile);
    }
    if (o.edit) {
      S.ob = null; document.body.classList.remove('ob-open'); var ee = $('#onboard'); ee.hidden = true; ee.innerHTML = '';
      render(); if (!skipped) toast('Regions and role saved'); return;
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
    el.innerHTML = '<div class="ob-screen building" role="status"><div class="ob-build">' + POLAR_SVG(!reducedMotion()) + '<h2>Building your feed</h2><p>Ranking ' + S.items.filter(inFollow).length + ' briefings from ' + esc(followsAll() ? 'all four desks' : joinList(S.follow.map(function (t) { return TOPIC_LABEL[t]; }))) + '\u2026</p></div>' + skeletonHTML(2) + '</div>';
    setTimeout(function () {
      el.classList.add('out');
      S.tab = 'feed'; S.topic = 'all'; S.query = ''; S.searchOpen = false; S.rendered = false; render(); $('#main').scrollTop = 0;
      setTimeout(function () { el.hidden = true; el.innerHTML = ''; el.classList.remove('out'); var sh = $('#sig-h'); if (sh) { sh.setAttribute('tabindex', '-1'); try { sh.focus({ preventScroll: true }); } catch (e) {} } }, reducedMotion() ? 0 : 320);
    }, reducedMotion() ? 200 : 1100);
  }

  /* ---------- actions ---------- */
  function toggleFollow(t) {
    if (CATEGORIES.indexOf(t) < 0) return;
    if (isFollowed(t) && S.follow.length === 1) { toast('Follow at least one topic'); return; }
    var on = !isFollowed(t);
    setFollow(on ? S.follow.concat([t]) : S.follow.filter(function (x) { return x !== t; }));
    haptic(); render(); toast((on ? 'Following ' : 'Stopped following ') + TOPIC_LABEL[t]);
  }
  function toggleSave(id) {
    var k = S.saved.indexOf(id);
    if (k >= 0) S.saved.splice(k, 1); else S.saved.push(id);
    store.set('vx.saved', S.saved); haptic(); toast(k >= 0 ? 'Removed from Saved' : 'Saved for offline reading');
    render(); refreshReader();
  }
  function refreshReader() { if (S.current) { var sc = $('#rscroll'), y = sc ? sc.scrollTop : 0; openArticle(S.current, true); if ($('#rscroll')) $('#rscroll').scrollTop = y; } }
  function toggleReact(id, r) {
    if (!byId(id)) return;
    var off = reactionOf(id) === r;
    if (off) delete S.reactions[id]; else S.reactions[id] = { r: r, t: Date.now() };
    store.set('vx.reactions', S.reactions); haptic();
    var m = $('#main'), y = m.scrollTop; render(); m.scrollTop = y; refreshReader();
  }
  function linkOf(i) { return safeUrl(i.signal && i.signal.source_url) || (trustOf(i) || {}).url || CFG.siteUrl; }
  function repostSheet(id) {
    var i = byId(id); if (!i) return;
    var u = linkOf(i), crux = (i.signal ? i.signal.crux : i.title).replace(/\s*[\u2014\u2013]\s*/g, ', ');
    var li = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(u);
    var x = 'https://x.com/intent/post?text=' + encodeURIComponent(crux + ' via @Voxarc ' + u);
    var mine = repostOf(id);
    sheet('<h3>Repost</h3>' + (mine ? '<p>You reposted this in Voxarc' + (mine.comment ? ': \u201C' + esc(mine.comment) + '\u201D' : '') + '</p><button class="btn ghost" data-repundo="' + esc(id) + '">Undo repost in Voxarc</button>'
        : '<textarea id="repc" class="repc" maxlength="280" placeholder="Add a comment (optional)" aria-label="Comment"></textarea><button class="btn primary" data-repin="' + esc(id) + '">Repost in Voxarc</button>') +
      '<p class="rep-n">LinkedIn and X open outside the app. You post it yourself on your own page.</p>' +
      '<button class="btn primary" data-repurl="' + esc(li) + '">Repost to LinkedIn</button><button class="btn primary" data-repurl="' + esc(x) + '">Repost to X</button>' +
      '<button class="btn ghost" data-repshare="' + esc(id) + '">Other apps</button><button class="btn ghost" data-closesheet>Cancel</button>');
  }
  function shareItem(id) {
    var i = byId(id); if (!i) return;
    var lead = (i.stat && i.stat.value ? i.stat.value + ': ' + i.stat.label : (i.summary || '')).replace(/\s+/g, ' ');
    if (lead.length > 180) lead = lead.slice(0, 177).replace(/\s+\S*$/, '') + '...';
    var text = i.title + '\n\n' + lead + '\n\nVoxarc Lab policy signal, read more in Voxarc Feed.';
    haptic();
    var sh = plugin('Share');
    if (sh) return sh.share({ title: i.title, text: text, url: linkOf(i), dialogTitle: 'Share briefing' }).catch(function () {});
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
  function sheet(html) { var s = $('#sheet'); $('.sheet-card', s).innerHTML = html; s.hidden = false; }
  function closeSheet() { $('#sheet').hidden = true; }
  function confirmClearSaved() {
    if (!S.saved.length) { toast('No saved briefings to clear'); return; }
    sheet('<h3>Clear saved briefings?</h3><p>This removes all ' + S.saved.length + ' saved briefing' + (S.saved.length === 1 ? '' : 's') + ' from this device. The briefings stay in the feed.</p>' +
      '<button class="btn primary" data-clearsavedok>Clear saved briefings</button><button class="btn ghost" data-closesheet>Cancel</button>');
  }
  function mail(subject) { var url = 'mailto:' + CFG.feedbackEmail + '?subject=' + encodeURIComponent(subject); window.location.href = url; }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var ob = e.target.closest('[data-ob],[data-obnext],[data-obback],[data-obskip],[data-obdone]');
    if (ob && S.ob) {
      if (ob.dataset.ob) { obToggle(ob.dataset.ob, ob.dataset.v); return; }
      if (ob.hasAttribute('data-obnext')) { haptic('LIGHT'); S.ob.step = Math.min(S.ob.steps.length - 1, S.ob.step + 1); renderOnboarding(1); return; }
      if (ob.hasAttribute('data-obback')) { S.ob.step = Math.max(0, S.ob.step - 1); renderOnboarding(-1); return; }
      if (ob.hasAttribute('data-obskip')) { finishOnboarding(true); return; }
      if (ob.hasAttribute('data-obdone')) { finishOnboarding(false); return; }
    }
    var x = e.target.closest('[data-retry],[data-suggest],[data-editprofile],[data-settopics],[data-setback],[data-follow],[data-followall],[data-managetopics]');
    if (x) {
      if (x.hasAttribute('data-retry')) { S.booting = true; render(); loadAll(); return; }
      if (x.dataset.suggest) { S.query = x.dataset.suggest; S.searchOpen = true; render(); return; }
      if (x.hasAttribute('data-editprofile')) { startOnboarding(true); return; }
      if (x.hasAttribute('data-settopics') || x.hasAttribute('data-managetopics')) { if (!wide() && S.current) closeArticle(); S.tab = 'settings'; S.setView = 'topics'; haptic(); render(); $('#main').scrollTop = 0; var sh = $('#st-h'); if (sh) try { sh.focus({ preventScroll: true }); } catch (er) {} return; }
      if (x.hasAttribute('data-setback')) { S.setView = null; render(); $('#main').scrollTop = 0; return; }
      if (x.dataset.follow) { toggleFollow(x.dataset.follow); return; }
      if (x.hasAttribute('data-followall')) { setFollow(CATEGORIES); haptic(); render(); toast('Following all topics'); return; }
    }
    var t = e.target.closest('[data-react],[data-savedview],[data-bm],[data-open],[data-topic],[data-tab],[data-share],[data-back],[data-url],[data-notif],[data-fs],[data-clearsaved],[data-clearsavedok],[data-closesheet],[data-mail],[data-refresh],[data-clearread],[data-clear],[data-textsize],[data-sf],[data-repost],[data-sinfo],[data-tipdone],[data-repin],[data-repundo],[data-repurl],[data-repshare],#btnSearch,#sheet');
    if (!t) return;
    if (t.dataset.sinfo) { e.stopPropagation(); infoSheet(); return; }
    if (t.hasAttribute('data-tipdone')) { e.stopPropagation(); S.tipDone = true; store.set('vx.tipSignals', 1); render(); return; }
    if (t.dataset.repin) { var cm = ($('#repc') || {}).value || ''; cm = cm.replace(/\s*[\u2014\u2013]\s*/g, ', ').trim().slice(0, 280);
      // Local-only for now. Shape mirrors a future shared reposts table: one row per user and story.
      S.reposts[t.dataset.repin] = { v: 1, storyId: t.dataset.repin, comment: cm, createdAt: new Date().toISOString(), userId: 'local', synced: false };
      saveReposts(); closeSheet(); haptic(); render(); refreshReader(); toast('Reposted in Voxarc'); return; }
    if (t.dataset.repundo) { delete S.reposts[t.dataset.repundo]; saveReposts(); closeSheet(); render(); refreshReader(); toast('Repost removed'); return; }
    if (t.dataset.repost) { e.stopPropagation(); repostSheet(t.dataset.repost); return; }
    if (t.dataset.repurl) { closeSheet(); openUrl(t.dataset.repurl); return; }
    if (t.dataset.repshare) { closeSheet(); shareItem(t.dataset.repshare); return; }
    if (t.dataset.sf) { S[t.dataset.sf] = t.dataset.sv; haptic(); render(); return; }
    if (t.id === 'sheet') { if (e.target === t) closeSheet(); return; }
    if (t.dataset.react) { e.stopPropagation(); toggleReact(t.dataset.rid, t.dataset.react); return; }
    if (t.dataset.savedview) { S.savedView = t.dataset.savedview; haptic(); render(); $('#main').scrollTop = 0; return; }
    if (t.dataset.bm) { e.stopPropagation(); toggleSave(t.dataset.bm); return; }
    if (t.dataset.open) { openArticle(t.dataset.open); return; }
    if (t.dataset.topic) {
      S.topic = t.dataset.topic; haptic(); render(); $('#main').scrollTop = 0;
      if (wide()) { var f0 = filtered(S.items)[0]; if (f0) openArticle(f0.id, true); } // the side reader follows the desk on iPad
      return;
    }
    if (t.dataset.tab) { if (S.tab === t.dataset.tab) { $('#main').scrollTop = 0; } S.tab = t.dataset.tab; S.setView = null; if (!wide() && S.current) closeArticle(); render(); return; }
    if (t.dataset.share) { e.stopPropagation(); shareItem(t.dataset.share); return; }
    if (t.hasAttribute('data-back')) { if (history.state && history.state.a) history.back(); else closeArticle(); return; }
    if (t.dataset.url) { openUrl(t.dataset.url); return; }
    if (t.hasAttribute('data-notif')) { setNotif(!S.prefs.notif); return; }
    if (t.dataset.fs) { S.prefs.fs = +t.dataset.fs; applyFs(); store.set('vx.prefs', S.prefs); render(); return; }
    if (t.hasAttribute('data-clearsaved')) { confirmClearSaved(); return; }
    if (t.hasAttribute('data-clearsavedok')) { closeSheet(); S.saved = []; store.set('vx.saved', S.saved); haptic(); render(); toast('Saved briefings cleared'); return; }
    if (t.hasAttribute('data-closesheet')) { closeSheet(); return; }
    if (t.dataset.mail) { closeSheet(); mail(t.dataset.mail); return; }
    if (t.hasAttribute('data-refresh')) { refreshRemote(true); return; }
    if (t.hasAttribute('data-clearread')) { S.read = {}; store.set('vx.read', S.read); render(); toast('Reading history cleared. All briefings are unread'); return; }
    if (t.hasAttribute('data-clear')) { S.query = ''; render(); return; }
    if (t.hasAttribute('data-textsize')) { var o = [15, 17, 19, 21]; S.prefs.fs = o[(o.indexOf(S.prefs.fs) + 1) % o.length]; applyFs(); store.set('vx.prefs', S.prefs); return; }
    if (t.id === 'btnSearch') { S.tab = 'feed'; S.searchOpen = !S.searchOpen; if (!S.searchOpen) S.query = ''; if (!wide() && S.current) closeArticle(); render(); if (S.searchOpen) { var q = $('#q'); if (q) q.focus(); } return; }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute && e.target.getAttribute('role') === 'button' && e.target.tagName === 'SPAN') { e.preventDefault(); e.target.click(); }
    if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet();
  });
  var qT;
  document.addEventListener('input', function (e) {
    if (e.target.id === 'q') { var v = e.target.value; clearTimeout(qT); qT = setTimeout(function () { S.query = v; var pos = v.length; render(); var q = $('#q'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } }, 220); }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'notifTime') { S.prefs.hour = +e.target.value; S.prefs.minute = 0; store.set('vx.prefs', S.prefs); scheduleNotif(); if (S.prefs.notif) toast('Daily brief at ' + fmtTime(S.prefs.hour, 0)); }
  });
  window.addEventListener('popstate', function () { if (S.current && !wide()) closeArticle(); });
  var rzT; window.addEventListener('resize', function () { clearTimeout(rzT); rzT = setTimeout(render, 60); });
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
    return Promise.all([loadBundled(), store.get('vx.feedCache'), store.get('vx.saved'), store.get('vx.read'), store.get('vx.prefs'), store.get('vx.reactions'), store.get('vx.onboarded'), store.get('vx.profile'), store.get('vx.follow')]).then(function (r) {
      var bundled = r[0], cache = r[1];
      var bc = validFeed(bundled) && Array.isArray(bundled.dataCards) ? bundled.dataCards : [], cc = cache && Array.isArray(cache.dataCards) ? cache.dataCards : [];
      S.cards = cc.length ? cc : bc;
      store.get('vx.tipSignals').then(function (v) { if (v) { S.tipDone = true; render(); } });
      store.get('vx.reposts').then(function (v) { if (v && typeof v === 'object') { S.reposts = v; render(); } });
      S.generated = validFeed(bundled) ? bundled.generated : null; if (cache && cache.generated && (!S.generated || cache.generated > S.generated)) S.generated = cache.generated;
      S.trends = validFeed(bundled) && bundled.signalTrends ? bundled.signalTrends : null;
      S.items = mergeFeeds(validFeed(bundled) ? bundled.items : [], cache && Array.isArray(cache.items) ? cache.items : []);
      S.saved = Array.isArray(r[2]) ? r[2] : []; S.read = r[3] || {}; if (cache && cache.updated) S.updated = cache.updated;
      if (r[4]) for (var k in r[4]) S.prefs[k] = r[4][k];
      S.reactions = r[5] && typeof r[5] === 'object' ? r[5] : {};
      S.onboarded = !!r[6];
      var pf = r[7], fw = r[8] && typeof r[8] === 'object' ? cleanFollow(r[8].topics) : [];
      // Followed topics: the saved choice, else the Week 1 interest topics, else all four.
      S.follow = fw.length ? fw : (pf && Array.isArray(pf.topics) && cleanFollow(pf.topics).length ? cleanFollow(pf.topics) : DESK_ORDER.slice());
      S.profile = pf && typeof pf === 'object' && Array.isArray(pf.topics) ? { topics: pf.topics.filter(function (t) { return TOPIC_LABEL[t]; }), regions: (pf.regions || []).filter(function (x) { return typeof x === 'string'; }), roles: (pf.roles || []).filter(function (x) { return typeof x === 'string'; }) } : null;
      S.booting = false;
      if (!booted) { booted = true; applyFs(); initNative(); }
      if (!S.onboarded && S.items.length) startOnboarding(false);
      render();
      var ss = plugin('SplashScreen'); if (ss) requestAnimationFrame(function () { setTimeout(function () { ss.hide({ fadeOutDuration: 200 }).catch(function () {}); }, 50); });
      spotlightIndex();
      var nx = plugin('VoxarcNative'); // a quick action or Spotlight result that launched the app
      if (nx && typeof nx.takePendingRoute === 'function') { try { nx.takePendingRoute().then(handleRoute).catch(function () {}); } catch (e) {} }
      if (!S.items.length) { S.booting = true; render(); return refreshRemote(false).then(function () { S.booting = false; if (!S.onboarded && S.items.length) startOnboarding(false); render(); }); }
      refreshRemote(false); scheduleNotif();
    });
  }
  loadAll();
})();
