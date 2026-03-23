/* ================================================================
   ⚙️  config.js — ตั้งค่าหลักของแอป
================================================================ */

// URL ของ Google Apps Script
// วิธีรับ URL: Deploy → New deployment → Web App → คัดลอก URL
export const API_URL =
  'https://script.google.com/macros/s/AKfycbyVrdEBAXjAZUA9Qknslarx7TkR8Vs6_AKieDyvAtupSQw3323AqKvLZrG_LmhadyvLFg/exec';

// Secret token สำหรับ verify POST request
// ⚠️ ต้องตรงกับค่า SECRET_TOKEN ใน Google Apps Script
export const SECRET_TOKEN = 'ubb-shop-secret-2024';

// SHA-256 hash ของ Admin PIN
// ค่าเริ่มต้น: PIN = "1234"
// วิธีสร้าง hash ใหม่ใน browser console:
//   const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOUR_PIN'));
//   console.log([...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join(''));
export const PIN_HASH =
  '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';

/* ================================================================
   Utility functions
================================================================ */

/** ฟอร์แมตราคาบาทไทย เช่น ฿1,200 */
export const fmt = (n) =>
  '฿' + Number(n).toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

/** HTML escape ป้องกัน XSS ทุกจุดที่แสดง user input */
export const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** แปลงไฟล์รูปเป็น Base64 string */
export function toB64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่ได้'));
    reader.readAsDataURL(file);
  });
}
