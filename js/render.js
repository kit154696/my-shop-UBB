/* ================================================================
   render.js — UI rendering: grid, detail sheet, skeleton, toast
================================================================ */
import { esc, fmt } from './config.js';
import { isAdmin }  from './auth.js';

/* ----------------------------------------------------------------
   Toast notification
---------------------------------------------------------------- */
/**
 * แสดง toast แจ้งเตือน
 * @param {string} msg
 * @param {'success'|'error'|'warning'} type
 */
export function toast(msg, type = 'success') {
  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] ?? '💬'}</span><span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => el.remove(), 320);
  }, 3200);
}

/* ----------------------------------------------------------------
   Sheet management
---------------------------------------------------------------- */
const overlay = document.getElementById('overlay');

/** เปิด bottom sheet พร้อม overlay */
export function openSheet(sheet) {
  overlay.classList.add('open');
  sheet.classList.add('open');
  document.body.style.overflow = 'hidden';
}

/** ปิด bottom sheet */
export function closeSheet(sheet) {
  sheet.classList.remove('open');
  // ปิด overlay เฉพาะเมื่อไม่มี sheet อื่นเปิดอยู่
  const anyOpen = document.querySelector('.sheet.open');
  if (!anyOpen) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
}

/* ----------------------------------------------------------------
   Skeleton loading
---------------------------------------------------------------- */
/** แสดง skeleton cards ขณะโหลด */
export function renderSkeleton() {
  const grid = document.getElementById('productGrid');
  const card = `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
        <div class="skeleton-line price"></div>
        <div class="skeleton-btn"></div>
      </div>
    </div>`;
  grid.innerHTML = card.repeat(4);
}

/* ----------------------------------------------------------------
   Product grid
---------------------------------------------------------------- */
const EMPTY_SVG = `
  <svg class="empty-state-svg" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="55" cy="55" r="52" fill="#F5EDE0"/>
    <rect x="28" y="48" width="54" height="40" rx="5" fill="#E0D4C4"/>
    <path d="M42 48 C42 35 68 35 68 48" stroke="#C8BAA8" stroke-width="4.5"
          stroke-linecap="round" fill="none"/>
    <circle cx="45" cy="65" r="3" fill="#B0A090"/>
    <circle cx="65" cy="65" r="3" fill="#B0A090"/>
    <path d="M44 73 Q55 81 66 73" stroke="#B0A090" stroke-width="3"
          stroke-linecap="round" fill="none"/>
  </svg>`;

/**
 * วาด product grid
 * @param {Array}    products
 * @param {Function} onCardClick(product) — เรียกเมื่อกดการ์ด
 */
export function renderGrid(products, onCardClick) {
  const grid      = document.getElementById('productGrid');
  const itemCount = document.getElementById('itemCount');

  itemCount.textContent = `${products.length} รายการ`;

  if (!products.length) {
    grid.innerHTML = `
      <div class="empty-state">
        ${EMPTY_SVG}
        <div class="empty-title">ไม่พบสินค้า</div>
        <div class="empty-sub">ลองพิมพ์คำอื่น หรือเพิ่มสินค้าใหม่</div>
      </div>`;
    return;
  }

  grid.innerHTML = products.map((p, i) => `
    <div class="product-card" data-i="${i}">
      <div class="card-img-wrap">
        ${p.image_url
          ? `<img src="${esc(p.image_url)}" alt="${esc(p.product_name)}" loading="lazy"
                  onerror="this.parentNode.innerHTML='<div class=card-img-placeholder>📦</div>'" />`
          : `<div class="card-img-placeholder">📦</div>`}
      </div>
      <div class="card-body">
        <div class="card-name">${esc(p.product_name)}</div>
        <div class="card-price-wrap">
          <span class="card-price">${fmt(p.price)}</span>
        </div>
        <button class="btn-select">เลือกสินค้า ▶</button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.product-card').forEach(card => {
    const p = products[+card.dataset.i];
    card.addEventListener('click', () => onCardClick(p));
    card.querySelector('.btn-select').addEventListener('click', e => {
      e.stopPropagation();
      onCardClick(p);
    });
  });
}

/* ----------------------------------------------------------------
   Product detail sheet
---------------------------------------------------------------- */
/**
 * เปิด bottom sheet รายละเอียดสินค้า
 * @param {Object}   product
 * @param {Object}   callbacks — { onEdit(product), onDelete(product) }
 */
export function openDetail(product, { onEdit, onDelete } = {}) {
  const detailBody  = document.getElementById('detailBody');
  const detailSheet = document.getElementById('detailSheet');

  // ปุ่ม Admin (แสดงเฉพาะ Admin mode)
  const adminHTML = isAdmin() ? `
    <div class="admin-actions">
      <button class="btn-edit"   id="btnEditProduct">✏️ แก้ไขสินค้า</button>
      <button class="btn-delete" id="btnDeleteProduct">🗑️ ลบสินค้า</button>
    </div>` : '';

  detailBody.innerHTML = `
    <div class="detail-img-wrap">
      ${product.image_url
        ? `<img src="${esc(product.image_url)}" alt="${esc(product.product_name)}"
                onerror="this.parentNode.innerHTML='<div class=detail-img-placeholder>📦</div>'" />`
        : `<div class="detail-img-placeholder">📦</div>`}
    </div>
    <div class="detail-name">${esc(product.product_name)}</div>
    <div class="detail-price-badge">
      ${fmt(product.price)}
      <span class="per-unit">/ ชิ้น</span>
    </div>
    ${adminHTML}
    <div class="calc-box">
      <div class="calc-title">🧮 คำนวณราคา</div>
      <div class="qty-row">
        <span class="qty-label">จำนวน</span>
        <div class="qty-controls">
          <button class="qty-btn" id="qtyMinus">−</button>
          <input  type="number" id="qtyInput" value="1" min="1" inputmode="numeric" />
          <button class="qty-btn" id="qtyPlus">+</button>
        </div>
      </div>
      <div class="total-box">
        <span class="total-label">ราคารวม</span>
        <span class="total-value" id="totalValue">${fmt(product.price)}</span>
      </div>
    </div>`;

  // Quantity calculator logic
  const qi   = document.getElementById('qtyInput');
  const tv   = document.getElementById('totalValue');
  const unit = parseFloat(product.price) || 0;

  function updateTotal() {
    const q = Math.max(1, parseInt(qi.value) || 1);
    qi.value = q;
    tv.textContent = fmt(unit * q);
  }

  qi.addEventListener('input', updateTotal);
  document.getElementById('qtyMinus').addEventListener('click', () => {
    if ((+qi.value || 1) > 1) { qi.value--; updateTotal(); }
  });
  document.getElementById('qtyPlus').addEventListener('click', () => {
    qi.value = (+qi.value || 1) + 1;
    updateTotal();
  });

  // Admin action listeners
  if (isAdmin()) {
    document.getElementById('btnEditProduct').addEventListener('click', () => {
      if (onEdit) onEdit(product);
    });
    document.getElementById('btnDeleteProduct').addEventListener('click', () => {
      if (onDelete) onDelete(product);
    });
  }

  openSheet(detailSheet);
}
