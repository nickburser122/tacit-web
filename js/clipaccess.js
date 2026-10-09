const ClipAccess = (() => {
  let nav = null;
  const N = () => nav || navigator;
  const S = () => Store.state.settings;

  async function permission() {
    if (!N().permissions?.query) return 'unknown';
    try {
      return (await N().permissions.query({ name: 'clipboard-read' })).state;
    } catch (e) {
      return 'unknown';
    }
  }

  function deny() {
    const s = S();
    s.clipDenied = Date.now();
    s.clipCaptureOnFocus = false;
    Store.changed('settings');
  }

  function allow() {
    if (!S().clipDenied) return;
    S().clipDenied = 0;
    Store.changed('settings');
  }

  async function read({ mode }) {
    if (!N().clipboard?.readText) return { ok: false, reason: 'unsupported' };
    const perm = await permission();
    if (perm === 'denied') {
      if (!S().clipDenied || S().clipCaptureOnFocus) deny();
      return { ok: false, reason: 'denied' };
    }
    if (mode === 'auto' && perm !== 'granted') return { ok: false, reason: 'idle' };
    if (mode === 'assist' && S().clipDenied && perm !== 'granted') return { ok: false, reason: 'denied' };
    try {
      const text = await N().clipboard.readText();
      allow();
      return { ok: true, text };
    } catch (e) {
      if ((await permission()) === 'granted') return { ok: false, reason: 'unavailable' };
      if (e && e.name === 'NotAllowedError') deny();
      return { ok: false, reason: 'denied' };
    }
  }

  return { read, permission, setNavigator: n => { nav = n; } };
})();
