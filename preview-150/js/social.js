/* Voxarc Feed accounts and social layer (1.4.0: real opt-in Public mode, public comments and citations, Tracked by). Backend: Supabase (Auth + Postgres with row level security).
   Same file runs in the Android app (Capacitor) and the web app. With placeholder config it runs in demo mode on this device. */
(function () {
  'use strict';
  var C = window.VX_SUPABASE || {};
  var LIVE = !!(C.url && C.anonKey && C.url.indexOf('YOUR-') < 0 && C.anonKey.indexOf('YOUR-') < 0);
  var GOOGLE = C.googleEnabled === true; // never advertise Google until OAuth client is enabled in config
  var Cap = window.Capacitor, isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  var P = (Cap && Cap.Plugins) || {};
  var X = function () { return window.__vx; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var noDash = function (s) { return String(s || '').replace(/\s*[\u2014\u2013]\s*/g, ', '); };
  function ls(k, v) { try { if (v === undefined) { var r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  var GL_TEXT = 'I agree to the Voxarc Community Guidelines and understand that harassment, defamatory remarks, and abusive content will lead to account termination.';
  var SIG_REASONS = ['Factually wrong', 'Misleading summary or rating', 'Source does not support it', 'Out of date', 'Something else'];
  function glBox(id) { return '<label class="sx-gl-ok"><input type="checkbox" id="' + id + '"> <span>' + esc(GL_TEXT) + ' <a href="#" data-sx="glread">Read the guidelines</a></span></label>'; }
  var REASONS = ['Spam', 'Harassment or hate', 'Misinformation', 'Sexual or violent content', 'Something else'];

  /* ---------- Supabase backend (REST, no SDK) ---------- */
  var sess = ls('vx.session');
  function hdr(extra) { var h = { apikey: C.anonKey, 'Content-Type': 'application/json' }; h.Authorization = 'Bearer ' + (sess && sess.access_token || C.anonKey); for (var k in extra || {}) h[k] = extra[k]; return h; }
  function req(path, o) {
    o = o || {};
    return fetch(C.url + path, { method: o.method || 'GET', headers: hdr(o.headers), body: o.body ? JSON.stringify(o.body) : undefined }).then(function (r) {
      if (r.status === 401 && sess && sess.refresh_token && !o.retried) return refresh().then(function () { o.retried = true; return req(path, o); });
      return r.text().then(function (t) { var j = t ? JSON.parse(t) : null; if (!r.ok) { var em = String((j && (j.msg || j.message || j.error_description)) || 'Request failed'); if (/row-level security/i.test(em)) em = 'rls: Not allowed. Turn on Public mode to post publicly.'; if (/rate_limit/i.test(em)) em = 'rate_limit: You are doing that too often. Try again in a while.'; throw new Error(em.replace(/^[a-z_]+:\s*/, '')); } return o.raw ? { j: j, r: r } : j; });
    });
  }
  function setSess(s) { sess = s ? { access_token: s.access_token, refresh_token: s.refresh_token, user: s.user || (sess && sess.user) } : null; ls('vx.session', sess); }
  function refresh() { return fetch(C.url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: C.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: sess.refresh_token }) }).then(function (r) { return r.json(); }).then(function (j) { if (j.access_token) setSess(j); else setSess(null); }); }
  function uid() { return sess && sess.user ? sess.user.id : null; }
  function cnt(path) { return req(path, { headers: { Prefer: 'count=exact', Range: '0-0' }, raw: true }).then(function (x) { var m = /\/(\d+)$/.exec(x.r.headers.get('content-range') || ''); return m ? +m[1] : 0; }); }
  var PF = 'id,name,handle,avatar_url,headline,tracked_by_count';
  var Live = {
    me: function () { return uid() ? req('/rest/v1/profiles?id=eq.' + uid() + '&select=' + PF + ',guidelines_accepted_at,visibility_mode').then(function (a) { return a[0] || { id: uid(), name: '', handle: '', visibility_mode: 'STEALTH' }; }) : Promise.resolve(null); },
    signInEmail: function (e, p) { return req('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: e, password: p } }).then(setSess); },
    // Accounts are created by the account-signup edge function (guidelines accepted, name filter, per-network limit), then signed in.
    signUpEmail: function (e, p, name) { return fetch(C.url + '/functions/v1/account-signup', { method: 'POST', headers: { apikey: C.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, password: p, name: name, accept: true }) }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.message || 'Could not create the account'); return Live.signInEmail(e, p); }); }); },
    signInGoogle: function () {
      var to = isNative ? C.nativeRedirect : (location.origin + location.pathname);
      var u = C.url + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(to);
      if (isNative && P.Browser) return P.Browser.open({ url: u }); location.href = u; return Promise.resolve();
    },
    takeRedirect: function (url) {
      var m = /[#?&]access_token=([^&]+)/.exec(url || ''), r = /[#?&]refresh_token=([^&]+)/.exec(url || '');
      if (!m) return Promise.resolve(false);
      sess = { access_token: decodeURIComponent(m[1]), refresh_token: r ? decodeURIComponent(r[1]) : null };
      return req('/auth/v1/user').then(function (u) { sess.user = u; setSess(sess); return true; });
    },
    signOut: function () { var p = req('/auth/v1/logout', { method: 'POST' }).catch(function () {}); setSess(null); return p; },
    updateProfile: function (p) { return req('/rest/v1/profiles?id=eq.' + uid(), { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: p }).then(function (a) { return a[0]; }); },
    setVisibility: function (m) { return req('/rest/v1/profiles?id=eq.' + uid(), { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { visibility_mode: m } }).then(function (a) { return a[0]; }); },
    myTrackers: function () { return req('/rest/v1/rpc/my_trackers', { method: 'POST', body: {} }); },
    tracking: function () { return uid() ? req('/rest/v1/follows?follower=eq.' + uid() + '&order=created_at.desc&select=followee,p:profiles!follows_followee_fkey(' + PF + ')').then(function (a) { return a.map(function (x) { return x.p; }).filter(Boolean); }) : Promise.resolve([]); },
    userComments: function (id) { return req('/rest/v1/comments?user_id=eq.' + id + '&hidden=eq.false&order=created_at.desc&limit=30&select=id,body,kind,quote,story_id,created_at,user_id'); },
    trackingFeed: function () { return Live.tracking().then(function (ps) { var ids = ps.map(function (p) { return p.id; }); if (!ids.length) return [];
      return req('/rest/v1/comments?user_id=in.(' + ids.join(',') + ')&hidden=eq.false&order=created_at.desc&limit=60&select=id,body,kind,quote,story_id,created_at,user_id,author:profiles(' + PF + ')'); }); },
    profile: function (id) { return req('/rest/v1/profiles?id=eq.' + id + '&select=' + PF).then(function (a) { return a[0]; }); },
    counts: function (id) { return Promise.all([cnt('/rest/v1/follows?followee=eq.' + id + '&select=follower'), cnt('/rest/v1/follows?follower=eq.' + id + '&select=followee')]).then(function (a) { return { followers: a[0], following: a[1] }; }); },
    isFollowing: function (id) { return uid() ? req('/rest/v1/follows?follower=eq.' + uid() + '&followee=eq.' + id + '&select=followee').then(function (a) { return a.length > 0; }) : Promise.resolve(false); },
    follow: function (id) { return req('/rest/v1/follows', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: { follower: uid(), followee: id } }); },
    unfollow: function (id) { return req('/rest/v1/follows?follower=eq.' + uid() + '&followee=eq.' + id, { method: 'DELETE' }); },
    followers: function (id) { return req('/rest/v1/follows?followee=eq.' + id + '&select=p:profiles!follows_follower_fkey(' + PF + ')').then(function (a) { return a.map(function (x) { return x.p; }); }); },
    following: function (id) { return req('/rest/v1/follows?follower=eq.' + id + '&select=p:profiles!follows_followee_fkey(' + PF + ')').then(function (a) { return a.map(function (x) { return x.p; }); }); },
    comments: function (sid) { return req('/rest/v1/comments?story_id=eq.' + encodeURIComponent(sid) + '&hidden=eq.false&order=created_at.asc&select=id,body,kind,quote,created_at,user_id,author:profiles(' + PF + ')'); },
    addComment: function (sid, body, kind, quote) { return req('/rest/v1/comments', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { story_id: sid, user_id: uid(), body: body, kind: kind === 'cite' ? 'cite' : 'comment', quote: kind === 'cite' ? quote : null } }); },
    deleteComment: function (id) { return req('/rest/v1/comments?id=eq.' + id + '&user_id=eq.' + uid(), { method: 'DELETE' }); },
    report: function (type, id, reason) { return req('/rest/v1/reports', { method: 'POST', body: { reporter: uid(), target_type: type, target_id: String(id), reason: reason } }); },
    block: function (id) { return req('/rest/v1/blocks', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: { blocker: uid(), blocked: id } }); },
    unblock: function (id) { return req('/rest/v1/blocks?blocker=eq.' + uid() + '&blocked=eq.' + id, { method: 'DELETE' }); },
    blocked: function () { return uid() ? req('/rest/v1/blocks?blocker=eq.' + uid() + '&select=p:profiles!blocks_blocked_fkey(' + PF + ')').then(function (a) { return a.map(function (x) { return x.p; }); }) : Promise.resolve([]); },
    react: function (sid, kind) { return kind ? req('/rest/v1/reactions', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: { user_id: uid(), story_id: sid, kind: kind } }) : req('/rest/v1/reactions?user_id=eq.' + uid() + '&story_id=eq.' + encodeURIComponent(sid), { method: 'DELETE' }); },
    save: function (sid, on) { return on ? req('/rest/v1/saves', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: { user_id: uid(), story_id: sid } }) : req('/rest/v1/saves?user_id=eq.' + uid() + '&story_id=eq.' + encodeURIComponent(sid), { method: 'DELETE' }); },
    mySaves: function () { return uid() ? req('/rest/v1/saves?user_id=eq.' + uid() + '&select=story_id,created_at') : Promise.resolve([]); },
    myWatch: function () { return uid() ? req('/rest/v1/watchlists?user_id=eq.' + uid() + '&select=story_id,hs_code,eccn,jurisdiction,created_at') : Promise.resolve([]); },
    upsertWatch: function (row) { return req('/rest/v1/watchlists?on_conflict=user_id,story_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: { user_id: uid(), story_id: row.storyId, hs_code: row.hs_code || null, eccn: row.eccn || null, jurisdiction: row.jurisdiction || null } }); },
    deleteWatch: function (sid) { return req('/rest/v1/watchlists?user_id=eq.' + uid() + '&story_id=eq.' + encodeURIComponent(sid), { method: 'DELETE' }); },
    myViews: function () { return uid() ? req('/rest/v1/saved_views?user_id=eq.' + uid() + '&select=name,filters,created_at&order=created_at.asc') : Promise.resolve([]); },
    addView: function (name, filters) { return req('/rest/v1/saved_views', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { user_id: uid(), name: name, filters: filters } }); },
    repost: function (sid, r) { return r ? req('/rest/v1/reposts', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: { user_id: uid(), story_id: sid, comment: r.comment || '' } }) : req('/rest/v1/reposts?user_id=eq.' + uid() + '&story_id=eq.' + encodeURIComponent(sid), { method: 'DELETE' }); },
    userReposts: function (id) { return req('/rest/v1/reposts?user_id=eq.' + id + '&order=created_at.desc&limit=50&select=story_id,comment,created_at,user_id'); },
    followingFeed: function () { return uid() ? req('/rest/v1/follows?follower=eq.' + uid() + '&select=followee').then(function (f) { var ids = f.map(function (x) { return x.followee; }); if (!ids.length) return [];
      return req('/rest/v1/reposts?user_id=in.(' + ids.join(',') + ')&order=created_at.desc&limit=100&select=story_id,comment,created_at,user_id,author:profiles(' + PF + ')'); }) : Promise.resolve([]); },
    commentCounts: function () { return req('/rest/v1/comments?hidden=eq.false&select=story_id&limit=5000').then(function (a) { var m = {}; (a || []).forEach(function (c) { m[c.story_id] = (m[c.story_id] || 0) + 1; }); return m; }); },
    people: function () { return req('/rest/v1/profiles?handle=not.is.null&order=created_at.desc&limit=100&select=' + PF); },
    myFollowing: function () { return uid() ? req('/rest/v1/follows?follower=eq.' + uid() + '&select=followee').then(function (a) { return a.map(function (x) { return x.followee; }); }) : Promise.resolve([]); },
    myReposts: function () { return req('/rest/v1/reposts?user_id=eq.' + uid() + '&select=story_id,comment,created_at'); },
    acceptGuidelines: function () { return req('/rest/v1/rpc/accept_guidelines', { method: 'POST', body: {} }); },
    reportSignal: function (sid, reason) { return req('/rest/v1/reports', { method: 'POST', body: { reporter: uid(), target_type: 'signal', target_id: String(sid), reason: reason } }); },
    deleteAccount: function () { return req('/rest/v1/rpc/delete_my_account', { method: 'POST', body: {} }).then(function () { setSess(null); }); }
  };

  /* ---------- Demo backend: same API on this device, seeded with sample members ---------- */
  function db() {
    var d = ls('vx.demo');
    if (!d) d = { me: null, users: {
      u1: { id: 'u1', name: 'Maya Okafor', handle: 'maya_policy' }, u2: { id: 'u2', name: 'Lars Nygaard', handle: 'arcticlars' }, u3: { id: 'u3', name: 'Priya Raman', handle: 'priya_minerals' } },
      follows: [['u1', 'u2'], ['u2', 'u1'], ['u3', 'u1'], ['u2', 'u3']], comments: [], reports: [], blocks: [], seq: 1 };
    return d;
  }
  function sv(d) { ls('vx.demo', d); }
  function seedReposts(d) {
    if (d.reposts) return; var it = (X() && X().S.items || []).slice(0, 6); if (!it.length) return;
    var cm = ['Worth reading before the comment window closes.', '', 'This is the number to watch for northern operators.', 'Quiet rule, big downstream effect.'];
    d.reposts = [['u1', 0, 0, 3], ['u2', 1, 2, 9], ['u1', 2, 3, 20], ['u3', 3, 1, 30]].map(function (x) { var i = it[x[1] % it.length]; return { user_id: x[0], story_id: i.id, comment: cm[x[2]], created_at: new Date(Date.now() - x[3] * 3600000).toISOString() }; });
    sv(d);
  }
  function myLocalReposts() { var r = X().S.reposts; return Object.keys(r).map(function (k) { return { story_id: k, comment: r[k].comment, created_at: r[k].createdAt, user_id: 'me' }; }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }); }
  function ok(v) { return Promise.resolve(v); }
  function seedComments(d, sid) {
    if (d.comments.some(function (c) { return c.story_id === sid; })) return;
    d.comments.push({ id: 'c' + d.seq++, story_id: sid, user_id: 'u1', body: 'Useful context. The comment deadline is the part to watch.', created_at: new Date(Date.now() - 5400000).toISOString() });
    d.comments.push({ id: 'c' + d.seq++, story_id: sid, user_id: 'u2', body: 'Shipping insurers will price this in before the rule is final.', created_at: new Date(Date.now() - 1800000).toISOString() });
  }
  var Demo = {
    me: function () { var d = db(); return ok(d.me ? d.users[d.me] : null); },
    signInEmail: function (e) { var d = db(); var id = 'me'; d.users[id] = d.users[id] || { id: id, name: e.split('@')[0], handle: e.split('@')[0].replace(/\W/g, '_').slice(0, 20), email: e }; d.me = id; sv(d); return ok(); },
    signUpEmail: function (e, p, name) { var d = db(); d.users.me = { id: 'me', name: name || e.split('@')[0], handle: e.split('@')[0].replace(/\W/g, '_').slice(0, 20), email: e, guidelines_accepted_at: new Date().toISOString(), visibility_mode: 'STEALTH' }; d.me = 'me'; sv(d); return ok({}); },
    signInGoogle: function () { var d = db(); d.users.me = d.users.me || { id: 'me', name: 'Ram Demo', handle: 'ram', email: 'demo@gmail.com' }; d.me = 'me'; sv(d); return ok(); },
    takeRedirect: function () { return ok(false); },
    signOut: function () { var d = db(); d.me = null; sv(d); return ok(); },
    updateProfile: function (p) { var d = db(); var u = d.users[d.me]; for (var k in p) u[k] = p[k]; sv(d); return ok(u); },
    profile: function (id) { return ok(db().users[id]); },
    counts: function (id) { var f = db().follows; return ok({ followers: f.filter(function (x) { return x[1] === id; }).length, following: f.filter(function (x) { return x[0] === id; }).length }); },
    isFollowing: function (id) { var d = db(); return ok(d.follows.some(function (x) { return x[0] === d.me && x[1] === id; })); },
    follow: function (id) { var d = db(); if (!d.follows.some(function (x) { return x[0] === d.me && x[1] === id; })) d.follows.push([d.me, id]); sv(d); return ok(); },
    unfollow: function (id) { var d = db(); d.follows = d.follows.filter(function (x) { return !(x[0] === d.me && x[1] === id); }); sv(d); return ok(); },
    followers: function (id) { var d = db(); return ok(d.follows.filter(function (x) { return x[1] === id; }).map(function (x) { return d.users[x[0]]; }).filter(Boolean)); },
    following: function (id) { var d = db(); return ok(d.follows.filter(function (x) { return x[0] === id; }).map(function (x) { return d.users[x[1]]; }).filter(Boolean)); },
    comments: function (sid) { var d = db(); return ok(d.comments.filter(function (c) { return c.story_id === sid && !c.hidden; }).map(function (c) { return { id: c.id, body: c.body, kind: c.kind, quote: c.quote, created_at: c.created_at, user_id: c.user_id, author: d.users[c.user_id] }; })); },
    addComment: function (sid, body, kind, quote) { var d = db(); d.comments.push({ id: 'c' + d.seq++, story_id: sid, user_id: d.me, body: body, kind: kind || 'comment', quote: quote || null, created_at: new Date().toISOString() }); sv(d); return ok(); },
    deleteComment: function (id) { var d = db(); d.comments = d.comments.filter(function (c) { return !(c.id === id && c.user_id === d.me); }); sv(d); return ok(); },
    report: function (type, id, reason) { var d = db(); d.reports.push({ type: type, id: id, reason: reason }); if (type === 'comment') d.comments.forEach(function (c) { if (c.id === id) c.hidden = true; }); sv(d); return ok(); },
    block: function (id) { var d = db(); if (d.blocks.indexOf(id) < 0) d.blocks.push(id); d.follows = d.follows.filter(function (x) { return !((x[0] === d.me && x[1] === id) || (x[1] === d.me && x[0] === id)); }); sv(d); return ok(); },
    unblock: function (id) { var d = db(); d.blocks = d.blocks.filter(function (x) { return x !== id; }); sv(d); return ok(); },
    blocked: function () { var d = db(); return ok(d.blocks.map(function (b) { return d.users[b]; }).filter(Boolean)); },
    userReposts: function (id) { var d = db(); return ok(id === d.me ? myLocalReposts() : (d.reposts || []).filter(function (r) { return r.user_id === id; })); },
    followingFeed: function () { var d = db(), f = d.follows.filter(function (x) { return x[0] === d.me; }).map(function (x) { return x[1]; });
      return ok((d.reposts || []).filter(function (r) { return f.indexOf(r.user_id) >= 0; }).map(function (r) { return { story_id: r.story_id, comment: r.comment, created_at: r.created_at, user_id: r.user_id, author: d.users[r.user_id] }; }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; })); },
    commentCounts: function () { var m = {}; db().comments.forEach(function (c) { if (!c.hidden) m[c.story_id] = (m[c.story_id] || 0) + 1; }); return ok(m); },
    people: function () { var d = db(); return ok(Object.keys(d.users).map(function (k) { return d.users[k]; })); },
    myFollowing: function () { var d = db(); return ok(d.follows.filter(function (x) { return x[0] === d.me; }).map(function (x) { return x[1]; })); },
    acceptGuidelines: function () { var d = db(); if (d.users[d.me]) d.users[d.me].guidelines_accepted_at = new Date().toISOString(); sv(d); return ok(); },
    reportSignal: function (sid, reason) { var d = db(); d.reports.push({ type: 'signal', id: sid, reason: reason }); sv(d); return ok(); },
    react: function () { return ok(); },
    save: function (sid, on) { var d = db(); d.saves = d.saves || []; if (on) { if (!d.saves.some(function (s) { return s.story_id === sid; })) d.saves.push({ story_id: sid, created_at: new Date().toISOString() }); } else d.saves = d.saves.filter(function (s) { return s.story_id !== sid; }); sv(d); return ok(); },
    mySaves: function () { return ok((db().saves || []).slice()); },
    myWatch: function () { return ok((db().watches || []).slice()); },
    upsertWatch: function (row) { var d = db(); d.watches = d.watches || []; d.watches = d.watches.filter(function (w) { return w.story_id !== row.storyId; }); d.watches.push({ story_id: row.storyId, hs_code: row.hs_code || null, eccn: row.eccn || null, jurisdiction: row.jurisdiction || null, created_at: row.createdAt || new Date().toISOString() }); sv(d); return ok(); },
    deleteWatch: function (sid) { var d = db(); d.watches = (d.watches || []).filter(function (w) { return w.story_id !== sid; }); sv(d); return ok(); },
    myViews: function () { return ok((db().views || []).slice()); },
    addView: function (name, filters) { var d = db(); d.views = d.views || []; d.views.push({ name: name, filters: filters, created_at: new Date().toISOString() }); sv(d); return ok(); },
    repost: function () { return ok(); }, myReposts: function () { return ok([]); },
    setVisibility: function (m) { var d = db(); if (d.users[d.me]) d.users[d.me].visibility_mode = m; sv(d); return ok(d.users[d.me]); },
    myTrackers: function () { return ok([]); }, tracking: function () { var d = db(); return ok(d.follows.filter(function (x) { return x[0] === d.me; }).map(function (x) { return d.users[x[1]]; }).filter(Boolean)); },
    userComments: function (id) { return ok(db().comments.filter(function (c) { return c.user_id === id && !c.hidden; })); }, trackingFeed: function () { return ok([]); },
    deleteAccount: function () { var d = db(); delete d.users.me; d.me = null; d.follows = d.follows.filter(function (x) { return x[0] !== 'me' && x[1] !== 'me'; }); d.comments = d.comments.filter(function (c) { return c.user_id !== 'me'; }); sv(d); return ok(); }
  };
  var B = LIVE ? Live : Demo;
  function demoSeed() { if (!LIVE) { var d = db(); seedReposts(d); } }

  /* ---------- state ---------- */
  var me = null, pendingAfterAuth = null, blockedIds = [], cache = {}, reported = ls('vx.reported') || {}, cmKind = 'comment', cacheT = {};
  function isPublic() { return !!(me && me.visibility_mode === 'PUBLIC'); }
  function syncMode() { var x = X(); if (!x || !x.S) return; var m = isPublic() ? 'PUBLIC' : 'STEALTH'; if (x.S.visibilityMode !== m) { x.S.visibilityMode = m; try { localStorage.setItem('vx.visibilityMode', JSON.stringify(m)); } catch (e) {} } }
  function refreshMe() { return B.me().then(function (m) { me = m; return B.blocked(); }).then(function (b) { blockedIds = (b || []).map(function (u) { return u && u.id; }); syncMode(); cache = {}; rerender(); }).catch(function () { syncMode(); }); }
  var ccount = {};
  function loadCounts() { return B.commentCounts().then(function (m) { ccount = m || {}; rerender(); }).catch(function () {}); }
  function headerSync() {
    var h = document.getElementById('sxHead'); if (!h) return;
    var person = '<svg class="sx-person" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 19.2a6.5 6.5 0 0 1 13 0"/></svg>';
    h.innerHTML = me ? '<button class="ct-btn sx-hb" data-sx="me" aria-label="Your profile">' + avatar(me) + '<span>Profile</span></button>' : '<button class="ct-btn sx-hb" data-sx="me" aria-label="Sign in">' + person + '<span>Sign in</span></button>';
  }
  function rerender() { headerSync(); var x = X(); if (!x) return; x.render(); x.refreshReader(); }
  function toast(m) { var x = X(); if (x) x.toast(m); }
  function sheet(h) { X().sheet('<div class="sx">' + h + '</div>'); }
  function closeSheet() { pendingAfterAuth = null; X().closeSheet(); }
  function avatar(u, big) { u = u || {}; var ini = String(u.name || u.handle || '?').trim().split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
    return u.avatar_url && /^https:\/\//.test(u.avatar_url) ? '<img class="sx-av' + (big ? ' big' : '') + '" src="' + esc(u.avatar_url) + '" alt="">' : '<span class="sx-av' + (big ? ' big' : '') + '" aria-hidden="true">' + esc(ini) + '</span>'; }
  function ago(iso) { var s = (Date.now() - new Date(iso)) / 1000; return s < 60 ? 'now' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : Math.floor(s / 86400) + 'd'; }
  function requireAuth(why, fn) {
    if (me) { if (fn) fn(); return; }
    pendingAfterAuth = typeof fn === 'function' ? fn : null;
    signInSheet(why || 'Sign in or create a free account.');
  }
  function need(fn) { requireAuth('Sign in to join the conversation', fn); }
  // Public actions need an account and Public mode. Stealth users are offered the switch, never posted silently.
  function needPublic(fn) { requireAuth('Sign in or create a free account to post publicly. Reading stays free without an account.', function () { if (isPublic()) fn(); else publicSheet(fn); }); }
  var NEVER = 'Never public, in any mode: Watchlists, Private Notes, Forward to Team, Helpful/Not Relevant, Ask history, and the analysts you track.';
  var EMPLOYER = 'If you use a company email, check your employer\u2019s policy before posting publicly.';
  var chev = '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>';

  /* ---------- screens ---------- */
  function signInSheet(why) {
    sheet('<h3>Sign in to Voxarc</h3><p>' + esc(why || 'Reading stays free without an account. Sign in to save signals and views, or to use Public mode.') + '</p>' +
      (GOOGLE ? '<button class="btn primary sx-g" data-sx="google"><span class="sx-gl" aria-hidden="true">G</span>Continue with Google</button><div class="sx-or"><span>or use email</span></div>' : '') +
      '<input id="sxName" class="sx-in" placeholder="Name (new accounts)" autocomplete="name" maxlength="60">' +
      '<input id="sxEmail" class="sx-in" type="email" placeholder="Email" autocomplete="email">' +
      '<input id="sxPw" class="sx-in" type="password" placeholder="Password (8+ characters)" autocomplete="current-password">' +
      '<div class="sx-2"><button class="btn primary" data-sx="emailin">Sign in</button><button class="btn ghost" data-sx="emailup">Create account</button></div>' +
      glBox('sxGl') + '<p class="sx-fine">Required to create an account. New accounts start in Stealth: nothing is public until you turn on Public mode. Reported comments are hidden for everyone while Voxarc Lab reviews them. Forgot your password? Email support@voxarc.io.' + (LIVE ? '' : '<br><b>Offline test mode:</b> accounts stay on this device.') + '</p>' +
      '<button class="btn ghost" data-closesheet>Not now</button>');
  }
  /* Public mode: one opt-in switch for public comments, public citations and the Tracked by analyst profile. */
  var pendingPublic = null;
  function publicSheet(after) {
    if (!me) return requireAuth('Sign in or create a free account to turn on Public mode. Reading stays free without an account.', function () { publicSheet(after); });
    pendingPublic = typeof after === 'function' ? after : null;
    if (isPublic()) {
      sheet('<h3>Public mode</h3><div class="vis-state"><span class="vis-dot on" aria-hidden="true"></span><div><b class="vis-b">On as @' + esc(me.handle) + '</b><span>Tracked by ' + (me.tracked_by_count || 0) + '</span></div></div>' +
        '<ul class="vis-list"><li>Public: your display name, handle and headline, the comments and citations you post, and how many people track you.</li><li>' + esc(NEVER) + '</li></ul>' +
        '<button class="btn ghost" data-sx="profile" data-id="' + esc(me.id) + '">View my analyst profile</button><button class="btn ghost" data-sx="edit">Edit public profile</button>' +
        '<button class="btn ghost" data-sx="gostealth">Switch to Stealth</button><button class="btn primary" data-closesheet>Done</button>');
      return;
    }
    var gl = !!me.guidelines_accepted_at;
    sheet('<h3>Turn on Public mode</h3><p class="vis-p">Post comments and citations on signals under your name, and let other analysts track your public profile. You can switch back to Stealth at any time, which hides all of it right away.</p>' +
      '<label class="sx-l">Display name<input id="sxPubN" class="sx-in" maxlength="60" value="' + esc(me.name || '') + '"></label>' +
      '<label class="sx-l">Public handle<input id="sxPubH" class="sx-in" maxlength="20" placeholder="letters, numbers, _" value="' + esc(me.handle || '') + '" autocapitalize="none"></label>' +
      '<label class="sx-l">Headline (optional)<input id="sxPubL" class="sx-in" maxlength="120" placeholder="e.g. Arctic shipping analyst" value="' + esc(me.headline || '') + '"></label>' +
      (gl ? '<p class="sx-fine">You agreed to the Community Guidelines. <a href="#" data-sx="glread">Read them again</a></p>' : glBox('sxPubG')) +
      '<ul class="vis-list"><li>' + esc(NEVER) + '</li><li>' + esc(EMPLOYER) + '</li></ul>' +
      '<button class="btn primary" data-sx="publicok">Turn on Public mode</button><button class="btn ghost" data-closesheet>Keep Stealth</button>');
  }
  function modeSheet() {
    var pub = isPublic();
    sheet('<h3>Visibility mode</h3><p class="vis-p">Stealth is the default. Public is opt-in and needs an account.</p>' +
      '<button class="vis-opt' + (pub ? '' : ' on') + '" data-sx="' + (pub ? 'gostealth' : 'noop') + '" aria-pressed="' + !pub + '"><b>Stealth Corporate Mode</b><span>Nothing you do in Voxarc Feed is published.</span></button>' +
      '<button class="vis-opt' + (pub ? ' on' : '') + '" data-sx="gopublic" aria-pressed="' + pub + '"><b>Public' + (pub && me ? ' \u00B7 @' + esc(me.handle) : '') + '</b><span>Public comments and citations under your name, and a public analyst profile others can track.</span></button>' +
      '<ul class="vis-list"><li>' + esc(NEVER) + '</li><li>' + esc(EMPLOYER) + '</li></ul><button class="btn primary" data-closesheet>Done</button>');
  }
  function stealthConfirm() {
    sheet('<h3>Switch to Stealth?</h3><p class="vis-p">Your public comments, citations and analyst profile are hidden from everyone right away. Nothing is deleted, and turning Public mode back on shows them again. People tracking you keep tracking you, but see nothing while you are in Stealth.</p>' +
      '<button class="btn primary" data-sx="stealthok">Switch to Stealth</button><button class="btn ghost" data-closesheet>Stay Public</button>');
  }
  function fresh(fn) { return function () { var args = arguments; if (!me) return fn.apply(null, args); B.me().then(function (m) { if (m) me = m; syncMode(); fn.apply(null, args); }).catch(function () { fn.apply(null, args); }); }; }
  function trackedSheet() {
    if (!me) { sheet('<h3>Tracked by</h3><div class="vis-state"><span class="vis-dot" aria-hidden="true"></span><div><b class="vis-b">Off</b><span>You are signed out, so nobody can track you.</span></div></div><p class="vis-p">With an account in Public mode you get a public analyst profile other readers can track. Whom you track always stays private.</p><button class="btn primary" data-sx="signin">Sign in or create account</button><button class="btn ghost" data-closesheet>Done</button>'); return; }
    var pub = isPublic();
    sheet('<h3>Tracked by</h3><div class="vis-state"><span class="vis-dot' + (pub ? ' on' : '') + '" aria-hidden="true"></span><div><b class="vis-b">' + (pub ? 'On \u00B7 tracked by ' + (me.tracked_by_count || 0) : 'Off') + '</b><span>' + (pub ? 'Your analyst profile @' + esc(me.handle) + ' is public. Readers can track it to follow your comments and citations.' : 'You are in Stealth, so your profile is hidden and nobody can track you.') + '</span></div></div>' +
      (pub ? '<button class="btn ghost" data-sx="trackers">See who tracks you</button><button class="btn ghost" data-sx="profile" data-id="' + esc(me.id) + '">View my analyst profile</button>' : '<button class="btn primary" data-sx="gopublic">Turn on Public mode</button>') +
      '<button class="btn ghost" data-sx="tracking">Analysts you track (private)</button><button class="btn ghost" data-sx="people">Find public analysts</button>' +
      '<p class="sx-fine">Whom you track is never shown to anyone, including the analysts you track, unless you are in Public mode yourself, in which case they can see that you track them.</p><button class="btn ghost" data-closesheet>Done</button>');
  }
  function annotateSheet(kind) {
    var c = kind === 'cite', pub = isPublic(), x = X(), nNotes = Object.keys((x && x.S.privateNotes) || {}).length;
    sheet('<h3>' + (c ? 'Cite &amp; Annotate' : 'Comment &amp; Annotate') + '</h3>' +
      '<div class="vis-state"><span class="vis-dot' + (pub ? ' on' : '') + '" aria-hidden="true"></span><div><b class="vis-b">Public ' + (c ? 'citations' : 'comments') + ': ' + (pub ? 'On as @' + esc(me.handle) : 'Off') + '</b><span>' + (pub ? (c ? 'Quote a passage from any signal and add your annotation. It appears under the signal with your display name.' : 'Comment on any signal. It appears under the signal with your display name.') : (me ? 'You are in Stealth. Turn on Public mode to post under your name.' : 'Sign in and turn on Public mode to post under your name.')) + '</span></div></div>' +
      (pub ? '<button class="btn primary" data-sx="myposts">My public comments and citations</button>' : '<button class="btn primary" data-sx="gopublic">Turn on Public mode</button>') +
      '<div class="vis-state"><span class="vis-dot on" aria-hidden="true"></span><div><b class="vis-b">' + nNotes + ' Private Note' + (nNotes === 1 ? '' : 's') + '</b><span>Private ' + (c ? 'citations' : 'notes') + ' stay on this device in every mode. Not team chat, never public.</span></div></div>' +
      '<button class="btn ghost" data-visnotes>Open ' + (c ? 'Private Desk' : 'Private Notes') + '</button>' + (nNotes ? '<button class="btn ghost" data-visclear="notes">Delete all Private Notes on this device</button>' : '') +
      '<button class="btn ghost" data-closesheet>Done</button>');
  }
  function citeSheet(id) {
    var i = X().byId(id); if (!i) return;
    var seed = noDash((i.signal && i.signal.crux) || i.summary || '').slice(0, 300);
    sheet('<h3>Cite &amp; Annotate publicly</h3><p class="vis-p">Quote the passage you are citing and add your annotation. It is posted under the signal as @' + esc(me.handle) + '.</p>' +
      '<label class="sx-l">Passage you are citing<textarea id="sxCq" class="sx-in" maxlength="400">' + esc(seed) + '</textarea></label>' +
      '<label class="sx-l">Your annotation<textarea id="sxCa" class="sx-in" maxlength="500" placeholder="Why it matters"></textarea></label>' +
      '<button class="btn primary" data-sx="citeok" data-id="' + esc(id) + '">Post citation publicly</button><button class="btn ghost" data-closesheet>Cancel</button>');
  }
  function postItemHTML(c, showSignal) {
    var a = c.author || {}, mine = me && c.user_id === me.id, i = showSignal ? X().byId(c.story_id) : null;
    return '<div class="sx-c">' + '<button class="sx-avb" data-sx="profile" data-id="' + esc(c.user_id) + '" aria-label="' + esc(a.name || 'Profile') + '">' + avatar(a) + '</button><div class="sx-cb"><div class="sx-ch">' +
      (a.handle ? '<button class="sx-nm" data-sx="profile" data-id="' + esc(c.user_id) + '"><b>' + esc(a.name || a.handle) + '</b> <span>@' + esc(a.handle) + ' \u00B7 ' + ago(c.created_at) + '</span></button>' : '<span>' + ago(c.created_at) + '</span>') +
      (mine ? '<button class="sx-more" data-sx="delcomment" data-id="' + esc(c.id) + '">Delete</button>' : '<button class="sx-more" data-sx="cmenu" data-id="' + esc(c.id) + '" data-u="' + esc(c.user_id) + '" data-h="' + esc(a.handle || '') + '" aria-label="Comment options">\u2022\u2022\u2022</button>') + '</div>' +
      (c.kind === 'cite' ? '<span class="sx-kind">Citation</span><blockquote class="sx-q">' + esc(noDash(c.quote)) + '</blockquote>' : '') +
      '<p>' + esc(noDash(c.body)) + '</p>' +
      (i ? '<button class="sx-rps" data-sx="openstory" data-id="' + esc(c.story_id) + '"><span class="sx-rpk">' + esc(i.kicker || 'Signal') + '</span><b>' + esc(noDash(i.signal ? i.signal.signal_title || i.title : i.title)) + '</b></button>' : '') + '</div></div>';
  }
  function visible(c) { return c && blockedIds.indexOf(c.user_id) < 0 && !reported['comment:' + c.id] && !reported['user:' + c.user_id]; }
  function profileSheet(id) {
    var mine = me && id === me.id;
    Promise.all([B.profile(id), mine ? Promise.resolve(false) : B.isFollowing(id), B.userComments(id)]).then(function (r) {
      var u = r[0];
      if (!u) { sheet('<h3>Profile not available</h3><p class="vis-p">This analyst is in Stealth or the account no longer exists.</p><button class="btn ghost" data-closesheet>Close</button>'); return; }
      var f = r[1], bl = blockedIds.indexOf(id) >= 0, posts = bl ? [] : (r[2] || []).map(function (c) { c.author = u; return c; });
      var pub = mine ? isPublic() : true;
      sheet('<div class="sx-ph">' + avatar(u, true) + '<div><b class="sx-name">' + esc(u.name) + '</b><span class="sx-handle">@' + esc(u.handle || '') + (mine ? ' \u00B7 ' + (pub ? 'Public' : 'Stealth') : '') + '</span>' + (u.headline ? '<span class="sx-headline">' + esc(u.headline) + '</span>' : '') + '</div></div>' +
        '<div class="sx-counts">' + (mine ? '<button data-sx="trackers"><b>' + (u.tracked_by_count || 0) + '</b>Tracked by</button><button data-sx="tracking"><b>\u2192</b>You track (private)</button>' : '<div><b>' + (u.tracked_by_count || 0) + '</b>Tracked by</div>') + '<div><b>' + posts.length + '</b>Public posts</div></div>' +
        (mine ? '<button class="btn primary" data-sx="gopublic">' + (pub ? 'Public mode settings' : 'Turn on Public mode') + '</button><button class="btn ghost" data-sx="tfeed">From analysts you track</button><button class="btn ghost" data-sx="people">Find public analysts</button><button class="btn ghost" data-sx="edit">Edit profile</button><button class="btn ghost" data-sx="blocked">Blocked accounts</button><button class="btn ghost" data-sx="signout">Sign out</button><button class="btn ghost sx-danger" data-sx="delete">Delete account</button>'
          : bl ? '<button class="btn ghost" data-sx="unblock" data-id="' + esc(id) + '">Unblock @' + esc(u.handle) + '</button>'
          : '<button class="btn ' + (f ? 'ghost' : 'primary') + '" data-sx="' + (f ? 'unfollow' : 'follow') + '" data-id="' + esc(id) + '">' + (f ? 'Tracking \u00B7 tap to stop' : 'Track analyst') + '</button><p class="sx-fine">Tracking is private. ' + (isPublic() ? 'Because you are in Public mode, @' + esc(u.handle) + ' can see that you track them.' : 'You are in Stealth, so you are counted but never named.') + '</p>' +
            '<div class="sx-2"><button class="btn ghost" data-sx="report" data-t="user" data-id="' + esc(id) + '">Report</button><button class="btn ghost sx-danger" data-sx="block" data-id="' + esc(id) + '" data-h="' + esc(u.handle) + '">Block</button></div>') +
        '<div class="sx-sec">' + (mine ? 'My public comments and citations<span>' + (pub ? 'Visible to everyone' : 'Hidden while in Stealth') + '</span>' : 'Public comments and citations') + '</div><div class="sx-list">' + (posts.map(function (c) { return postItemHTML(c, true); }).join('') || '<p class="sx-fine">No public posts yet.</p>') + '</div>' +
        '<button class="btn ghost" data-closesheet>Close</button>');
    }).catch(function () { toast('Could not load profile'); });
  }
  function personRow(u, tracked, ret) {
    return '<div class="sx-row sx-prow"><button class="sx-pl" data-sx="profile" data-id="' + esc(u.id) + '">' + avatar(u) + '<span><b>' + esc(u.name) + '</b><small>@' + esc(u.handle) + (u.headline ? ' \u00B7 ' + esc(u.headline) : '') + ' \u00B7 tracked by ' + (u.tracked_by_count || 0) + '</small></span></button>' +
      (ret ? '<button class="sx-fb' + (tracked ? '' : ' on') + '" data-sx="' + (tracked ? 'unfollow' : 'follow') + '" data-id="' + esc(u.id) + '" data-ret="' + ret + '">' + (tracked ? 'Tracking' : 'Track') + '</button>' : '') + '</div>';
  }
  function trackersSheet() {
    B.myTrackers().then(function (a) {
      a = (a || []).filter(function (u) { return u && blockedIds.indexOf(u.id) < 0; });
      var total = me.tracked_by_count || 0, hiddenN = Math.max(total - a.length, 0);
      sheet('<h3>Who tracks you</h3><p class="vis-p">' + total + ' tracking your analyst profile. Trackers in Public mode are listed; ' + hiddenN + ' in Stealth ' + (hiddenN === 1 ? 'is' : 'are') + ' counted but never named.</p><div class="sx-list">' + (a.map(function (u) { return personRow(u, false, null); }).join('') || '<p class="sx-fine">No public trackers yet.</p>') + '</div><button class="btn ghost" data-sx="profile" data-id="' + esc(me.id) + '">Back to profile</button>');
    }).catch(function (er) { toast(er.message); });
  }
  function trackingSheet() {
    B.tracking().then(function (a) {
      sheet('<h3>Analysts you track</h3><p class="vis-p">Private. Only you can see this list.</p><div class="sx-list">' + (a.map(function (u) { return personRow(u, true, 'tracking'); }).join('') || '<p class="sx-fine">You are not tracking anyone yet.</p>') + '</div><button class="btn ghost" data-sx="people">Find public analysts</button><button class="btn ghost" data-closesheet>Close</button>');
    }).catch(function (er) { toast(er.message); });
  }
  function editSheet() {
    sheet('<h3>Edit profile</h3><label class="sx-l">Display name<input id="sxPn" class="sx-in" maxlength="60" value="' + esc(me.name) + '"></label>' +
      '<label class="sx-l">Handle<input id="sxPh" class="sx-in" maxlength="20" value="' + esc(me.handle || '') + '" autocapitalize="none"></label>' +
      '<label class="sx-l">Headline (optional)<input id="sxPl" class="sx-in" maxlength="120" value="' + esc(me.headline || '') + '"></label>' +
      '<label class="sx-l">Avatar image URL (optional)<input id="sxPa" class="sx-in" value="' + esc(me.avatar_url || '') + '" placeholder="https://"></label>' +
      '<p class="sx-fine">' + (isPublic() ? 'Your name, handle, headline and avatar are public while Public mode is on.' : 'Private while you are in Stealth.') + '</p>' +
      '<button class="btn primary" data-sx="saveprofile">Save</button><button class="btn ghost" data-sx="profile" data-id="' + esc(me.id) + '">Cancel</button>');
  }
  function sigReportSheet(id) {
    sheet('<h3>Report inaccurate or misleading signal</h3><p>Signals are AI-assisted summaries of public sources. Tell Voxarc Lab what looks wrong and we will check it against the source within 24 hours.</p>' +
      '<div class="sx-reasons">' + SIG_REASONS.map(function (r, n) { return '<label class="sx-r"><input type="radio" name="sxSR" value="' + esc(r) + '"' + (n ? '' : ' checked') + '>' + esc(r) + '</label>'; }).join('') + '</div>' +
      '<textarea id="sxSRn" class="sx-in" maxlength="400" placeholder="What is wrong? (optional)" aria-label="Details"></textarea>' +
      '<button class="btn primary" data-sx="sigreportok" data-id="' + esc(id) + '">Send report</button><button class="btn ghost" data-closesheet>Cancel</button>');
  }
  function reportSheet(type, id) {
    sheet('<h3>Report ' + (type === 'user' ? 'this account' : 'this comment') + '</h3><p>Tell Voxarc Lab what is wrong. ' + (type === 'comment' ? 'The comment is hidden for everyone right away' : 'Their posts are hidden for you right away') + ' and Voxarc Lab reviews it within 24 hours. Urgent? Email support@voxarc.io.</p>' +
      '<div class="sx-reasons">' + REASONS.map(function (r, n) { return '<label class="sx-r"><input type="radio" name="sxR" value="' + esc(r) + '"' + (n ? '' : ' checked') + '>' + esc(r) + '</label>'; }).join('') + '</div>' +
      '<button class="btn primary" data-sx="reportok" data-t="' + type + '" data-id="' + esc(id) + '">Send report</button><button class="btn ghost" data-closesheet>Cancel</button>');
  }
  function blockSheet(id, h) {
    sheet('<h3>Block @' + esc(h) + '?</h3><p>You will no longer see each other\u2019s comments, citations or profile, and neither of you can track the other. They are not told. You can unblock them in Profile, Blocked accounts.</p>' +
      '<button class="btn primary sx-dangerbg" data-sx="blockok" data-id="' + esc(id) + '">Block</button><button class="btn ghost" data-closesheet>Cancel</button>');
  }
  function deleteSheet() {
    sheet('<h3>Delete your account?</h3><p>This permanently deletes your Voxarc account and everything tied to it: profile, public comments and citations, tracking, blocks, reactions and saves. It cannot be undone. Briefings and Private Notes saved on this device stay until you clear them.</p>' +
      '<p class="sx-fine">You can also request deletion on the web at ' + esc(C.deleteUrl || '') + ' or by emailing support@voxarc.io.</p>' +
      '<input id="sxDel" class="sx-in" placeholder="Type DELETE to confirm" autocapitalize="characters">' +
      '<button class="btn primary sx-dangerbg" data-sx="deleteok">Delete account permanently</button><button class="btn ghost" data-closesheet>Cancel</button>');
  }
  function peopleSheet() {
    Promise.all([B.people(), B.myFollowing()]).then(function (r) {
      var fl = r[1] || [], list = (r[0] || []).filter(function (u) { return u && u.handle && (!me || u.id !== me.id) && blockedIds.indexOf(u.id) < 0 && !reported['user:' + u.id]; });
      sheet('<h3>Public analysts</h3><p>Readers who turned on Public mode. Track them to follow their comments and citations. Tracking is private.</p><div class="sx-list">' + (list.map(function (u) { return personRow(u, fl.indexOf(u.id) >= 0, 'people'); }).join('') || '<p class="sx-fine">No public analysts yet. Turn on Public mode to be among the first.</p>') +
        '</div>' + (me ? '' : '<button class="btn primary" data-sx="signin">Sign in to track analysts</button>') + '<button class="btn ghost" data-closesheet>Close</button>');
    }).catch(function () { toast('Could not load analysts'); });
  }
  function trackingFeedSheet() {
    B.trackingFeed().then(function (a) {
      a = (a || []).filter(visible);
      sheet('<h3>From analysts you track</h3><p>Their latest public comments and citations.</p><div class="sx-list">' + (a.map(function (c) { return postItemHTML(c, true); }).join('') || '<p class="sx-fine">Nothing yet. Track analysts from their profile or from Find public analysts.</p>') + '</div><button class="btn ghost" data-closesheet>Close</button>');
    }).catch(function () { toast('Could not load posts'); });
  }
  function myPostsSheet() { profileSheet(me.id); }

  /* ---------- hooks used by app.js ---------- */
  function settingsHTML() {
    return '<div class="group-h">Account</div><div class="group">' + (me
      ? '<button class="cell" data-sx="profile" data-id="' + esc(me.id) + '">' + avatar(me) + '<div class="l">' + esc(me.name) + '<small>@' + esc(me.handle || 'no handle yet') + ' \u00B7 ' + (isPublic() ? 'Public analyst profile' : 'Stealth') + '</small></div>' + chev + '</button>' +
        '<button class="cell" data-sx="tfeed"><div class="l">From analysts you track<small>Their latest public comments and citations</small></div>' + chev + '</button>' +
        '<button class="cell" data-sx="people"><div class="l">Find public analysts<small>Readers who turned on Public mode</small></div>' + chev + '</button>' +
        '<button class="cell" data-sx="delete"><div class="l sx-danger">Delete account<small>Removes your account and all of its data</small></div></button>'
      : '<button class="cell" data-sx="signin"><div class="l">Sign in or create account<small>' + (GOOGLE ? 'Google or email' : 'Email') + '. Needed to save a signal, a watchlist item or a view, and for Public mode. Reading stays free without an account.</small></div>' + chev + '</button>') + '</div>';
  }
  function commentsHTML(i) {
    var id = i.id, list = cache[id];
    if (list === undefined || (list && Date.now() - (cacheT[id] || 0) > 45000)) { cacheT[id] = Date.now(); if (list === undefined) cache[id] = null; B.comments(id).then(function (a) { cache[id] = (a || []).filter(visible); ccount[id] = cache[id].length; var x = X(); if (x && x.S.current === id) x.refreshReader(); }).catch(function () { cache[id] = []; }); }
    var items = list || [], pub = isPublic();
    var h = '<section class="sx-cm" aria-label="Public comments and citations"><div class="sx-cmh"><h5>Public comments and citations</h5><span>' + (list === null ? 'Loading' : items.length) + '</span></div>';
    h += items.map(function (c) { return postItemHTML(c, false); }).join('');
    if (list && !items.length) h += '<p class="sx-fine">No public comments yet.</p>';
    if (!me) h += '<div class="sx-gate"><p>Reading stays free. Sign in and turn on Public mode to comment or cite under your name.</p><button class="btn ghost" data-sx="gopublic">Sign in to comment</button></div>';
    else if (!pub) h += '<div class="sx-gate"><p>You are in Stealth, so nothing you do here is public. Turn on Public mode to comment or cite under your name.</p><button class="btn ghost" data-sx="gopublic">Turn on Public mode</button></div>';
    else h += '<div class="sx-compose"><div class="sx-seg" role="group" aria-label="Post type"><button data-sx="cmkind" data-k="comment" aria-pressed="' + (cmKind === 'comment') + '" class="' + (cmKind === 'comment' ? 'on' : '') + '">Comment</button><button data-sx="cmkind" data-k="cite" aria-pressed="' + (cmKind === 'cite') + '" class="' + (cmKind === 'cite' ? 'on' : '') + '">Cite</button></div>' +
      (cmKind === 'cite' ? '<textarea id="sxQuote" class="sx-in" maxlength="400" placeholder="Passage you are citing" aria-label="Passage you are citing"></textarea>' : '') +
      '<textarea id="sxCm" class="sx-in" maxlength="500" placeholder="' + (cmKind === 'cite' ? 'Your annotation' : 'Add a public comment') + '" aria-label="' + (cmKind === 'cite' ? 'Your annotation' : 'Public comment') + '"></textarea>' +
      '<button class="btn primary" data-sx="post" data-id="' + esc(id) + '">Post publicly as @' + esc(me.handle) + '</button><p class="sx-fine">Follows the Community Guidelines. Others can report it. ' + esc(EMPLOYER) + '</p></div>';
    return h + '</section>';
  }
  function onReact(sid, kind) { if (me && LIVE) B.react(sid, kind).catch(function () {}); }
  function onSave(sid, on) { if (me) B.save(sid, on).catch(function () {}); }
  function onWatch(id, on, row) { if (!me) return; var p = on ? B.upsertWatch(row || { storyId: id }) : B.deleteWatch(id); if (p && p.catch) p.catch(function () {}); }
  function onView(name, filters) { if (me) B.addView(name, filters).catch(function () {}); }
  function pullAccount() {
    if (!me) return Promise.resolve();
    var x = X(); if (!x || !x.applyAccount) return Promise.resolve();
    return Promise.all([B.mySaves(), B.myWatch(), B.myViews()]).then(function (r) {
      x.applyAccount({ saves: r[0] || [], watches: r[1] || [], views: r[2] || [] });
    }).catch(function () {});
  }
  function onRepost(sid, r) { if (me && LIVE) B.repost(sid, r).then(function () { var x = X(); if (r && x.S.reposts[sid]) { x.S.reposts[sid].synced = true; x.S.reposts[sid].userId = me.id; x.saveReposts(); } }).catch(function () {}); }
  function syncReposts() {
    if (!me || !LIVE) return;
    var x = X(); B.myReposts().then(function (a) {
      (a || []).forEach(function (r) { if (!x.S.reposts[r.story_id]) x.S.reposts[r.story_id] = { v: 1, storyId: r.story_id, comment: r.comment, createdAt: r.created_at, userId: me.id, synced: true }; });
      Object.keys(x.S.reposts).forEach(function (k) { if (!x.S.reposts[k].synced) onRepost(k, x.S.reposts[k]); });
      x.saveReposts(); rerender();
    }).catch(function () {});
  }
  function afterAuth(msg) {
    var resume = pendingAfterAuth; pendingAfterAuth = null;
    X().closeSheet();
    return refreshMe().then(function () { return pullAccount(); }).then(function () {
      syncReposts();
      toast(msg || 'Signed in');
      if (resume) resume();
    });
  }
  function post(id, body, kind, quote) {
    body = noDash(body).trim(); quote = noDash(quote || '').trim();
    if (!body) return toast(kind === 'cite' ? 'Add your annotation' : 'Write a comment first');
    if (kind === 'cite' && !quote) return toast('Add the passage you are citing');
    return B.addComment(id, body.slice(0, 500), kind, quote.slice(0, 400)).then(function () { delete cache[id]; ccount[id] = (ccount[id] || 0) + 1; cmKind = 'comment'; closeSheet(); rerender(); toast(kind === 'cite' ? 'Citation posted publicly' : 'Comment posted publicly'); }).catch(function (er) { toast(er.message); });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-sx]'); if (!t) return;
    e.stopPropagation(); e.preventDefault();
    var a = t.dataset.sx, id = t.dataset.id, v = function (q) { var el = document.getElementById(q); return el ? el.value.trim() : ''; };
    if (a === 'noop') return;
    if (a === 'signin') return signInSheet();
    if (a === 'glread') { var gx = X(); if (gx && gx.openUrl) gx.openUrl(C.guidelinesUrl); else window.open(C.guidelinesUrl, '_blank'); return; }
    if (a === 'sigmenu') return sheet('<h3>Signal options</h3><button class="btn ghost" data-sx="sigreport" data-id="' + esc(id) + '">Report inaccurate or misleading signal</button><button class="btn ghost" data-closesheet>Cancel</button>');
    if (a === 'sigreport') return sigReportSheet(id);
    if (a === 'sigreportok') { var sr = document.querySelector('input[name="sxSR"]:checked'), note = noDash(v('sxSRn')).slice(0, 400);
      return B.reportSignal(id, (sr ? sr.value : 'Something else') + (note ? ': ' + note : '')).then(function () { closeSheet(); toast('Thanks. Voxarc Lab will check this signal against its source'); }).catch(function () { closeSheet(); var x = X(); if (x && x.mail) x.mail('Signal report ' + id); else toast('Could not send. Email support@voxarc.io'); }); }
    if (a === 'google' && !GOOGLE) return;
    if (a === 'google') return B.signInGoogle().then(function () { if (!LIVE) afterAuth('Signed in with Google'); }).catch(function (er) { toast(er.message); });
    if (a === 'emailin' || a === 'emailup') {
      var em = v('sxEmail'), pw = v('sxPw'), gl = document.getElementById('sxGl');
      if (a === 'emailup' && !(gl && gl.checked)) return toast('Tick the box to agree to the Community Guidelines');
      if (!/^\S+@\S+\.\S+$/.test(em) || pw.length < 8) return toast('Enter an email and a password of 8 or more characters');
      t.disabled = true;
      return (a === 'emailin' ? B.signInEmail(em, pw) : B.signUpEmail(em, pw, noDash(v('sxName')))).then(function () {
        return afterAuth(a === 'emailup' ? 'Account created. You are in Stealth' : 'Signed in');
      }).catch(function (er) { t.disabled = false; toast(/invalid login/i.test(er.message || '') ? 'Wrong email or password' : (er.message || 'Sign in failed')); });
    }
    if (a === 'gopublic') { if (isPublic()) return publicSheet(); return publicSheet(); }
    if (a === 'publicok') {
      var nm = noDash(v('sxPubN')).slice(0, 60), hd = v('sxPubH').replace(/[^\w]/g, '').toLowerCase().slice(0, 20), hl = noDash(v('sxPubL')).slice(0, 120), g = document.getElementById('sxPubG');
      if (!nm) return toast('Add a display name');
      if (hd.length < 3) return toast('Handle needs 3 or more letters, numbers or _');
      if (g && !g.checked) return toast('Tick the box to agree to the Community Guidelines');
      var resumeP = pendingPublic; pendingPublic = null; t.disabled = true;
      return (me.guidelines_accepted_at ? Promise.resolve() : B.acceptGuidelines()).then(function () { return B.updateProfile({ name: nm, handle: hd, headline: hl || null }); })
        .then(function () { return B.setVisibility('PUBLIC'); }).then(refreshMe).then(function () { closeSheet(); toast('Public mode is on as @' + hd); if (resumeP) resumeP(); })
        .catch(function (er) { t.disabled = false; toast(/duplicate|unique/i.test(er.message) ? 'That handle is taken' : er.message); });
    }
    if (a === 'gostealth') return stealthConfirm();
    if (a === 'stealthok') return B.setVisibility('STEALTH').then(refreshMe).then(function () { closeSheet(); toast('Stealth is on. Nothing you do is public'); }).catch(function (er) { toast(er.message); });
    if (a === 'trackers') return fresh(trackersSheet)();
    if (a === 'tracking') return need(trackingSheet);
    if (a === 'tfeed') return need(trackingFeedSheet);
    if (a === 'myposts') return myPostsSheet();
    if (a === 'cmkind') { cmKind = t.dataset.k === 'cite' ? 'cite' : 'comment'; var x0 = X(); if (x0) x0.refreshReader(); return; }
    if (a === 'citeok') return post(id, v('sxCa'), 'cite', v('sxCq'));
    if (a === 'profile') return profileSheet(id);
    if (a === 'people') return peopleSheet();
    if (a === 'me') return me ? profileSheet(me.id) : signInSheet();
    if (a === 'openstory') return X().openArticle(id);
    if (a === 'edit') return editSheet();
    if (a === 'saveprofile') { var h = v('sxPh').replace(/[^\w]/g, '').slice(0, 20); if (h.length < 3) return toast('Handle needs 3 or more letters or numbers');
      return B.updateProfile({ name: noDash(v('sxPn')).slice(0, 60), handle: h.toLowerCase(), headline: noDash(v('sxPl')).slice(0, 120) || null, avatar_url: /^https:\/\//.test(v('sxPa')) ? v('sxPa') : null }).then(function () { return refreshMe(); }).then(function () { toast('Profile saved'); profileSheet(me.id); }).catch(function (er) { toast(/duplicate|unique/i.test(er.message) ? 'That handle is taken' : er.message); }); }
    if (a === 'follow' || a === 'unfollow') return need(function () { B[a](id).then(function () { return refreshMe(); }).then(function () { toast(a === 'follow' ? 'Tracking. Only you can see whom you track' : 'Stopped tracking'); if (t.dataset.ret === 'people') peopleSheet(); else if (t.dataset.ret === 'tracking') trackingSheet(); else profileSheet(id); }).catch(function (er) { toast(er.message); }); });
    if (a === 'report') return need(function () { reportSheet(t.dataset.t, id); });
    if (a === 'reportok') { var rs = document.querySelector('input[name="sxR"]:checked'); return B.report(t.dataset.t, id, rs ? rs.value : 'Other').then(function () { reported[t.dataset.t + ':' + id] = 1; ls('vx.reported', reported); cache = {}; closeSheet(); toast('Report sent. Voxarc Lab reviews it within 24 hours'); rerender(); }).catch(function (er) { toast(er.message); }); }
    if (a === 'cmenu') return need(function () { sheet('<h3>@' + esc(t.dataset.h) + '</h3><button class="btn ghost" data-sx="report" data-t="comment" data-id="' + esc(id) + '">Report comment</button><button class="btn ghost" data-sx="report" data-t="user" data-id="' + esc(t.dataset.u) + '">Report account</button><button class="btn ghost sx-danger" data-sx="block" data-id="' + esc(t.dataset.u) + '" data-h="' + esc(t.dataset.h) + '">Block @' + esc(t.dataset.h) + '</button><button class="btn ghost" data-closesheet>Cancel</button>'); });
    if (a === 'block') return need(function () { blockSheet(id, t.dataset.h); });
    if (a === 'blockok') return B.block(id).then(refreshMe).then(function () { closeSheet(); toast('Blocked'); }).catch(function (er) { toast(er.message); });
    if (a === 'unblock') return B.unblock(id).then(refreshMe).then(function () { toast('Unblocked'); profileSheet(id); });
    if (a === 'blocked') return B.blocked().then(function (l) { sheet('<h3>Blocked accounts</h3><div class="sx-list">' + ((l || []).filter(Boolean).map(function (u) { return '<button class="sx-row" data-sx="unblock" data-id="' + esc(u.id) + '">' + avatar(u) + '<span><b>' + esc(u.name) + '</b><small>@' + esc(u.handle) + ' \u00B7 tap to unblock</small></span></button>'; }).join('') || '<p class="sx-fine">You have not blocked anyone.</p>') + '</div><button class="btn ghost" data-sx="profile" data-id="' + esc(me.id) + '">Back</button>'); });
    if (a === 'signout') return B.signOut().then(function () { me = null; cache = {}; syncMode(); closeSheet(); rerender(); toast('Signed out'); });
    if (a === 'delete') return need(deleteSheet);
    if (a === 'deleteok') { if (v('sxDel').toUpperCase() !== 'DELETE') return toast('Type DELETE to confirm'); return B.deleteAccount().then(function () { me = null; cache = {}; syncMode(); var x = X(); Object.keys(x.S.reposts).forEach(function (k) { x.S.reposts[k].synced = false; }); x.saveReposts(); closeSheet(); rerender(); toast('Your account was deleted'); }).catch(function (er) { toast(er.message); }); }
    if (a === 'post') { var kd = cmKind; return needPublic(function () { post(id, v('sxCm'), kd, v('sxQuote')); }); }
    if (a === 'delcomment') return sheet('<h3>Delete this post?</h3><p class="vis-p">It is removed for everyone. This cannot be undone.</p><button class="btn primary sx-dangerbg" data-sx="delcommentok" data-id="' + esc(id) + '">Delete</button><button class="btn ghost" data-closesheet>Cancel</button>');
    if (a === 'delcommentok') return B.deleteComment(id).then(function () { cache = {}; closeSheet(); rerender(); toast('Deleted'); }).catch(function (er) { toast(er.message); });
  }, true);

  // OAuth return: web reads the URL hash; Android gets io.voxarc.app://auth-callback#access_token=... through appUrlOpen.
  if (LIVE) {
    if (/access_token=/.test(location.hash)) B.takeRedirect(location.hash).then(function () { history.replaceState(null, '', location.pathname); afterAuth('Signed in with Google'); });
    if (isNative && P.App) P.App.addListener('appUrlOpen', function (ev) { if (ev && /auth-callback/.test(ev.url || '')) { if (P.Browser) P.Browser.close().catch(function () {}); B.takeRedirect(ev.url).then(function (okk) { if (okk) afterAuth('Signed in with Google'); }); } });
  }
  window.VXSocial = { count: function (id) { return ccount[id] || 0; }, settingsHTML: settingsHTML, commentsHTML: commentsHTML, onReact: onReact, onSave: onSave, onWatch: onWatch, onView: onView, pullAccount: pullAccount, onRepost: onRepost, live: LIVE, user: function () { return me; }, requireAuth: requireAuth,
    isPublic: isPublic, publicSheet: publicSheet, modeSheet: fresh(modeSheet), trackedSheet: fresh(trackedSheet), annotateSheet: fresh(annotateSheet),
    cite: function (id) { needPublic(function () { citeSheet(id); }); },
    postFromShare: function (id, note) { needPublic(function () { if (!note) { cmKind = 'comment'; var x = X(); x.closeSheet(); x.openArticle(id); return toast('Write your public comment under the signal'); } post(id, note, 'comment'); }); } };
  setTimeout(function () { headerSync(); refreshMe().then(function () { syncReposts(); return pullAccount(); }); loadCounts(); }, 0);
})();
