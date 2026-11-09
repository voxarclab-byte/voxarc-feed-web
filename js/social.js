/* Voxarc Feed accounts and social layer (1.2.0). Backend: Supabase (Auth + Postgres with row level security).
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
      return r.text().then(function (t) { var j = t ? JSON.parse(t) : null; if (!r.ok) throw new Error((j && (j.msg || j.message || j.error_description)) || 'Request failed'); return o.raw ? { j: j, r: r } : j; });
    });
  }
  function setSess(s) { sess = s ? { access_token: s.access_token, refresh_token: s.refresh_token, user: s.user || (sess && sess.user) } : null; ls('vx.session', sess); }
  function refresh() { return fetch(C.url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: C.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: sess.refresh_token }) }).then(function (r) { return r.json(); }).then(function (j) { if (j.access_token) setSess(j); else setSess(null); }); }
  function uid() { return sess && sess.user ? sess.user.id : null; }
  function cnt(path) { return req(path, { headers: { Prefer: 'count=exact', Range: '0-0' }, raw: true }).then(function (x) { var m = /\/(\d+)$/.exec(x.r.headers.get('content-range') || ''); return m ? +m[1] : 0; }); }
  var PF = 'id,name,handle,avatar_url';
  var Live = {
    me: function () { return uid() ? req('/rest/v1/profiles?id=eq.' + uid() + '&select=' + PF + ',guidelines_accepted_at').then(function (a) { return a[0] || { id: uid(), name: '', handle: '' }; }) : Promise.resolve(null); },
    signInEmail: function (e, p) { return req('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: e, password: p } }).then(setSess); },
    signUpEmail: function (e, p, name) { return req('/auth/v1/signup', { method: 'POST', body: { email: e, password: p, data: { name: name, guidelines_accepted: new Date().toISOString() } } }).then(function (j) { if (j && j.access_token) setSess(j); return j; }); },
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
    updateProfile: function (p) { p.id = uid(); return req('/rest/v1/profiles', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: p }).then(function (a) { return a[0]; }); },
    profile: function (id) { return req('/rest/v1/profiles?id=eq.' + id + '&select=' + PF).then(function (a) { return a[0]; }); },
    counts: function (id) { return Promise.all([cnt('/rest/v1/follows?followee=eq.' + id + '&select=follower'), cnt('/rest/v1/follows?follower=eq.' + id + '&select=followee')]).then(function (a) { return { followers: a[0], following: a[1] }; }); },
    isFollowing: function (id) { return uid() ? req('/rest/v1/follows?follower=eq.' + uid() + '&followee=eq.' + id + '&select=followee').then(function (a) { return a.length > 0; }) : Promise.resolve(false); },
    follow: function (id) { return req('/rest/v1/follows', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: { follower: uid(), followee: id } }); },
    unfollow: function (id) { return req('/rest/v1/follows?follower=eq.' + uid() + '&followee=eq.' + id, { method: 'DELETE' }); },
    followers: function (id) { return req('/rest/v1/follows?followee=eq.' + id + '&select=p:profiles!follows_follower_fkey(' + PF + ')').then(function (a) { return a.map(function (x) { return x.p; }); }); },
    following: function (id) { return req('/rest/v1/follows?follower=eq.' + id + '&select=p:profiles!follows_followee_fkey(' + PF + ')').then(function (a) { return a.map(function (x) { return x.p; }); }); },
    comments: function (sid) { return req('/rest/v1/comments?story_id=eq.' + encodeURIComponent(sid) + '&hidden=eq.false&order=created_at.asc&select=id,body,created_at,user_id,author:profiles(' + PF + ')'); },
    addComment: function (sid, body) { return req('/rest/v1/comments', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { story_id: sid, user_id: uid(), body: body } }); },
    deleteComment: function (id) { return req('/rest/v1/comments?id=eq.' + id + '&user_id=eq.' + uid(), { method: 'DELETE' }); },
    report: function (type, id, reason) { return req('/rest/v1/reports', { method: 'POST', body: { reporter: uid(), target_type: type, target_id: String(id), reason: reason } }); },
    block: function (id) { return req('/rest/v1/blocks', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: { blocker: uid(), blocked: id } }); },
    unblock: function (id) { return req('/rest/v1/blocks?blocker=eq.' + uid() + '&blocked=eq.' + id, { method: 'DELETE' }); },
    blocked: function () { return uid() ? req('/rest/v1/blocks?blocker=eq.' + uid() + '&select=p:profiles!blocks_blocked_fkey(' + PF + ')').then(function (a) { return a.map(function (x) { return x.p; }); }) : Promise.resolve([]); },
    react: function (sid, kind) { return kind ? req('/rest/v1/reactions', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: { user_id: uid(), story_id: sid, kind: kind } }) : req('/rest/v1/reactions?user_id=eq.' + uid() + '&story_id=eq.' + encodeURIComponent(sid), { method: 'DELETE' }); },
    save: function (sid, on) { return on ? req('/rest/v1/saves', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: { user_id: uid(), story_id: sid } }) : req('/rest/v1/saves?user_id=eq.' + uid() + '&story_id=eq.' + encodeURIComponent(sid), { method: 'DELETE' }); },
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
    signUpEmail: function (e, p, name) { var d = db(); d.users.me = { id: 'me', name: name || e.split('@')[0], handle: e.split('@')[0].replace(/\W/g, '_').slice(0, 20), email: e, guidelines_accepted_at: new Date().toISOString() }; d.me = 'me'; sv(d); return ok({}); },
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
    comments: function (sid) { var d = db(); seedComments(d, sid); sv(d); return ok(d.comments.filter(function (c) { return c.story_id === sid && !c.hidden; }).map(function (c) { return { id: c.id, body: c.body, created_at: c.created_at, user_id: c.user_id, author: d.users[c.user_id] }; })); },
    addComment: function (sid, body) { var d = db(); d.comments.push({ id: 'c' + d.seq++, story_id: sid, user_id: d.me, body: body, created_at: new Date().toISOString() }); sv(d); return ok(); },
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
    react: function () { return ok(); }, save: function () { return ok(); }, repost: function () { return ok(); }, myReposts: function () { return ok([]); },
    deleteAccount: function () { var d = db(); delete d.users.me; d.me = null; d.follows = d.follows.filter(function (x) { return x[0] !== 'me' && x[1] !== 'me'; }); d.comments = d.comments.filter(function (c) { return c.user_id !== 'me'; }); sv(d); return ok(); }
  };
  var B = LIVE ? Live : Demo;
  function demoSeed() { if (!LIVE) { var d = db(); seedReposts(d); } }

  /* ---------- state ---------- */
  var me = null, blockedIds = [], cache = {}, reported = ls('vx.reported') || {};
  function refreshMe() { return B.me().then(function (m) { me = m; return B.blocked(); }).then(function (b) { blockedIds = (b || []).map(function (u) { return u && u.id; }); rerender(); }).catch(function () {}); }
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
  function closeSheet() { X().closeSheet(); }
  function avatar(u, big) { u = u || {}; var ini = String(u.name || u.handle || '?').trim().split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
    return u.avatar_url && /^https:\/\//.test(u.avatar_url) ? '<img class="sx-av' + (big ? ' big' : '') + '" src="' + esc(u.avatar_url) + '" alt="">' : '<span class="sx-av' + (big ? ' big' : '') + '" aria-hidden="true">' + esc(ini) + '</span>'; }
  function ago(iso) { var s = (Date.now() - new Date(iso)) / 1000; return s < 60 ? 'now' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : Math.floor(s / 86400) + 'd'; }
  function need(fn) { if (me) return fn(); signInSheet('Sign in to join the conversation'); }

  /* ---------- screens ---------- */
  function signInSheet(why) {
    sheet('<h3>Sign in to Voxarc</h3><p>' + esc(why || 'Reading, local Watch and Private Notes work without an account. Sign in to sync Watch/Notes across devices and (when enabled) join optional public analyst features.') + '</p>' +
      (GOOGLE ? '<button class="btn primary sx-g" data-sx="google"><span class="sx-gl" aria-hidden="true">G</span>Continue with Google</button><div class="sx-or"><span>or use email</span></div>' : '') +
      '<input id="sxName" class="sx-in" placeholder="Name (new accounts)" autocomplete="name" maxlength="60">' +
      '<input id="sxEmail" class="sx-in" type="email" placeholder="Email" autocomplete="email">' +
      '<input id="sxPw" class="sx-in" type="password" placeholder="Password (8+ characters)" autocomplete="current-password">' +
      '<div class="sx-2"><button class="btn primary" data-sx="emailin">Sign in</button><button class="btn ghost" data-sx="emailup">Create account</button></div>' +
      glBox('sxGl') + '<p class="sx-fine">Required to create an account. Reported comments are hidden for everyone while Voxarc Lab reviews them. Support: support@voxarc.io' + (LIVE ? '' : '<br><b>Demo mode:</b> accounts stay on this device until the backend is connected.') + '</p>' +
      '<button class="btn ghost" data-closesheet>Not now</button>');
  }
  function profileSheet(id) {
    var mine = me && id === me.id;
    demoSeed();
    Promise.all([B.profile(id), B.counts(id), mine ? Promise.resolve(false) : B.isFollowing(id), B.userReposts(id)]).then(function (r) {
      var u = r[0] || {}, c = r[1], f = r[2], bl = blockedIds.indexOf(id) >= 0, reps = bl ? [] : (r[3] || []);
      sheet('<div class="sx-ph">' + avatar(u, true) + '<div><b class="sx-name">' + esc(u.name) + '</b><span class="sx-handle">@' + esc(u.handle) + '</span></div></div>' +
        '<div class="sx-counts"><button data-sx="list" data-k="followers" data-id="' + esc(id) + '"><b>' + c.followers + '</b>Followers</button><button data-sx="list" data-k="following" data-id="' + esc(id) + '"><b>' + c.following + '</b>Following</button><div><b>' + reps.length + '</b>Reposts</div></div>' +
        (mine ? '<button class="btn primary" data-sx="ffeed">Following feed</button><button class="btn ghost" data-sx="people">Find peers</button><button class="btn ghost" data-sx="edit">Edit profile</button><button class="btn ghost" data-sx="blocked">Blocked accounts</button><button class="btn ghost" data-sx="signout">Sign out</button><button class="btn ghost sx-danger" data-sx="delete">Delete account</button>'
          : bl ? '<button class="btn ghost" data-sx="unblock" data-id="' + esc(id) + '">Unblock @' + esc(u.handle) + '</button>'
          : '<button class="btn ' + (f ? 'ghost' : 'primary') + '" data-sx="' + (f ? 'unfollow' : 'follow') + '" data-id="' + esc(id) + '">' + (f ? 'Following' : 'Follow') + '</button>' +
            '<div class="sx-2"><button class="btn ghost" data-sx="report" data-t="user" data-id="' + esc(id) + '">Report</button><button class="btn ghost sx-danger" data-sx="block" data-id="' + esc(id) + '" data-h="' + esc(u.handle) + '">Block</button></div>') +
        '<div class="sx-sec">' + (mine ? 'My Reposts<span>Public on your profile</span>' : 'Reposts') + '</div><div class="sx-list">' + (reps.map(function (x) { return repostItemHTML(x, false); }).join('') || '<p class="sx-fine">No reposts yet.</p>') + '</div>' +
        '<button class="btn ghost" data-closesheet>Close</button>');
    }).catch(function () { toast('Could not load profile'); });
  }
  function listSheet(id, k) {
    B[k](id).then(function (a) {
      a = (a || []).filter(function (u) { return u && blockedIds.indexOf(u.id) < 0; });
      sheet('<h3>' + (k === 'followers' ? 'Followers' : 'Following') + '</h3><div class="sx-list">' + (a.length ? a.map(function (u) { return '<button class="sx-row" data-sx="profile" data-id="' + esc(u.id) + '">' + avatar(u) + '<span><b>' + esc(u.name) + '</b><small>@' + esc(u.handle) + '</small></span></button>'; }).join('') : '<p class="sx-fine">Nobody here yet.</p>') +
        '</div><button class="btn ghost" data-sx="profile" data-id="' + esc(id) + '">Back to profile</button>');
    });
  }
  function editSheet() {
    sheet('<h3>Edit profile</h3><label class="sx-l">Name<input id="sxPn" class="sx-in" maxlength="60" value="' + esc(me.name) + '"></label>' +
      '<label class="sx-l">Handle<input id="sxPh" class="sx-in" maxlength="20" value="' + esc(me.handle) + '"></label>' +
      '<label class="sx-l">Avatar image URL (optional)<input id="sxPa" class="sx-in" value="' + esc(me.avatar_url || '') + '" placeholder="https://"></label>' +
      '<button class="btn primary" data-sx="saveprofile">Save</button><button class="btn ghost" data-sx="profile" data-id="' + esc(me.id) + '">Cancel</button>');
  }
  function glSheet(sid) {
    // Part D: public comments off. Guidelines sheet retained for account flows that still reference acceptance.
    sheet('<h3>Community Guidelines</h3><p>Public comments are off in this build. Private Note is the annotation path (device-local until sign-in; then account-private via RLS).</p>' + glBox('sxGl2') +
      '<button class="btn primary" data-sx="glok" data-id="' + esc(sid) + '">Agree</button><button class="btn ghost" data-closesheet>Cancel</button>');
  }
  function sigReportSheet(id) {
    sheet('<h3>Report inaccurate or misleading signal</h3><p>Signals are AI-assisted summaries of public sources. Tell Voxarc Lab what looks wrong and we will check it against the source within 24 hours.</p>' +
      '<div class="sx-reasons">' + SIG_REASONS.map(function (r, n) { return '<label class="sx-r"><input type="radio" name="sxSR" value="' + esc(r) + '"' + (n ? '' : ' checked') + '>' + esc(r) + '</label>'; }).join('') + '</div>' +
      '<textarea id="sxSRn" class="sx-in" maxlength="400" placeholder="What is wrong? (optional)" aria-label="Details"></textarea>' +
      '<button class="btn primary" data-sx="sigreportok" data-id="' + esc(id) + '">Send report</button><button class="btn ghost" data-closesheet>Cancel</button>');
  }
  function reportSheet(type, id) {
    sheet('<h3>Report ' + (type === 'user' ? 'this account' : 'this comment') + '</h3><p>Tell Voxarc Lab what is wrong. ' + (type === 'comment' ? 'The comment is hidden for everyone right away' : 'Their comments are hidden for you right away') + ' and Voxarc Lab reviews it within 24 hours.</p>' +
      '<div class="sx-reasons">' + REASONS.map(function (r, n) { return '<label class="sx-r"><input type="radio" name="sxR" value="' + esc(r) + '"' + (n ? '' : ' checked') + '>' + esc(r) + '</label>'; }).join('') + '</div>' +
      '<button class="btn primary" data-sx="reportok" data-t="' + type + '" data-id="' + esc(id) + '">Send report</button><button class="btn ghost" data-closesheet>Cancel</button>');
  }
  function blockSheet(id, h) {
    sheet('<h3>Block @' + esc(h) + '?</h3><p>They will not be able to follow you, and you will no longer see their comments or profile. They are not told. You can unblock them in Profile, Blocked accounts.</p>' +
      '<button class="btn primary sx-dangerbg" data-sx="blockok" data-id="' + esc(id) + '">Block</button><button class="btn ghost" data-closesheet>Cancel</button>');
  }
  function deleteSheet() {
    sheet('<h3>Delete your account?</h3><p>This permanently deletes your Voxarc account and everything tied to it: profile, comments, follows, reactions, saves and reposts. It cannot be undone. Briefings saved on this device stay until you clear them.</p>' +
      '<p class="sx-fine">You can also request deletion on the web at ' + esc(C.deleteUrl || '') + ' or by emailing support@voxarc.io.</p>' +
      '<input id="sxDel" class="sx-in" placeholder="Type DELETE to confirm" autocapitalize="characters">' +
      '<button class="btn primary sx-dangerbg" data-sx="deleteok">Delete account permanently</button><button class="btn ghost" data-closesheet>Cancel</button>');
  }

  function repostItemHTML(r, showAuthor) {
    var i = X().byId(r.story_id), a = r.author || {}; if (!i) return '';
    var title = i.signal ? i.signal.signal_title : i.title, crux = i.signal && i.signal.crux ? i.signal.crux : (i.summary || '');
    return '<div class="sx-rp">' + (showAuthor ? '<button class="sx-rpa" data-sx="profile" data-id="' + esc(r.user_id) + '">' + avatar(a) + '<span><b>' + esc(a.name) + '</b> reposted \u00B7 ' + ago(r.created_at) + '</span></button>' : '<div class="sx-rpt">Reposted \u00B7 ' + ago(r.created_at) + '</div>') +
      (r.comment ? '<p class="sx-rpc">' + esc(noDash(r.comment)) + '</p>' : '') +
      '<button class="sx-rps" data-sx="openstory" data-id="' + esc(r.story_id) + '"><span class="sx-rpk">' + esc(i.kicker || 'Signal') + '</span><b>' + esc(noDash(title)) + '</b><small>' + esc(noDash(crux).slice(0, 160)) + '</small></button></div>';
  }
  function peopleSheet() {
    Promise.all([B.people(), B.myFollowing()]).then(function (r) {
      var fl = r[1] || [], list = (r[0] || []).filter(function (u) { return u && u.handle && (!me || u.id !== me.id) && blockedIds.indexOf(u.id) < 0 && !reported['user:' + u.id]; });
      sheet('<h3>Find peers</h3><p>Analysts, buyers and readers on Voxarc. Follow them to see the signals they share.</p><div class="sx-list">' + (list.map(function (u) { var f = fl.indexOf(u.id) >= 0;
        return '<div class="sx-row sx-prow"><button class="sx-pl" data-sx="profile" data-id="' + esc(u.id) + '">' + avatar(u) + '<span><b>' + esc(u.name) + '</b><small>@' + esc(u.handle) + '</small></span></button>' +
          '<button class="sx-fb' + (f ? '' : ' on') + '" data-sx="' + (f ? 'unfollow' : 'follow') + '" data-id="' + esc(u.id) + '" data-ret="people">' + (f ? 'Following' : 'Follow') + '</button></div>'; }).join('') || '<p class="sx-fine">No one to show yet. Be the first to sign up and comment.</p>') +
        '</div>' + (me ? '' : '<button class="btn primary" data-sx="signin">Sign in to follow people</button>') + '<button class="btn ghost" data-closesheet>Close</button>');
    }).catch(function () { toast('Could not load people'); });
  }
  function followingFeedSheet() {
    B.followingFeed().then(function (a) {
      a = (a || []).filter(function (r) { return blockedIds.indexOf(r.user_id) < 0 && !reported['user:' + r.user_id]; });
      sheet('<h3>Following</h3><p>Reposts from people you follow.</p><div class="sx-list">' + (a.map(function (r) { return repostItemHTML(r, true); }).join('') || '<p class="sx-fine">No reposts yet. Follow people from the comments on any signal.</p>') + '</div><button class="btn ghost" data-closesheet>Close</button>');
    }).catch(function () { toast('Could not load the Following feed'); });
  }

  /* ---------- hooks used by app.js ---------- */
  function settingsHTML() {
    // Part E ship order: public follow/people stay off until CFG.flags.publicSocial
    var pub = !!(window.__vx && window.__vx.CFG && window.__vx.CFG.flags && window.__vx.CFG.flags.publicSocial);
    var peers = pub ? '<button class="cell" data-sx="people"><div class="l">Find peers<small>Analysts and buyers who discuss signals</small></div><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></button>' : '';
    var ffeed = pub ? '<button class="cell" data-sx="ffeed"><div class="l">Following feed<small>Reposts from people you follow</small></div><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></button>' : '';
    return '<div class="group-h">Account</div><div class="group">' + (me
      ? '<button class="cell" data-sx="profile" data-id="' + esc(me.id) + '">' + avatar(me) + '<div class="l">' + esc(me.name) + '<small>@' + esc(me.handle) + ' \u00B7 Profile and blocked accounts</small></div><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></button>' +
        ffeed + peers + '<button class="cell" data-sx="delete"><div class="l sx-danger">Delete account<small>Removes your account and all of its data</small></div></button>'
      : '<button class="cell" data-sx="signin"><div class="l">Sign in or create account<small>' + (GOOGLE ? 'Google or email' : 'Email') + '. Reading, local Watch and Private Notes stay free without an account.</small></div><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></button>') + '</div>';
  }
  function commentsHTML(i) {
    // Part D override: public comments disabled. Private Note replaces annotation.
    return '';
  }
  function onReact(sid, kind) { if (me && LIVE) B.react(sid, kind).catch(function () {}); }
  function onSave(sid, on) { if (me && LIVE) B.save(sid, on).catch(function () {}); }
  function onRepost(sid, r) { if (me && LIVE) B.repost(sid, r).then(function () { var x = X(); if (r && x.S.reposts[sid]) { x.S.reposts[sid].synced = true; x.S.reposts[sid].userId = me.id; x.saveReposts(); } }).catch(function () {}); }
  function syncReposts() {
    if (!me || !LIVE) return;
    var x = X(); B.myReposts().then(function (a) {
      (a || []).forEach(function (r) { if (!x.S.reposts[r.story_id]) x.S.reposts[r.story_id] = { v: 1, storyId: r.story_id, comment: r.comment, createdAt: r.created_at, userId: me.id, synced: true }; });
      Object.keys(x.S.reposts).forEach(function (k) { if (!x.S.reposts[k].synced) onRepost(k, x.S.reposts[k]); });
      x.saveReposts(); rerender();
    }).catch(function () {});
  }
  function afterAuth(msg) { closeSheet(); return refreshMe().then(function () { syncReposts(); if (me && !me.handle) editSheet(); toast(msg || 'Signed in'); }); }

  var pendingCm = '';
  function postComment(id) { var b = pendingCm; if (!b) return; return B.addComment(id, b).then(function () { pendingCm = ''; delete cache[id]; ccount[id] = (ccount[id] || 0) + 1; rerender(); toast('Comment posted'); }).catch(function (er) { toast(er.message); }); }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-sx]'); if (!t) return;
    e.stopPropagation(); e.preventDefault();
    var a = t.dataset.sx, id = t.dataset.id, v = function (q) { var el = document.getElementById(q); return el ? el.value.trim() : ''; };
    if (a === 'signin') return signInSheet();
    if (a === 'glread') { var gx = X(); if (gx && gx.openUrl) gx.openUrl(C.guidelinesUrl); else window.open(C.guidelinesUrl, '_blank'); return; }
    if (a === 'sigmenu') return sheet('<h3>Signal options</h3><button class="btn ghost" data-sx="sigreport" data-id="' + esc(id) + '">Report inaccurate or misleading signal</button><button class="btn ghost" data-closesheet>Cancel</button>');
    if (a === 'sigreport') return sigReportSheet(id);
    if (a === 'sigreportok') { var sr = document.querySelector('input[name="sxSR"]:checked'), note = noDash(v('sxSRn')).slice(0, 400);
      return B.reportSignal(id, (sr ? sr.value : 'Something else') + (note ? ': ' + note : '')).then(function () { closeSheet(); toast('Thanks. Voxarc Lab will check this signal against its source'); }).catch(function () { closeSheet(); var x = X(); if (x && x.mail) x.mail('Signal report ' + id); else toast('Could not send. Email support@voxarc.io'); }); }
    if (a === 'glok') { var g2 = document.getElementById('sxGl2'); if (!g2 || !g2.checked) return toast('Tick the box to agree to the Community Guidelines');
      return B.acceptGuidelines().then(function () { me.guidelines_accepted_at = new Date().toISOString(); closeSheet(); postComment(id); }).catch(function (er) { toast(er.message); }); }
    if (a === 'google' && !GOOGLE) return;
    if (a === 'google') return B.signInGoogle().then(function () { if (!LIVE) afterAuth('Signed in with Google'); }).catch(function (er) { toast(er.message); });
    if (a === 'emailin' || a === 'emailup') {
      var em = v('sxEmail'), pw = v('sxPw'), gl = document.getElementById('sxGl');
      if (a === 'emailup' && !(gl && gl.checked)) return toast('Tick the box to agree to the Community Guidelines');
      if (!/^\S+@\S+\.\S+$/.test(em) || pw.length < 8) return toast('Enter an email and a password of 8 or more characters');
      return (a === 'emailin' ? B.signInEmail(em, pw) : B.signUpEmail(em, pw, noDash(v('sxName')))).then(function (j) {
        if (a === 'emailup' && LIVE && !(sess && sess.access_token)) { closeSheet(); return toast('Check your email to confirm your account'); }
        return afterAuth(a === 'emailup' ? 'Account created' : 'Signed in');
      }).catch(function (er) { toast(er.message || 'Sign in failed'); });
    }
    if (a === 'profile') return profileSheet(id);
    if (a === 'people') return peopleSheet();
    if (a === 'me') return me ? profileSheet(me.id) : signInSheet();
    if (a === 'ffeed') return need(function () { demoSeed(); followingFeedSheet(); });
    if (a === 'openstory') return X().openArticle(id);
    if (a === 'list') return listSheet(id, t.dataset.k);
    if (a === 'edit') return editSheet();
    if (a === 'saveprofile') { var h = v('sxPh').replace(/[^\w]/g, '').slice(0, 20); if (h.length < 3) return toast('Handle needs 3 or more letters or numbers');
      return B.updateProfile({ name: noDash(v('sxPn')).slice(0, 60), handle: h.toLowerCase(), avatar_url: /^https:\/\//.test(v('sxPa')) ? v('sxPa') : null }).then(function () { return refreshMe(); }).then(function () { toast('Profile saved'); profileSheet(me.id); }).catch(function (er) { toast(/duplicate|unique/i.test(er.message) ? 'That handle is taken' : er.message); }); }
    if (a === 'follow' || a === 'unfollow') return need(function () { B[a](id).then(function () { toast(a === 'follow' ? 'Following' : 'Unfollowed'); if (t.dataset.ret === 'people') peopleSheet(); else profileSheet(id); }); });
    if (a === 'report') return need(function () { reportSheet(t.dataset.t, id); });
    if (a === 'reportok') { var rs = document.querySelector('input[name="sxR"]:checked'); return B.report(t.dataset.t, id, rs ? rs.value : 'Other').then(function () { reported[t.dataset.t + ':' + id] = 1; ls('vx.reported', reported); closeSheet(); toast('Report sent. Thanks for keeping Voxarc useful'); rerender(); }).catch(function (er) { toast(er.message); }); }
    if (a === 'cmenu') return need(function () { sheet('<h3>@' + esc(t.dataset.h) + '</h3><button class="btn ghost" data-sx="report" data-t="comment" data-id="' + esc(id) + '">Report comment</button><button class="btn ghost" data-sx="report" data-t="user" data-id="' + esc(t.dataset.u) + '">Report account</button><button class="btn ghost sx-danger" data-sx="block" data-id="' + esc(t.dataset.u) + '" data-h="' + esc(t.dataset.h) + '">Block @' + esc(t.dataset.h) + '</button><button class="btn ghost" data-closesheet>Cancel</button>'); });
    if (a === 'block') return need(function () { blockSheet(id, t.dataset.h); });
    if (a === 'blockok') return B.block(id).then(refreshMe).then(function () { closeSheet(); toast('Blocked'); });
    if (a === 'unblock') return B.unblock(id).then(refreshMe).then(function () { toast('Unblocked'); profileSheet(id); });
    if (a === 'blocked') return B.blocked().then(function (l) { sheet('<h3>Blocked accounts</h3><div class="sx-list">' + ((l || []).filter(Boolean).map(function (u) { return '<button class="sx-row" data-sx="profile" data-id="' + esc(u.id) + '">' + avatar(u) + '<span><b>' + esc(u.name) + '</b><small>@' + esc(u.handle) + ' \u00B7 tap to unblock</small></span></button>'; }).join('') || '<p class="sx-fine">You have not blocked anyone.</p>') + '</div><button class="btn ghost" data-sx="profile" data-id="' + esc(me.id) + '">Back</button>'); });
    if (a === 'signout') return B.signOut().then(function () { me = null; closeSheet(); rerender(); toast('Signed out'); });
    if (a === 'delete') return need(deleteSheet);
    if (a === 'deleteok') { if (v('sxDel').toUpperCase() !== 'DELETE') return toast('Type DELETE to confirm'); return B.deleteAccount().then(function () { me = null; var x = X(); Object.keys(x.S.reposts).forEach(function (k) { x.S.reposts[k].synced = false; }); x.saveReposts(); closeSheet(); rerender(); toast('Your account was deleted'); }).catch(function (er) { toast(er.message); }); }
    if (a === 'post' || a === 'postx') { toast('Public comments are off. Use Private Note.'); return; }
    if (a === 'delcomment') return B.deleteComment(id).then(function () { cache = {}; X().refreshReader(); toast('Comment deleted'); });
  }, true);

  // OAuth return: web reads the URL hash; Android gets io.voxarc.app://auth-callback#access_token=... through appUrlOpen.
  if (LIVE) {
    if (/access_token=/.test(location.hash)) B.takeRedirect(location.hash).then(function () { history.replaceState(null, '', location.pathname); afterAuth('Signed in with Google'); });
    if (isNative && P.App) P.App.addListener('appUrlOpen', function (ev) { if (ev && /auth-callback/.test(ev.url || '')) { if (P.Browser) P.Browser.close().catch(function () {}); B.takeRedirect(ev.url).then(function (okk) { if (okk) afterAuth('Signed in with Google'); }); } });
  }
  window.VXSocial = { count: function (id) { return ccount[id] || 0; }, settingsHTML: settingsHTML, commentsHTML: commentsHTML, onReact: onReact, onSave: onSave, onRepost: onRepost, live: LIVE, user: function () { return me; } };
  setTimeout(function () { headerSync(); refreshMe().then(syncReposts); loadCounts(); }, 0);
})();
