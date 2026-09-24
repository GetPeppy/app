const { layout, PRODUCTS } = require('./layout');

// Pick featured products
const FEATURED = ['retatrutide-10mg','semax-10mg','selank-10mg','nad-1000mg'];

function homePage(stock, latestCoas) {
  const featuredCards = FEATURED.map(id => {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return '';
    const inStock = stock[id]?.in_stock;
    const btn = inStock
      ? `<button class="featured-card-btn" onclick="addToCart('${p.id}','${p.name}','${p.dose}',${p.price})">Add to Cart</button>`
      : `<button class="featured-card-btn notify" onclick="openNotify('${p.id}','${p.name} ${p.dose}')">Notify Me</button>`;
    return `
    <div class="featured-card" onclick="window.location='/products/${p.id}'">
      <div class="featured-card-img"><img src="/img/${p.id}.jpg" alt="${p.name} ${p.dose}" loading="lazy"></div>
      <div class="featured-card-body">
        <div style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:4px;margin-bottom:8px;color:${p.cat_color};background:${p.cat_bg}">${p.category}</div>
        <div class="featured-card-name">${p.name}</div>
        <div class="featured-card-dose">${p.dose}</div>
        <div class="featured-card-footer">
          <span class="featured-card-price">CA$${p.price}</span>
          ${btn}
        </div>
      </div>
    </div>`;
  }).join('');

  const coaRows = (latestCoas || []).slice(0, 5).map(c => `
    <tr>
      <td style="padding:14px 18px;font-weight:600;font-size:14px;text-align:left">${c.product_name || c.product_id}</td>
      <td style="padding:14px 18px;font-size:13px;color:#666;text-align:center">${c.lab || '—'}</td>
      <td style="padding:14px 18px;font-size:13px;color:#666;text-align:center">${c.date || '—'}</td>
      <td style="padding:14px 18px;font-size:14px;font-weight:700;color:#16A34A;text-align:right">${c.purity || '—'}</td>
    </tr>`).join('');

  const CATS = [
    { key:'Metabolic Research', sub:'GLP-1 & weight management',       color:'#D97706', bg:'#FEF3C7' },
    { key:'Cognitive Research', sub:'Focus, mood & neuroprotection',   color:'#2563EB', bg:'#EFF6FF' },
    { key:'Longevity Research', sub:'NAD+, GLOW, KLOW & more',         color:'#16A34A', bg:'#F0FDF4' },
    { key:'Growth Research',    sub:'GH secretagogues & peptides',     color:'#7C3AED', bg:'#F5F3FF' },
  ];
  const catTiles = CATS.map(c => `
    <a href="/shop?category=${encodeURIComponent(c.key)}" class="cat-tile" style="text-decoration:none">
      <span class="cat-tile-pill" style="color:${c.color};background:${c.bg}">${c.key}</span>
      <div class="cat-tile-name">${c.key}</div>
      <div class="cat-tile-count">${c.sub}</div>
    </a>`).join('');

  const body = `
  <!-- Hero -->
  <section class="hero">
    <div class="hero-left">
      <p class="hero-eyebrow">Research-Grade Peptides · Canada</p>
      <h1 class="hero-headline">Precision<br>peptides for<br><em>serious research.</em></h1>
      <p class="hero-sub">Third-party tested with certificates of analysis for every batch. No jargon — just science you can trust.</p>
      <a href="/shop" class="hero-btn">Shop Now</a>
    </div>
    <div class="hero-right">
      <div class="hero-coa-panel">
        <p class="hero-coa-eyebrow"><span class="hero-coa-check">✓</span> INDEPENDENTLY VERIFIED</p>
        <h2 class="hero-coa-title">Latest Lab<br>Verified Results</h2>
        <p class="hero-coa-sub">Every batch tested by accredited third-party labs before it ships.</p>
        <table class="hero-coa-table">
          <thead><tr>
            <th class="hero-coa-col-hd" style="text-align:left">PRODUCT</th>
            <th class="hero-coa-col-hd" style="text-align:center">LAB</th>
            <th class="hero-coa-col-hd" style="text-align:center">DATE</th>
            <th class="hero-coa-col-hd" style="text-align:right">PURITY</th>
          </tr></thead>
          <tbody>${coaRows || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#888;font-size:13px">Lab reports loading…</td></tr>'}</tbody>
        </table>
        <a href="/lab-reports" class="hero-coa-link">View all lab reports →</a>
      </div>
    </div>
  </section>

  <!-- Research Categories -->
  <section class="cats-section">
    <div class="container">
      <p class="section-eyebrow">BROWSE BY CATEGORY</p>
      <h2 class="section-title">Research Categories</h2>
      <div class="cats-grid">${catTiles}</div>
    </div>
  </section>

  <!-- Most Popular -->
  <section class="featured-section">
    <div class="container">
      <p class="section-eyebrow">BESTSELLERS</p>
      <h2 class="section-title">Most Popular</h2>
      <a href="/shop" class="section-link">View all products →</a>
      <div class="featured-grid">${featuredCards}</div>
    </div>
  </section>

  <!-- How payment works -->
  <section class="payment-section">
    <div class="container">
      <p class="section-eyebrow">SECURE CHECKOUT</p>
      <h2 class="section-title">How payment works</h2>
      <div class="payment-steps">
        <div class="payment-step">
          <div class="payment-num">1</div>
          <h3>Place your order</h3>
          <p>Add products to your cart and proceed to checkout. You'll receive your order reference immediately.</p>
        </div>
        <div class="payment-step">
          <div class="payment-num">2</div>
          <h3>Send payment</h3>
          <p>Pay via USDC, BTC, or e-Transfer to the address shown. Include your order reference in the memo.</p>
        </div>
        <div class="payment-step">
          <div class="payment-num">3</div>
          <h3>We confirm & ship</h3>
          <p>Once payment is confirmed we pack and ship within 1–2 business days. Tracking provided by email.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Why Peppy -->
  <section class="why-strip">
    <div class="why-item"><div class="why-icon">🔬</div><strong>Third-Party Tested</strong><p>Every batch independently tested by accredited labs. Certificates of analysis available on every product page.</p></div>
    <div class="why-item"><div class="why-icon">✓</div><strong>99%+ Purity Guaranteed</strong><p>Advanced purification methods ensure every product meets or exceeds pharmaceutical-grade purity standards.</p></div>
    <div class="why-item"><div class="why-icon">🚚</div><strong>Canada-Wide Shipping</strong><p>Discrete shipping across Canada. Payment via USDC, BTC, or e-Transfer. Research use only.</p></div>
  </section>`;

  return layout({ title: 'Precision Peptides · Canada', page: 'home', body,
    description: 'Research-grade peptides for Canadian researchers. Third-party tested, 99%+ purity, COAs on every batch. Retatrutide, NAD+, Semax, Selank and more.' });
}

module.exports = { homePage };
