// ── Cart & shared JS ──────────────────────────────────────────────────────────
var cart = {};
try { var _saved = localStorage.getItem('peppy_cart'); if (_saved) cart = JSON.parse(_saved); } catch(e) {}

function saveCart() {
  try { localStorage.setItem('peppy_cart', JSON.stringify(cart)); } catch(e) {}
}

function updateCartCount() {
  var count = Object.values(cart).reduce(function(s,q){ return s+q; }, 0);
  document.querySelectorAll('.cart-count').forEach(function(el){ el.textContent = count || '0'; });
}

function addToCart(id, name, dose, price) {
  cart[id] = (cart[id] || 0) + 1;
  saveCart();
  updateCartCount();
  openCart();
  renderCart();
  showToast(name + ' ' + dose + ' added to cart');
}

function openCart() {
  var d = document.getElementById('cart-drawer');
  if (d) { d.classList.add('open'); document.getElementById('cart-overlay').classList.add('open'); }
  renderCart();
}
function closeCart() {
  var d = document.getElementById('cart-drawer');
  if (d) { d.classList.remove('open'); document.getElementById('cart-overlay').classList.remove('open'); }
}

function renderCart() {
  var itemsEl = document.getElementById('cart-items');
  var footerEl = document.getElementById('cart-footer-wrap');
  var keys = Object.keys(cart);
  if (!keys.length) {
    if (itemsEl) itemsEl.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
    if (footerEl) footerEl.style.display = 'none';
    return;
  }
  if (!window.PRODUCTS) return;
  var total = 0; var out = '';
  keys.forEach(function(id) {
    var p = PRODUCTS.find(function(x){ return x.id === id; });
    if (!p) return;
    var qty = cart[id]; var line = p.price * qty; total += line;
    out += '<div class="cart-item">';
    out += '<img src="/img/' + id + '.jpg" alt="' + p.name + '" style="width:56px;height:56px;object-fit:cover;border-radius:4px;flex-shrink:0">';
    out += '<div style="flex:1;min-width:0;padding:0 12px">';
    out += '<div class="cart-item-name">' + p.name + '</div>';
    out += '<div class="cart-item-dose">' + p.dose + '</div>';
    out += '<div class="cart-item-qty">';
    out += '<button class="cart-qty-btn" data-id="' + id + '" data-d="-1" onclick="changeQty(this.dataset.id,-1)">−</button>';
    out += '<span class="cart-qty-num">' + qty + '</span>';
    out += '<button class="cart-qty-btn" data-id="' + id + '" data-d="1" onclick="changeQty(this.dataset.id,1)">+</button>';
    out += '</div></div>';
    out += '<div style="text-align:right"><div class="cart-item-price">CA$' + line + '</div>';
    out += '<button class="cart-remove" data-id="' + id + '" onclick="removeItem(this.dataset.id)">✕</button></div>';
    out += '</div>';
  });
  if (itemsEl) itemsEl.innerHTML = out;
  var ship = total >= 500 ? 0 : 25;
  var grand = total + ship;
  var sub = document.getElementById('cart-subtotal-amt');
  var shp = document.getElementById('cart-shipping-amt');
  var tot = document.getElementById('cart-total-amt');
  if (sub) sub.textContent = 'CA$' + total;
  if (shp) shp.textContent = ship === 0 ? 'Free (over CA$500)' : 'CA$25';
  if (tot) tot.textContent = 'CA$' + grand;
  if (footerEl) footerEl.style.display = 'block';
}

function changeQty(id, delta) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  saveCart();
  updateCartCount(); renderCart();
}
function removeItem(id) { delete cart[id]; saveCart(); updateCartCount(); renderCart(); }

function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 2500);
}

function clearCart() { cart = {}; saveCart(); updateCartCount(); renderCart(); }

// Notify Me modal
var _notifyProductId = null;
function openNotify(productId, productName) {
  _notifyProductId = productId;
  var lbl = document.getElementById('notify-product-label');
  var inp = document.getElementById('notify-email');
  if (lbl) lbl.textContent = 'We\'ll email you when ' + productName + ' is back in stock.';
  if (inp) inp.value = '';
  var m = document.getElementById('notify-modal');
  if (m) { m.style.display = 'flex'; setTimeout(function(){ if(inp) inp.focus(); }, 100); }
}
async function submitNotify() {
  var email = (document.getElementById('notify-email')||{}).value||'';
  if (!email || !email.includes('@')) { alert('Please enter a valid email.'); return; }
  var r = await fetch('/api/notify', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ product_id: _notifyProductId, email: email }) });
  var d = await r.json();
  if (d.ok) {
    var m = document.getElementById('notify-modal');
    if (m) m.style.display = 'none';
    showToast('You\'re on the list!');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  updateCartCount();
  var overlay = document.getElementById('cart-overlay');
  if (overlay) overlay.addEventListener('click', closeCart);
  var notifyModal = document.getElementById('notify-modal');
  if (notifyModal) notifyModal.addEventListener('click', function(e){ if(e.target===this) this.style.display='none'; });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeCart(); });
});
