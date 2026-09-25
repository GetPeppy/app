const PRODUCTS = [
  { id:'retatrutide-10mg',    name:'Retatrutide',            dose:'10mg',          price:90,  category:'Metabolic Research',  cat_color:'#D97706', cat_bg:'#FEF3C7', desc:'Retatrutide is a triple GIP, GLP-1, and glucagon receptor agonist peptide studied for its effects on metabolic function, energy regulation, and body composition in preclinical and clinical research.' },
  { id:'retatrutide-20mg',    name:'Retatrutide',            dose:'20mg',          price:150, category:'Metabolic Research',  cat_color:'#D97706', cat_bg:'#FEF3C7', desc:'Retatrutide is a triple GIP, GLP-1, and glucagon receptor agonist peptide studied for its effects on metabolic function, energy regulation, and body composition in preclinical and clinical research.' },
  { id:'mots-c-10mg',         name:'MOTS-c',                 dose:'10mg',          price:40,  category:'Metabolic Research',  cat_color:'#D97706', cat_bg:'#FEF3C7', desc:'MOTS-c is a mitochondrial-derived peptide studied for its role in metabolic regulation, insulin sensitivity, and exercise performance in preclinical research models.' },
  { id:'mots-c-40mg',         name:'MOTS-c',                 dose:'40mg',          price:120, category:'Metabolic Research',  cat_color:'#D97706', cat_bg:'#FEF3C7', desc:'MOTS-c is a mitochondrial-derived peptide studied for its role in metabolic regulation, insulin sensitivity, and exercise performance in preclinical research models.' },
  { id:'klow-80mg',           name:'KLOW',                   dose:'80mg',          price:100, category:'Longevity Research',  cat_color:'#16A34A', cat_bg:'#F0FDF4', desc:'KLOW is a proprietary longevity-focused peptide blend studied in the context of cellular health, mitochondrial function, and aging research.' },
  { id:'glow-70mg',           name:'GLOW',                   dose:'70mg',          price:90,  category:'Longevity Research',  cat_color:'#16A34A', cat_bg:'#F0FDF4', desc:'GLOW is a peptide blend studied for its potential role in longevity pathways, cellular resilience, and NAD+ metabolism in preclinical research.' },
  { id:'tesamorelin-10mg',    name:'Tesamorelin',            dose:'10mg',          price:90,  category:'Growth Research',     cat_color:'#7C3AED', cat_bg:'#F5F3FF', desc:'Tesamorelin is a growth hormone-releasing hormone (GHRH) analogue studied for its effects on GH secretion, body composition, and metabolic parameters in research settings.' },
  { id:'cjc-ipamorelin-10mg', name:'CJC-1295 / Ipamorelin', dose:'10mg (5mg/5mg)',price:75,  category:'Growth Research',     cat_color:'#7C3AED', cat_bg:'#F5F3FF', desc:'CJC-1295 and Ipamorelin are studied in combination for their synergistic effects on GH pulse amplitude and frequency in research models.' },
  { id:'nad-500mg',           name:'NAD+',                   dose:'500mg',         price:50,  category:'Longevity Research',  cat_color:'#16A34A', cat_bg:'#F0FDF4', desc:'NAD+ is a coenzyme essential to cellular energy metabolism, DNA repair, and sirtuin activation, studied extensively in longevity and aging research.' },
  { id:'nad-1000mg',          name:'NAD+',                   dose:'1000mg',        price:80,  category:'Longevity Research',  cat_color:'#16A34A', cat_bg:'#F0FDF4', desc:'NAD+ is a coenzyme essential to cellular energy metabolism, DNA repair, and sirtuin activation, studied extensively in longevity and aging research.' },
  { id:'5amino1mq-50mg',      name:'5-Amino-1MQ',            dose:'50mg',          price:80,  category:'Metabolic Research',  cat_color:'#D97706', cat_bg:'#FEF3C7', desc:'5-Amino-1MQ is a small molecule NNMT inhibitor studied for its effects on adipogenesis, energy expenditure, and metabolic function in preclinical models.' },
  { id:'semax-10mg',          name:'Semax',                  dose:'10mg',          price:50,  category:'Cognitive Research',  cat_color:'#2563EB', cat_bg:'#EFF6FF', desc:'Semax is a synthetic analogue of ACTH studied for its neuroprotective, nootropic, and anxiolytic properties in preclinical and clinical research contexts.' },
  { id:'selank-10mg',         name:'Selank',                 dose:'10mg',          price:50,  category:'Cognitive Research',  cat_color:'#2563EB', cat_bg:'#EFF6FF', desc:'Selank is a synthetic analogue of tuftsin, studied for its anxiolytic, nootropic, and stress-modulating effects in research settings.' },
];

