/* ================================================================
   api.js — ติดต่อ Google Apps Script backend
================================================================ */
import { API_URL, SECRET_TOKEN } from './config.js';

/**
 * ดึงสินค้าทั้งหมดจาก Google Sheet
 * @returns {Promise<Array>} array ของ { product_name, price, image_url, rowIndex }
 */
export async function fetchProducts() {
  const res = await fetch(`${API_URL}?action=getProducts`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.products || [];
}

/**
 * เพิ่มสินค้าใหม่
 * @param {{ name: string, price: number, imageBase64: string, imageMimeType: string }} param
 */
export async function addProduct({ name, price, imageBase64, imageMimeType }) {
  const res = await fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain' },
    body:    JSON.stringify({
      action: 'addProduct',
      token:  SECRET_TOKEN,
      name, price, imageBase64, imageMimeType,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/**
 * แก้ไขสินค้าที่มีอยู่
 * @param {{ rowIndex: number, name: string, price: number, imageBase64?: string, imageMimeType?: string }} param
 */
export async function editProduct({ rowIndex, name, price, imageBase64, imageMimeType }) {
  const body = {
    action: 'editProduct',
    token:  SECRET_TOKEN,
    rowIndex, name, price,
  };
  if (imageBase64) {
    body.imageBase64    = imageBase64;
    body.imageMimeType  = imageMimeType;
  }

  const res = await fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain' },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/**
 * ลบสินค้าตาม rowIndex
 * @param {number} rowIndex
 */
export async function deleteProduct(rowIndex) {
  const res = await fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain' },
    body:    JSON.stringify({
      action: 'deleteProduct',
      token:  SECRET_TOKEN,
      rowIndex,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
