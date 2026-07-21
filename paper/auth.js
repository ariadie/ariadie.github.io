const AUTH_HASH = '715b11e297e2b0d2085eb510f222ec4acb7f16e47978da9595cd557ba4d292c9';

async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function requireAuth() {
  const r = new URLSearchParams(window.location.search).get('return');
  if (r) { sessionStorage.setItem('moo_auth', '1'); return; }
  if (!sessionStorage.getItem('moo_auth')) {
    const ret = window.location.pathname.split('/').pop() || 'index.html';
    window.location.replace('login.html?return=' + encodeURIComponent(ret));
  }
}

async function verifyPassword(pwd) {
  return (await sha256(pwd)) === AUTH_HASH;
}
