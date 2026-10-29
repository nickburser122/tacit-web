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

  const dur = q => { const r = Timers.parse(q); return r ? r.seconds + '|' + r.label : null; };
  const durCases = {
    'timer 25m': '1500|', '25 min timer tea': '1500|tea', 'timer 1h30': '5400|', 'timer 1h 30m call mom': '5400|call mom',
    'remind me in 5 minutes to call mom': '300|call mom', 'timer 90s': '90|', 'timer 5:00': '300|', 'timer 10': '600|',
    'timer 2 hours and 15 minutes': '8100|', '10m': '600|', '1.5h': '5400|', 'pomodoro': '1500|', 'مؤقت ٢٥m': '1500|',
    'timer': null, 'timer abc': null, '5 min in sec': null, 'timer 0': null, 'timer 100h': null, 'youtube': null, '5 km in miles': null
  };
  for (const [q, expected] of Object.entries(durCases)) check('timer parse ' + q, dur(q) === expected, dur(q));
  check('timer bare flag', Timers.parse('10m')?.bare === true && !Timers.parse('timer 10m')?.bare, Timers.parse('10m'));
  check('timer format', Timers.format(90) === '1:30' && Timers.format(3661) === '1:01:01' && Timers.format(5) === '0:05', [Timers.format(90), Timers.format(3661), Timers.format(5)]);
  check('timer remaining', Timers.remaining({ end: 10500 }, 10000) === 1 && Timers.remaining({ end: 9000 }, 10000) === 0, Timers.remaining({ end: 10500 }, 10000));

  const colorOf = q => { const c = Color.parse(q); return c ? c.hex + ' ' + c.rgb + ' ' + c.hsl : null; };
  check('color hex', colorOf('#c2663a') === '#c2663a rgb(194, 102, 58) hsl(19, 54%, 49%)', colorOf('#c2663a'));
  check('color short hex', Color.parse('#fff')?.hex === '#ffffff', Color.parse('#fff'));
  check('color rgb', Color.parse('rgb(255 0 0)')?.hex === '#ff0000' && Color.parse('rgba(0, 255, 0, .5)')?.hex === '#00ff00', Color.parse('rgb(255 0 0)'));
  check('color hsl', Color.parse('hsl(120, 100%, 50%)')?.hex === '#00ff00' && Color.parse('hsl(0 0% 100%)')?.hex === '#ffffff', Color.parse('hsl(120, 100%, 50%)'));
  check('color rejects', ['blue', 'abc', '#12', '#gggggg', 'rgb(300,0,0)', 'hsl(10, 120%, 50%)', 'color'].every(q => Color.parse(q) === null), null);

  const at = (h, m) => Sky.at(new Date(2026, 9, 13, h, m || 0));
  check('sky noon is bright warm day', at(12).day && at(12).intensity > 0.95 && at(12).hue > 30 && at(12).hue < 50, at(12));
  check('sky dawn is warm', at(7).hue < 45, at(7));
  check('sky dusk is warm', at(18).hue < 30, at(18));
  check('sky night is cool and dim', !at(23, 30).day && at(23, 30).hue > 215 && at(23, 30).hue < 235 && at(23, 30).intensity < 0.6, at(23, 30));
  let skyOk = true;
  for (let m = 0; m < 1440; m += 7) {
    const k = Sky.at(new Date(2026, 9, 13, Math.floor(m / 60), m % 60));
    if (!(k.x >= 10 && k.x <= 90 && k.intensity > 0.1 && k.intensity <= 1 && k.sat >= 30 && k.sat <= 70 && Number.isFinite(k.hue) && Number.isFinite(k.y))) skyOk = false;
  }
  check('sky stays in range all day', skyOk, null);

  check('parse task prefix', Compose.parse('+ buy milk', st).scope === 'task' && Compose.parse('+ buy milk', st).text === 'buy milk', Compose.parse('+ buy milk', st));
  check('parse +5 stays math', Compose.parse('+5', st).scope === 'all' && Compose.parse('+(2*3)', st).scope === 'all', Compose.parse('+5', st));
  check('compose task add first', Compose.compose('+ buy milk', st).rows[0]?.kind === 'task-add', Compose.compose('+ buy milk', st).rows);
  const stTasks = Store.fresh();
  stTasks.tasks.push({ id: 'a', text: 'Buy milk', done: false }, { id: 'b', text: 'Call the bank', done: true, doneAt: 5 });
  const taskKinds = Compose.compose('+ milk', stTasks).rows.map(r => r.kind).join(',');
  check('compose task filter', taskKinds === 'task-add,task', taskKinds);
  const allTasks = Compose.compose('+', stTasks).rows;
  check('compose task list open first', allTasks.length === 2 && allTasks[0].id === 'a' && allTasks[1].done === true, allTasks);
  const homeRows = Compose.compose('', st).rows;
  check('compose home tiles', homeRows.length === 8 && homeRows.every(r => r.kind === 'link'), homeRows.length);
  check('compose color rows', Compose.compose('#c2663a', st).rows.filter(r => r.kind === 'color').length === 3, Compose.compose('#c2663a', st).rows);
  check('compose timer row first', Compose.compose('25m timer', st).rows[0]?.kind === 'timer' && Compose.compose('25m timer', st).rows[0].payload.seconds === 1500, Compose.compose('25m timer', st).rows[0]);
  check('compose math unaffected', Compose.compose('5+5', st).rows[0]?.kind === 'calc', Compose.compose('5+5', st).rows[0]);
  check('compose conversion unaffected', Compose.compose('5 min in sec', st).rows[0]?.kind === 'calc', Compose.compose('5 min in sec', st).rows[0]);
  check('zoneOf cities', Calc.zoneOf('tokyo') === 'Asia/Tokyo' && Calc.zoneOf('new york') === 'America/New_York' && Calc.zoneOf('nowhere') === null, Calc.zoneOf('tokyo'));
  check('store defaults', Array.isArray(st.tasks) && Array.isArray(st.timers) && st.settings.prefixes.tasks === '+' && st.settings.accent === 'ember' && st.settings.worlds === undefined && st.settings.greeting === false, st.settings);

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


  async function moreChecks() {
    const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const st = Store.fresh();
    const eng = prefix => st.engines.find(e => e.prefix === prefix);

    check('links safe https', Links.safe('https://a.com') && Links.safe('tel:+20100') && Links.safe('obsidian://open?x=1'), null);
    check('links unsafe schemes', ['javascript:alert(1)', ' JaVaScRiPt:x', 'java\tscript:x', 'data:text/html,x', 'vbscript:x', 'blob:abc', '', null].every(u => !Links.safe(u)), null);
    check('links clean strips trackers', eq(Links.clean('https://e.com/a?utm_source=x&id=5&fbclid=1'), { url: 'https://e.com/a?id=5', removed: 2 }), Links.clean('https://e.com/a?utm_source=x&id=5&fbclid=1'));
    check('links clean drops empty query', Links.clean('https://e.com/?utm_x=1').url === 'https://e.com/', Links.clean('https://e.com/?utm_x=1'));
    check('links clean youtube si only', Links.clean('https://youtu.be/abc?si=z&t=5').url === 'https://youtu.be/abc?t=5' && Links.clean('https://e.com/?si=1').removed === 0, Links.clean('https://youtu.be/abc?si=z&t=5'));
    check('links clean ignores non urls', Links.clean('hello').removed === 0 && Links.clean('mailto:a@b.c').removed === 0, null);
    check('links normalize host', Links.normalizeHost('lingva.ml/') === 'https://lingva.ml' && Links.normalizeHost('http://x.org/p/') === 'http://x.org/p' && Links.normalizeHost('javascript:x') === '' && Links.normalizeHost('') === '', null);

    check('provider percent plus', Providers.build(eng('ddg'), 'a b&c') === 'https://duckduckgo.com/?q=a+b%26c', Providers.build(eng('ddg'), 'a b&c'));
    check('provider translate path', Providers.build(eng('tr'), 'good morning') === 'https://lingva.ml/auto/ar/good%20morning', Providers.build(eng('tr'), 'good morning'));
    check('provider translate arabic to en', Providers.build(eng('tr'), 'صباح').startsWith('https://lingva.ml/auto/en/'), Providers.build(eng('tr'), 'صباح'));
    check('provider translate forced target', Providers.build(eng('tr'), 'hello', { to: 'fr' }) === 'https://lingva.ml/auto/fr/hello', Providers.build(eng('tr'), 'hello', { to: 'fr' }));
    check('provider translate settings', Providers.build(eng('tr'), 'hello', { state: { settings: { translateOtherTo: 'de', translateArabicTo: 'en' } } }) === 'https://lingva.ml/auto/de/hello', null);
    check('provider placeholders not reexpanded', Providers.build({ url: '{host}/{q}', host: 'https://h.io', hostDefault: 'https://h.io' }, '{to}') === 'https://h.io/%7Bto%7D', Providers.build({ url: '{host}/{q}', host: 'https://h.io', hostDefault: 'https://h.io' }, '{to}'));
    check('provider wiki language', Providers.build(eng('w'), 'مصر').startsWith('https://ar.wikipedia.org/') && Providers.build(eng('w'), 'egypt').startsWith('https://en.wikipedia.org/'), null);
    check('provider host override', Providers.build({ ...eng('r'), host: 'https://redlib.example/' }, 'cats') === 'https://redlib.example/search?q=cats', Providers.build({ ...eng('r'), host: 'https://redlib.example/' }, 'cats'));
    check('provider blank host falls to default', Providers.build({ ...eng('yt'), host: '' }, 'x') === 'https://www.youtube.com/results?search_query=x', null);
    check('provider unusable without host', !Providers.usable(eng('sx')) && Providers.usable(eng('tr')) && Providers.usable({ ...eng('sx'), host: 'https://s.example' }), null);
    check('provider home', Providers.home(eng('gh')) === 'https://github.com' && Providers.home(eng('r')) === 'https://www.reddit.com', null);

    const scoped = q => Providers.parseScoped(q, st);
    check('scoped target tr>fr', scoped('tr>fr bonjour')?.to === 'fr' && scoped('tr>fr bonjour')?.text === 'bonjour' && scoped('tr>fr bonjour')?.engine.prefix === 'tr', scoped('tr>fr bonjour'));
    check('scoped target colon and empty text', scoped('tr:ar-eg')?.to === 'ar-eg' && scoped('tr>fr')?.text === '', scoped('tr:ar-eg'));
    check('scoped plain prefix', scoped('g cats')?.engine.prefix === 'g' && scoped('g cats')?.text === 'cats' && scoped('tr hello')?.to === undefined, scoped('g cats'));
    check('scoped rejects lookalikes', scoped('trx') === null && scoped('gh') === null && scoped('g>fr x') === null, null);
    check('scoped skips unusable', scoped('sx cats') === null, scoped('sx cats'));

    const jump = q => Providers.direct(q, st).map(r => r.payload);
    check('direct repo', eq(jump('microsoft/vscode'), ['https://github.com/microsoft/vscode']), jump('microsoft/vscode'));
    check('direct reddit', eq(jump('r/privacy'), ['https://www.reddit.com/r/privacy']) && eq(jump('/u/spez'), ['https://www.reddit.com/u/spez']), [jump('r/privacy'), jump('/u/spez')]);
    check('direct ignores noise', ['1/2', 'example.org/page', 'a b/c', 'km', 'a/'].every(q => jump(q).length === 0), null);

    const names = q => Providers.rank(q, st).map(e => e.prefix);
    check('rank default first', names('hello world')[0] === 'ddg', names('hello world'));
    check('rank word surfaces dictionary', names('hello').indexOf('d') < names('hello').indexOf('g') && names('hello').indexOf('d') <= 2, names('hello'));
    check('rank arabic word', names('مرحبا').slice(0, 3).includes('d') && names('مرحبا').slice(0, 3).includes('tr'), names('مرحبا'));
    check('rank repo and reddit', names('microsoft/vscode').slice(0, 2).includes('gh') && names('r/privacy').slice(0, 2).includes('r'), [names('microsoft/vscode'), names('r/privacy')]);
    check('rank hides unusable', !names('x').includes('sx'), names('x'));

    const legacy = [
      { id: 'a', prefix: 'w', name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php?search=%s', aliases: [] },
      { id: 'b', prefix: 'yt', name: 'YouTube', url: 'https://www.youtube.com/results?search_query=%s', aliases: [] },
      { id: 'c', prefix: 'w2', name: 'My wiki', url: 'https://wiki.me/?s=%s', aliases: [] }
    ];
    const migrated = Providers.migrate(legacy, () => 'n' + Math.random());
    check('migrate upgrades defaults', migrated.find(e => e.id === 'a').url.includes('{lang}') && migrated.find(e => e.id === 'b').hostDefault === 'https://www.youtube.com', migrated.slice(0, 2));
    check('migrate keeps custom', migrated.find(e => e.id === 'c').url === 'https://wiki.me/?s=%s' && migrated.find(e => e.id === 'c').cat === 'web', migrated.find(e => e.id === 'c'));
    check('migrate adds missing defaults once', migrated.length === 15 + 1 && new Set(migrated.map(e => e.prefix)).size === migrated.length, migrated.map(e => e.prefix));

    const merged = Store.merge({
      version: 1,
      links: [{ id: 'x', name: 'bad', url: 'javascript:alert(1)' }, { id: 'y', name: 'ok', url: 'https://ok.com' }, { id: 'z', name: 'blank', url: '' }],
      engines: legacy.concat([{ id: 'd', prefix: 'evil', name: 'Evil', url: 'javascript:alert({q})' }]),
      settings: { kindOrder: ['link', 'person', 'web'] }
    });
    check('merge drops unsafe links keeps blank', eq(merged.links.map(l => l.id), ['y', 'z']), merged.links);
    check('merge drops unsafe engines', !merged.engines.some(e => e.prefix === 'evil'), merged.engines.map(e => e.prefix));
    check('merge migrates and versions', merged.version === 2 && merged.engines.length === 16 && Array.isArray(merged.sets) && Array.isArray(merged.notes), merged.version);
    check('merge fills kind order', merged.settings.kindOrder.includes('set') && merged.settings.kindOrder.indexOf('set') < merged.settings.kindOrder.indexOf('web') && merged.settings.kindOrder.includes('clip'), merged.settings.kindOrder);
    check('merge sanitizes sets', eq(Store.merge({ sets: [{ id: 's', name: 'n', urls: ['https://a.com', 'javascript:x'] }] }).sets[0].urls, ['https://a.com']), null);
    check('merge version 2 not remigrated', Store.merge({ version: 2, engines: [legacy[2]] }).engines.length === 1, null);

    const hex = text => Tools.sha256(Tools.utf8(text));
    check('sha256 empty', hex('') === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', hex(''));
    check('sha256 abc', hex('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', hex('abc'));
    check('sha256 two blocks', hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq') === '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1', hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'));
    check('sha256 unicode', hex('مرحبا').length === 64 && hex('مرحبا') !== hex('مرحبى'), null);
    check('base64 known', Tools.toBase64('hello') === 'aGVsbG8=', Tools.toBase64('hello'));
    check('base64 round trip', ['مرحبا بالعالم', 'a', 'ab', 'abc', '😀 x', 'x'.repeat(70000)].every(t => Tools.fromBase64(Tools.toBase64(t)) === t), null);
    check('base64 url safe and bad input', Tools.fromBase64('aGk_') !== undefined && Tools.fromBase64('!!!') === null && Tools.fromBase64('/w==') === null, null);
    check('layout swap both ways', Tools.swapLayout('hgsghl') === 'السلام' && Tools.swapLayout('السلام') === 'hgsghl' && Tools.swapLayout('hgsghl ugd;l') === 'السلام عليكم', [Tools.swapLayout('hgsghl'), Tools.swapLayout('hgsghl ugd;l')]);
    check('digits both ways', Tools.toLatinDigits('٠١٢٣٤٥٦٧٨٩ ۰۱۲') === '0123456789 012' && Tools.toArabicDigits('2026-10') === '٢٠٢٦-١٠', null);
    check('slug', Tools.slug('  Hello, Wörld! 2026 ') === 'hello-world-2026' && Tools.slug('مرحبا بالعالم') === 'مرحبا-بالعالم', [Tools.slug('  Hello, Wörld! 2026 '), Tools.slug('مرحبا بالعالم')]);

    const tool = q => Tools.parse(q).map(r => r.label);
    check('tool parse b64 url upper', tool('b64 hello')[0] === 'aGVsbG8=' && tool('url a b&c')[0] === 'a%20b%26c' && tool('upper abc')[0] === 'ABC' && tool('unb64 aGVsbG8=')[0] === 'hello', [tool('b64 hello'), tool('url a b&c')]);
    check('tool parse quiet when no change', tool('url shortener').length === 0 && tool('upper ABC').length === 0 && tool('unb64 !!!').length === 0 && tool('hello world').length === 0 && tool('b64').length === 0, null);
    check('tool json', tool('json {"a":[1,2]}').length === 2 && Tools.parse('json {bad')[0].payload === '' && Tools.parse('json 5').length === 0, tool('json {"a":[1,2]}'));
    check('tool count', Tools.parse('count one two three')[0].label === '3 words', Tools.parse('count one two three'));
    check('tool aliases', tool('base64 hi')[0] === 'aGk=' && tool('sha abc')[0].startsWith('ba7816bf') && tool('layout hgsghl')[0] === 'السلام', null);

    if (Tools.hijriSupported()) {
      const iso = d => d.toISOString().slice(0, 10);
      check('hijri known conversion', iso(Tools.gregorianOfHijri(1448, 5, 1)) === '2026-10-12' && (h => h.year === 1448 && h.month === 5 && h.day === 1)(Tools.hijriOf(new Date(Date.UTC(2026, 9, 12, 12)))), Tools.hijriOf(new Date(Date.UTC(2026, 9, 12, 12))));
      let ok = true;
      for (let i = 0; i < 120; i++) {
        const d = new Date(Date.UTC(2000, 0, 1, 12) + i * 311 * 86400000);
        const h = Tools.hijriOf(d);
        const back = Tools.gregorianOfHijri(h.year, h.month, h.day);
        if (!back || iso(back) !== iso(d)) ok = false;
      }
      check('hijri round trip', ok, null);
      check('hijri invalid day', Tools.gregorianOfHijri(1448, 2, 31) === null && Tools.gregorianOfHijri(1448, 13, 1) === null, null);
      check('hijri tool rows', Tools.parse('hijri').length === 1 && Tools.parse('hijri 1448-05-01')[0].payload === '2026-10-12' && Tools.parse('hijri 2026-10-12')[0].kind === 'tool' && Tools.parse('hijri 12/10/2026').length === 1 && Tools.parse('hijri nonsense').length === 0, Tools.parse('hijri 1448-05-01'));
    }

    const fresh = Store.fresh();
    fresh.notes.push({ id: 'n1', text: 'call the plumber', time: Date.now() - 60000 }, { id: 'n2', text: 'buy milk', time: Date.now() });
    check('parse note scope', Compose.parse('note buy', fresh).scope === 'note' && Compose.parse('notes', fresh).scope === 'all' && Compose.parse('note ', fresh).scope === 'note', Compose.parse('notes', fresh));
    const noteRows = Compose.compose('note milk', fresh).rows;
    check('compose note add then match', eq(noteRows.map(r => r.kind), ['note-add', 'note']) && noteRows[1].id === 'n2', noteRows);
    check('compose note list newest first', eq(Compose.compose('note ', fresh).rows.map(r => r.id), ['n2', 'n1']), Compose.compose('note ', fresh).rows);

    fresh.sets.push({ id: 's1', name: 'Morning', urls: ['https://a.com', 'https://b.com'], aliases: ['am'] });
    fresh.links.push({ id: 'bad', name: 'Evil', url: 'javascript:alert(1)', aliases: [] });
    const built = Compose.buildItems(fresh);
    check('items include set', built.some(i => i.kind === 'set' && i.sub === '2 links' && i.payload.length === 2), built.filter(i => i.kind === 'set'));
    check('items skip unsafe link', !built.some(i => i.label === 'Evil'), null);
    check('items hide unusable engine', !built.some(i => i.isEngine && i.label === 'SearXNG') && built.some(i => i.isEngine && i.label === 'Reddit'), null);

    Engine.setItems(built);
    const hello = Compose.compose('hello', fresh);
    check('compose chips and active', hello.chips.length >= 8 && hello.active.prefix === 'ddg' && hello.rows[hello.rows.length - 1].engineId === hello.active.id, hello.chips.map(c => c.prefix));
    const other = hello.chips[2];
    const forced = Compose.compose('hello', fresh, { engineId: other.id });
    check('compose engine override', forced.rows[forced.rows.length - 1].engineId === other.id && forced.active.id === other.id, forced.active);
    check('compose scoped keeps chips', Compose.compose('g cats', fresh).chips.length >= 8 && Compose.compose('g cats', fresh).active.prefix === 'g', null);
    check('compose no chips for tasks and home', Compose.compose('+ x', fresh).chips.length === 0 && Compose.compose('', fresh).chips.length === 0, null);
    const trRow = Compose.compose('tr>fr bonjour', fresh).rows[0];
    check('compose translate row', trRow.sub === 'Translate → fr' && trRow.payload === 'https://lingva.ml/auto/fr/bonjour', trRow);
    const emptyScope = Compose.compose('g ', fresh).rows;
    check('compose empty scope row', emptyScope.length === 1 && emptyScope[0].payload === 'https://www.google.com' && emptyScope[0].sub === 'Type to search', emptyScope);
    const dirty = Compose.compose('https://e.com/?utm_source=a&x=1', fresh).rows.find(r => r.key === 'url');
    check('compose url cleaned', dirty.payload === 'https://e.com/?x=1' && /tracking/.test(dirty.sub), dirty);
    fresh.settings.stripTrackers = false;
    check('compose url untouched when disabled', Compose.compose('https://e.com/?utm_source=a', fresh).rows.find(r => r.key === 'url').payload === 'https://e.com/?utm_source=a', null);
    const repo = Compose.compose('microsoft/vscode', fresh).rows.map(r => r.payload);
    check('compose repo jump before web', repo[0] === 'https://github.com/microsoft/vscode', repo);
    check('compose tool rows before web', Compose.compose('b64 hi', fresh).rows[0].kind === 'tool', Compose.compose('b64 hi', fresh).rows[0]);
    check('compose math still first', Compose.compose('2+2', fresh).rows[0].kind === 'calc', null);

    check('engine url legacy encoding', Compose.engineUrl({ url: 'https://d.com/?q=%s' }, 'a b&c') === 'https://d.com/?q=a+b%26c', null);

    if (Backup.supported()) {
      const box = JSON.parse(await Backup.encrypt('{"hello":"عالم"}', 'correct horse'));
      check('backup shape', Backup.isEncrypted(box) && box.enc === 'aes-256-gcm' && box.iter >= 100000 && !JSON.stringify(box).includes('hello'), box);
      check('backup round trip', (await Backup.decrypt(box, 'correct horse')) === '{"hello":"عالم"}', null);
      check('backup wrong passphrase', (await Backup.decrypt(box, 'wrong horse')) === null, null);
      const tampered = { ...box, data: box.data.slice(0, -4) + 'AAAA' };
      check('backup tamper detected', (await Backup.decrypt(tampered, 'correct horse')) === null, null);
      check('backup rejects garbage', (await Backup.decrypt({ iter: 1, salt: '!', iv: '!', data: '!' }, 'x')) === null && !Backup.isEncrypted({ a: 1 }) && !Backup.isEncrypted(null), null);
    }

    try {
      const page = await (await fetch('index.html')).text();
      const worker = await (await fetch('sw.js')).text();
      const assets = [...page.matchAll(/(?:src|href)="((?:js|css|fonts)\/[^"]+)"/g)].map(m => m[1]);
      const missing = assets.filter(a => !worker.includes("'" + a + "'"));
      check('service worker caches every asset', assets.length > 20 && missing.length === 0, missing);
      check('csp forbids inline script', /script-src 'self'(?:;|")/.test(page) && !/<script>[^<]/.test(page) && !/ on[a-z]+="/.test(page), null);
      check('referrer policy set', /name="referrer" content="no-referrer"/.test(page), null);
      const loaded = [...page.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]);
      const testPage = await (await fetch('selftest.html')).text();
      const missingInTest = loaded.filter(s => !['js/ui.js', 'js/panel.js', 'js/app.js', 'js/start.js', 'js/boot.js'].includes(s) && !testPage.includes('"' + s + '"'));
      check('selftest loads the same modules', missingInTest.length === 0, missingInTest);
    } catch (e) {
      check('asset checks reachable', false, String(e));
    }
  }

  clipboardChecks().then(moreChecks).then(() => {
    const fails = results.filter(r => r.startsWith('FAIL'));
    document.getElementById('out').textContent = `${results.length - fails.length}/${results.length} passed\n\n` + results.join('\n');
    console.log(`SELFTEST ${results.length - fails.length}/${results.length} passed`);
    fails.forEach(f => console.log(f));
  });
})();
