const { layout, PRODUCTS } = require('./layout');
const FEATURED = ['retatrutide-10mg','semax-10mg','selank-10mg','nad-1000mg'];

const CATS = [
  {
    key:'Metabolic Research', color:'#D97706', bg:'#FEF3C7',
    title:'Metabolic Research',
    tagline:'GLP-1 & weight management',
    desc:'Peptides studied for their role in glucose regulation, fat oxidation, and body composition. Includes GLP-1 receptor agonists and metabolic modulators.',
    products:'Retatrutide, MOTS-c, 5-Amino-1MQ'
  },
  {
    key:'Cognitive Research', color:'#2563EB', bg:'#EFF6FF',
    title:'Cognitive Research',
    tagline:'Focus, mood & neuroprotection',
    desc:'Peptides studied for neuroprotective, anxiolytic, and nootropic effects. Research-focused compounds with strong safety profiles in preclinical models.',
    products:'Semax, Selank'
  },
  {
    key:'Longevity Research', color:'#16A34A', bg:'#F0FDF4',
    title:'Longevity Research',
    tagline:'NAD+, cellular health & aging',
    desc:'Compounds studied in the context of mitochondrial function, NAD+ metabolism, sirtuin activation, and cellular resilience across aging research.',
    products:'NAD+ 500mg, NAD+ 1000mg, GLOW, KLOW'
  },
  {
    key:'Growth Research', color:'#7C3AED', bg:'#F5F3FF',
    title:'Growth Research',
    tagline:'GH secretagogues & peptides',
    desc:'Growth hormone releasing peptides and analogues studied for their effects on GH pulse amplitude, body composition, and recovery in research models.',
    products:'Tesamorelin, CJC-1295 / Ipamorelin'
  },
];

