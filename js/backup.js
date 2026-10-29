const Backup = (() => {
  const ITER = 250000;
  const MAX_ITER = 2000000;

  const encode = bytes => {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decode = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));

  const supported = () => !!(window.crypto && crypto.subtle && window.isSecureContext);

  const isEncrypted = value => !!(value && typeof value === 'object' && value.enc && value.data && value.salt && value.iv);

  async function deriveKey(passphrase, salt, iterations) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  }

  async function encrypt(plain, passphrase) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt, ITER);
    const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain)));
    return JSON.stringify({ tacit_backup: 2, enc: 'aes-256-gcm', kdf: 'pbkdf2-sha256', iter: ITER, salt: encode(salt), iv: encode(iv), data: encode(data) });
  }

  async function decrypt(box, passphrase) {
    try {
      const iterations = Math.min(MAX_ITER, Math.max(1, Number(box.iter) || ITER));
      const key = await deriveKey(passphrase, decode(box.salt), iterations);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(box.iv) }, key, decode(box.data));
      return new TextDecoder().decode(plain);
    } catch (e) {
      return null;
    }
  }

  return { supported, isEncrypted, encrypt, decrypt };
})();
