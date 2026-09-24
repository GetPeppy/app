const { layout } = require('./layout');

const FAQS = [
  { q: 'What is the intended use of these products?', a: 'All products sold by Peppy are for in-vitro research purposes only. They are not intended for human consumption, clinical use, or veterinary use. By purchasing, you confirm you are a qualified researcher aged 21 or older.' },
  { q: 'How do I pay for my order?', a: 'We accept USDC (USD Coin on Ethereum), Bitcoin (BTC), and Canadian e-Transfer. Payment instructions including the address and amount are shown immediately after placing your order. Include your order reference number in the payment memo.' },
  { q: 'How long does shipping take?', a: 'Orders are shipped within 1–2 business days after payment confirmation. We ship across Canada via tracked courier. You will receive your tracking number by email once your order has shipped.' },
  { q: 'What is your shipping cost?', a: 'Shipping is CA$25 flat rate across Canada. Orders over CA$500 qualify for free shipping.' },
  { q: 'Do you ship internationally?', a: 'We currently ship within Canada only. International shipping is not available at this time.' },
  { q: 'What third-party labs do you use?', a: 'We work with several accredited independent laboratories including Janoshik, Freedom Diagnostics, Testides, Uzorak, and ILS Laboratories. Every batch is tested before shipment. All certificates are available on the Lab Reports page.' },
  { q: 'How should I store peptides?', a: 'Lyophilized (powder) peptides should be stored in a freezer at -20°C for long-term storage, or refrigerated at 2–8°C for short-term use. Keep away from light and moisture. Do not freeze-thaw repeatedly once reconstituted.' },
  { q: 'What does your purity guarantee mean?', a: 'We guarantee a minimum 99% purity by HPLC (High Performance Liquid Chromatography). If a batch fails to meet this standard it is rejected before it reaches inventory. The exact purity for each lot is listed on its certificate of analysis.' },
  { q: 'Can I get a refund or exchange?', a: 'Due to the nature of research peptides, we do not accept returns. If you receive a damaged or incorrect product please contact us within 48 hours of delivery with photos and your order reference number.' },
  { q: 'How do I track my order?', a: 'Once your order has shipped you will receive an email with your tracking number. If you have questions about your order status, contact us with your order reference number.' },
];

function faqPage() {
  const items = FAQS.map((f, i) => `
    <div class="faq-item" id="faq-${i}">
      <button class="faq-q" onclick="toggleFaq(${i})">
        <span>${f.q}</span>
        <span class="faq-icon" id="faq-icon-${i}">+</span>
      </button>
      <div class="faq-a" id="faq-a-${i}" style="display:none">${f.a}</div>
    </div>`).join('');

  const body = `
  <div class="container">
    <div class="page-hero">
      <h1 class="page-title">FAQ</h1>
      <p class="page-subtitle">Answers to common questions about our products, ordering, and shipping.</p>
    </div>
    <div class="faq-list" style="max-width:760px">${items}</div>
  </div>
  <script>
  function toggleFaq(i) {
    var a = document.getElementById('faq-a-'+i);
    var icon = document.getElementById('faq-icon-'+i);
    if (a.style.display === 'none') { a.style.display = 'block'; icon.textContent = '−'; }
    else { a.style.display = 'none'; icon.textContent = '+'; }
  }
  </script>`;

  return layout({ title: 'FAQ', page: 'faq', body,
    description: 'Frequently asked questions about Peppy research peptides — ordering, payment, shipping, storage, and purity guarantees.' });
}

module.exports = { faqPage };
