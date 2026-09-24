const { layout, PRODUCTS } = require('./layout');

const CATS = ['Metabolic Research','Cognitive Research','Longevity Research','Growth Research'];

function shopPage(stock, activeCategory) {
  // Group products by category
  const groups = CATS.map(cat => ({
    cat,
    color: PRODUCTS.find(p => p.category === cat)?.cat_color || '#888',
    bg:    PRODUCTS.find(p => p.category === cat)?.cat_bg    || '#F5F5F5',
    products: PRODUCTS.filter(p => p.category === cat)
  }));

  const filterBtns = `
    <a href="/shop" class="filter-btn${!activeCategory ? ' active' : ''}">All Products</a>
    ${CATS.map(cat => `<a href="/shop?category=${encodeURIComponent(cat)}" class="filter-btn${activeCategory===cat?' active':''}">${cat}</a>`).join('')}`;

  let content = '';
  const filtered = activeCategory ? groups.filter(g => g.cat === activeCategory) : groups;

  filtered.forEach(g => {
    const cards = g.products.map(p => {
      const inStock = stock[p.id]?.in_stock !== false;
      const btn = inStock
        ? `<button class="product-card-btn" onclick="event.stopPropagation();addToCart('${p.id}','${p.name}','${p.dose}',${p.price})">Add to Cart</button>`
        : `<button class="product-card-btn notify" onclick="event.stopPropagation();openNotify('${p.id}','${p.name} ${p.dose}')">Notify Me</button>`;
      return `
      <div class="product-card" onclick="window.location='/products/${p.id}'">
        <div class="product-card-img"><img src="/img/${p.id}.jpg" alt="${p.name} ${p.dose}" loading="lazy"></div>
        <div class="product-card-body">
          <span class="product-card-cat" style="color:${p.cat_color};background:${p.cat_bg}">${p.category}</span>
          <div class="product-card-name">${p.name}</div>
          <div class="product-card-dose">${p.dose}</div>
          <div class="product-card-price">CA$${p.price}</div>
          ${btn}
        </div>
      </div>`;
    }).join('');

    // Only show category header when showing all
    const header = !activeCategory ? `
      <div class="cat-section-header">
        <span class="cat-section-pill" style="color:${g.color};background:${g.bg}">${g.cat}</span>
      </div>` : '';

    content += `<div class="cat-section">${header}<div class="products-grid">${cards}</div></div>`;
  });

  const total = activeCategory
    ? PRODUCTS.filter(p => p.category === activeCategory).length
    : PRODUCTS.length;

  const body = `
  <div class="container">
    <div class="page-hero">
      <h1 class="page-title">All Products</h1>
      <p class="page-subtitle">${total} product${total !== 1 ? 's' : ''} — independently verified, 99%+ purity</p>
    </div>
    <div class="filter-bar">${filterBtns}</div>
    ${content}
  </div>`;

  return layout({ title: 'Shop', page: 'shop', body,
    description: 'Browse all research-grade peptides. Retatrutide, MOTS-c, NAD+, Semax, Selank, Tesamorelin and more. Third-party tested, ships across Canada.' });
}

module.exports = { shopPage };
