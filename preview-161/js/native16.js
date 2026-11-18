/* 1.6.0 native desk: features that run on the device. Web builds show the same screens
   and fall back when a native plugin is not there (browser preview, Android without FCM). */
(function () {
  var KEY = 'vx.native16';
  var prefs = { alerts: false, face: false, pass: '', tour: false };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) prefs = saved; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} }
  function vx() { return window.__vx || null; }
  function S() { var x = vx(); return x && x.S; }
  function toast(m) { var x = vx(); if (x && x.toast) x.toast(m); }
  function sheet(h) { var x = vx(); if (x && x.sheet) x.sheet(h); }
  function closeSheet() { var x = vx(); if (x && x.closeSheet) x.closeSheet(); }
  function byId(id) { var x = vx(); return x && x.byId ? x.byId(id) : null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function native() {
    var Cap = window.Capacitor;
    if (!Cap || !Cap.isNativePlatform || !Cap.isNativePlatform()) return null;
    return (Cap.Plugins && Cap.Plugins.VoxarcNative) || null;
  }
  function isAndroid() {
    var Cap = window.Capacitor;
    try { return !!(Cap && Cap.getPlatform && Cap.getPlatform() === 'android'); } catch (e) { return false; }
  }
  var IOS_ONLY = { live: 1, siri: 1, audio: 1, spot: 1, ipad: 1 };
  function call(method, opts) {
    var nx = native();
    if (!nx || typeof nx[method] !== 'function') return Promise.resolve(null);
    try {
      var p = nx[method](opts || {});
      return p && typeof p.then === 'function' ? p.catch(function () { return null; }) : Promise.resolve(p);
    } catch (e) { return Promise.resolve(null); }
  }
  function impactHigh(i) {
    var g = (i && i.signal) || {};
    var imp = String(g.importance || g.impact || '').toLowerCase();
    return imp === 'high' || (g.policy && +g.policy.impact_score_10 >= 7);
  }
  function deadlineOf(i) {
    var list = (i && i.deadlines) || [];
    var today = new Date().toISOString().slice(0, 10);
    var next = null;
    list.forEach(function (d) {
      if (!d || !d.date || d.date < today) return;
      if (!next || d.date < next.date) next = d;
    });
    if (next) return { label: next.label || 'Deadline', date: next.date, assumed: false };
    var pub = String((i && i.published) || today).slice(0, 10);
    var p = pub.split('-');
    var dt = new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
    dt.setDate(dt.getDate() + 90);
    var iso = dt.toISOString().slice(0, 10);
    return { label: '90-day window', date: iso, assumed: true };
  }
  function ms(iso) { var p = iso.split('-'); return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1, 17, 0, 0).getTime(); }
  function topicName(i) {
    var t = (i && i.topics && i.topics[0]) || (i && i.primary) || 'desk';
    return String(t).replace(/-/g, ' ');
  }
  function followedItems() {
    var st = S(); if (!st) return [];
    var follow = st.follow || [];
    return (st.items || []).filter(function (i) {
      if (!follow.length) return true;
      var topics = i.topics || [];
      return topics.some(function (t) { return follow.indexOf(t) >= 0; }) || follow.indexOf(i.primary) >= 0;
    });
  }
  function briefingText() {
    var rows = followedItems().slice(0, 6);
    if (!rows.length) return 'No signals are stored on this device yet.';
    var parts = ['Your voxarc brief.'];
    rows.forEach(function (i, n) {
      var line = (i.summary || i.title || '').replace(/\s+/g, ' ').trim();
      if (line.length > 220) line = line.slice(0, 217).replace(/\s+\S*$/, '') + '.';
      parts.push((n + 1) + '. ' + (i.title || 'Signal') + '. ' + line);
    });
    return parts.join(' ');
  }
  function syncDesk() {
    var st = S(); if (!st) return;
    var items = (st.items || []).slice(0, 80).map(function (i) {
      return { id: String(i.id), title: String(i.title || ''), summary: String(i.summary || '').slice(0, 240), topic: topicName(i), topics: i.topics || [] };
    });
    call('saveDesk', { items: items, topics: st.follow || [], alerts: !!prefs.alerts });
    var indexed = items.map(function (i) { return { id: i.id, title: i.title, summary: i.summary, topic: i.topic, kind: 'briefing' }; });
    (st.saved || []).forEach(function (id) {
      var i = byId(id); if (!i) return;
      indexed.push({ id: String(id), title: String(i.title || ''), summary: String(i.summary || '').slice(0, 240), topic: topicName(i), kind: 'saved' });
    });
    Object.keys(st.privateNotes || {}).forEach(function (id) {
      var note = st.privateNotes[id]; var i = byId(id);
      indexed.push({ id: String(id), title: (i && i.title) || 'Private note', summary: String((note && note.body) || '').slice(0, 240), topic: 'note', kind: 'note' });
    });
    call('indexBriefings', { items: indexed.slice(0, 200) });
  }
  function page(which) {
    prefs.view = which || prefs.view || 'tour';
    save();
    var st = S(); if (!st) return '';
    st.tab = 'settings'; st.setView = 'n16';
    if (vx() && vx().render) vx().render();
  }
  function tourHTML() {
    var rows = [
      ['push', 'Topic alerts', 'A high-impact signal in a topic you follow can notify you while voxarc is closed.'],
      ['offline', 'Offline save and notes', 'Save a signal and write a note with no account and no network. An account only adds sync.'],
      ['ask', 'Ask voxarc', 'Answers are built from signals on this device, with a citation that opens the signal. No web page.'],
      ['live', 'Lock screen countdown', 'Track a deadline on the Lock Screen and in the Dynamic Island.'],
      ['siri', 'Siri and Shortcuts', 'Ask Siri for today\'s Arctic signals, or open saved signals from a morning automation.'],
      ['audio', 'Daily audio brief', 'About two minutes, spoken on this device, including with the screen off.'],
      ['cal', 'Calendar', 'Put a signal deadline on your calendar with a reminder the day before.'],
      ['scan', 'Scan a brief', 'Photograph a printed page. voxarc reads it on device and matches related signals.'],
      ['lock', 'Face ID for notes', 'Private notes stay locked behind Face ID, with a passcode if biometrics are off.'],
      ['spot', 'iPhone search', 'Saved signals and notes show up when you search the iPhone, for example tungsten.'],
      ['ipad', 'iPad split view', 'On iPad Air 11-inch, the list stays on the left and the signal on the right, in portrait and landscape.']
    ];
    if (isAndroid()) {
      rows = rows.filter(function (r) { return !IOS_ONLY[r[0]]; }).map(function (r) {
        if (r[0] === 'push') return ['push', 'Topic alerts', 'When you open the app, a new high-impact signal in a topic you follow posts a notification.'];
        if (r[0] === 'cal') return ['cal', 'Calendar', 'Open a signal deadline in your calendar app, ready to save.'];
        if (r[0] === 'scan') return ['scan', 'Match a brief', 'Paste text from a printed page and see related signals stored on this device.'];
        if (r[0] === 'lock') return ['lock', 'Passcode for notes', 'Lock private notes behind a 4-digit passcode on this device.'];
        return r;
      });
    }
    return '<div class="n16"><h2 id="n16-h">What you can do</h2><p class="n16-lead">These run on the device. They are not a website.</p><ul class="n16-list">' +
      rows.map(function (r) { return '<li><button type="button" data-n16="open" data-view="' + r[0] + '"><b>' + r[1] + '</b><span>' + r[2] + '</span></button></li>'; }).join('') +
      '</ul></div>';
  }
  function bodyFor(view) {
    if (isAndroid() && IOS_ONLY[view]) return tourHTML();
    if (view === 'push') return pushHTML();
    if (view === 'offline') return offlineHTML();
    if (view === 'ask') return askHTML();
    if (view === 'live') return liveHTML();
    if (view === 'siri') return siriHTML();
    if (view === 'audio') return audioHTML();
    if (view === 'cal') return calHTML();
    if (view === 'scan') return scanHTML();
    if (view === 'lock') return lockHTML();
    if (view === 'spot') return spotHTML();
    if (view === 'ipad') return ipadHTML();
    return tourHTML();
  }
  function pushHTML() {
    return '<div class="n16"><h2>Topic alerts</h2><p>' + (isAndroid() ? 'Follow a topic such as Critical Minerals. When you open the app, a new high-rated signal in that topic posts a notification.' : 'Follow a topic such as Critical Minerals. A new high-rated signal can alert you while the app is closed.') + '</p>' +
      '<button type="button" class="switch' + (prefs.alerts ? ' on' : '') + '" data-n16="alerts" role="switch" aria-checked="' + prefs.alerts + '" aria-label="Topic alerts"></button>' +
      '<p class="n16-note">' + (prefs.alerts ? 'Alerts are on for the topics you follow.' : 'Alerts are off.') + '</p>' +
      (isAndroid() ? '<p class="n16-note">Alerts are posted by this device. Nothing is sent to a server.</p>' : '<p class="n16-note">Apple Push needs an APNs key only Ram can add. Until then, iOS checks the feed in the background and posts a local notification. Android uses the same local notification until an FCM key is added.</p>') +
      '<button type="button" class="btn primary" data-n16="preview-alert">Preview an alert</button>' +
      (prefs.previewAlert ? '<div class="n16-note-card" role="status"><b>voxarc</b><span>New high-impact signal in a topic you follow.</span></div>' : '') +
      '</div>';
  }
  function offlineHTML() {
    var st = S();
    return '<div class="n16"><h2>Offline save and notes</h2><p>Saving a signal and writing a private note does not need a network or an account. An account only syncs them later.</p>' +
      '<p class="n16-note">' + ((st && st.saved) || []).length + ' saved on this device. ' + Object.keys((st && st.privateNotes) || {}).length + ' private notes. ' + (st && st.online ? 'Online.' : 'Offline. The copy on this device is what you are reading.') + '</p>' +
      '<button type="button" class="btn primary" data-n16="save-guest">Save the latest signal on this device</button></div>';
  }
  function askHTML() {
    return '<div class="n16"><h2>Ask voxarc</h2><p>Answers are built only from signals already on this device. Each citation opens the signal here. Nothing opens a web page, and it still works from the cached feed when you are offline.</p>' +
      '<button type="button" class="btn primary" data-n16="ask-arctic">Ask about Arctic signals</button></div>';
  }
  function liveHTML() {
    var i = followedItems()[0] || (S() && S().items && S().items[0]);
    var dl = i ? deadlineOf(i) : null;
    var end = dl ? ms(dl.date) : Date.now();
    var left = Math.max(0, end - Date.now());
    var days = Math.floor(left / 86400000);
    var hours = Math.floor((left % 86400000) / 3600000);
    return '<div class="n16"><h2>Lock screen countdown</h2><p>Track a deadline, such as a 90-day licence window, on the Lock Screen and in the Dynamic Island.</p>' +
      (i ? '<article class="n16-island" aria-label="Lock Screen preview"><div><b>voxarc · ' + esc(topicName(i)) + '</b><span>' + esc(i.title) + '</span><small>' + esc(dl.label) + (dl.assumed ? ' (90 days from publication)' : '') + '</small></div><strong>' + days + 'd ' + hours + 'h</strong></article>' +
        '<button type="button" class="btn primary" data-n16="live-start" data-id="' + esc(i.id) + '">Track on the Lock Screen</button>' : '<p>No signal is stored yet.</p>') +
      '</div>';
  }
  function siriHTML() {
    var lines = [];
    var items = (S() && S().items) || [];
    items.filter(function (i) { return (i.topics || []).indexOf('arctic') >= 0 || (i.topics || []).indexOf('arctic-security') >= 0 || String(i.primary) === 'arctic'; }).slice(0, 3).forEach(function (i, n) {
      lines.push('<li><button type="button" data-open="' + esc(i.id) + '">' + (n + 1) + '. ' + esc(i.title) + '</button></li>');
    });
    return '<div class="n16"><h2>Siri and Shortcuts</h2><p>These work from Siri and in the Shortcuts app, including an automation every morning at 8.</p>' +
      '<ul class="n16-phrases"><li>“What are today\'s Arctic signals in voxarc”</li><li>“Open my saved signals in voxarc”</li></ul>' +
      '<p>Try it here. The top three Arctic signals on this device:</p><ol class="n16-phrases">' + (lines.join('') || '<li>No Arctic signals in the cached feed.</li>') + '</ol>' +
      '<button type="button" class="btn ghost" data-n16="open-saved">Open saved signals</button></div>';
  }
  function audioHTML() {
    return '<div class="n16"><h2>Daily audio brief</h2><p>About two minutes, spoken on this device from the topics you follow. It keeps playing with the screen off, with the usual lock-screen controls.</p>' +
      '<button type="button" class="btn primary" data-n16="speak">' + (prefs.speaking ? 'Stop' : 'Play the brief') + '</button>' +
      (prefs.speaking ? '<p class="n16-note" role="status">Playing. Lock the screen. The controls stay on the Lock Screen.</p>' : '') +
      '<article class="n16-script">' + esc(briefingText()) + '</article></div>';
  }
  function calHTML() {
    var i = followedItems()[0] || (S() && S().items && S().items[0]);
    var dl = i ? deadlineOf(i) : null;
    return '<div class="n16"><h2>Add to calendar</h2><p>' + (isAndroid() ? 'Your calendar app opens with the deadline filled in. Save it there.' : 'The deadline is written to the calendar on this device, with a reminder the day before.') + '</p>' +
      (i ? '<p><b>' + esc(i.title) + '</b><br>' + esc(dl.label) + ' · ' + esc(dl.date) + (dl.assumed ? ' (90-day window)' : '') + '</p>' +
        '<button type="button" class="btn primary" data-n16="calendar" data-id="' + esc(i.id) + '">Add to calendar</button>' : '') +
      (prefs.calNote ? '<p class="n16-note">' + esc(prefs.calNote) + '</p>' : '') + '</div>';
  }
  function scanHTML() {
    if (isAndroid()) {
      return '<div class="n16"><h2>Match a brief</h2><p>Paste text from a printed page or an email. Related signals are matched against the feed stored on this device.</p>' +
        '<textarea id="n16scan" class="repc" placeholder="Paste text here">' + esc(prefs.scanText || '') + '</textarea>' +
        '<button type="button" class="btn primary" data-n16="match">Match signals</button>' +
        '<div id="n16matches"></div></div>';
    }
    return '<div class="n16"><h2>Scan a printed brief</h2><p>On iPhone, VisionKit scans the page and the text is read on device. Related signals are matched against the feed stored here.</p>' +
      '<button type="button" class="btn primary" data-n16="scan">Scan with the camera</button>' +
      '<label class="n16-file">Or choose a photo<input id="n16file" type="file" accept="image/*" capture="environment" data-n16="file"></label>' +
      '<textarea id="n16scan" class="repc" placeholder="Scanned text appears here">' + esc(prefs.scanText || '') + '</textarea>' +
      '<button type="button" class="btn ghost" data-n16="match">Match signals</button>' +
      '<div id="n16matches"></div></div>';
  }
  function lockHTML() {
    if (isAndroid()) {
      return '<div class="n16"><h2>Passcode for private notes</h2><p>Notes stay on this device. Set a 4-digit passcode, then turn the lock on.</p>' +
        '<label>Passcode<input id="n16pass" inputmode="numeric" maxlength="4" placeholder="4 digits" value="' + esc(prefs.pass || '') + '"></label>' +
        '<button type="button" class="btn primary" data-n16="save-pass">Save passcode</button>' +
        '<button type="button" class="switch' + (prefs.face ? ' on' : '') + '" data-n16="face" role="switch" aria-checked="' + prefs.face + '" aria-label="Lock private notes"></button>' +
        '<p class="n16-note">' + (prefs.face ? 'Private notes are locked.' : 'Private notes are unlocked.') + '</p></div>';
    }
    return '<div class="n16"><h2>Face ID for private notes</h2><p>Notes stay on this device. Face ID opens them. If Face ID is off, the device passcode is the fallback. In a browser, use the 4-digit passcode.</p>' +
      '<button type="button" class="switch' + (prefs.face ? ' on' : '') + '" data-n16="face" role="switch" aria-checked="' + prefs.face + '" aria-label="Face ID lock"></button>' +
      '<p class="n16-note">' + (prefs.face ? 'Private notes are locked.' : 'Private notes are unlocked.') + '</p>' +
      '<label>Passcode fallback<input id="n16pass" inputmode="numeric" maxlength="4" placeholder="4 digits" value="' + esc(prefs.pass || '') + '"></label>' +
      '<button type="button" class="btn primary" data-n16="save-pass">Save passcode</button></div>';
  }
  function spotHTML() {
    return '<div class="n16"><h2>Search from the iPhone</h2><p>Saved signals and private notes are indexed for Spotlight, not only the public briefings. Search the iPhone for a word such as tungsten and open the signal.</p>' +
      '<label>Try a search<input id="n16q" placeholder="tungsten"></label>' +
      '<button type="button" class="btn primary" data-n16="spot">Search saved signals</button><div id="n16spot"></div></div>';
  }
  function ipadHTML() {
    return '<div class="n16"><h2>iPad split view</h2><p>On an iPad Air 11-inch the list stays on the left and the signal, with its notes, on the right. That includes portrait, about 820 points wide, and landscape.</p>' +
      '<button type="button" class="btn primary" data-tab="feed">Open the desk</button></div>';
  }
  function settingsHTML() {
    return '<div class="group-h">On this device</div><div class="group"><button class="cell" data-n16="open" data-view="tour"><div class="l">What you can do<small>' + (isAndroid() ? 'Alerts, offline notes, calendar, brief matching, notes passcode' : 'Alerts, offline notes, Siri, audio, calendar, scan, Face ID') + '</small></div></button></div>';
  }
  function pageHTML() {
    var view = prefs.view || 'tour';
    return '<div class="settings-inner"><div class="subbar"><button class="back" data-n16="back">Settings</button></div>' + bodyFor(view) + '</div>';
  }
  function detailButtons(id) {
    return '<button type="button" class="btn ghost block" data-n16="calendar" data-id="' + esc(id) + '">Add deadline to calendar</button>' +
      (isAndroid() ? '' : '<button type="button" class="btn ghost block" data-n16="live-start" data-id="' + esc(id) + '">Track deadline on the Lock Screen</button>');
  }
  function notesLocked() { return !!prefs.face && !prefs.unlocked; }
  function lockedNotesHTML() {
    return '<div class="n16-lock" role="dialog" aria-label="Private notes are locked"><h3>Private notes are locked</h3><p>' + (isAndroid() ? 'Enter the passcode for this device.' : 'Use Face ID, or the passcode for this device.') + '</p>' +
      (isAndroid() ? '' : '<button type="button" class="btn primary" data-n16="face-unlock">Unlock with Face ID</button>') +
      '<label>Passcode<input id="n16unlock" inputmode="numeric" maxlength="4" placeholder="4 digits"></label>' +
      '<button type="button" class="btn ghost" data-n16="pass-unlock">Unlock with passcode</button></div>';
  }
  function blockNotes(next) {
    if (!notesLocked()) return false;
    prefs.afterUnlock = next;
    sheet('<h3>Private notes are locked</h3><p>Face ID on iPhone. Passcode if biometrics are unavailable.</p>' +
      '<button type="button" class="btn primary" data-n16="face-unlock">Unlock with Face ID</button>' +
      '<label>Passcode<input id="n16unlock" inputmode="numeric" maxlength="4"></label>' +
      '<button type="button" class="btn ghost" data-n16="pass-unlock">Unlock with passcode</button>');
    return true;
  }
  function unlockOk() {
    prefs.unlocked = true;
    var fn = prefs.afterUnlock; prefs.afterUnlock = null;
    closeSheet();
    toast('Private notes unlocked on this device');
    if (typeof fn === 'function') fn();
    else if (vx() && vx().render) vx().render();
  }
  function matchText(text) {
    var words = String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length > 4; });
    var items = (S() && S().items) || [];
    var hits = [];
    items.forEach(function (i) {
      var blob = (i.title + ' ' + (i.summary || '')).toLowerCase();
      var score = 0;
      words.forEach(function (w) { if (blob.indexOf(w) >= 0) score++; });
      if (score) hits.push({ i: i, score: score });
    });
    hits.sort(function (a, b) { return b.score - a.score; });
    return hits.slice(0, 5);
  }
  function showMatches(text) {
    var box = document.getElementById('n16matches'); if (!box) return;
    var hits = matchText(text);
    box.innerHTML = hits.length ? '<h3>Related signals on this device</h3><ul class="n16-phrases">' + hits.map(function (h) {
      return '<li><button type="button" data-open="' + esc(h.i.id) + '">' + esc(h.i.title) + '</button></li>';
    }).join('') + '</ul>' : '<p>No stored signal shares words with that page.</p>';
  }
  function ics(i) {
    var dl = deadlineOf(i);
    var start = dl.date.replace(/-/g, '');
    var title = (i.title || 'voxarc deadline').replace(/[,;\n]/g, ' ');
    return 'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:' + title + '\nDESCRIPTION:' + (dl.label || 'Deadline') + ' from voxarc\nDTSTART;VALUE=DATE:' + start + '\nBEGIN:VALARM\nTRIGGER:-P1D\nACTION:DISPLAY\nDESCRIPTION:Reminder\nEND:VALARM\nEND:VEVENT\nEND:VCALENDAR\n';
  }
  function act(el) {
    var name = el.getAttribute('data-n16');
    var id = el.getAttribute('data-id');
    if (name === 'open') { page(el.getAttribute('data-view') || 'tour'); return; }
    if (name === 'back') { var st = S(); if (st) { st.setView = null; } if (vx() && vx().render) vx().render(); return; }
    if (name === 'alerts') {
      prefs.alerts = !prefs.alerts; save();
      if (prefs.alerts) call('registerPush', {});
      syncDesk(); page('push'); return;
    }
    if (name === 'preview-alert') { prefs.previewAlert = true; save(); page('push'); return; }
    if (name === 'save-guest') {
      var st2 = S(); var first = st2 && st2.items && st2.items[0];
      if (first && vx()) { if (st2.saved.indexOf(first.id) < 0) st2.saved.push(first.id); try { localStorage.setItem('vx.saved', JSON.stringify(st2.saved)); } catch (e) {} }
      toast('Saved on this device. No account and no network required.');
      syncDesk(); return;
    }
    if (name === 'ask-arctic') {
      var st3 = S(); if (st3) { st3.tab = 'ask'; st3.query = 'Arctic'; st3.setView = null; }
      if (vx() && vx().render) vx().render(); return;
    }
    if (name === 'live-start') {
      var item = byId(id) || followedItems()[0];
      if (!item) return;
      var dl = deadlineOf(item);
      call('startDeadline', { id: String(item.id), title: item.title || 'Deadline', topic: topicName(item), endsAt: ms(dl.date) }).then(function (r) {
        toast(r && r.ok ? 'Countdown is on the Lock Screen' : 'Lock Screen preview is ready. Live Activities start on iPhone.');
      });
      page('live'); return;
    }
    if (name === 'open-saved') { var st4 = S(); if (st4) { st4.tab = 'saved'; st4.setView = null; } if (vx() && vx().render) vx().render(); return; }
    if (name === 'speak') {
      if (prefs.speaking) { prefs.speaking = false; save(); window.speechSynthesis && window.speechSynthesis.cancel(); call('stopBriefing', {}); page('audio'); return; }
      prefs.speaking = true; save();
      var text = briefingText();
      call('speakBriefing', { text: text }).then(function (r) {
        if (!r && window.speechSynthesis) {
          var u = new SpeechSynthesisUtterance(text);
          u.onend = function () { prefs.speaking = false; save(); };
          window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
        }
      });
      page('audio'); return;
    }
    if (name === 'calendar') {
      var item2 = byId(id) || followedItems()[0]; if (!item2) return;
      var dl2 = deadlineOf(item2);
      call('addCalendar', { title: item2.title || 'voxarc deadline', notes: dl2.label, startsAt: ms(dl2.date) }).then(function (r) {
        if (r && r.ok) { prefs.calNote = isAndroid() ? 'Opened in your calendar app.' : 'Added to the calendar on this device, with a reminder the day before.'; save(); page('cal'); return; }
        var blob = new Blob([ics(item2)], { type: 'text/calendar' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'voxarc-deadline.ics'; a.click();
        prefs.calNote = 'Calendar file ready. On iPhone this is written straight into Calendar.'; save(); page('cal');
      });
      return;
    }
    if (name === 'scan') {
      call('scanDocument', {}).then(function (r) {
        if (r && r.text) { prefs.scanText = r.text; save(); page('scan'); setTimeout(function () { showMatches(r.text); }, 30); return; }
        toast('Camera scan runs on iPhone. Paste text or choose a photo, then match.');
        var ta = document.getElementById('n16scan'); if (ta) ta.focus();
      });
      return;
    }
    if (name === 'match') {
      var ta2 = document.getElementById('n16scan');
      prefs.scanText = ta2 ? ta2.value : '';
      save(); showMatches(prefs.scanText); return;
    }
    if (name === 'face') { prefs.face = !prefs.face; if (!prefs.face) prefs.unlocked = true; else prefs.unlocked = false; save(); page('lock'); return; }
    if (name === 'save-pass') {
      var p = document.getElementById('n16pass');
      prefs.pass = p ? String(p.value || '').replace(/\D/g, '').slice(0, 4) : '';
      save(); toast(prefs.pass.length === 4 ? 'Passcode saved on this device' : 'Enter 4 digits'); return;
    }
    if (name === 'face-unlock') {
      call('unlockNotes', {}).then(function (r) {
        if (r && r.ok) { unlockOk(); return; }
        toast(r && r.reason ? r.reason : 'Use the passcode on this device.');
      });
      return;
    }
    if (name === 'pass-unlock') {
      var entered = (document.getElementById('n16unlock') || {}).value || '';
      if (prefs.pass && entered === prefs.pass) unlockOk();
      else toast('Passcode does not match');
      return;
    }
    if (name === 'spot') {
      var q = ((document.getElementById('n16q') || {}).value || 'tungsten').toLowerCase();
      var st5 = S(); var hits = [];
      (st5.saved || []).forEach(function (sid) { var i = byId(sid); if (i && (i.title + ' ' + (i.summary || '')).toLowerCase().indexOf(q) >= 0) hits.push(i); });
      Object.keys(st5.privateNotes || {}).forEach(function (sid) {
        var note = st5.privateNotes[sid]; var i = byId(sid);
        if ((note.body || '').toLowerCase().indexOf(q) >= 0 || (i && i.title.toLowerCase().indexOf(q) >= 0)) hits.push(i || { id: sid, title: 'Private note' });
      });
      var box = document.getElementById('n16spot');
      if (box) box.innerHTML = hits.length ? '<ul class="n16-phrases">' + hits.map(function (i) { return '<li><button type="button" data-open="' + esc(i.id) + '">' + esc(i.title) + '</button></li>'; }).join('') + '</ul>' : '<p>Nothing saved matches “' + esc(q) + '”. Save a signal first. On iPhone, the same words are in Spotlight.</p>';
      syncDesk();
      return;
    }
  }
  function localAlerts() {
    if (!prefs.alerts) return;
    var st = S(); if (!st || !window.Capacitor || !Capacitor.Plugins || !Capacitor.Plugins.LocalNotifications) return;
    var seen = {};
    try { seen = JSON.parse(localStorage.getItem('vx.pushSeen') || '{}'); } catch (e) {}
    var fresh = (st.items || []).filter(function (i) { return !seen[i.id] && impactHigh(i); });
    if (!fresh.length) return;
    var ln = Capacitor.Plugins.LocalNotifications;
    ln.schedule({ notifications: [{ id: 16001, title: 'New high-impact signal', body: fresh[0].title, extra: { id: fresh[0].id } }] }).catch(function () {});
    fresh.forEach(function (i) { seen[i.id] = 1; });
    try { localStorage.setItem('vx.pushSeen', JSON.stringify(seen)); } catch (e) {}
  }
  function afterRender() {
    // The 1.5.1 home desk stays as it was. These features are opened from Settings.
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-n16]');
    if (!t) return;
    e.preventDefault();
    act(t);
  });
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'n16file' && e.target.files && e.target.files[0]) {
      prefs.scanText = 'Printed brief selected: ' + e.target.files[0].name + '. On iPhone the words are read on device. Paste a sentence to match signals in this browser.';
      save(); page('scan');
    }
  });
  window.VXNative16 = {
    settingsHTML: settingsHTML,
    pageHTML: pageHTML,
    detailButtons: detailButtons,
    notesLocked: notesLocked,
    lockedNotesHTML: lockedNotesHTML,
    blockNotes: blockNotes,
    afterRender: afterRender,
    sync: syncDesk,
    dismissTour: function () { prefs.tour = true; save(); }
  };
  var bootTimer = setInterval(function () {
    var st = S();
    if (!st || st.booting) return;
    clearInterval(bootTimer);
    syncDesk();
    localAlerts();
  }, 400);
})();
