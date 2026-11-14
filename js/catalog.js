const Catalog = (() => {
  const REV = 2;
  const PACK_ON = true;
  const LEGACY_ENGINES = ['ddg', 'b', 'sp', 'mj', 'sx', 'g', 'w', 'd', 'tr', 'gh', 'cg', 'mdn', 'r', 'yt', 'map'];
  const GROUPS = [["core", "Core", "الأساسية"], ["tools", "Tools", "الأدوات"], ["practice", "Practice", "التدريب"], ["experimental", "Experimental", "التجريبية"], ["print", "Print", "الطباعة"]];
  const APPS = [
    {"k":"a:ledger-form","g":"core","n":"Ledger Form","a":"نموذج الدفتر","u":"https://slippery-form-2-2.vercel.app/","al":["kharegy 2","khargy","ledger","خارجي","daftar form"],"de":"Pharmacy ledger entry form","da":"تسجيل خارجي الصيدلية"},
    {"k":"a:ledger-form:folio","g":"core","n":"Ledger Form · Folio","a":"نموذج الدفتر · فوليو","u":"https://slippery-form.vercel.app/","al":[],"de":"Pharmacy ledger entry form","da":"تسجيل خارجي الصيدلية"},
    {"k":"a:ledger-form:alt","g":"core","n":"Ledger Form · Alt","a":"نموذج الدفتر · بديل","u":"https://datakid-github-io.vercel.app/","al":[],"de":"Pharmacy ledger entry form","da":"تسجيل خارجي الصيدلية"},
    {"k":"a:parser","g":"core","n":"Parser","a":"المحلل","u":"https://lx-parser.vercel.app/","al":["kharegy 0","mohalel","khargy 0","خارجي","parser","dashboard"],"de":"Parses raw claim data","da":"متابعة بيان الخارجي"},
    {"k":"a:parser:alt","g":"core","n":"Parser · Alt","a":"المحلل · بديل","u":"https://simpledashboard21.netlify.app/","al":[],"de":"Parses raw claim data","da":"متابعة بيان الخارجي"},
    {"k":"a:workspace","g":"core","n":"Workspace","a":"مجموعات دوائية","u":"https://desktop-ru4x.vercel.app/","al":["majmoat dawaeya","drug groups","majmoaat"],"de":"Drug-group workspace","da":"مساحة عمل المجموعات الدوائية"},
    {"k":"a:drug-list","g":"core","n":"Drug List","a":"قائمة الأدوية","u":"https://searchbar-five-beta.vercel.app/","al":["listet el-adwia","لستة الادوية","adwia","list","magany","majani"],"de":"Searchable master drug list","da":"قائمة الأدوية القابلة للبحث"},
    {"k":"a:drug-list:full","g":"core","n":"Drug List · Full","a":"قائمة الأدوية · الكامل","u":"https://lx-search-kappa.vercel.app/","al":["kamel","complete"],"de":"Searchable master drug list","da":"قائمة الأدوية القابلة للبحث"},
    {"k":"a:drug-list:alt","g":"core","n":"Drug List · Alt","a":"قائمة الأدوية · بديل","u":"https://ag-search.vercel.app/","al":[],"de":"Searchable master drug list","da":"قائمة الأدوية القابلة للبحث"},
    {"k":"a:paid-calculator","g":"core","n":"Paid Calculator","a":"المنفذ والتحمل","u":"https://newlist-eta.vercel.app/","al":["monfaz wal tahamol","monfaz","tahamol","copay"],"de":"Paid amount and co-pay","da":"حساب المنفذ ونسبة التحمل"},
    {"k":"a:paid-calculator:alt","g":"core","n":"Paid Calculator · Daleel 460","a":"المنفذ والتحمل · دليل قرار 460","u":"https://460-prices.vercel.app/","al":["dalil","qarar 460","decision 460","asaar","اسعار الخدمات"],"de":"Service price statement under Decision 460","da":"بيان باسعار الخدمات بقرار 460"},
    {"k":"a:protocols","g":"core","n":"Protocols","a":"بروتوكولات الصرف","u":"https://strong-snickerdoodle-02a92f.netlify.app/","al":["brotokolat el-sarf","sarf","dispensing"],"de":"Dispensing protocol reference","da":"مرجع بروتوكولات الصرف"},
    {"k":"a:index-builder","g":"core","n":"Index Builder","a":"فهرس الأدوية","u":"https://lx-index.vercel.app/","al":["fehres el-adwia","drug index","fahras"],"de":"Builds the drug index","da":"بناء فهرس الأدوية"},
    {"k":"a:dafter","g":"core","n":"Dafter","a":"دفتر الحركة","u":"https://daftar-psi-two.vercel.app/","al":["daftar el-haraka","daftar","movement"],"de":"Monthly movement ledger","da":"تسجيل المنصرف الشهري للصيدلية"},
    {"k":"a:id-dates","g":"tools","n":"Number Tools","a":"أدوات الأرقام","u":"https://lx-id.vercel.app/","al":["adawat el-arqam","number tools","arqam","raqm","ارقام","raqm qawmy","national id","dates","tarikh","id tools","hawia","adawat el-hawia","رقم قومي","تواريخ","هوية"],"de":"National ID and date utilities","da":"أدوات الرقم القومي والتواريخ"},
    {"k":"a:id-dates:contacts","g":"tools","n":"Number Tools · Contact Tools","a":"أدوات الأرقام · أدوات جهات الاتصال","u":"https://contact-flow-web-orpin.vercel.app/","al":["contact flow","contacts","phone numbers","arqam el-hatef","hatef","vcard","ارقام الهاتف","هاتف","جهات اتصال"],"de":"Import, clean up and export contacts","da":"استيراد جهات الاتصال وتنظيفها وتصديرها"},
    {"k":"a:roi","g":"tools","n":"ROI Calculator","a":"عائد الاستثمار","u":"https://roi-calc-express.vercel.app/","al":["roi","aid al-istithmar","return on investment","sare3","saree3","quick"],"de":"Return-on-investment calculator","da":"حاسبة عائد الاستثمار"},
    {"k":"a:roi:full","g":"tools","n":"ROI Calculator · Full","a":"عائد الاستثمار · الكامل","u":"https://roi-calculator-eight-omega.vercel.app/","al":["kamel","complete"],"de":"Return-on-investment calculator","da":"حاسبة عائد الاستثمار"},
    {"k":"a:survival-mirror","g":"tools","n":"Survival Mirror","a":"منحنى البقاء","u":"https://survival-mirror.vercel.app/","al":["monhna el-baqaa","life expectancy","baqaa"],"de":"Personal survival-curve estimate","da":"تقدير منحنى البقاء الشخصي"},
    {"k":"a:qisma-mizan","g":"tools","n":"Qisma / Mizan","a":"قسمة العوائد","u":"https://m-izan.vercel.app/","al":["qisma el-awaed"],"de":"Shareholder split and balance","da":"قسمة إيرادات هيئة التأمين"},
    {"k":"a:qisma-mizan:qisma","g":"tools","n":"Qisma / Mizan · Qisma","a":"قسمة العوائد · قسمة","u":"https://shareholders-coral.vercel.app/","al":["shareholders"],"de":"Shareholder split and balance","da":"قسمة إيرادات هيئة التأمين"},
    {"k":"a:solver","g":"tools","n":"Solver","a":"حل المعادلات","u":"https://solver-clone.vercel.app/","al":["hal el-moadalat","solver","equations","moadla"],"de":"Equation solver","da":"حل المعادلات والمسائل الحسابية"},
    {"k":"a:pattern-recognition","g":"tools","n":"Text Pattern Recognition","a":"التعرف على أنماط النصوص","u":"https://pattern-recognition-sooty.vercel.app/","al":["taaruf anmat","pattern recognition","text pattern","pattern","انماط","أنماط","fahs el-asala","asala","ai detector","authenticity","c2pa","forensics","كشف","ذكاء اصطناعي","تزييف"],"de":"Provenance and pattern analysis, on-device","da":"كشف الصور والنصوص المولّدة وتحليل الأنماط"},
    {"k":"a:pattern-recognition:alt","g":"tools","n":"Text Pattern Recognition · iCleaner","a":"التعرف على أنماط النصوص · منظّف","u":"https://icleaner-woad.vercel.app/","al":["cleaner","monazef"],"de":"Provenance and pattern analysis, on-device","da":"كشف الصور والنصوص المولّدة وتحليل الأنماط"},
    {"k":"a:plan-maker","g":"tools","n":"Planner","a":"الخطة","u":"https://rushed-plan.vercel.app/","al":["el-khetta","khetta","plan","kheta","sare3","saree3","quick","rushed"],"de":"Recurring visit schedule","da":"توليد خطة مرور دورية"},
    {"k":"a:plan-maker:full","g":"tools","n":"Planner · Full","a":"الخطة · الكامل","u":"https://plan-maker-tan.vercel.app/","al":["kamel","complete"],"de":"Recurring visit schedule","da":"توليد خطة مرور دورية"},
    {"k":"a:plan-maker:alt","g":"tools","n":"Planner · Alt","a":"الخطة · بديل","u":"https://alt-plan-maker.vercel.app/","al":[],"de":"Recurring visit schedule","da":"توليد خطة مرور دورية"},
    {"k":"a:criteria-builder","g":"tools","n":"Criteria Builder","a":"بناء المعايير","u":"https://facilities-demo-tau.vercel.app/","al":["maayir","criteria","معايير","facilities"],"de":"Scoring and ranking criteria","da":"بناء معايير التقييم والترتيب"},
    {"k":"a:criteria-builder:rubric","g":"tools","n":"Criteria Builder · Rubric","a":"بناء المعايير · سلّم التقييم","u":"https://ranking-builder-demo.vercel.app/","al":["ranking","ranking builder","sollam"],"de":"Scoring and ranking criteria","da":"بناء معايير التقييم والترتيب"},
    {"k":"a:criteria-builder:waymark","g":"tools","n":"Criteria Builder · Waymark","a":"بناء المعايير · وايمارك","u":"https://waymark-hazel.vercel.app/#route","al":["routing","clinic flow","equations","معادلات"],"de":"Care routing, clinic flow and equations","da":"مسار الرعاية وتدفق العيادة والمعادلات"},
    {"k":"a:harvest-studio","g":"tools","n":"Harvest Studio","a":"الحصاد","u":"https://harvest-studio-phi.vercel.app/","al":["harvest","harvest studio","alhasad","hasad","favicon","favicons","icons","icon","ayqunat","ayqonat","الحصاد","حصاد","ايقونات","أيقونات","ايقونة"],"de":"App favicons, glyph tracing and set colouring","da":"أيقونات التطبيقات وتلوين المجموعة"},
    {"k":"a:power-query-manager","g":"tools","n":"Power Query Manager","a":"مدير Power Query","u":"https://power-query-manager.vercel.app/","al":["pq","power query","powerquery","queries","m language","باور كويري","استعلامات"],"de":"Power Query viewer and manager","da":"عارض ومدير Power Query"},
    {"k":"a:typing-practice","g":"practice","n":"Typing Practice","a":"تمرين الكتابة","u":"https://typing-practice-wine-eta.vercel.app/","al":["tamreen el-kitaba","tadreeb","tadreeb kitaba","typing","typing practice","typing test","tarq","keyboard","kitaba","تدريب","تدريب كتابة","كتابة","تمرين","طرق"],"de":"Keyboard typing practice","da":"تدريب على الكتابة بلوحة المفاتيح"},
    {"k":"a:platen","g":"practice","n":"Platen","a":"بلاتن","u":"https://platen-2zj1.vercel.app/#/t/python/values-types/assignment/a","al":["coding","programming","code","practice","exercises","python","py","javascript","js","typescript","ts","java","cpp","csharp","go","golang","rust","sql","bash","shell","html","css","php","ruby","kotlin","swift","dart","lua","matlab","scala","perl","haskell","برمجة","كود","تمارين","تدريب","بايثون","جافاسكريبت","جافا","تايب سكريبت","سي","سي شارب","جو","راست","اس كيو ال"],"de":"Coding practice","da":"تدريب على البرمجة"},
    {"k":"a:reaction-time","g":"practice","n":"Reaction Time","a":"زمن رد الفعل","u":"https://reaction-time-lovat-mu.vercel.app/","al":["lull","reflex","reflexes","input timing","رد الفعل","ردة الفعل","زمن الاستجابة"],"de":"Reaction time and input timing practice","da":"تدريب على زمن رد الفعل وتوقيت الإدخال"},
    {"k":"a:to-do","g":"experimental","n":"To Do","a":"المهام","u":"https://to-do-cyan-theta.vercel.app/","al":["maham","taqarir","reports","todo","تقارير"],"de":"Task and report tracker","da":"متابعة المهام والتقارير"},
    {"k":"a:entity-tracker","g":"experimental","n":"Entity Tracker","a":"بيان جهات متعاقدة","u":"https://entity-tracker-pi.vercel.app/","al":["bayan gehat","gehat","contracted entities"],"de":"Tracks contracted entities","da":"تتبع الجهات المتعاقدة"},
    {"k":"a:entity-tracker:alt","g":"experimental","n":"Entity Tracker · Alt","a":"بيان جهات متعاقدة · بديل","u":"https://entity-viewer.vercel.app/","al":["entity viewer","viewer"],"de":"Contracted entities statement from xlsx, xls and csv files","da":"بيان الجهات المتعاقدة من ملفات xlsx وxls وcsv"},
    {"k":"a:pillbug","g":"experimental","n":"Pharmacy Tools","a":"أدوات الصيدلية","u":"https://pillbug.vercel.app/","al":["adawat saydaliya","pharmacy tools","صيدلية","pillbugs","lists","edarat qawaem","قوائم"],"de":"Lists, tasks and unit and price converter","da":"إدارة القوائم ومحول الوحدات والأسعار"},
    {"k":"a:pillbug:bugvert","g":"experimental","n":"Pharmacy Tools · Bugvert","a":"أدوات الصيدلية · محول الوحدة","u":"https://bugvert.vercel.app/","al":["converter","unit converter","price converter","mohawel","mohawel wahda","محول","وحدة","وحدات"],"de":"Lists, tasks and unit and price converter","da":"إدارة القوائم ومحول الوحدات والأسعار"},
    {"k":"a:prep","g":"experimental","n":"Data Prep","a":"تجهيز البيانات","u":"https://duckbench2.vercel.app/","al":["tagheez","tagheez el-bayanat","data"],"de":"Prepare and sift datasets","da":"تجهيز البيانات وتنقيتها"},
    {"k":"a:prep:floe","g":"experimental","n":"Data Prep · Floe","a":"تجهيز البيانات · فلو","u":"https://polars-desktop-demo.vercel.app/","al":["polars"],"de":"Prepare and sift datasets","da":"تجهيز البيانات وتنقيتها"},
    {"k":"a:prep:duckbench","g":"experimental","n":"Data Prep · Legacy","a":"تجهيز البيانات · قديم","u":"https://duckbench.vercel.app/","al":["duckbench","adeem"],"de":"Prepare and sift datasets","da":"تجهيز البيانات وتنقيتها"},
    {"k":"a:text-tools","g":"experimental","n":"Text Tools","a":"أدوات النصوص","u":"https://data-cleaner-coral.vercel.app/","al":["adawat nosos","text tools","تنظيف","tanqya","data cleaner"],"de":"Clean and reshape text and tables","da":"تنظيف النصوص والجداول"},
    {"k":"a:text-tools:text","g":"experimental","n":"Text Tools · Text","a":"أدوات النصوص · نصوص","u":"https://text-tools-kohl.vercel.app/","al":["nosos"],"de":"Clean and reshape text and tables","da":"تنظيف النصوص والجداول"},
    {"k":"a:draw","g":"experimental","n":"Draw","a":"الرسم البياني","u":"https://draw-gold.vercel.app/","al":["rasm bayani","rasm","draw","chart","rasm bayan"],"de":"Charts and diagram tool","da":"أداة رسم المخططات"},
    {"k":"a:gitlink","g":"experimental","n":"GitLink","a":"إحصائيات جيتهب","u":"https://gitlink-gilt.vercel.app/","al":["gitlink","github","jithub","followers","جيتهب"],"de":"GitHub followers, viewers and profile stats","da":"متابعين وزوار وإحصائيات جيتهب"},
    {"k":"a:paper","g":"print","n":"Paper","a":"ورقة","u":"https://el-messiry.netlify.app/","al":["waraqa","paper","warqa","print","tebaa"],"de":"Part of the print toolset","da":"جزء من أدوات الطباعة"},
    {"k":"a:thread","g":"print","n":"Thread","a":"خيط","u":"https://willowy-centaur-417620.netlify.app/","al":["khait","thread","kheit","print","tebaa"],"de":"Part of the print toolset","da":"جزء من أدوات الطباعة"},
    {"k":"a:adad","g":"print","n":"Adad","a":"عدّاد","u":"https://visit-tracker-xi.vercel.app/","al":["adad","addad","aadad","visit tracker","visit allowance","allowances","badalat","badalat el-moror","intiqalat","moror","kashf","عداد","بدلات","انتقالات","مرور","كشوف"],"de":"Visit allowances from Excel, with PDF statements","da":"حساب بدلات المرور وإصدار كشوف PDF"},
    {"k":"a:font-maker","g":"print","n":"Font Maker","a":"صانع الخطوط","u":"https://simple-font-maker.vercel.app/","al":["sane3 el-khotot","font","fonts","font maker","handwriting","handwriting font","khat","khat yad","khotot","خط","خط يد","خط اليد","خطوط"],"de":"Turn your handwriting into a font","da":"تحويل خط اليد إلى خط"},
    {"k":"a:letters","g":"print","n":"Letters","a":"خطابات","u":"https://letters-kohl.vercel.app/","al":["khetabat","khitabat","khetab","letters","letter","gawabat","jawabat","print","tebaa","خطابات","خطاب","جوابات"],"de":"Letters analysis by entity and user","da":"تحليل بيانات الخطابات حسب الجهة والمستخدم"},
    {"k":"a:masar","g":"print","n":"Masar","a":"مسار","u":"https://msar-seven.vercel.app/","al":["masar","msar","masaar","moror","visits","visit analysis","print","tebaa","مسار","مرور","زيارات"],"de":"Visit analysis by member, entity and area","da":"تحليل زيارات المرور حسب العضو والجهة والمنطقة"},
    {"k":"a:bayan","g":"print","n":"Bayan","a":"بيان","u":"https://bayan-mauve.vercel.app/","al":["bayan","bayaan","bayyan","roshetta","roshetat","rosheta","prescription","prescriptions","extract","xlsx","print","tebaa","بيان","روشتة","روشتات","وصفة","وصفات","استخراج"],"de":"Extract prescription data from special xlsx files","da":"استخراج بيانات الروشتات من ملفات xlsx الخاصة"},
    {"k":"a:basic-cover","g":"print","n":"Basic Cover","a":"الغلاف الأساسي","u":"https://basic-cover.vercel.app/","al":["cover","covers","cards","ghilaf","tebaa","غلاف","أغلفة","بطاقات","طباعة"],"de":"Printable cover cards with print settings","da":"بطاقات غلاف للطباعة مع إعدادات الطباعة"}
  ];

  const engineKey = prefix => 'e:' + prefix;
  const isEngineKey = ck => ck.charCodeAt(0) === 101;
  const normUrl = u => String(u || '').trim().toLowerCase().replace(/\/+$/, '');

  function makeLink(a, uid) {
    return { id: uid(), name: a.n, url: a.u, aliases: a.al.slice(), pinned: false, ck: a.k, names: [a.a], desc: [a.de, a.da], grp: a.g };
  }

  function readMeta(state) {
    const meta = state.catalog;
    if (!meta || typeof meta !== 'object' || !Array.isArray(meta.dropped)) return null;
    return { rev: Number(meta.rev) || 0, dropped: meta.dropped.filter(k => typeof k === 'string') };
  }

  function sync(state, uid, fresh) {
    const meta = readMeta(state);
    if (meta && meta.rev >= REV) {
      state.catalog = meta;
      return;
    }
    const dropped = new Set(meta ? meta.dropped : []);
    const known = !!meta;
    const byPrefix = new Map();
    for (const e of state.engines) byPrefix.set(String(e.prefix || '').toLowerCase(), e);
    for (const d of Providers.defaults()) {
      const ck = engineKey(d.prefix);
      const have = byPrefix.get(d.prefix);
      if (have) {
        if (!have.ck) have.ck = ck;
        continue;
      }
      if (dropped.has(ck)) continue;
      if (!fresh && !known && LEGACY_ENGINES.includes(d.prefix)) {
        dropped.add(ck);
        continue;
      }
      const row = { id: uid(), aliases: [], ...d, ck };
      state.engines.push(row);
      byPrefix.set(d.prefix, row);
    }
    if (PACK_ON) {
      const byUrl = new Map();
      for (const l of state.links) byUrl.set(normUrl(l.url), l);
      for (const a of APPS) {
        if (dropped.has(a.k)) continue;
        const have = byUrl.get(normUrl(a.u));
        if (have) {
          if (!have.ck) have.ck = a.k;
          continue;
        }
        state.links.push(makeLink(a, uid));
      }
    }
    state.catalog = { rev: REV, dropped: [...dropped] };
  }

  function engineEntries() {
    return Providers.defaults().map(d => ({ ck: engineKey(d.prefix), name: d.name, group: d.cat, tag: d.prefix, priv: !!d.priv }));
  }

  function appEntries() {
    return APPS.map(a => ({ ck: a.k, name: a.n, alt: a.a, group: a.g }));
  }

  function present(state) {
    const out = new Set();
    for (const e of state.engines) if (e.ck) out.add(e.ck);
    for (const l of state.links) if (l.ck) out.add(l.ck);
    return out;
  }

  function markDropped(state, ck) {
    if (!ck) return;
    const meta = readMeta(state) || { rev: REV, dropped: [] };
    if (!meta.dropped.includes(ck)) meta.dropped.push(ck);
    state.catalog = meta;
  }

  function unmark(state, ck) {
    const meta = readMeta(state);
    if (!meta) return;
    meta.dropped = meta.dropped.filter(k => k !== ck);
    state.catalog = meta;
  }

  function remove(state, ck) {
    const engine = isEngineKey(ck);
    const list = engine ? state.engines : state.links;
    const at = list.findIndex(r => r.ck === ck);
    if (at >= 0) {
      const row = list.splice(at, 1)[0];
      const pin = (engine ? 'engine:' : 'link:') + row.id;
      state.pins = state.pins.filter(k => k !== pin);
    }
    markDropped(state, ck);
  }

  function restore(state, ck, uid) {
    if (isEngineKey(ck)) {
      const d = Providers.defaults().find(x => engineKey(x.prefix) === ck);
      if (!d) return false;
      if (state.engines.some(e => e.ck === ck || String(e.prefix || '').toLowerCase() === d.prefix)) return false;
      state.engines.push({ id: uid(), aliases: [], ...d, ck });
      unmark(state, ck);
      return true;
    }
    const a = APPS.find(x => x.k === ck);
    if (!a || state.links.some(l => l.ck === ck)) return false;
    state.links.push(makeLink(a, uid));
    unmark(state, ck);
    return true;
  }

  function removeAll(state, keys) {
    for (const ck of keys) remove(state, ck);
  }

  function restoreAll(state, keys, uid) {
    let n = 0;
    for (const ck of keys) if (restore(state, ck, uid)) n++;
    return n;
  }

  return { REV, GROUPS, APPS, sync, engineEntries, appEntries, present, remove, restore, removeAll, restoreAll, markDropped };
})();
