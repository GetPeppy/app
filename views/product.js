const { layout, PRODUCTS } = require('./layout');

function productPage(productId, stock, coas) {
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) return null;

  const inStock = stock[productId]?.in_stock !== false;
  const btn = inStock
    ? `<button class="product-detail-btn" onclick="addToCart('${p.id}','${p.name}','${p.dose}',${p.price});window.scrollTo(0,0)">Add to Cart</button>`
    : `<button class="product-detail-btn" style="background:#888;cursor:default" disabled>Out of Stock</button>
       <button class="product-detail-btn" style="margin-top:8px;background:#fff;color:#111;border:1px solid #E0E0E0" onclick="openNotify('${p.id}','${p.name} ${p.dose}')">Notify Me When Available</button>`;

  const coaList = (coas || []).map(c => `
    <div class="coa-row">
      <div>
        <div class="coa-label">${c.label}${c.is_current ? ' <span style="background:#DCFCE7;color:#166534;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700;margin-left:6px">Current</span>' : ''}</div>
        <div class="coa-meta">Reported ${c.date} by ${c.lab}${c.purity ? ' · ' + c.purity + ' purity' : ''}</div>
      </div>
      <a class="coa-link" href="/coa/${p.id}/${c.filename}" target="_blank">Download PDF</a>
    </div>`).join('');

  // Related products (same category, different product)
  const related = PRODUCTS.filter(x => x.category === p.category && x.id !== p.id).slice(0, 3);
  const relatedCards = related.map(r => `
    <a href="/products/${r.id}" class="product-card" style="text-decoration:none">
      <div class="product-card-img"><img src="/img/${r.id}.jpg" alt="${r.name} ${r.dose}" loading="lazy"></div>
      <div class="product-card-body">
        <div class="product-card-name">${r.name}</div>
        <div class="product-card-dose">${r.dose}</div>
        <div class="product-card-price">CA$${r.price}</div>
      </div>
    </a>`).join('');

  const body = `
  <div class="container">
    <p style="font-size:13px;color:#888;margin:24px 0 0"><a href="/shop" style="color:#888;text-decoration:none">Shop</a> → <a href="/shop?category=${encodeURIComponent(p.category)}" style="color:#888;text-decoration:none">${p.category}</a> → ${p.name} ${p.dose}</p>

    <div class="product-detail">
      <div class="product-detail-img">
        <img src="/img/${p.id}.jpg" alt="${p.name} ${p.dose}">
      </div>
      <div>
        <span class="product-detail-cat" style="color:${p.cat_color};background:${p.cat_bg}">${p.category}</span>
        <h1 class="product-detail-name">${p.name}</h1>
        <div class="product-detail-dose">${p.dose}</div>
        <div class="product-detail-price">CA$${p.price}</div>
        ${btn}
        <p class="product-detail-desc">${p.desc}</p>
        ${coaList ? `<div class="product-detail-coas"><h3>Certificates of Analysis</h3>${coaList}</div>` : ''}
        <p style="font-size:11px;color:#aaa;margin-top:20px;line-height:1.6">For in-vitro research use only. Not for human consumption. Must be 21+ to purchase.</p>
      </div>
    </div>

    ${relatedCards ? `
    <div style="margin:48px 0">
      <h2 style="font-family:'Fraunces',serif;font-size:24px;font-weight:300;margin-bottom:20px">More in ${p.category}</h2>
      <div class="products-grid" style="max-width:900px">${relatedCards}</div>
    </div>` : ''}
  </div>`;

  return layout({
    title: `${p.name} ${p.dose}`,
    page: 'product',
    description: `${p.name} ${p.dose} — ${p.desc.slice(0, 120)}…`,
    body
  });
}

module.exports = { productPage };
