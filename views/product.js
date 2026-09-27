const { layout, PRODUCTS } = require('./layout');

function productPage(productId, stock, coas, prices = {}) {
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) return null;

  const inStock = stock[productId]?.in_stock !== false;
  const btn = inStock
    ? `<button class="product-detail-btn" onclick="addToCart('${p.id}','${p.name}','${p.dose}',${(prices[p.id]!==undefined?prices[p.id]:p.price)});window.scrollTo(0,0)">Add to Cart</button>`
    : `<button class="product-detail-btn" style="background:#888;cursor:default" disabled>Out of Stock</button>
       <button class="product-detail-btn" style="margin-top:8px;background:#fff;color:#111;border:1px solid #E0E0E0" onclick="openNotify('${p.id}','${p.name} ${p.dose}')">Notify Me When Available</button>`;

  // Show only last 3 COAs
  const lastThreeCoas = (coas || []).slice(-3);
  const coaList = lastThreeCoas.map(c => `
    <div class="coa-row">
      <div>
        <div class="coa-label">${c.label}${c.is_current ? ' <span style="background:#DCFCE7;color:#166534;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700;margin-left:6px">Current</span>' : ''}</div>
        <div class="coa-meta">Reported ${c.date} by ${c.lab}${c.purity ? ' · ' + c.purity + ' purity' : ''}</div>
      </div>
      <a class="coa-link" href="/coa/${p.id}/${c.filename}" target="_blank">Download PDF</a>
    </div>`).join('');

  // Build detailed content sections from product extended data
  let detailedContent = '';
  
  // Research use only warning
  if (p.researchWarning) {
    detailedContent += `
    <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;padding:24px;margin:32px 0">
      <div style="display:flex;gap:12px;margin-bottom:16px">
        <span style="font-size:20px">⚠️</span>
        <h3 style="font-size:18px;font-weight:700;margin:0">Research use only</h3>
      </div>
      ${p.researchWarning.map(text => `<p style="margin:12px 0;font-size:14px;line-height:1.6">${text}</p>`).join('')}
    </div>`;
  }

  // Main description
  if (p.fullDescription) {
    detailedContent += `
    <div style="margin:32px 0">
      <p style="font-size:15px;line-height:1.8;color:#333">${p.fullDescription}</p>
    </div>`;
  }

  // Research applications
  if (p.researchApplications) {
    detailedContent += `
    <div style="margin:32px 0">
      <h3 style="font-family:'Fraunces',serif;font-size:20px;font-weight:400;margin-bottom:16px">Research applications</h3>
      <ul style="list-style:none;padding:0;margin:0">
        ${p.researchApplications.map(app => `
          <li style="font-size:14px;line-height:1.8;margin-bottom:12px;display:flex;gap:12px">
            <span style="color:#0EA5E9;font-weight:700">✓</span>
            <span>${app}</span>
          </li>
        `).join('')}
      </ul>
    </div>`;
  }

  // Research evidence
  if (p.researchEvidence) {
    detailedContent += `
    <div style="margin:32px 0">
      <h3 style="font-family:'Fraunces',serif;font-size:20px;font-weight:400;margin-bottom:16px">Research evidence</h3>
      <div style="background:#F9FAFB;border-radius:8px;padding:24px">
        ${Object.entries(p.researchEvidence).map(([title, text]) => `
          <div style="margin-bottom:24px">
            <h4 style="font-weight:700;font-size:14px;margin:0 0 8px 0">${title}</h4>
            <p style="font-size:14px;line-height:1.6;color:#555;margin:0">${text}</p>
          </div>
        `).join('')}
      </div>
    </div>`;
  }

  // Storage & handling
  if (p.storageHandling) {
    detailedContent += `
    <div style="margin:32px 0">
      <h3 style="font-family:'Fraunces',serif;font-size:20px;font-weight:400;margin-bottom:16px">Storage & handling</h3>
      ${Object.entries(p.storageHandling).map(([title, text]) => `
        <div style="margin-bottom:16px">
          <p style="font-size:14px;margin:0"><strong>${title}:</strong> ${text}</p>
        </div>
      `).join('')}
    </div>`;
  }

  // Related products (same category, different product)
  const related = PRODUCTS.filter(x => x.category === p.category && x.id !== p.id).slice(0, 3);
  const relatedCards = related.map(r => `
    <a href="/products/${r.id}" class="product-card" style="text-decoration:none">
      <div class="product-card-img"><img src="/img/${r.id}.jpg" alt="${r.name} ${r.dose}" loading="lazy"></div>
      <div class="product-card-body">
        <div class="product-card-name">${r.name}</div>
        <div class="product-card-dose">${r.dose}</div>
        <div class="product-card-price">CA$${(prices[r.id]!==undefined?prices[r.id]:r.price)}</div>
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
        <div class="product-detail-price">CA$${(prices[p.id]!==undefined?prices[p.id]:p.price)}</div>
        ${btn}
        ${coaList ? `<div class="product-detail-coas" style="margin-top:24px"><h3>Certificates of Analysis</h3>${coaList}</div>` : ''}
      </div>
    </div>

    ${detailedContent}

    ${relatedCards ? `
    <div style="margin:48px 0">
      <h2 style="font-family:'Fraunces',serif;font-size:24px;font-weight:300;margin-bottom:20px">More in ${p.category}</h2>
      <div class="products-grid" style="max-width:900px">${relatedCards}</div>
    </div>` : ''}
  </div>`;

  return layout({
    prices,
    title: `${p.name} ${p.dose}`,
    page: 'product',
    description: `${p.name} ${p.dose} — ${p.desc.slice(0, 120)}…`,
    body
  });
}

module.exports = { productPage };
