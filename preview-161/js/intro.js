/* Globe ignite. Option B from the approved launch renderer (brand/launch_anim/anim.html).
   Cold start only. A tap skips. Reduced motion holds the final lockup. No video. */
(function () {
  var root = document.getElementById('vxIntro');
  var canvas = document.getElementById('vxIntroC');
  if (!root || !canvas || window.__vxIntroStarted) return;
  window.__vxIntroStarted = true;

  function hideSplash() {
    if (hideSplash.done) return;
    hideSplash.done = true;
    var Cap = window.Capacitor;
    if (!Cap || !Cap.isNativePlatform || !Cap.isNativePlatform()) return;
    var ss = Cap.Plugins && Cap.Plugins.SplashScreen;
    if (!ss || !ss.hide) return;
    try {
      var p = ss.hide({ fadeOutDuration: 0 });
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  function removeIntro() {
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  if (document.documentElement.classList.contains('vx-no-intro')) {
    hideSplash();
    removeIntro();
    return;
  }
  try { sessionStorage.setItem('vx.introPlayed', '1'); } catch (e) {}

  var ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) { hideSplash(); removeIntro(); return; }

  var W = 1080, H = 1920, BG = '#000000', CX = 540;
  var END = 3.3, FADE_MS = 240, STILL_MS = 600;
  var MARK = [
    [[5, 9], [143, 9], [164, 46], [88, 47], [136, 132], [228, 9], [291, 9], [158, 177], [108, 177]],
    [[312, 9], [371, 9], [413, 174], [367, 174], [359, 148], [279, 148], [304, 117], [352, 116], [334, 53], [189, 235], [142, 235], [121, 198], [163, 197]]
  ];
  var MCX = 209, MCY = 122, MS = 1.10;
  var CITIES = { tor: [43.65, -79.38], nyc: [40.71, -74.0], lon: [51.5, -0.12], fra: [50.1, 8.68], dxb: [25.2, 55.27], bom: [19.07, 72.88], sin: [1.35, 103.8], tyo: [35.68, 139.7], syd: [-33.87, 151.2], sao: [-23.55, -46.63], los: [6.52, 3.38], jnb: [-26.2, 28.04], nbo: [-1.29, 36.82], osl: [59.91, 10.75], nuuk: [64.18, -51.72], iqa: [63.75, -68.5], anc: [61.2, -149.9], rey: [64.15, -21.94], lax: [34.05, -118.24], mex: [19.43, -99.13], van: [49.28, -123.12], bru: [50.85, 4.35], ott: [45.42, -75.7], yel: [62.45, -114.37], tro: [69.65, 18.96] };
  var ARCS = [['tor', 'lon'], ['nuuk', 'tor'], ['iqa', 'osl'], ['lon', 'dxb'], ['ott', 'bru'], ['nyc', 'sao'], ['rey', 'tro'], ['tor', 'van'], ['fra', 'bom'], ['yel', 'anc'], ['lon', 'los'], ['dxb', 'sin'], ['van', 'tyo'], ['nyc', 'fra'], ['tor', 'mex'], ['jnb', 'nbo'], ['osl', 'nuuk'], ['lax', 'syd']];
  var LK = { ms: 0.74, mx: 0, my: 960, tx: 0, vb: 0, lb: 0, vf: 136, lf: 86, vw: 0 };
  var reduce = false;
  try { reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function seg(t, a, b) { return clamp((t - a) / (b - a)); }
  function eo3(x) { return 1 - Math.pow(1 - x, 3); }
  function ei3(x) { return x * x * x; }
  function eio3(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function eo5(x) { return 1 - Math.pow(1 - x, 5); }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function rng(s) {
    return function () {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      var t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function track(px) {
    try { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; } catch (e) {}
  }
  function markPath(cx, cy, s) {
    var p = new Path2D();
    for (var n = 0; n < MARK.length; n++) {
      var poly = MARK[n];
      for (var i = 0; i < poly.length; i++) {
        var X = cx + (poly[i][0] - MCX) * s, Y = cy + (poly[i][1] - MCY) * s;
        if (i) p.lineTo(X, Y); else p.moveTo(X, Y);
      }
      p.closePath();
    }
    return p;
  }
  function markGrad(cx, cy, s) {
    var g = ctx.createLinearGradient(cx - 210 * s, cy - 120 * s, cx + 210 * s, cy + 120 * s);
    g.addColorStop(0, '#E9521C'); g.addColorStop(0.28, '#FF7E1E'); g.addColorStop(0.5, '#F86812'); g.addColorStop(0.72, '#FF8A24'); g.addColorStop(1, '#E0461A');
    return g;
  }
  function drawMark(cx, cy, s, alpha, glow) {
    ctx.save(); ctx.globalAlpha = alpha;
    var p = markPath(cx, cy, s);
    if (glow > 0) { ctx.shadowColor = 'rgba(255,106,0,' + Math.min(1, glow) + ')'; ctx.shadowBlur = 60 * glow + 10; }
    ctx.fillStyle = markGrad(cx, cy, s); ctx.fill(p); ctx.shadowBlur = 0;
    ctx.clip(p);
    var g = ctx.createLinearGradient(cx, cy - 120 * s, cx, cy + 120 * s);
    g.addColorStop(0, 'rgba(255,200,140,0.10)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(90,10,0,0.18)');
    ctx.fillStyle = g; ctx.fillRect(cx - 260 * s, cy - 140 * s, 520 * s, 280 * s);
    ctx.restore();
  }
  function sweep(path, x0, x1, u, cy, a) {
    if (u <= 0 || u >= 1) return;
    ctx.save(); ctx.clip(path);
    var x = lerp(x0, x1, u);
    var g = ctx.createLinearGradient(x - 90, cy, x + 90, cy);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,240,220,' + a + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.setTransform(1, 0, -0.35, 1, 0.35 * cy, 0);
    ctx.fillStyle = g; ctx.fillRect(x - 100, cy - 300, 200, 600);
    ctx.restore();
  }
  function layoutLockup() {
    ctx.save(); ctx.font = '700 ' + LK.vf + 'px MS'; track(-2);
    LK.vw = ctx.measureText('voxarc').width; ctx.restore();
    var mw = 408 * LK.ms, gap = 26, total = mw + gap + LK.vw, x0 = CX - total / 2;
    LK.mx = x0 + mw / 2; LK.tx = x0 + mw + gap; LK.vb = LK.my + 8; LK.lb = LK.my + 92;
  }
  function lockText(alphaV, revealV, alphaL, dy) {
    ctx.save(); ctx.translate(0, dy || 0);
    ctx.font = '700 ' + LK.vf + 'px MS'; track(-2);
    var w = LK.vw;
    ctx.beginPath(); ctx.rect(LK.tx - 10, LK.vb - 170, (w + 30) * revealV, 200); ctx.save(); ctx.clip();
    ctx.globalAlpha = alphaV; ctx.fillStyle = '#F8F8F7'; ctx.fillText('voxarc', LK.tx, LK.vb); ctx.restore();
    if (revealV > 0 && revealV < 1) {
      var x = LK.tx - 10 + (w + 30) * revealV;
      var g = ctx.createLinearGradient(x - 70, 0, x + 10, 0);
      g.addColorStop(0, 'rgba(255,140,60,0)'); g.addColorStop(0.8, 'rgba(255,200,150,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 70, LK.vb - 120, 80, 140);
      ctx.fillStyle = 'rgba(255,230,200,.9)'; ctx.shadowColor = '#FF6A00'; ctx.shadowBlur = 30; ctx.fillRect(x - 2, LK.vb - 115, 3, 130);
    }
    ctx.globalAlpha = alphaL; ctx.font = '300 ' + LK.lf + 'px MS'; track(0); ctx.fillStyle = '#F8F8F7'; ctx.fillText('lab', LK.tx + 4, LK.lb);
    ctx.restore();
  }
  var grain = document.createElement('canvas'); grain.width = grain.height = 512;
  (function () {
    var g = grain.getContext('2d'), d = g.createImageData(512, 512), r = rng(7);
    for (var i = 0; i < d.data.length; i += 4) {
      var v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
  })();
  function bg() { ctx.globalAlpha = 1; ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); }
  function finishGrain() {
    ctx.save(); ctx.globalAlpha = 0.018;
    for (var y = 0; y < H; y += 512) for (var x = 0; x < W; x += 512) ctx.drawImage(grain, x, y);
    ctx.restore();
  }
  function v3(lat, lon) {
    var a = lat * Math.PI / 180, b = lon * Math.PI / 180;
    return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)];
  }
  function rot(p, yaw, tilt) {
    var x = p[0], y = p[1], z = p[2], c = Math.cos(yaw), s = Math.sin(yaw);
    var x2 = x * c + z * s, z2 = -x * s + z * c;
    var c2 = Math.cos(tilt), s2 = Math.sin(tilt);
    return [x2, y * c2 - z2 * s2, y * s2 + z2 * c2];
  }
  function slerp(a, b, u) {
    var d = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
    if (d < 1e-6) return a;
    var s = Math.sin(d), k1 = Math.sin((1 - u) * d) / s, k2 = Math.sin(u * d) / s;
    return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
  }
  var DOTS = null;
  var fontOK = false;
  function ensureLayout() {
    if (!fontOK && document.fonts && document.fonts.check) {
      fontOK = document.fonts.check('700 136px MS') && document.fonts.check('300 86px MS');
    }
    if (fontOK) layoutLockup();
    return fontOK;
  }
  function renderB(t) {
    bg();
    if (!DOTS) {
      var r = rng(9); DOTS = [];
      for (var i = 0; i < 420; i++) {
        var u = r() * 2 - 1, th = r() * 6.283;
        DOTS.push([Math.sqrt(1 - u * u) * Math.cos(th), u, Math.sqrt(1 - u * u) * Math.sin(th), r()]);
      }
    }
    var zoom = 1 + 3.2 * ei3(seg(t, 1.2, 1.86));
    var ga = eo3(seg(t, 0, 0.35)) * (1 - seg(t, 1.62, 1.86));
    var R = 430 * lerp(0.94, 1, eo3(seg(t, 0, 0.6))) * zoom;
    var gy = 960 + 170 * (zoom - 1);
    var yaw = 0.42 + t * 0.2 + 0.15 * ei3(seg(t, 1.2, 1.86)), tilt = 0.52;
    function P(p, h) {
      var q = rot(p, yaw, tilt), k = R * (1 + (h || 0));
      return [CX + q[0] * k, gy - q[1] * k, q[2]];
    }
    if (ga > 0) {
      ctx.save(); ctx.globalAlpha = ga;
      var g = ctx.createRadialGradient(CX, gy, R * 0.9, CX, gy, R * 1.22);
      g.addColorStop(0, 'rgba(255,106,0,0.22)'); g.addColorStop(1, 'rgba(255,106,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(CX, gy, R * 1.22, 0, 6.283); ctx.fill();
      g = ctx.createRadialGradient(CX - R * 0.35, gy - R * 0.4, R * 0.1, CX, gy, R);
      g.addColorStop(0, '#2A140A'); g.addColorStop(1, '#0C0503');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(CX, gy, R, 0, 6.283); ctx.fill();
      ctx.lineWidth = 1.3;
      function line(pts) {
        for (var i = 1; i < pts.length; i++) {
          var a = pts[i - 1], b = pts[i], z = (a[2] + b[2]) / 2;
          if (z < -0.05) continue;
          ctx.strokeStyle = 'rgba(255,120,50,' + (0.07 + 0.22 * z).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      }
      var la, lo, pts, k;
      for (la = -75; la <= 75; la += 15) { pts = []; for (lo = -180; lo <= 180; lo += 4) pts.push(P(v3(la, lo))); line(pts); }
      for (lo = -180; lo < 180; lo += 15) { pts = []; for (la = -90; la <= 90; la += 4) pts.push(P(v3(la, lo))); line(pts); }
      for (k = 0; k < DOTS.length; k++) {
        var q = P(DOTS[k]);
        if (q[2] < 0) continue;
        ctx.fillStyle = 'rgba(255,150,80,' + (0.12 + 0.4 * q[2] * DOTS[k][3]).toFixed(3) + ')';
        ctx.fillRect(q[0] - 1.2, q[1] - 1.2, 2.4, 2.4);
      }
      ctx.strokeStyle = 'rgba(255,130,50,0.55)'; ctx.lineWidth = 2; ctx.shadowColor = '#FF6A00'; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.arc(CX, gy, R, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'lighter';
      for (var ai = 0; ai < ARCS.length; ai++) {
        var st = 0.18 + ai * 0.055, dur = 0.42, u = eo3(seg(t, st, st + dur));
        if (u <= 0) continue;
        var A = v3(CITIES[ARCS[ai][0]][0], CITIES[ARCS[ai][0]][1]);
        var B = v3(CITIES[ARCS[ai][1]][0], CITIES[ARCS[ai][1]][1]);
        var N = 48; pts = [];
        for (k = 0; k <= N; k++) { var w = k / N; pts.push(P(slerp(A, B, w), 0.18 * Math.sin(Math.PI * w))); }
        var head = Math.floor(u * N); ctx.lineCap = 'round';
        for (k = 1; k <= head; k++) {
          var p0 = pts[k - 1], p1 = pts[k];
          if (p1[2] < -0.15 && Math.hypot(p1[0] - CX, p1[1] - gy) < R) continue;
          var fade = 0.35 + 0.65 * (k / Math.max(1, head));
          ctx.strokeStyle = 'rgba(255,110,20,' + (0.28 * fade) + ')'; ctx.lineWidth = 7;
          ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,170,90,' + (0.85 * fade) + ')'; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
        }
        var ends = [pts[0], u >= 1 ? pts[N] : null];
        for (k = 0; k < ends.length; k++) {
          var e = ends[k];
          if (e && e[2] > 0) { ctx.fillStyle = 'rgba(255,190,120,0.95)'; ctx.beginPath(); ctx.arc(e[0], e[1], 4, 0, 6.283); ctx.fill(); }
        }
        if (u < 1) {
          var h = pts[head];
          var g2 = ctx.createRadialGradient(h[0], h[1], 0, h[0], h[1], 22);
          g2.addColorStop(0, 'rgba(255,230,190,1)'); g2.addColorStop(1, 'rgba(255,106,0,0)');
          ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(h[0], h[1], 22, 0, 6.283); ctx.fill();
        }
      }
      ctx.restore();
    }
    var FP = 1.84;
    var f = t < FP ? Math.pow(seg(t, 1.45, FP), 2.2) : Math.exp(-(t - FP) * 6.5);
    if (f > 0.002) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      var fg = ctx.createRadialGradient(CX, 960, 0, CX, 960, 700);
      fg.addColorStop(0, 'rgba(255,236,210,' + (0.95 * f) + ')');
      fg.addColorStop(0.12, 'rgba(255,140,50,' + (0.75 * f) + ')');
      fg.addColorStop(0.5, 'rgba(255,90,0,' + (0.25 * f) + ')');
      fg.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = fg; ctx.fillRect(0, 260, W, 1400);
      ctx.translate(CX, 960); ctx.scale(1, 0.035);
      fg = ctx.createRadialGradient(0, 0, 0, 0, 0, 620);
      fg.addColorStop(0, 'rgba(255,220,180,' + (0.9 * f) + ')'); fg.addColorStop(1, 'rgba(255,106,0,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 0, 620, 0, 6.283); ctx.fill();
      ctx.restore();
    }
    var mu = seg(t, 1.8, 2.15), mv = eio3(seg(t, 2.0, 2.5));
    if (mu > 0) {
      var sc = lerp(MS * lerp(1.22, 1, eo5(mu)), LK.ms, mv);
      var mx = lerp(CX, LK.mx, mv);
      drawMark(mx, 960, sc, eo3(seg(t, 1.8, 1.95)), Math.max(0, 1 - seg(t, 1.8, 2.4)) * 1.2);
      sweep(markPath(mx, 960, sc), mx - 300, mx + 300, seg(t, 2.55, 2.95), 960, 0.45);
    }
    var wa = eo3(seg(t, 2.2, 2.6)), lb = eo3(seg(t, 2.35, 2.75));
    if (wa > 0 && ensureLayout()) lockText(wa, 1, lb, 0);
    finishGrain();
  }

  var gone = false, fading = false, raf = 0, holding = false;
  function paint(t) {
    if (gone) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    try { ctx.setLineDash([]); } catch (e) {}
    try { renderB(t); }
    catch (err) { beginFade(); }
  }
  function finish() {
    if (gone) return;
    gone = true;
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey, true);
    removeIntro();
    hideSplash();
  }
  function beginFade() {
    if (gone || fading) return;
    fading = true;
    if (raf) cancelAnimationFrame(raf);
    if (reduce) { finish(); return; }
    // Compositor fade so the handoff into #120804 (welcome) or the home screen is smooth.
    root.style.transition = 'opacity ' + FADE_MS + 'ms linear';
    root.style.opacity = '0';
    setTimeout(function () { if (!gone) root.style.pointerEvents = 'none'; }, 0);
    var ended = false;
    function end() {
      if (ended) return;
      ended = true;
      finish();
    }
    root.addEventListener('transitionend', end);
    setTimeout(end, FADE_MS + 80);
  }
  function skip() { beginFade(); }
  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); e.stopPropagation(); skip();
    }
  }
  root.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); skip(); });
  root.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });
  window.addEventListener('keydown', onKey, true);

  if (document.fonts && document.fonts.load) {
    document.fonts.load('700 136px MS').then(function () { return document.fonts.load('300 86px MS'); }).then(function () {
      fontOK = true; layoutLockup(); if (holding) paint(END);
    }).catch(function () { fontOK = true; });
  } else fontOK = true;

  window.__vxIntroAt = Date.now();
  setTimeout(finish, 4500);

  requestAnimationFrame(function () {
    paint(reduce ? END : 0);
    requestAnimationFrame(function () {
      hideSplash();
      if (gone) return;
      if (reduce) {
        holding = true;
        paint(END);
        setTimeout(beginFade, STILL_MS);
        return;
      }
      var t0 = performance.now();
      function loop(now) {
        if (gone || fading) return;
        var t = (now - t0) / 1000;
        if (t >= END) { paint(END); beginFade(); return; }
        paint(t);
        raf = requestAnimationFrame(loop);
      }
      raf = requestAnimationFrame(loop);
    });
  });
})();
