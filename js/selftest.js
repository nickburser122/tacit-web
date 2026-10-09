(() => {
  const results = [];
  const check = (name, ok, got) => results.push((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  got: ' + JSON.stringify(got)));
  const item = (label, kind, extra) => ({ key: kind + ':' + label, kind: kind || 'person', label, extra: extra || [], aliases: [] });

  Engine.configure({ strictness: 'normal', transliterate: true, kindOrder: ['link', 'person', 'snippet', 'command', 'action', 'calc', 'web', 'clip'] });
  const base = [
    item('Asmaa Gouda'), item('أسماء جودة'), item('Gamal Osman'), item('Ahmed Galal'), item('Mohamed Salah'),
    item('YouTube', 'link'), item('YouTube Music', 'link'), item('WhatsApp Web', 'link'), item('Gmail', 'link'),
    item('Google', 'link'), item('Maps', 'link'), item('Calendar', 'link'), item('Wi-Fi', 'link', ['wifi']), item('Bluetooth', 'link')
  ];
  Engine.setItems(base);
  const labels = q => Engine.search(q, 10).map(h => h.item.label);
  const top = q => labels(q)[0];

  check('gos -> Asmaa Gouda', labels('gos').includes('Asmaa Gouda'), labels('gos'));
  check('ag -> Asmaa Gouda in top 3', labels('ag').slice(0, 3).includes('Asmaa Gouda'), labels('ag'));
  check('gou -> Asmaa Gouda first', top('gou') === 'Asmaa Gouda', labels('gou'));
  check('asm gou', top('asm gou') === 'Asmaa Gouda', labels('asm gou'));
  check('gou asm (any order)', top('gou asm') === 'Asmaa Gouda', labels('gou asm'));
  check('asmaa -> Arabic contact', labels('asmaa').includes('أسماء جودة'), labels('asmaa'));
  check('اسماء -> hamza folding', labels('اسماء').includes('أسماء جودة'), labels('اسماء'));
  check('wfi -> Wi-Fi', top('wfi') === 'Wi-Fi', labels('wfi'));
  check('blutooth -> Bluetooth', top('blutooth') === 'Bluetooth', labels('blutooth'));
  check('yt -> YouTube', top('yt') === 'YouTube', labels('yt'));
  check('maps exact', top('maps') === 'Maps', labels('maps'));
  check('zq -> nothing', labels('zq').length === 0, labels('zq'));
  check('xouda -> nothing (first letter rule)', labels('xouda').length === 0, labels('xouda'));
  check('prefixDistance swap', Engine.prefixDistance('gmial', 'gmail', 2) === 1, Engine.prefixDistance('gmial', 'gmail', 2));

  const withAlias = base.map(i => ({ ...i }));
  withAlias.find(i => i.label === 'Gmail').aliases = ['work'];
  withAlias.find(i => i.label === 'Calendar').aliases = ['work', 'cal'];
  Engine.setItems(withAlias);
  check('alias beats prefix (cal)', top('cal') === 'Calendar', labels('cal'));
  check('shared alias shows both', new Set(labels('work').slice(0, 2)).size === 2 && labels('work').slice(0, 2).every(l => ['Gmail', 'Calendar'].includes(l)), labels('work'));
  Engine.setItems(base);

  check('top-k matches full ranking', JSON.stringify(Engine.search('a', 3).map(h => h.item.label)) === JSON.stringify(labels('a').slice(0, 3)), Engine.search('a', 3).map(h => h.item.label));
  check('gmial -> Gmail via typo pass', top('gmial') === 'Gmail', labels('gmial'));

  const usage = {};
  Engine.configure({ usage });
  Engine.setItems([item('Alpha One', 'link'), item('Alpha Two', 'link')]);
  check('frecency neutral order', top('alpha') === 'Alpha One', labels('alpha'));
  Engine.frecency.bump(usage, 'link:Alpha Two', Date.now());
  check('frecency boosts used item', top('alpha') === 'Alpha Two', labels('alpha'));
  check('frecency empty query lists used', labels('')[0] === 'Alpha Two', labels(''));
  Engine.configure({ usage: {} });
  Engine.setItems(base);

  const big = [];
  const syl = ['ka', 'lo', 'mi', 'ra', 'su', 'ten', 'bo', 'zan', 'el', 'dar', 'fi', 'gu'];
  let seed = 1;
  const rnd = n => { seed = (seed * 16807) % 2147483647; return seed % n; };
  for (let i = 0; i < 4000; i++) {
    const words = 2 + rnd(2);
    const name = Array.from({ length: words }, () => Array.from({ length: 2 + rnd(2) }, () => syl[rnd(syl.length)]).join('')).join(' ');
    big.push(item(name + ' ' + i));
  }
  Engine.setItems(big.concat(base));
  const qs = ['k', 'ka', 'kal', 'kalo', 'kalom', 'dra', 'sut', 'zanel', 'gufi', 'gos', 'asm gou'];
  for (let i = 0; i < 5; i++) qs.forEach(q => Engine.search(q, 8));
  const times = [];
  for (let r = 0; r < 10; r++) for (const q of qs) { const t0 = performance.now(); Engine.search(q, 8); times.push(performance.now() - t0); }
  times.sort((a, b) => a - b);
  const p95 = times[Math.floor(times.length * 0.95)];
  check('keystroke p95 < 16ms on 4,014 items (' + p95.toFixed(2) + 'ms)', p95 < 16, p95);
  Engine.setItems(base);

  Calc.setClock(() => new Date(Date.UTC(2026, 9, 8, 12, 0, 0)));
  const calc = q => Calc.evaluate(q)?.copy;
  const calcCases = {
    '1+1': '2', '2+3*4': '14', '(2+3)*4': '20', '10/4': '2.5', '2^10': '1024', '-5+3': '-2', '5!': '120', '10 mod 3': '1',
    'sqrt 16': '4', '0.1+0.2': '0.3', '2(3+4)': '14', 'abs(-7)': '7', '2^-1': '0.5', '7 - -2': '9',
    '5 plus 3 times 2': '11', '15% of 340': '51', '340 + 15%': '391', '200 - 10%': '180', 'half of 90': '45', 'twice 12': '24',
    '10 divided by 4': '2.5', '3 squared': '9', '6 x 7': '42', '12 × 3': '36', '9 ÷ 3': '3', '50 is what % of 200': '25',
    '20% off 50': '40', '٢+٣': '5', '1,000*2': '2000',
    '5 km in miles': '3.1068559612', '72f to c': '22.2222222222', '3gb in mb': '3000', '100 c to f': '212', '1 kg in lb': '2.2046226218',
    '1 feddan in m2': '4200', '255 in hex': '0xFF', '0xff in binary': '0b11111111', '8 in octal': '0o10',
    'time in tokyo': '21:00', 'time in dubai': '16:00', '5pm dubai in tokyo': '22:00', 'time in new york': '08:00',
    'today - 2024-01-01': '1011', 'next friday + 3 weeks': '2026-10-30'
  };
  for (const [q, expected] of Object.entries(calcCases)) check('calc ' + q, calc(q) === expected, calc(q));
  check('calc 42 is not a result', calc('42') == null, calc('42'));
  check('calc youtube is not math', !Calc.looksLikeMath('youtube'), true);
  check('calc 5 km in kg -> null', calc('5 km in kg') == null, calc('5 km in kg'));
  ['', '(', '1/0', '+', '2^^3', 'sqrt(-1)', '1000!', 'e^', '%%%', '10 mod 0', 'days until', 'time in', '9'.repeat(400)]
    .forEach(q => { try { Calc.evaluate(q); check('calc safe: ' + q.slice(0, 12), true); } catch (e) { check('calc safe: ' + q.slice(0, 12), false, String(e)); } });

  check('sensitive card', Sensitive.classify('4111 1111 1111 1111') === 'card', Sensitive.classify('4111 1111 1111 1111'));
  check('sensitive iban', Sensitive.classify('GB82 WEST 1234 5698 7654 32') === 'iban', Sensitive.classify('GB82 WEST 1234 5698 7654 32'));
  check('sensitive otp', Sensitive.classify('482913') === 'otp', Sensitive.classify('482913'));
  check('sensitive token', Sensitive.classify('ghp_9fK2LmQ8xR4tZ7vB1nC3dE6hJ0pS5wYa') === 'token', Sensitive.classify('ghp_9fK2LmQ8xR4tZ7vB1nC3dE6hJ0pS5wYa'));
  check('sensitive plain', Sensitive.classify('meet at 5pm near the station') === null, Sensitive.classify('meet at 5pm near the station'));
  check('sensitive bad luhn', Sensitive.classify('4111 1111 1111 1112') === null, Sensitive.classify('4111 1111 1111 1112'));

  const st = Store.fresh();
  check('parse ddg', Compose.parse('ddg hello', st).scope === 'web', Compose.parse('ddg hello', st));
  check('parse ytmusic stays all', Compose.parse('ytmusic', st).scope === 'all', Compose.parse('ytmusic', st));
  check('parse cb', Compose.parse('cb pass', st).scope === 'clip', Compose.parse('cb pass', st));
  check('parse @', Compose.parse('@asmaa', st).scope === 'person', Compose.parse('@asmaa', st));
  check('recognize phone', Compose.recognize('+20 100 123 4567')?.value === '+201001234567', Compose.recognize('+20 100 123 4567'));
  check('recognize arabic digits', Compose.recognize('٠١٠٠١٢٣٤٥٦٧')?.value === '01001234567', Compose.recognize('٠١٠٠١٢٣٤٥٦٧'));
  check('recognize url', Compose.recognize('example.org')?.value === 'https://example.org', Compose.recognize('example.org'));
  check('recognize email', Compose.recognize('a@b.com')?.type === 'email', Compose.recognize('a@b.com'));
  check('recognize name -> null', Compose.recognize('asmaa gouda') === null, Compose.recognize('asmaa gouda'));
  check('engine url encodes', Compose.engineUrl({ url: 'https://d.com/?q=%s' }, 'a b&c') === 'https://d.com/?q=a+b%26c', Compose.engineUrl({ url: 'https://d.com/?q=%s' }, 'a b&c'));

  Engine.setItems(Compose.buildItems(st));
  const composed = Compose.compose('2+2', st).rows;
  check('compose calc first', composed[0]?.kind === 'calc' && composed[0].label === '4', composed[0]);
  check('compose web last', composed[composed.length - 1]?.kind === 'web', composed[composed.length - 1]);

  const csv = [['a', 'x, y'], ['k"q', 'line\nbreak']];
  check('csv round trip', JSON.stringify(Importers.Csv.decode(Importers.Csv.encode(csv))) === JSON.stringify(csv), Importers.Csv.decode(Importers.Csv.encode(csv)));
  const vcf = 'BEGIN:VCARD\nVERSION:3.0\nFN:Asmaa Gouda\nTEL;TYPE=CELL:+20 100 123 4567\nEMAIL:a@b.com\nNICKNAME:Simsim\nEND:VCARD\nBEGIN:VCARD\nN:جودة;أسماء;;;\nTEL:0100\nEND:VCARD';
  const people = Importers.vcards(vcf);
  check('vcf parse 2 people', people.length === 2 && people[0].phones[0] === '+201001234567' && people[0].aliases[0] === 'Simsim', people);
  check('vcf N fallback', people[1]?.name === 'أسماء جودة', people[1]);
  const bm = Importers.bookmarks('<DL><DT><A HREF="https://a.com" SHORTCUTURL="aa">A</A><DT><A HREF="javascript:x">J</A></DL>');
  check('bookmarks parse', bm.length === 1 && bm[0].aliases[0] === 'aa', bm);

  async function clipboardChecks() {
    const realChanged = Store.changed;
    Store.changed = () => {};
    const s = Store.state.settings;
    const notAllowed = () => Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }));
    const granted = () => Promise.resolve('hello');
    const setup = (perm, impl, withApi = true) => {
      const calls = { n: 0 };
      ClipAccess.setNavigator({
        clipboard: withApi ? { readText: () => { calls.n++; return impl(); } } : undefined,
        permissions: perm ? { query: async () => ({ state: perm }) } : undefined
      });
      return calls;
    };
    const reset = () => { s.clipDenied = 0; s.clipCaptureOnFocus = true; };

    reset();
    let calls = setup('prompt', granted);
    let r = await ClipAccess.read({ mode: 'auto' });
    check('clip auto never prompts', !r.ok && calls.n === 0, { r, n: calls.n });

    calls = setup('granted', granted);
    r = await ClipAccess.read({ mode: 'auto' });
    check('clip auto reads when granted', r.ok && r.text === 'hello' && calls.n === 1, { r, n: calls.n });

    calls = setup(null, granted);
    r = await ClipAccess.read({ mode: 'auto' });
    check('clip auto skipped without permission api', !r.ok && calls.n === 0, { r, n: calls.n });

    reset();
    calls = setup('prompt', notAllowed);
    r = await ClipAccess.read({ mode: 'assist' });
    check('clip dismissal records denial', !r.ok && !!s.clipDenied && s.clipCaptureOnFocus === false && calls.n === 1, { r, n: calls.n, d: s.clipDenied });
    r = await ClipAccess.read({ mode: 'assist' });
    check('clip assist does not ask again', !r.ok && calls.n === 1, { r, n: calls.n });
    r = await ClipAccess.read({ mode: 'auto' });
    check('clip auto does not ask after denial', !r.ok && calls.n === 1, { r, n: calls.n });
    r = await ClipAccess.read({ mode: 'manual' });
    check('clip manual retries on request', calls.n === 2, calls.n);

    reset();
    calls = setup('denied', granted);
    r = await ClipAccess.read({ mode: 'manual' });
    check('clip browser-denied never calls readText', !r.ok && calls.n === 0 && !!s.clipDenied && s.clipCaptureOnFocus === false, { r, n: calls.n });

    s.clipDenied = Date.now();
    calls = setup('granted', granted);
    r = await ClipAccess.read({ mode: 'assist' });
    check('clip recovers when browser grants', r.ok && s.clipDenied === 0, { r, d: s.clipDenied });

    calls = setup('prompt', granted, false);
    r = await ClipAccess.read({ mode: 'manual' });
    check('clip unsupported', !r.ok && r.reason === 'unsupported', r);

    ClipAccess.setNavigator(null);
    s.clipDenied = 0;
    s.clipCaptureOnFocus = false;
    Store.changed = realChanged;
  }

  clipboardChecks().then(() => {
    const fails = results.filter(r => r.startsWith('FAIL'));
    document.getElementById('out').textContent = `${results.length - fails.length}/${results.length} passed\n\n` + results.join('\n');
    console.log(`SELFTEST ${results.length - fails.length}/${results.length} passed`);
    fails.forEach(f => console.log(f));
  });
})();
