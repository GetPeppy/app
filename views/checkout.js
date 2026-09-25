const { layout } = require('./layout');

function checkoutPage(settings) {
  // The checkout script must come AFTER PRODUCTS and cart.js
  // So we put it in extraScript which layout renders after those
  const checkoutScript = `<script>
var _payMethod = 'usdc';

function selectPay(el, method) {
  document.querySelectorAll('.pay-opt').forEach(function(e){ e.classList.remove('active'); });
  el.classList.add('active');
  _payMethod = method;
}

function coChangeQty(id, delta) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  if (typeof saveCart === 'function') saveCart();
  if (typeof updateCartCount === 'function') updateCartCount();
  renderSummary();
}

function coRemove(id) {
  delete cart[id];
  if (typeof saveCart === 'function') saveCart();
  if (typeof updateCartCount === 'function') updateCartCount();
  renderSummary();
}

function renderSummary() {
  var itemsEl = document.getElementById('co-items');
  if (!itemsEl || !window.PRODUCTS) return;
  var keys = Object.keys(cart);
  if (!keys.length) {
    itemsEl.innerHTML = '<p style="color:#888;font-size:14px;padding:8px 0">Your cart is empty. <a href="/shop" style="color:#3B6FD4">Continue shopping</a></p>';
    document.getElementById('co-subtotal').textContent = 'CA$0';
    document.getElementById('co-ship').textContent = 'CA$25';
    document.getElementById('co-total').textContent = 'CA$25';
    var b = document.getElementById('co-submit-btn');
    if (b) b.disabled = true;
    return;
  }
  var b = document.getElementById('co-submit-btn');
  if (b) b.disabled = false;
  var sub = 0; var html = '';
  keys.forEach(function(id) {
    var p = PRODUCTS.find(function(x){ return x.id === id; });
    if (!p) return;
    var qty = cart[id]; var line = p.price * qty; sub += line;
    html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #EEF3FB">'
      + '<img src="/img/' + id + '.jpg" style="width:48px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0" alt="">'
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:13px;font-weight:600;color:#111">' + p.name + ' <span style="color:#888;font-weight:400">' + p.dose + '</span></div>'
      + '<div style="display:flex;align-items:center;gap:8px;margin-top:6px">'
      + '<button data-id="' + id + '" data-delta="-1" class="co-qty-btn" style="width:26px;height:26px;border-radius:50%;border:1px solid #E0E0E0;background:#F9F9F9;cursor:pointer;font-size:15px">&#8722;</button>'
      + '<span style="font-size:13px;font-weight:600;min-width:16px;text-align:center">' + qty + '</span>'
      + '<button data-id="' + id + '" data-delta="1" class="co-qty-btn" style="width:26px;height:26px;border-radius:50%;border:1px solid #E0E0E0;background:#F9F9F9;cursor:pointer;font-size:15px">+</button>'
      + '</div></div>'
      + '<div style="text-align:right;flex-shrink:0">'
      + '<div style="font-size:14px;font-weight:700;color:#111">CA$' + line + '</div>'
      + '<button data-id="' + id + '" class="co-remove-btn" style="font-size:11px;color:#aaa;background:none;border:none;cursor:pointer;margin-top:4px">Remove</button>'
      + '</div></div>';
  });
  itemsEl.innerHTML = html;
  // Wire up buttons via delegation
  itemsEl.querySelectorAll('.co-qty-btn').forEach(function(btn) {
    btn.onclick = function() { coChangeQty(this.dataset.id, parseInt(this.dataset.delta)); };
  });
  itemsEl.querySelectorAll('.co-remove-btn').forEach(function(btn) {
    btn.onclick = function() { coRemove(this.dataset.id); };
  });
  var ship = sub >= 500 ? 0 : 25;
  document.getElementById('co-subtotal').textContent = 'CA$' + sub;
  document.getElementById('co-ship').textContent = ship === 0 ? 'Free \u2014 over CA$500' : 'CA$25';
  document.getElementById('co-total').textContent = 'CA$' + (sub + ship);
}

async function placeOrder() {
  var name    = document.getElementById('co-name').value.trim();
  var email   = document.getElementById('co-email').value.trim();
  var address = document.getElementById('co-address').value.trim();
  var city    = document.getElementById('co-city').value.trim();
  var prov    = document.getElementById('co-province').value;
  var postal  = document.getElementById('co-postal').value.trim();
  var phone   = document.getElementById('co-phone').value.trim();
  var errEl   = document.getElementById('co-error');
  if (!name||!email||!address||!city||!prov||!postal) {
    errEl.textContent='Please fill in all required fields.'; errEl.style.display='block'; return;
  }
  var items = Object.keys(cart).map(function(id){
    var p = PRODUCTS.find(function(x){ return x.id===id; });
    return p ? {id:p.id,name:p.name,dose:p.dose,price:p.price,qty:cart[id]} : null;
  }).filter(Boolean);
  var sub = items.reduce(function(t,i){ return t+i.price*i.qty; },0);
  var btn = document.getElementById('co-submit-btn');
  if (btn) { btn.textContent='Placing order\u2026'; btn.disabled=true; }
  errEl.style.display='none';
  try {
    var r = await fetch('/api/order',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name,email,address,city,province:prov,postal,phone,items,subtotal:sub,payment_method:_payMethod})});
    var d = await r.json();
    if (!d.ok) throw new Error(d.error||'Order failed');
    if (typeof clearCart==='function') clearCart();
    showConfirmation(d.ref,d.payment_address,d.total,d.shipping,_payMethod);
  } catch(e) {
    errEl.textContent=e.message; errEl.style.display='block';
    if(btn){btn.textContent='Place Order \u2192';btn.disabled=false;}
  }
}

function showConfirmation(ref,payAddr,total,shipping,method) {
  var mLabel={usdc:'USDC (Ethereum)',btc:'Bitcoin',etransfer:'e-Transfer'}[method]||method;
  document.getElementById('confirm-content').innerHTML=
    '<div style="width:64px;height:64px;background:#16A34A;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;margin:0 auto 20px">\u2713</div>'
    +'<h1 style="font-family:Fraunces,serif;font-size:36px;font-weight:300;margin-bottom:8px">Order Placed!</h1>'
    +'<p style="font-size:16px;color:#555;margin-bottom:6px">Reference: <strong>'+ref+'</strong></p>'
    +'<p style="font-size:14px;color:#888;margin-bottom:32px">Please send payment below and we will confirm within 1 business day.</p>'
    +'<div style="background:#F7F9FF;border:1px solid #DDE6F5;border-radius:10px;padding:24px;text-align:left;margin-bottom:24px">'
    +'<p style="font-size:14px;color:#555;margin-bottom:10px">Send <strong>CA$'+total+'</strong> via '+mLabel+' to:</p>'
    +'<div style="font-family:monospace;font-size:13px;background:#fff;border:1px solid #DDE6F5;border-radius:6px;padding:12px;word-break:break-all">'+(payAddr||'Contact us for payment details')+'</div>'
    +'<p style="font-size:12px;color:#888;margin-top:10px">Include <strong>'+ref+'</strong> in your payment memo.</p>'
    +'</div>'
    +'<a href="/" style="display:inline-block;background:#3B6FD4;color:#fff;padding:14px 36px;font-size:15px;font-weight:700;border-radius:8px;text-decoration:none">Return to Shop</a>';
  document.getElementById('confirm-overlay').style.display='block';
  window.scrollTo(0,0);
}

// Run after everything is loaded
renderSummary();
</script>`;

  const body = `
  <div class="container" style="padding-top:48px;padding-bottom:64px;max-width:1100px">
    <h1 style="font-family:'Fraunces',serif;font-size:36px;font-weight:300;margin-bottom:32px">Checkout</h1>
    <div class="checkout-layout">
      <div>
        <h2 class="checkout-heading">Contact & Shipping</h2>
        <div class="co-row-2">
          <div><label class="co-label">Full Name *</label><input class="co-field" id="co-name" placeholder="John Smith"></div>
          <div><label class="co-label">Email *</label><input class="co-field" id="co-email" type="email" placeholder="you@example.com"></div>
        </div>
        <div class="co-row"><label class="co-label">Phone</label><input class="co-field" id="co-phone" placeholder="+1 (555) 000-0000"></div>
        <div class="co-row"><label class="co-label">Street Address *</label><input class="co-field" id="co-address" placeholder="123 Main Street"></div>
        <div class="co-row-3">
          <div><label class="co-label">City *</label><input class="co-field" id="co-city" placeholder="Vancouver"></div>
          <div><label class="co-label">Province *</label>
            <select class="co-field" id="co-province">
              <option value="">Province</option>
              ${['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'].map(p=>`<option>${p}</option>`).join('')}
            </select>
          </div>
          <div><label class="co-label">Postal Code *</label><input class="co-field" id="co-postal" placeholder="V6B 1A1"></div>
        </div>
        <h2 class="checkout-heading" style="margin-top:32px">Payment Method</h2>
        <div class="pay-methods">
          <div class="pay-opt active" onclick="selectPay(this,'usdc')"><div class="pay-opt-name">USDC</div><div class="pay-opt-sub">USD Coin</div></div>
          <div class="pay-opt" onclick="selectPay(this,'btc')"><div class="pay-opt-name">Bitcoin</div><div class="pay-opt-sub">BTC on-chain</div></div>
          <div class="pay-opt" onclick="selectPay(this,'etransfer')"><div class="pay-opt-name">e-Transfer</div><div class="pay-opt-sub">Canadian banks</div></div>
        </div>
        <div id="co-error" style="display:none;background:#FEE2E2;color:#991B1B;padding:12px 16px;border-radius:6px;margin-top:8px;font-size:13px"></div>
        <button class="co-submit-btn" id="co-submit-btn" onclick="placeOrder()">Place Order →</button>
        <p class="co-legal">For research use only. Not for human consumption. Must be 21+ to purchase.</p>
      </div>
      <div class="checkout-summary-col">
        <h2 class="checkout-heading">Order Summary</h2>
        <div id="co-items" class="co-items"><p style="color:#888;font-size:14px">Loading cart…</p></div>
        <div class="co-totals">
          <div class="co-total-row"><span>Subtotal</span><span id="co-subtotal">CA$0</span></div>
          <div class="co-total-row"><span>Shipping</span><span id="co-ship">CA$25</span></div>
          <div class="co-total-row co-grand"><span>Total</span><span id="co-total">CA$0</span></div>
        </div>
        <p style="font-size:11px;color:#999;margin-top:14px;line-height:1.6">Ships within Canada only. Payment instructions shown after placing your order.</p>
      </div>
    </div>
    <div id="confirm-overlay" style="display:none;position:fixed;inset:0;background:#fff;z-index:200;overflow-y:auto;padding:60px 24px">
      <div style="max-width:600px;margin:0 auto;text-align:center" id="confirm-content"></div>
    </div>
  </div>`;

  return layout({ title: 'Checkout', page: 'checkout', body, extraScript: checkoutScript });
}

module.exports = { checkoutPage };