function homePage(stock, latestCoas) {
  const featuredCards = FEATURED.map(id => {
    const p = PRODUCTS.find(x => x.id === id); if (!p) return '';
    const inStock = stock[id] ? stock[id].in_stock : true;
    const btn = inStock
      ? `<button class="featured-card-btn" onclick="event.stopPropagation();addToCart('${p.id}','${p.name}','${p.dose}',${p.price})">Add to Cart</button>`
      : `<button class="featured-card-btn notify" onclick="event.stopPropagation();openNotify('${p.id}','${p.name} ${p.dose}')">Notify Me</button>`;
    return `<div class="featured-card" onclick="window.location='/products/${p.id}'" style="cursor:pointer">
      <div class="featured-card-img"><img src="/img/${p.id}.jpg" alt="${p.name} ${p.dose}" loading="lazy"></div>
      <div class="featured-card-body">
        <div style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:4px;margin-bottom:8px;color:${p.cat_color};background:${p.cat_bg}">${p.category}</div>
        <div class="featured-card-name">${p.name}</div>
        <div class="featured-card-dose">${p.dose}</div>
        <div class="featured-card-footer"><span class="featured-card-price">CA$${p.price}</span>${btn}</div>
      </div>
    </div>`;
  }).join('');

  const coaRows = (latestCoas||[]).slice(0,5).map(c=>{
    const purity = c.purity && c.purity.trim() ? c.purity : null;
    return `<tr class="hero-coa-row">
      <td class="hero-coa-product">${c.product_name||c.product_id}</td>
      <td class="hero-coa-meta" style="text-align:center">${c.lab||'—'}</td>
      <td class="hero-coa-meta" style="text-align:center">${c.date||'—'}</td>
      <td class="hero-coa-purity" style="text-align:right">${purity ? '<span style="color:#16A34A;font-weight:700">'+purity+'</span>' : '<a href="/lab-reports" style="font-size:11px;color:#3B6FD4;text-decoration:none">View PDF</a>'}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="4" style="padding:18px 0;text-align:center;color:#9CA3AF;font-size:13px">No lab reports on file yet</td></tr>`;

  const catTiles = CATS.map(cat=>`
    <a href="/shop?category=${encodeURIComponent(cat.key)}" class="cat-tile">
      <span class="cat-tile-pill" style="color:${cat.color};background:${cat.bg}">${cat.key}</span>
      <div class="cat-tile-name" style="color:#111;font-family:'Fraunces',serif;font-size:22px;font-weight:400;margin-bottom:8px">${cat.title}</div>
      <div class="cat-tile-desc" style="color:#555">${cat.desc}</div>
      <div class="cat-tile-products" style="color:#888;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-top:10px">${cat.products}</div>
      <div class="cat-tile-arrow">→</div>
    </a>`).join('');

  const body = `
  <!-- Hero -->
  <section class="hero">
    <div class="hero-inner">
      <div class="hero-copy">
        <p class="eyebrow">Research-Grade Peptides · Canada</p>
        <h1>Precision<br>peptides for<br><em>serious research.</em></h1>
        <p class="hero-sub">Third-party tested with certificates of analysis for every batch. No jargon — just science you can trust.</p>
        <div class="hero-actions">
          <a href="/shop" style="display:inline-block;background:#3B6FD4;color:#fff;padding:16px 48px;font-size:16px;font-weight:700;border-radius:8px;text-decoration:none;font-family:'Inter',sans-serif">Shop Now</a>
        </div>
      </div>
      <div class="hero-coa-panel">
        <div class="hero-coa">
          <p class="hero-coa-eyebrow"><span class="hero-coa-check">✓</span> INDEPENDENTLY VERIFIED</p>
          <h2 class="hero-coa-title">Latest Lab<br>Verified Results</h2>
          <p class="hero-coa-sub">Every batch tested by accredited third-party labs before it ships.</p>
          <div class="hero-coa-table-wrap">
            <table class="hero-coa-table">
              <thead><tr>
                <th class="hero-coa-col-hd" style="text-align:left;padding-bottom:10px">PRODUCT</th>
                <th class="hero-coa-col-hd" style="text-align:center;padding-bottom:10px">TESTING LAB</th>
                <th class="hero-coa-col-hd" style="text-align:center;padding-bottom:10px">DATE</th>
                <th class="hero-coa-col-hd" style="text-align:right;padding-bottom:10px">PURITY</th>
              </tr></thead>
              <tbody>${coaRows}</tbody>
            </table>
          </div>
          <a href="/lab-reports" class="hero-coa-link">View all lab reports →</a>
        </div>
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
      <h2 class="section-title" style="display:inline-block;margin-right:16px">Most Popular</h2>
      <a href="/shop" class="section-link">View all products →</a>
      <div class="featured-grid">${featuredCards}</div>
    </div>
  </section>

  <!-- Why Peppy -->
  <div class="why-strip">
    <div class="why-item">
      <div class="why-icon">🔬</div>
      <strong>Third-Party Tested</strong>
      <p>Every batch independently tested by accredited labs. Certificates of analysis available on every product page.</p>
    </div>
    <div class="why-item">
      <div class="why-icon">✓</div>
      <strong>99%+ Purity Guaranteed</strong>
      <p>Advanced purification methods ensure every product meets or exceeds pharmaceutical-grade purity standards.</p>
    </div>
    <div class="why-item">
      <div class="why-icon">🚚</div>
      <strong>Canada-Wide Shipping</strong>
      <p>Discrete shipping across Canada. Payment via USDC, BTC, or e-Transfer. Research use only.</p>
    </div>
  </div>

  <!-- How payment works -->
  <section class="payment-section">
    <div class="container">
      <p class="section-eyebrow">SECURE CHECKOUT</p>
      <h2 class="section-title">How payment works</h2>
      <div class="payment-steps">
        <div class="payment-step"><div class="payment-num">1</div><h3>Place your order</h3><p>Add products to your cart and proceed to checkout. You'll receive your order reference immediately.</p></div>
        <div class="payment-step"><div class="payment-num">2</div><h3>Send payment</h3><p>Pay via USDC, BTC, or e-Transfer to the address shown. Include your order reference in the memo.</p></div>
        <div class="payment-step"><div class="payment-num">3</div><h3>We confirm & ship</h3><p>Once payment is confirmed we pack and ship within 1–2 business days. Tracking provided by email.</p></div>
      </div>
    </div>
  </section>`;

  return layout({ title:'Precision Peptides · Canada', page:'home', body,
    description:'Research-grade peptides for Canadian researchers. Third-party tested, 99%+ purity, COAs on every batch.' });
}

module.exports = { homePage };
