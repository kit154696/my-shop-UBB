/* ================================================================
   app.js — Event listeners, init, orchestration
================================================================ */
import { fetchProducts, addProduct, editProduct, deleteProduct } from './api.js';
import { isAdmin, logout, initPinDialog, openPinDialog, closePinDialog } from './auth.js';
import { toast, openSheet, closeSheet, renderSkeleton, renderGrid, openDetail } from './render.js';
import { fmt, esc, toB64 } from './config.js';

/* ----------------------------------------------------------------
   DOM references
---------------------------------------------------------------- */
const overlay      = document.getElementById('overlay');
const searchInput  = document.getElementById('searchInput');
const clearSearch  = document.getElementById('clearSearch');
const itemCount    = document.getElementById('itemCount');

const detailSheet  = document.getElementById('detailSheet');
const closeDetail  = document.getElementById('closeDetail');

const addSheet     = document.getElementById('addSheet');
const closeAdd     = document.getElementById('closeAdd');
const btnOpenAdd   = document.getElementById('btnOpenAdd');
const productName  = document.getElementById('productName');
const productPrice = document.getElementById('productPrice');
const imgFile      = document.getElementById('imgFile');
const previewImg   = document.getElementById('previewImg');
const previewOvl   = document.getElementById('previewOverlay');
const uploadInner  = document.getElementById('uploadInner');
const btnSubmit    = document.getElementById('btnSubmit');

const editSheet    = document.getElementById('editSheet');
const closeEdit    = document.getElementById('closeEdit');
const editRowIndex = document.getElementById('editRowIndex');
const editName     = document.getElementById('editName');
const editPrice    = document.getElementById('editPrice');
const editImgFile  = document.getElementById('editImgFile');
const editPreview  = document.getElementById('editPreviewImg');
const editPrevOvl  = document.getElementById('editPreviewOverlay');
const editUpInner  = document.getElementById('editUploadInner');
const btnEditSubmit= document.getElementById('btnEditSubmit');

const btnAdmin     = document.getElementById('btnAdmin');
const adminBadge   = document.getElementById('adminBadge');
const confirmDialog= document.getElementById('confirmDialog');
const confirmTitle = document.getElementById('confirmTitle');
const confirmSub   = document.getElementById('confirmSub');
const btnCancelCfm = document.getElementById('btnCancelConfirm');
const btnConfirmDel= document.getElementById('btnConfirmDelete');

/* ----------------------------------------------------------------
   State
---------------------------------------------------------------- */
let allProducts   = [];
let pendingDelete = null; // product รอการยืนยันลบ

