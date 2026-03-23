/* ================================================================
   auth.js — ระบบ PIN-based Authentication สำหรับ Admin
================================================================ */
import { PIN_HASH } from './config.js';

const SESSION_KEY = 'adminSession';

/* ----------------------------------------------------------------
   Core auth functions
---------------------------------------------------------------- */

/** ตรวจสอบว่า login เป็น Admin อยู่หรือไม่ */
export function isAdmin() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

/** Hash PIN ด้วย SHA-256 (Web Crypto API) */
export async function hashPin(pin) {
  const encoded    = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * พยายาม login ด้วย PIN
 * @returns {Promise<boolean>} true ถ้า PIN ถูกต้อง
 */
export async function login(pin) {
  const hash = await hashPin(pin);
  if (hash === PIN_HASH) {
    sessionStorage.setItem(SESSION_KEY, 'true');
    return true;
  }
  return false;
}

/** Logout ออกจาก Admin session */
export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

/* ----------------------------------------------------------------
   PIN Dialog UI
---------------------------------------------------------------- */
let _pinResolve = null;
let _pinInput   = '';

/** Initialize PIN keypad และ event listeners (เรียกครั้งเดียวตอน init) */
export function initPinDialog() {
  const grid = document.getElementById('pinGrid');

  // สร้างปุ่ม 1–9, ⌫, 0, ✓
  const keys = ['1','2','3','4','5','6','7','8','9','⌫','0','✓'];
  grid.innerHTML = keys.map(k => {
    let cls = 'pin-key';
    if (k === '⌫') cls += ' action';
    if (k === '✓') cls += ' confirm';
    return `<button class="${cls}" data-key="${k}" type="button">${k}</button>`;
  }).join('');

  grid.querySelectorAll('.pin-key').forEach(btn => {
    btn.addEventListener('click', () => _handleKey(btn.dataset.key));
  });

  document.getElementById('pinCancel').addEventListener('click', () => {
    closePinDialog();
    if (_pinResolve) { _pinResolve(false); _pinResolve = null; }
  });
}

/** เปิด PIN dialog คืน Promise<boolean> */
export function openPinDialog() {
  _pinInput = '';
  document.getElementById('pinError').textContent = '';
  _updateDots();
  document.getElementById('pinDialog').classList.add('open');
  return new Promise(resolve => { _pinResolve = resolve; });
}

/** ปิด PIN dialog */
export function closePinDialog() {
  document.getElementById('pinDialog').classList.remove('open');
  _pinInput = '';
  _updateDots();
}

/* ----------------------------------------------------------------
   Private helpers
---------------------------------------------------------------- */
function _updateDots() {
  document.querySelectorAll('#pinDots span').forEach((dot, i) => {
    dot.classList.toggle('filled', i < _pinInput.length);
  });
}

async function _handleKey(key) {
  const errorEl = document.getElementById('pinError');
  const pinBox  = document.getElementById('pinBox');

  if (key === '⌫') {
    _pinInput = _pinInput.slice(0, -1);
    errorEl.textContent = '';
    _updateDots();
    return;
  }

  if (key === '✓') {
    if (_pinInput.length < 4) {
      errorEl.textContent = 'กรุณากรอก PIN 4 หลัก';
      return;
    }
    const ok = await login(_pinInput);
    if (ok) {
      closePinDialog();
      if (_pinResolve) { _pinResolve(true); _pinResolve = null; }
    } else {
      _pinInput = '';
      _updateDots();
      errorEl.textContent = 'PIN ไม่ถูกต้อง กรุณาลองใหม่';
      // shake animation
      pinBox.classList.remove('shake');
      void pinBox.offsetWidth; // force reflow
      pinBox.classList.add('shake');
      pinBox.addEventListener('animationend', () => pinBox.classList.remove('shake'), { once: true });
    }
    return;
  }

  // ตัวเลข 0-9
  if (_pinInput.length >= 4) return;
  _pinInput += key;
  errorEl.textContent = '';
  _updateDots();

  // auto-confirm เมื่อครบ 4 หลัก
  if (_pinInput.length === 4) {
    setTimeout(() => _handleKey('✓'), 200);
  }
}