function layout({ title, description, page, body, extraScript = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title} — Peppy Research Peptides</title>
<meta name="description" content="${description || 'Research-grade peptides for Canadian researchers. Third-party tested with certificates of analysis for every batch.'}">
<meta name="robots" content="index, follow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;1,300&family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css">
</head>
<body>

<!-- Nav FIRST -->
<nav role="navigation" aria-label="Main navigation">
  <a href="/" class="wordmark">
    <div class="wordmark-bar"></div>
    <div class="wordmark-text"><span class="word-pep">PEP</span><span class="word-py">PY</span></div>
  </a>
  <ul class="nav-links">
    <li><a href="/" class="${page==='home'?'active':''}">Home</a></li>
    <li><a href="/shop" class="${page==='shop'||page==='product'?'active':''}">Shop</a></li>
    <li><a href="/lab-reports" class="${page==='lab-reports'?'active':''}">Lab Reports</a></li>
    <li><a href="/faq" class="${page==='faq'?'active':''}">FAQ</a></li>
  </ul>
  <button class="cart-btn" onclick="openCart()">Cart (<span class="cart-count">0</span>)</button>
</nav>

<!-- Ticker BELOW nav -->
<div class="ticker-wrap">
  <div class="ticker"><span class="ticker-text">Research Use Only</span><span class="ticker-sep"></span><span class="ticker-text">Not for Human Consumption</span><span class="ticker-sep"></span><span class="ticker-text">Must Be 21+ to Purchase</span><span class="ticker-sep"></span><span class="ticker-text">Ships Within Canada Only</span><span class="ticker-sep"></span><span class="ticker-text">All Prices in CAD</span><span class="ticker-sep"></span><span class="ticker-text">Lab-Tested COAs on Every Batch</span><span class="ticker-sep"></span><span class="ticker-text">99%+ HPLC-Verified Purity</span><span class="ticker-sep"></span><span class="ticker-text">Discrete Packaging</span><span class="ticker-sep"></span><span class="ticker-text">Ships Within 1–2 Business Days</span><span class="ticker-sep"></span><span class="ticker-text">Research Use Only</span><span class="ticker-sep"></span><span class="ticker-text">Not for Human Consumption</span><span class="ticker-sep"></span><span class="ticker-text">Must Be 21+ to Purchase</span><span class="ticker-sep"></span><span class="ticker-text">Ships Within Canada Only</span><span class="ticker-sep"></span><span class="ticker-text">All Prices in CAD</span><span class="ticker-sep"></span><span class="ticker-text">Lab-Tested COAs on Every Batch</span><span class="ticker-sep"></span><span class="ticker-text">99%+ HPLC-Verified Purity</span><span class="ticker-sep"></span><span class="ticker-text">Discrete Packaging</span><span class="ticker-sep"></span><span class="ticker-text">Ships Within 1–2 Business Days</span><span class="ticker-sep"></span></div>
</div>

<!-- Cart Drawer -->
<div id="cart-overlay" class="cart-overlay" onclick="closeCart()"></div>
<div id="cart-drawer" class="cart-drawer">
  <div class="cart-header">
    <div class="cart-title">Your Cart</div>
    <button class="cart-close" onclick="closeCart()">✕</button>
  </div>
  <div id="cart-items" class="cart-items"></div>
  <div id="cart-footer-wrap" style="display:none">
    <div class="cart-footer-inner">
      <div class="cart-total-row" style="font-size:13px;color:#888;margin-bottom:6px"><span>Subtotal</span><span id="cart-subtotal-amt"></span></div>
      <div class="cart-total-row" style="font-size:13px;color:#888;margin-bottom:12px"><span>Shipping</span><span id="cart-shipping-amt"></span></div>
      <div class="cart-total-row"><span>Total</span><strong id="cart-total-amt"></strong></div>
      <a href="/checkout" class="cart-checkout-btn" style="display:block;text-align:center;text-decoration:none">Proceed to Checkout</a>
      <p class="cart-note">Payment via USDC, BTC, and e-Transfer · Canada shipping only</p>
    </div>
  </div>
</div>

<!-- Toast -->
<div id="toast" class="toast"></div>

<!-- Notify Modal -->
<div id="notify-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:300;align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:12px;width:420px;max-width:95vw;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,.2);">
    <h2 style="font-family:'Fraunces',serif;font-size:22px;font-weight:300;margin-bottom:8px">Notify Me</h2>
    <p style="font-size:14px;color:#888;margin-bottom:20px" id="notify-product-label">We'll email you when this product is back in stock.</p>
    <input id="notify-email" type="email" placeholder="your@email.com" style="width:100%;padding:12px 14px;border:1px solid #E8E8E8;border-radius:6px;font-size:14px;font-family:'Inter',sans-serif;outline:none;box-sizing:border-box;margin-bottom:12px">
    <div style="display:flex;gap:10px">
      <button onclick="submitNotify()" style="flex:1;background:#3B6FD4;color:#fff;border:none;padding:13px;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif">Notify Me</button>
      <button onclick="document.getElementById('notify-modal').style.display='none'" style="padding:13px 20px;background:none;border:1px solid #E8E8E8;border-radius:6px;font-size:14px;cursor:pointer;font-family:'Inter',sans-serif">Cancel</button>
    </div>
  </div>
</div>

<!-- Page body -->
<main class="site-main">${body}</main>

<!-- Footer -->
<footer class="site-footer">
  <div class="footer-inner">
    <a href="/" class="wordmark" style="text-decoration:none">
      <div class="wordmark-bar"></div>
      <div class="wordmark-text"><span class="word-pep">PEP</span><span class="word-py">PY</span></div>
    </a>
    <nav class="footer-links">
      <a href="/faq">FAQ</a>
      <a href="/lab-reports">Lab Reports</a>
      <a href="/shop">Shop</a>
    </nav>
    <div class="footer-copy">© 2026 Peppy. All rights reserved.</div>
  </div>
</footer>

<script>var PRODUCTS=${JSON.stringify(PRODUCTS)};</script>
<script src="/js/cart.js"></script>
${extraScript}
</body></html>`;
}

module.exports = { layout, PRODUCTS };
