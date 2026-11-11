/* Small PDF writer. Built-in Helvetica only, real text from the caller. No remote fonts. */
(function () {
  'use strict';
  function latin(s) {
    return String(s == null ? '' : s).replace(/[^\x20-\x7E]/g, function (ch) {
      if (ch === '\u2019' || ch === '\u2018') return "'";
      if (ch === '\u201c' || ch === '\u201d') return '"';
      if (ch === '\u2013' || ch === '\u2014') return '-';
      if (ch === '\u00b7' || ch === '\u2022') return '-';
      return '';
    });
  }
  function esc(s) { return latin(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
  function wrap(s, n) {
    var words = latin(s).split(/\s+/).filter(Boolean), lines = [], cur = '';
    function take(w) {
      while (w.length > n) { if (cur) { lines.push(cur); cur = ''; } lines.push(w.slice(0, n)); w = w.slice(n); }
      var next = cur ? cur + ' ' + w : w;
      if (next.length > n && cur) { lines.push(cur); cur = w; }
      else cur = next;
    }
    words.forEach(take);
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }
  function pageStream(blocks) {
    var y = 760, out = [];
    function text(font, size, x, yy, str, color) {
      var c = color || '0 0 0';
      out.push(c + ' rg');
      out.push('BT /' + font + ' ' + size + ' Tf ' + x + ' ' + yy + ' Td (' + esc(str) + ') Tj ET');
    }
    out.push('0.878 0.329 0.102 rg');
    out.push('0 748 612 44 re f');
    text('F2', 16, 40, 764, 'VOXARC', '1 1 1');
    text('F1', 10, 150, 766, 'FEED', '1 1 1');
    text('F1', 9, 430, 766, blocks.kicker || 'Signal brief', '1 1 1');
    y = 724;
    (blocks.lines || []).forEach(function (ln) {
      if (y < 56) return;
      if (ln.rule) { out.push('0.90 0.89 0.88 rg'); out.push('40 ' + (y + 4) + ' 532 0.6 re f'); y -= 10; return; }
      text(ln.bold ? 'F2' : 'F1', ln.size || 11, ln.x || 40, y, ln.t, ln.color);
      y -= ln.gap || 15;
    });
    text('F1', 8, 40, 32, 'Voxarc Lab. Informational only. Not legal or trade-compliance advice.', '0.45 0.43 0.40');
    text('F1', 8, 40, 20, blocks.stamp || '', '0.45 0.43 0.40');
    return out.join('\n');
  }
  function build(pages) {
    var objs = [];
    function add(s) { objs.push(s); return objs.length; }
    var font1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    var font2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    var pageIds = pages.map(function (p) {
      var stream = pageStream(p);
      var cid = add('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
      return { cid: cid, lines: p };
    });
    var kids = pageIds.map(function (p) {
      return add('<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Contents ' + p.cid + ' 0 R /Resources << /Font << /F1 ' + font1 + ' 0 R /F2 ' + font2 + ' 0 R >> >> >>');
    });
    var pagesId = add('<< /Type /Pages /Kids [' + kids.map(function (id) { return id + ' 0 R'; }).join(' ') + '] /Count ' + kids.length + ' >>');
    var cat = add('<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>');
    objs[pagesId - 1] = objs[pagesId - 1];
    objs = objs.map(function (s) { return s.replace('/Parent 0 0 R', '/Parent ' + pagesId + ' 0 R'); });
    var body = '%PDF-1.4\n', offsets = [0];
    objs.forEach(function (s, i) {
      offsets.push(body.length);
      body += (i + 1) + ' 0 obj\n' + s + '\nendobj\n';
    });
    var xref = body.length;
    body += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offsets.slice(1).forEach(function (o) { body += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
    body += 'trailer << /Size ' + (objs.length + 1) + ' /Root ' + cat + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    var bytes = new Uint8Array(body.length);
    for (var i = 0; i < body.length; i++) bytes[i] = body.charCodeAt(i) & 255;
    return bytes;
  }
  function linesOf(title, sections) {
    var lines = [{ t: title, bold: true, size: 16, gap: 20 }];
    sections.forEach(function (sec) {
      if (!sec || !sec.body) return;
      lines.push({ t: sec.h, bold: true, size: 11, color: '0.878 0.329 0.102', gap: 14 });
      wrap(sec.body, 92).forEach(function (t) { lines.push({ t: t, size: 10, gap: 13 }); });
      lines.push({ rule: true });
    });
    return lines;
  }
  function paginate(kicker, title, sections, stamp) {
    var all = linesOf(title, sections), pages = [], chunk = [], used = 0, budget = 640;
    all.forEach(function (ln) {
      var h = ln.gap || 14;
      if (used + h > budget && chunk.length) { pages.push({ kicker: kicker, stamp: stamp, lines: chunk }); chunk = []; used = 0; }
      chunk.push(ln); used += h;
    });
    if (chunk.length) pages.push({ kicker: kicker, stamp: stamp, lines: chunk });
    return pages.length ? pages : [{ kicker: kicker, stamp: stamp, lines: [{ t: title, bold: true, size: 16 }] }];
  }
  function deliver(bytes, filename, title) {
    var blob = new Blob([bytes], { type: 'application/pdf' });
    var file = new File([blob], filename, { type: 'application/pdf' });
    window.__vxLastPdf = { name: filename, bytes: bytes, title: title };
    function download() {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    }
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: title }).catch(function (e) {
        if (e && e.name === 'AbortError') return;
        download();
      });
    }
    download();
    return Promise.resolve();
  }
  window.VXPdf = { build: build, paginate: paginate, deliver: deliver, latin: latin };
})();
