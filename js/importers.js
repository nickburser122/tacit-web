const Importers = (() => {
  const Csv = {
    encode(rows) {
      return rows.map(r => r.map(f => {
        const s = String(f ?? '');
        return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',')).join('\n');
    },
    decode(text) {
      const rows = [];
      let row = [];
      let field = '';
      let quoted = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
          if (c === '"') {
            if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
          } else field += c;
        } else if (c === '"') quoted = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (c !== '\r') field += c;
      }
      if (field || row.length) { row.push(field); rows.push(row); }
      return rows;
    }
  };

  function bookmarks(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const out = [];
    const seen = new Set();
    for (const a of doc.querySelectorAll('a[href]')) {
      const url = a.getAttribute('href');
      if (!/^https?:/i.test(url) || seen.has(url)) continue;
      seen.add(url);
      const name = (a.textContent || '').trim() || url;
      const shortcut = a.getAttribute('shortcuturl');
      out.push({ name, url, aliases: shortcut ? [shortcut] : [] });
    }
    return out;
  }

  function unfold(text) {
    return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  }

  function decodeValue(value, params) {
    let v = value;
    if (/ENCODING=QUOTED-PRINTABLE/i.test(params)) {
      const bytes = [];
      v = v.replace(/=\n/g, '');
      for (let i = 0; i < v.length; i++) {
        if (v[i] === '=' && /^[0-9A-F]{2}$/i.test(v.substr(i + 1, 2))) { bytes.push(parseInt(v.substr(i + 1, 2), 16)); i += 2; }
        else bytes.push(v.charCodeAt(i));
      }
      try { v = new TextDecoder('utf-8').decode(new Uint8Array(bytes)); } catch (e) {}
    }
    return v.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/gi, ' ').trim();
  }

  function vcards(text) {
    const people = [];
    for (const block of unfold(text).split(/BEGIN:VCARD/i).slice(1)) {
      const person = { name: '', phones: [], emails: [], aliases: [] };
      let structured = '';
      for (const line of block.split('\n')) {
        const m = /^([^:]+):(.*)$/.exec(line);
        if (!m) continue;
        const [, head, raw] = m;
        const key = head.split(';')[0].toUpperCase().replace(/^ITEM\d+\./, '');
        const value = decodeValue(raw, head);
        if (key === 'FN') person.name = value;
        else if (key === 'N') structured = value.split(';').filter(Boolean).reverse().join(' ');
        else if (key === 'TEL' && value) person.phones.push(value.replace(/[^\d+]/g, ''));
        else if (key === 'EMAIL' && value) person.emails.push(value);
        else if (key === 'NICKNAME' && value) person.aliases.push(...value.split(',').map(s => s.trim()).filter(Boolean));
      }
      if (!person.name) person.name = structured;
      person.phones = [...new Set(person.phones.filter(Boolean))];
      person.emails = [...new Set(person.emails)];
      if (person.name) people.push(person);
    }
    return people;
  }

  return { Csv, bookmarks, vcards };
})();
