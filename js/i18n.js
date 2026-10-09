const I18n = (() => {
  const en = {
    search: 'Search', panel: 'Panel', copied: 'Copied', saved: 'Saved', nothing: 'Nothing yet',
    save: 'Save', cancel: 'Cancel', ok: 'OK', back: 'Back', opened: 'Opened',
    call: 'Call', message: 'Message', whatsapp: 'WhatsApp', email: 'Email', open: 'Open', copy: 'Copy',
    pin: 'Pin', unpin: 'Unpin', aliases: 'Aliases', edit: 'Edit', delete: 'Delete', saveLink: 'Save as link',
    saveSnippet: 'Save as snippet', openNewTab: 'Open in new tab',
    kind_link: 'Link', kind_person: 'Person', kind_snippet: 'Snippet', kind_command: 'Tacit', kind_action: 'Action',
    kind_calc: 'Calculator', kind_web: 'Web', kind_clip: 'Clipboard',
    tab_links: 'Links', tab_people: 'People', tab_snippets: 'Snippets', tab_engines: 'Engines', tab_commands: 'Commands',
    tab_settings: 'Settings', tab_data: 'Data', tab_keys: 'Keys',
    col_name: 'Name', col_url: 'Address', col_aliases: 'Aliases', col_phones: 'Phones', col_emails: 'Emails',
    col_trigger: 'Trigger', col_title: 'Title', col_body: 'Text', col_prefix: 'Prefix', col_template: 'Address with %s',
    col_command: 'Command', col_pin: 'Pin',
    add_row: 'Add row', filter: 'Filter', fill_initials: 'Fill initials', export_csv: 'Export CSV', import_csv: 'Import CSV',
    import_bookmarks: 'Import bookmarks', import_vcf: 'Import contacts (.vcf)', shared_aliases: 'Shared aliases',
    rows_imported: '{n} rows imported', remove_row: 'Remove row',
    set_look: 'Look', set_theme: 'Theme', theme_system: 'System', theme_dark: 'Charcoal', theme_light: 'Cream',
    set_lang: 'Language', lang_auto: 'Automatic', set_bar_bottom: 'Search bar at bottom', set_clock: 'Clock', set_date: 'Date',
    set_results: 'Results', set_search: 'Search', set_fuzzy: 'Typo tolerance', fuzzy_off: 'Off', fuzzy_normal: 'Normal',
    fuzzy_loose: 'Loose', set_translit: 'Arabic ↔ Latin matching', set_actions: 'Actions', set_newtab: 'Open links in a new tab',
    set_clear: 'Clear after opening', set_engine: 'Default web engine', set_country: 'Default country code',
    set_clip: 'Clipboard', set_clip_on: 'Clipboard history', set_clip_focus: 'Capture clipboard when Tacit gets focus',
    set_clip_focus_note: 'Chromium browsers only, and only after you allow it once. If you decline, Tacit stops asking.',
    clip_blocked_help: 'Clipboard is blocked. Allow it in your browser\'s site settings, then try again.',
    clip_unsupported: 'This browser does not allow reading the clipboard.',
    clip_fallback: 'Copied · used last saved clip', set_clip_retry: 'Try again',
    set_clip_days: 'Keep for days (0 = forever)', set_clip_max: 'Keep items (0 = unlimited)',
    set_sensitive: 'Sensitive items', sens_skip: 'Never store', sens_expire: 'Delete after 1 minute', sens_hide: 'Store, hide preview',
    set_prefixes: 'Prefixes', p_calc: 'Calculator', p_clip: 'Clipboard', p_people: 'People', p_snippets: 'Snippets', p_commands: 'Commands',
    more: 'More', set_order: 'Type order', set_learn: 'Rank by what I open', data_clear_usage: 'Reset learned ranking',
    data_export: 'Export everything (JSON)', data_import: 'Import JSON', data_reset: 'Reset Tacit',
    data_reset_confirm: 'Delete all links, people, snippets, clipboard and settings on this browser?',
    data_clear_clip: 'Clear clipboard history', data_clear_clip_confirm: 'Delete all clipboard history?',
    data_storage: 'Everything is stored in this browser only. Nothing is sent anywhere.',
    data_url: 'Search from your browser bar', data_url_note: 'Add a custom search engine in your browser with this address. Then type its keyword, a space, and your query. Add &go=1 to open the top result directly.',
    data_home: 'Use as your start page', data_home_note: 'Set this page as your browser\'s home or startup page. Install it as an app from the browser menu to open it in its own window.',
    cmd_panel: 'Open panel', cmd_theme: 'Switch theme', cmd_clock: 'Show or hide clock', cmd_export: 'Export everything',
    cmd_import: 'Import', cmd_clear_clip: 'Clear clipboard history', cmd_keys: 'Keyboard keys', cmd_save_clip: 'Save current clipboard',
    cmd_add_link: 'Add link', cmd_add_person: 'Add person', cmd_add_snippet: 'Add snippet', cmd_lang: 'Switch language',
    clip_hidden: 'Sensitive, hidden', clip_denied: 'Clipboard access denied', clip_empty: 'Clipboard is empty',
    keys_title: 'Keys',
    keys: [
      ['Enter', 'Open the selected result'], ['Ctrl/⌘ + Enter', 'Open in a new tab'], ['↑ ↓', 'Move'],
      ['Tab', 'Actions for the selected result'], ['Esc', 'Clear, then close menus'], ['/', 'Focus search from anywhere'],
      ['Ctrl/⌘ + ,', 'Panel'], ['Alt + 1…9', 'Open result 1 to 9']
    ],
    prefix_help: 'Prefixes'
  };

  const ar = {
    search: 'بحث', panel: 'اللوحة', copied: 'تم النسخ', saved: 'تم الحفظ', nothing: 'لا شيء بعد',
    save: 'حفظ', cancel: 'إلغاء', ok: 'حسنًا', back: 'رجوع', opened: 'تم الفتح',
    call: 'اتصال', message: 'رسالة', whatsapp: 'واتساب', email: 'بريد', open: 'فتح', copy: 'نسخ',
    pin: 'تثبيت', unpin: 'إلغاء التثبيت', aliases: 'الأسماء المستعارة', edit: 'تعديل', delete: 'حذف', saveLink: 'حفظ كرابط',
    saveSnippet: 'حفظ كمقتطف', openNewTab: 'فتح في علامة تبويب جديدة',
    kind_link: 'رابط', kind_person: 'شخص', kind_snippet: 'مقتطف', kind_command: 'Tacit', kind_action: 'إجراء',
    kind_calc: 'حاسبة', kind_web: 'ويب', kind_clip: 'الحافظة',
    tab_links: 'الروابط', tab_people: 'الأشخاص', tab_snippets: 'المقتطفات', tab_engines: 'المحركات', tab_commands: 'الأوامر',
    tab_settings: 'الإعدادات', tab_data: 'البيانات', tab_keys: 'المفاتيح',
    col_name: 'الاسم', col_url: 'العنوان', col_aliases: 'الأسماء المستعارة', col_phones: 'الأرقام', col_emails: 'البريد',
    col_trigger: 'الاختصار', col_title: 'العنوان', col_body: 'النص', col_prefix: 'البادئة', col_template: 'العنوان مع %s',
    col_command: 'الأمر', col_pin: 'تثبيت',
    add_row: 'إضافة صف', filter: 'تصفية', fill_initials: 'ملء بالأحرف الأولى', export_csv: 'تصدير CSV', import_csv: 'استيراد CSV',
    import_bookmarks: 'استيراد الإشارات المرجعية', import_vcf: 'استيراد جهات الاتصال (.vcf)', shared_aliases: 'أسماء مشتركة',
    rows_imported: 'تم استيراد {n} صف', remove_row: 'حذف الصف',
    set_look: 'المظهر', set_theme: 'السمة', theme_system: 'حسب النظام', theme_dark: 'فحمي', theme_light: 'كريمي',
    set_lang: 'اللغة', lang_auto: 'تلقائي', set_bar_bottom: 'شريط البحث في الأسفل', set_clock: 'الساعة', set_date: 'التاريخ',
    set_results: 'عدد النتائج', set_search: 'البحث', set_fuzzy: 'تحمّل الأخطاء الإملائية', fuzzy_off: 'إيقاف', fuzzy_normal: 'عادي',
    fuzzy_loose: 'متساهل', set_translit: 'مطابقة العربية ↔ اللاتينية', set_actions: 'الإجراءات', set_newtab: 'فتح الروابط في علامة تبويب جديدة',
    set_clear: 'مسح البحث بعد الفتح', set_engine: 'محرك البحث الافتراضي', set_country: 'رمز الدولة الافتراضي',
    set_clip: 'الحافظة', set_clip_on: 'سجل الحافظة', set_clip_focus: 'التقاط الحافظة عند التركيز على Tacit',
    set_clip_focus_note: 'متصفحات Chromium فقط، وبعد أن تسمح مرة واحدة. إذا رفضت يتوقف Tacit عن الطلب.',
    clip_blocked_help: 'الحافظة محظورة. اسمح بها من إعدادات الموقع في المتصفح ثم حاول مجددًا.',
    clip_unsupported: 'هذا المتصفح لا يسمح بقراءة الحافظة.',
    clip_fallback: 'تم النسخ · من آخر عنصر محفوظ', set_clip_retry: 'إعادة المحاولة',
    set_clip_days: 'الاحتفاظ بالأيام (0 = للأبد)', set_clip_max: 'الاحتفاظ بالعناصر (0 = بلا حد)',
    set_sensitive: 'العناصر الحساسة', sens_skip: 'لا تحفظ أبدًا', sens_expire: 'احذف بعد دقيقة', sens_hide: 'احفظ مع إخفاء المعاينة',
    set_prefixes: 'البادئات', p_calc: 'الحاسبة', p_clip: 'الحافظة', p_people: 'الأشخاص', p_snippets: 'المقتطفات', p_commands: 'الأوامر',
    more: 'المزيد', set_order: 'ترتيب الأنواع', set_learn: 'ترتيب النتائج حسب ما أفتحه', data_clear_usage: 'إعادة ضبط الترتيب المتعلَّم',
    data_export: 'تصدير كل شيء (JSON)', data_import: 'استيراد JSON', data_reset: 'إعادة ضبط Tacit',
    data_reset_confirm: 'حذف كل الروابط والأشخاص والمقتطفات والحافظة والإعدادات من هذا المتصفح؟',
    data_clear_clip: 'مسح سجل الحافظة', data_clear_clip_confirm: 'حذف كل سجل الحافظة؟',
    data_storage: 'كل شيء محفوظ في هذا المتصفح فقط. لا يُرسل أي شيء إلى أي مكان.',
    data_url: 'البحث من شريط المتصفح', data_url_note: 'أضف محرك بحث مخصصًا في متصفحك بهذا العنوان، ثم اكتب كلمته ومسافة وما تبحث عنه. أضف ‎&go=1 لفتح النتيجة الأولى مباشرة.',
    data_home: 'استخدامه كصفحة البداية', data_home_note: 'اجعل هذه الصفحة صفحة البداية في متصفحك، أو ثبّتها كتطبيق من قائمة المتصفح لتفتح في نافذة مستقلة.',
    cmd_panel: 'فتح اللوحة', cmd_theme: 'تبديل السمة', cmd_clock: 'إظهار أو إخفاء الساعة', cmd_export: 'تصدير كل شيء',
    cmd_import: 'استيراد', cmd_clear_clip: 'مسح سجل الحافظة', cmd_keys: 'مفاتيح لوحة المفاتيح', cmd_save_clip: 'حفظ الحافظة الحالية',
    cmd_add_link: 'إضافة رابط', cmd_add_person: 'إضافة شخص', cmd_add_snippet: 'إضافة مقتطف', cmd_lang: 'تبديل اللغة',
    clip_hidden: 'حساس، مخفي', clip_denied: 'تم رفض الوصول إلى الحافظة', clip_empty: 'الحافظة فارغة',
    keys_title: 'المفاتيح',
    keys: [
      ['Enter', 'فتح النتيجة المحددة'], ['Ctrl/⌘ + Enter', 'فتح في علامة تبويب جديدة'], ['↑ ↓', 'تنقل'],
      ['Tab', 'إجراءات النتيجة المحددة'], ['Esc', 'مسح ثم إغلاق القوائم'], ['/', 'التركيز على البحث من أي مكان'],
      ['Ctrl/⌘ + ,', 'اللوحة'], ['Alt + 1…9', 'فتح النتيجة من 1 إلى 9']
    ],
    prefix_help: 'البادئات'
  };

  let current = 'en';

  function resolve(setting) {
    if (setting === 'ar' || setting === 'en') return setting;
    return (navigator.language || 'en').toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  function apply(setting) {
    current = resolve(setting);
    const root = document.documentElement;
    const dir = current === 'ar' ? 'rtl' : 'ltr';
    if (root.lang !== current) root.lang = current;
    if (root.dir !== dir) root.dir = dir;
  }

  function t(key, vars) {
    const table = current === 'ar' ? ar : en;
    let s = table[key] ?? en[key] ?? key;
    if (vars && typeof s === 'string') for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
  }

  return { apply, t, get lang() { return current; }, tables: { en, ar } };
})();