/* ----------------------------------------------------------------
   Data fetching
---------------------------------------------------------------- */
async function fetchAndRender() {
  renderSkeleton();
  try {
    allProducts = await fetchProducts();
    renderGrid(allProducts, handleCardClick);
  } catch (e) {
    document.getElementById('productGrid').innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <div class="error-title">โหลดข้อมูลไม่ได้</div>
        <div class="error-sub">กรุณาตรวจสอบอินเทอร์เน็ต</div>
      </div>`;
    document.getElementById('itemCount').textContent = '0 รายการ';
  }
}

/* ----------------------------------------------------------------
   Card click → open detail
---------------------------------------------------------------- */
function handleCardClick(product) {
  openDetail(product, {
    onEdit:   handleEditOpen,
    onDelete: handleDeleteRequest,
  });
}

/* ----------------------------------------------------------------
   Auth UI
---------------------------------------------------------------- */
function updateAuthUI() {
  const admin = isAdmin();
  adminBadge.classList.toggle('visible', admin);
  btnAdmin.textContent = admin ? '🔓 Logout' : '🔐 Admin';

  // ปิด sheet ที่มี admin buttons เมื่อ logout
  if (!admin) {
    closeSheet(detailSheet);
    closeSheet(editSheet);
  }
}

/* ----------------------------------------------------------------
   Search
---------------------------------------------------------------- */
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  clearSearch.classList.toggle('visible', q.length > 0);
  renderGrid(
    allProducts.filter(p => p.product_name.toLowerCase().includes(q)),
    handleCardClick,
  );
});

clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  clearSearch.classList.remove('visible');
  renderGrid(allProducts, handleCardClick);
  searchInput.focus();
});

/* ----------------------------------------------------------------
   Overlay / Close buttons
---------------------------------------------------------------- */
overlay.addEventListener('click', () => {
  // ไม่ปิดถ้า PIN/confirm dialog กำลังเปิด
  if (document.getElementById('pinDialog').classList.contains('open'))    return;
  if (confirmDialog.classList.contains('open')) return;
  closeSheet(detailSheet);
  closeSheet(addSheet);
  closeSheet(editSheet);
});

closeDetail.addEventListener('click', () => closeSheet(detailSheet));
closeAdd.addEventListener('click', () => { closeSheet(addSheet); resetAddForm(); });
closeEdit.addEventListener('click', () => { closeSheet(editSheet); resetEditForm(); });

/* ----------------------------------------------------------------
   Admin button
---------------------------------------------------------------- */
btnAdmin.addEventListener('click', async () => {
  if (isAdmin()) {
    logout();
    updateAuthUI();
    toast('ออกจากระบบ Admin แล้ว', 'success');
  } else {
    const ok = await openPinDialog();
    if (ok) {
      updateAuthUI();
      toast('เข้าสู่ระบบ Admin สำเร็จ! 🔑', 'success');
    }
  }
});

/* ----------------------------------------------------------------
   Add product sheet
   — Guest กดปุ่ม "เพิ่มสินค้า" → แสดง PIN dialog ก่อน
---------------------------------------------------------------- */
btnOpenAdd.addEventListener('click', async () => {
  if (!isAdmin()) {
    const ok = await openPinDialog();
    if (!ok) return;
    updateAuthUI();
    toast('เข้าสู่ระบบ Admin สำเร็จ! 🔑', 'success');
  }
  openSheet(addSheet);
});

/* Add — image preview */
imgFile.addEventListener('change', () => {
  const f = imgFile.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    previewImg.style.display = 'block';
    previewOvl.style.display = 'block';
    uploadInner.style.display = 'none';
  };
  reader.readAsDataURL(f);
});

/* Add — submit */
btnSubmit.addEventListener('click', async () => {
  const name  = productName.value.trim();
  const price = parseFloat(productPrice.value);
  const file  = imgFile.files[0];

  if (!name)              { toast('กรุณากรอกชื่อสินค้า', 'error'); productName.focus(); return; }
  if (!price || price<=0) { toast('กรุณากรอกราคาให้ถูกต้อง', 'error'); productPrice.focus(); return; }
  if (!file)              { toast('กรุณาเลือกรูปภาพสินค้า', 'error'); return; }

  btnSubmit.classList.add('loading');
  btnSubmit.disabled = true;
  try {
    const b64 = await toB64(file);
    await addProduct({
      name, price,
      imageBase64:    b64.split(',')[1],
      imageMimeType:  file.type,
    });
    toast('เพิ่มสินค้าสำเร็จ! 🎉');
    resetAddForm();
    closeSheet(addSheet);
    await fetchAndRender();
  } catch (e) {
    toast(`เกิดข้อผิดพลาด: ${e.message}`, 'error');
  } finally {
    btnSubmit.classList.remove('loading');
    btnSubmit.disabled = false;
  }
});

function resetAddForm() {
  productName.value = '';
  productPrice.value = '';
  imgFile.value = '';
  previewImg.src = '';
  previewImg.style.display = 'none';
  previewOvl.style.display = 'none';
  uploadInner.style.display = '';
}

/* ----------------------------------------------------------------
   Edit product sheet
---------------------------------------------------------------- */
function handleEditOpen(product) {
  // ปิด detail sheet ก่อน แล้วเปิด edit sheet
  closeSheet(detailSheet);

  editRowIndex.value  = product.rowIndex;
  editName.value      = product.product_name;
  editPrice.value     = product.price;

  // แสดงรูปเดิม
  if (product.image_url) {
    editPreview.src          = product.image_url;
    editPreview.style.display = 'block';
    editPrevOvl.style.display = 'block';
    editUpInner.style.display = 'none';
  } else {
    resetEditForm();
  }

  openSheet(editSheet);
}

/* Edit — image preview */
editImgFile.addEventListener('change', () => {
  const f = editImgFile.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = e => {
    editPreview.src           = e.target.result;
    editPreview.style.display = 'block';
    editPrevOvl.style.display = 'block';
    editUpInner.style.display = 'none';
  };
  reader.readAsDataURL(f);
});

/* Edit — submit */
btnEditSubmit.addEventListener('click', async () => {
  const rowIndex = parseInt(editRowIndex.value);
  const name     = editName.value.trim();
  const price    = parseFloat(editPrice.value);
  const file     = editImgFile.files[0];

  if (!name)              { toast('กรุณากรอกชื่อสินค้า', 'error'); editName.focus(); return; }
  if (!price || price<=0) { toast('กรุณากรอกราคาให้ถูกต้อง', 'error'); editPrice.focus(); return; }
  if (!rowIndex)          { toast('ข้อมูลสินค้าไม่ถูกต้อง', 'error'); return; }

  btnEditSubmit.classList.add('loading');
  btnEditSubmit.disabled = true;
  try {
    const payload = { rowIndex, name, price };
    if (file) {
      const b64 = await toB64(file);
      payload.imageBase64   = b64.split(',')[1];
      payload.imageMimeType = file.type;
    }
    await editProduct(payload);
    toast('แก้ไขสินค้าสำเร็จ ✅');
    resetEditForm();
    closeSheet(editSheet);
    await fetchAndRender();
  } catch (e) {
    toast(`เกิดข้อผิดพลาด: ${e.message}`, 'error');
  } finally {
    btnEditSubmit.classList.remove('loading');
    btnEditSubmit.disabled = false;
  }
});

function resetEditForm() {
  editRowIndex.value = '';
  editName.value     = '';
  editPrice.value    = '';
  editImgFile.value  = '';
  editPreview.src           = '';
  editPreview.style.display = 'none';
  editPrevOvl.style.display = 'none';
  editUpInner.style.display = '';
}

/* ----------------------------------------------------------------
   Delete product — confirm dialog
---------------------------------------------------------------- */
function handleDeleteRequest(product) {
  pendingDelete   = product;
  confirmTitle.textContent = 'ยืนยันการลบสินค้า';
  confirmSub.textContent   = `ต้องการลบ "${product.product_name}" ใช่หรือไม่?`;
  confirmDialog.classList.add('open');
}

btnCancelCfm.addEventListener('click', () => {
  confirmDialog.classList.remove('open');
  pendingDelete = null;
});

btnConfirmDel.addEventListener('click', async () => {
  if (!pendingDelete) return;
  const product = pendingDelete;

  btnConfirmDel.classList.add('loading');
  btnConfirmDel.disabled = true;
  try {
    await deleteProduct(product.rowIndex);
    confirmDialog.classList.remove('open');
    pendingDelete = null;
    closeSheet(detailSheet);
    toast('ลบสินค้าแล้ว 🗑️', 'success');
    await fetchAndRender();
  } catch (e) {
    toast(`เกิดข้อผิดพลาด: ${e.message}`, 'error');
  } finally {
    btnConfirmDel.classList.remove('loading');
    btnConfirmDel.disabled = false;
  }
});

/* ----------------------------------------------------------------
   Ripple effect — ใส่กับปุ่มที่มี overflow: hidden
---------------------------------------------------------------- */
function addRipple(btn) {
  btn.addEventListener('click', function (e) {
    const rect   = btn.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height);
    const x      = (e.clientX - rect.left) - size / 2;
    const y      = (e.clientY - rect.top)  - size / 2;
    const ripple = document.createElement('span');
    ripple.className      = 'ripple';
    ripple.style.cssText  = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
}

/* ----------------------------------------------------------------
   Drag-to-close gesture สำหรับ bottom sheets
---------------------------------------------------------------- */
function initDragToClose(sheet, onClose) {
  const handle = sheet.querySelector('.sheet-handle');
  if (!handle) return;

  let startY   = 0;
  let currentY = 0;
  let dragging = false;

  handle.addEventListener('touchstart', e => {
    startY   = e.touches[0].clientY;
    currentY = startY;
    dragging = true;
    sheet.style.transition = 'none';
  }, { passive: true });

  handle.addEventListener('touchmove', e => {
    if (!dragging) return;
    currentY     = e.touches[0].clientY;
    const delta  = Math.max(0, currentY - startY);
    sheet.style.transform = `translateX(-50%) translateY(${delta}px)`;
  }, { passive: true });

  handle.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    sheet.style.transition = '';
    sheet.style.transform  = '';
    const delta = Math.max(0, currentY - startY);
    if (delta > 90) onClose();
  });
}

/* ----------------------------------------------------------------
   Initialisation
---------------------------------------------------------------- */
function init() {
  // PIN dialog
  initPinDialog();

  // Sync auth UI (ถ้ายังมี session อยู่จาก tab ก่อน)
  updateAuthUI();

  // Drag-to-close สำหรับทุก sheet
  initDragToClose(detailSheet, () => closeSheet(detailSheet));
  initDragToClose(addSheet,    () => { closeSheet(addSheet); resetAddForm(); });
  initDragToClose(editSheet,   () => { closeSheet(editSheet); resetEditForm(); });

  // Ripple บนปุ่มหลัก
  [btnOpenAdd, btnAdmin].forEach(addRipple);

  // โหลดสินค้า
  fetchAndRender();
}

init();
