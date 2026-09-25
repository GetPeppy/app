const { layout } = require('./layout');

function checkoutPage(settings) {
  const body = `
  <div class="container" style="padding-top:48px;padding-bottom:64px;max-width:1100px">
    <h1 style="font-family:'Fraunces',serif;font-size:36px;font-weight:300;margin-bottom:32px">Checkout</h1>
    <div class="checkout-layout">

      <!-- LEFT: form -->
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

      <!-- RIGHT: order summary with editable quantities -->
      <div class="checkout-summary-col">
        <h2 class="checkout-heading">Order Summary</h2>
        <div id="co-items" class="co-items"></div>
        <div class="co-totals">
          <div class="co-total-row"><span>Subtotal</span><span id="co-subtotal">CA$0</span></div>
          <div class="co-total-row"><span>Shipping</span><span id="co-ship">CA$25</span></div>
          <div class="co-total-row co-grand"><span>Total</span><span id="co-total">CA$0</span></div>
        </div>
        <p style="font-size:11px;color:#999;margin-top:14px;line-height:1.6">Ships within Canada only. Payment instructions shown after placing your order.</p>
      </div>
    </div>

    <!-- Confirmation overlay (shown after order placed) -->
    <div id="confirm-overlay" style="display:none;position:fixed;inset:0;background:#fff;z-index:200;overflow-y:auto;padding:60px 24px">
      <div style="max-width:600px;margin:0 auto;text-align:center" id="confirm-content"></div>
    </div>
  </div>
`;

  return layout({ title: 'Checkout', page: 'checkout', body, extraScript: `<script>
${script_body}
</script>` });
}

module.exports = { checkoutPage };
