const { layout, PRODUCTS } = require('./layout');

const PROD_NAMES = Object.fromEntries(PRODUCTS.map(p => [p.id, `${p.name} ${p.dose}`]));

function labReportsPage(coasByProduct) {
  const CAT_COLOR = {
    'Metabolic Research':'#D97706','Cognitive Research':'#2563EB',
    'Longevity Research':'#16A34A','Growth Research':'#7C3AED'
  };
  const CAT_BG = {
    'Metabolic Research':'#FEF3C7','Cognitive Research':'#EFF6FF',
    'Longevity Research':'#F0FDF4','Growth Research':'#F5F3FF'
  };

  const sorted = [...PRODUCTS].sort((a,b) => a.name.localeCompare(b.name) || a.dose.localeCompare(b.dose));

  const rows = sorted.map(p => {
    const coas = coasByProduct[p.id] || [];
    const color = CAT_COLOR[p.category] || '#888';
    const bg    = CAT_BG[p.category]   || '#F5F5F5';

    const coaRows = coas.map(c => `
      <div class="coa-table-row">
        <div>
          <div style="font-size:14px;font-weight:600;color:#111">${c.label}${c.is_current ? ' <span style="background:#DCFCE7;color:#166534;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700">Current</span>' : ''}</div>
          <div style="font-size:12px;color:#888;margin-top:2px">Reported ${c.date} by ${c.lab}${c.purity ? ' · ' + c.purity : ''}</div>
        </div>
        <a href="/coa/${p.id}/${c.filename}" target="_blank" style="font-size:13px;font-weight:600;color:#3B6FD4;text-decoration:none;white-space:nowrap">Download PDF</a>
      </div>`).join('') || '<div class="coa-table-row" style="color:#888;font-size:13px">No COAs on file yet.</div>';

    return `
    <div class="lab-product">
      <div class="lab-product-header">
        <span style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 10px;border-radius:4px;color:${color};background:${bg}">${p.category}</span>
        <div style="font-family:'Fraunces',serif;font-size:19px;font-weight:400;color:#111">${p.name} <span style="color:#888;font-weight:300">${p.dose}</span></div>
      </div>
      ${coaRows}
    </div>`;
  }).join('');

  const body = `
  <div class="container">
    <div class="page-hero">
      <h1 class="page-title">Certificates of Analysis</h1>
      <p class="page-subtitle">Every lab report we have on file, for every product we sell, in one place. Each certificate is issued by an independent third-party lab and covers purity, identity, and/or endotoxin testing for that specific batch.</p>
    </div>
    ${rows}
  </div>`;

  return layout({ title: 'Lab Reports', page: 'lab-reports', body,
    description: 'Certificates of analysis for all Peppy research peptides. Third-party tested by Janoshik, Freedom Diagnostics, Testides, and more.' });
}

module.exports = { labReportsPage };
