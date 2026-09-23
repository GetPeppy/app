const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const ADMIN_PASS = process.env.ADMIN_PASSWORD || (() => {
  const p = crypto.randomBytes(6).toString('hex');
  console.log(`\n⚠️  First-run admin password: ${p}\n`);
  return p;
})();
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// ── Database ──────────────────────────────────────────────────────────────────
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'peppy.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_ref TEXT UNIQUE NOT NULL,
    customer_name TEXT, customer_email TEXT, customer_address TEXT,
    customer_city TEXT, customer_province TEXT, customer_postal TEXT, customer_phone TEXT,
    items TEXT NOT NULL,
    subtotal REAL NOT NULL,
    shipping REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    payment_address TEXT,
    tracking_number TEXT,
    status TEXT NOT NULL DEFAULT 'submitted',
    notes TEXT,
    account_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS customer_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    province TEXT,
    postal TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS customer_sessions (
    token TEXT PRIMARY KEY,
    account_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, email TEXT UNIQUE, phone TEXT,
    address TEXT, notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_order_at TEXT
  );
  CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dose TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    in_stock INTEGER NOT NULL DEFAULT 1,
    price REAL NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS coa_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    label TEXT NOT NULL,
    lab TEXT NOT NULL,
    date TEXT NOT NULL,
    purity TEXT,
    is_current INTEGER NOT NULL DEFAULT 0,
    data BLOB NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO settings VALUES ('usdc_address','');
  INSERT OR IGNORE INTO settings VALUES ('btc_address','');
  INSERT OR IGNORE INTO settings VALUES ('etransfer_email','');
  INSERT OR IGNORE INTO settings VALUES ('site_name','Peppy');
`);

// ── Migrations — add columns to existing tables if missing ───────────────────
const orderCols = db.prepare(`PRAGMA table_info(orders)`).all().map(r => r.name);
if (!orderCols.includes('customer_city'))     db.exec(`ALTER TABLE orders ADD COLUMN customer_city TEXT`);
if (!orderCols.includes('customer_province')) db.exec(`ALTER TABLE orders ADD COLUMN customer_province TEXT`);
if (!orderCols.includes('customer_postal'))   db.exec(`ALTER TABLE orders ADD COLUMN customer_postal TEXT`);
if (!orderCols.includes('customer_phone'))    db.exec(`ALTER TABLE orders ADD COLUMN customer_phone TEXT`);
if (!orderCols.includes('shipping'))          db.exec(`ALTER TABLE orders ADD COLUMN shipping REAL NOT NULL DEFAULT 0`);
if (!orderCols.includes('total'))             db.exec(`ALTER TABLE orders ADD COLUMN total REAL NOT NULL DEFAULT 0`);
if (!orderCols.includes('tracking_number'))   db.exec(`ALTER TABLE orders ADD COLUMN tracking_number TEXT`);
if (!orderCols.includes('account_id'))        db.exec(`ALTER TABLE orders ADD COLUMN account_id INTEGER`);
if (!orderCols.includes('status'))            db.exec(`ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'submitted'`);
// Fix status default on old records
db.prepare(`UPDATE orders SET status='submitted' WHERE status='pending'`).run();

// Seed inventory from product list
const PRODUCTS = [
  { id:'retatrutide-10mg', name:'Retatrutide', dose:'10mg', price:90 },
  { id:'retatrutide-20mg', name:'Retatrutide', dose:'20mg', price:150 },
  { id:'mots-c-10mg',      name:'MOTS-c',      dose:'10mg', price:40 },
  { id:'mots-c-40mg',      name:'MOTS-c',      dose:'40mg', price:120 },
  { id:'klow-80mg',        name:'KLOW',        dose:'80mg', price:100 },
  { id:'glow-70mg',        name:'GLOW',        dose:'70mg', price:90 },
  { id:'tesamorelin-10mg', name:'Tesamorelin', dose:'10mg', price:90 },
  { id:'cjc-ipamorelin-10mg', name:'CJC-1295 / Ipamorelin', dose:'10mg', price:75 },
  { id:'nad-500mg',        name:'NAD+',        dose:'500mg', price:50 },
  { id:'nad-1000mg',       name:'NAD+',        dose:'1000mg', price:80 },
  { id:'5amino1mq-50mg',   name:'5-Amino-1MQ', dose:'50mg', price:80 },
  { id:'semax-10mg',       name:'Semax',       dose:'10mg', price:50 },
  { id:'selank-10mg',      name:'Selank',      dose:'10mg', price:50 },
];
const upsert = db.prepare(`INSERT OR IGNORE INTO inventory(id,name,dose,price,quantity,in_stock) VALUES(?,?,?,?,0,1)`);
for (const p of PRODUCTS) upsert.run(p.id, p.name, p.dose, p.price);

// Fix: set in_stock=0 for any product where quantity=0
db.prepare(`UPDATE inventory SET in_stock=0 WHERE quantity=0`).run();

// Seed coa_files table from static PDFs on disk (runs once — skips existing)
try { (function seedCOAs() {
  const coaDir = path.join(__dirname, 'public', 'coa');
  if (!fs.existsSync(coaDir)) return;
  const check = db.prepare(`SELECT COUNT(*) as c FROM coa_files WHERE product_id=? AND filename=?`);
  const insert = db.prepare(`INSERT INTO coa_files(product_id,filename,label,lab,date,purity,is_current,data) VALUES(?,?,?,?,?,?,?,?)`);
  // Map folder names to product IDs
  const folderMap = {
    '5amino-50':'5amino1mq-50mg', 'cjc-ipa-10':'cjc-ipamorelin-10mg',
    'glow-70':'glow-70mg', 'klow-80':'klow-80mg',
    'mots-c-10':'mots-c-10mg', 'mots-c-40':'mots-c-40mg',
    'nad-1000':'nad-1000mg', 'nad-500':'nad-500mg',
    'reta-10':'retatrutide-10mg', 'reta-20':'retatrutide-20mg',
    'selank-10':'selank-10mg', 'semax-10':'semax-10mg', 'tesa-10':'tesamorelin-10mg',
  };
  for (const folder of fs.readdirSync(coaDir)) {
    const productId = folderMap[folder];
    if (!productId) continue;
    const folderPath = path.join(coaDir, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.pdf')).sort();
    files.forEach((filename, idx) => {
      if (check.get(productId, filename).c > 0) return; // already seeded
      const data = fs.readFileSync(path.join(folderPath, filename));
      // Parse metadata from filename
      const parts = filename.replace('.pdf','').split('_');
      // Extract date (last segment like 2026-07-31)
      const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : '';
      // Detect lab
      const lab = filename.includes('Janoshik') ? 'Janoshik'
        : filename.includes('Freedom') ? 'Freedom Diagnostics'
        : filename.includes('Testides') ? 'Testides'
        : filename.includes('Uzorak') ? 'Uzorak'
        : filename.includes('ILS') ? 'ILS Laboratories'
        : filename.includes('Peptidologix') ? 'Peptidologix'
        : filename.includes('Reviva') ? 'Reviva'
        : '';
      // Detect type
      const label = filename.includes('Endotoxin') ? 'Endotoxin Test'
        : filename.includes('Sterility') ? 'Sterility Test'
        : filename.includes('MassPurity') ? 'Mass & Purity Analysis'
        : 'Purity Analysis';
      // Most recent file per folder = current
      const isCurrent = idx === files.length - 1 ? 1 : 0;
      try { insert.run(productId, filename, label, lab, date, '', isCurrent, data); } catch(e) {}
    });
  }
})(); } catch(e) { console.error('COA seed error:', e.message); }

// Notify me table
db.exec(`CREATE TABLE IF NOT EXISTS notify_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);`);

// ── Sessions ──────────────────────────────────────────────────────────────────
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours
function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare(`INSERT INTO sessions(token,created_at) VALUES(?,?)`).run(token, Date.now());
  return token;
}
function validSession(token) {
  if (!token) return false;
  const row = db.prepare(`SELECT created_at FROM sessions WHERE token=?`).get(token);
  if (!row) return false;
  if (Date.now() - row.created_at > SESSION_TTL) {
    db.prepare(`DELETE FROM sessions WHERE token=?`).run(token);
    return false;
  }
  return true;
}
function getCookie(req, name) {
  const h = req.headers.cookie || '';
  const m = h.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
  return m ? decodeURIComponent(m.split('=')[1]) : null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function genRef() {
  return 'PP-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
}
function body(req) {
  return new Promise((res, rej) => {
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => {
      try { res(JSON.parse(d)); } catch { res({}); }
    });
    req.on('error', rej);
  });
}
function json(res, data, status = 200) {
  const payload = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
}
function redirect(res, url) {
  res.writeHead(302, { Location: url });
  res.end();
}
function upsertCustomer(name, email, address) {
  if (!email) return;
  const existing = db.prepare(`SELECT id FROM customers WHERE email=?`).get(email);
  if (existing) {
    db.prepare(`UPDATE customers SET name=COALESCE(?,name), address=COALESCE(?,address), last_order_at=datetime('now') WHERE email=?`)
      .run(name || null, address || null, email);
  } else {
    db.prepare(`INSERT INTO customers(name,email,address,last_order_at) VALUES(?,?,?,datetime('now'))`)
      .run(name || null, email, address || null);
  }
}

// ── Customer account helpers ──────────────────────────────────────────────────
function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw + 'peppy_salt_2026').digest('hex');
}
function createCustomerSession(accountId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare(`INSERT INTO customer_sessions(token,account_id,created_at) VALUES(?,?,?)`).run(token, accountId, Date.now());
  return token;
}
function getCustomerFromSession(req) {
  const token = getCookie(req, 'peppy_customer');
  if (!token) return null;
  const sess = db.prepare(`SELECT account_id, created_at FROM customer_sessions WHERE token=?`).get(token);
  if (!sess) return null;
  if (Date.now() - sess.created_at > 30 * 24 * 60 * 60 * 1000) {
    db.prepare(`DELETE FROM customer_sessions WHERE token=?`).run(token);
    return null;
  }
  return db.prepare(`SELECT * FROM customer_accounts WHERE id=?`).get(sess.account_id);
}
function calcShipping(subtotal) {
  return subtotal >= 500 ? 0 : 25;
}

// ── Static files ──────────────────────────────────────────────────────────────
const MIME = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript',
               '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg',
               '.pdf':'application/pdf', '.ico':'image/x-icon' };
function serveStatic(res, filePath) {
  if (!fs.existsSync(filePath)) return false;
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

// ── Admin HTML ────────────────────────────────────────────────────────────────
function adminHTML(page = 'orders') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Peppy Admin</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;background:#F8F8F8;color:#111;font-size:14px}
nav{background:#111;color:#fff;display:flex;align-items:center;gap:0;position:sticky;top:0;z-index:100}
.nav-brand{font-weight:800;font-size:18px;letter-spacing:-1px;padding:14px 24px;border-right:1px solid #333}
.nav-brand span{color:#3B6FD4}
.nav-links{display:flex;flex:1}
.nav-links a{color:#aaa;text-decoration:none;padding:14px 20px;font-size:13px;font-weight:500;transition:all .15s;border-right:1px solid #222}
.nav-links a:hover,.nav-links a.active{color:#fff;background:#1a1a1a}
.nav-links a.active{border-bottom:2px solid #3B6FD4}
main{max-width:1200px;margin:0 auto;padding:32px 24px}
h1{font-size:22px;font-weight:700;margin-bottom:24px;letter-spacing:-0.5px}
h2{font-size:16px;font-weight:600;margin-bottom:16px}
.card{background:#fff;border:1px solid #E8E8E8;border-radius:8px;overflow:hidden;margin-bottom:24px}
.card-header{padding:16px 20px;border-bottom:1px solid #E8E8E8;display:flex;align-items:center;justify-content:space-between}
.card-body{padding:20px}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:10px 14px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #E8E8E8;background:#FAFAFA}
td{padding:12px 14px;border-bottom:1px solid #F0F0F0;vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:#FAFAFA}
.badge{display:inline-block;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600;letter-spacing:.03em}
.badge-pending{background:#FEF9C3;color:#854D0E}
.badge-submitted{background:#EFF6FF;color:#1D4ED8}
.badge-received{background:#FEF9C3;color:#854D0E}
.badge-payment_confirmed{background:#DCFCE7;color:#166534}
.badge-paid{background:#DCFCE7;color:#166534}
.badge-shipped{background:#DBEAFE;color:#1E40AF}
.badge-delivered{background:#F3F4F6;color:#374151}
.badge-completed{background:#F3F4F6;color:#374151}
.badge-cancelled{background:#FEE2E2;color:#991B1B}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .15s;text-decoration:none}
.btn-primary{background:#111;color:#fff}.btn-primary:hover{background:#333}
.btn-blue{background:#3B6FD4;color:#fff}.btn-blue:hover{background:#2d5ab5}
.btn-ghost{background:none;color:#111;border:1px solid #E8E8E8}.btn-ghost:hover{background:#F5F5F5}
.btn-danger{background:#EF4444;color:#fff}.btn-danger:hover{background:#DC2626}
.btn-sm{padding:5px 12px;font-size:12px}
input,select,textarea{width:100%;padding:8px 12px;border:1px solid #E8E8E8;border-radius:6px;font-size:13px;font-family:inherit;outline:none;transition:border .15s}
input:focus,select:focus,textarea:focus{border-color:#3B6FD4;box-shadow:0 0 0 3px rgba(59,111,212,.1)}
label{font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:6px}
.form-row{margin-bottom:16px}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
.stat{background:#fff;border:1px solid #E8E8E8;border-radius:8px;padding:20px}
.stat-label{font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}
.stat-value{font-size:28px;font-weight:700;letter-spacing:-1px;color:#111}
.stat-sub{font-size:12px;color:#888;margin-top:4px}
.empty{text-align:center;padding:48px;color:#888}
.alert{padding:12px 16px;border-radius:6px;margin-bottom:20px;font-size:13px}
.alert-success{background:#DCFCE7;color:#166534;border:1px solid #BBF7D0}
.alert-error{background:#FEE2E2;color:#991B1B;border:1px solid #FECACA}
select.status-select{width:auto;padding:4px 8px;font-size:12px}
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;align-items:center;justify-content:center}
.modal-overlay.open{display:flex}
.modal{background:#fff;border-radius:10px;width:560px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.modal-header{padding:20px 24px;border-bottom:1px solid #E8E8E8;display:flex;align-items:center;justify-content:space-between}
.modal-body{padding:24px}
.modal-footer{padding:16px 24px;border-top:1px solid #E8E8E8;display:flex;gap:10px;justify-content:flex-end}
.close-btn{background:none;border:none;font-size:20px;cursor:pointer;color:#888;line-height:1}
.tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#EEF3FB;color:#3B6FD4}
#toast{position:fixed;bottom:24px;right:24px;background:#111;color:#fff;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;opacity:0;transition:opacity .3s;z-index:999;pointer-events:none}
#toast.show{opacity:1}
@media(max-width:768px){.stats{grid-template-columns:1fr 1fr}.grid-2,.grid-3{grid-template-columns:1fr}}
</style>
</head>
<body>
<nav>
  <div class="nav-brand">PEP<span>PY</span></div>
  <div class="nav-links">
    <a href="/admin" class="${page==='orders'?'active':''}">Orders</a>
    <a href="/admin/customers" class="${page==='customers'?'active':''}">Customers</a>
    <a href="/admin/inventory" class="${page==='inventory'?'active':''}">Inventory</a>
    <a href="/admin/coas" class="${page==='coas'?'active':''}">Lab Reports</a>
    <a href="/admin/settings" class="${page==='settings'?'active':''}">Settings</a>
    <a href="/admin/logout" style="margin-left:auto">Log out</a>
  </div>
</nav>
<div id="toast"></div>
<script>
function toast(msg,err){
  const t=document.getElementById('toast');
  t.textContent=msg;t.style.background=err?'#EF4444':'#111';
  t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800);
}
function openModal(id){document.getElementById(id).classList.add('open')}
function closeModal(id){document.getElementById(id).classList.remove('open')}
async function api(url,method='GET',data){
  const opts={method,headers:{'Content-Type':'application/json'}};
  if(data) opts.body=JSON.stringify(data);
  const r=await fetch(url,opts);
  return r.json();
}
</script>
`;
}

// ── Login page ────────────────────────────────────────────────────────────────
function loginPage(err = '') {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Peppy Admin — Login</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;background:#F8F8F8;display:flex;align-items:center;justify-content:center;min-height:100vh}
.box{background:#fff;border:1px solid #E8E8E8;border-radius:10px;padding:40px;width:360px}
.brand{font-size:28px;font-weight:900;letter-spacing:-2px;margin-bottom:28px;text-align:center}
.brand span{color:#3B6FD4}
input{width:100%;padding:10px 14px;border:1px solid #E8E8E8;border-radius:6px;font-size:14px;margin-bottom:12px;outline:none}
input:focus{border-color:#3B6FD4}
button{width:100%;padding:11px;background:#111;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer}
button:hover{background:#333}
.err{color:#EF4444;font-size:13px;margin-bottom:12px;text-align:center}
</style></head><body>
<div class="box">
  <div class="brand">PEP<span>PY</span></div>
  ${err ? `<p class="err">${err}</p>` : ''}
  <form method="POST" action="/admin/login">
    <input name="password" type="password" placeholder="Admin password" autofocus required>
    <button type="submit">Sign in</button>
  </form>
</div>
</body></html>`;
}

// ── Route handler ─────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost`);
  const pathname = url.pathname;
  const method = req.method;

  // ── Public: place order ───────────────────────────────────────────────────
  if (pathname === '/api/order' && method === 'POST') {
    const data = await body(req);
    const ref = genRef();
    const settings = {};
    for (const r of db.prepare(`SELECT key,value FROM settings`).all())
      settings[r.key] = r.value;
    const payAddr = data.payment_method === 'usdc' ? settings.usdc_address
                  : data.payment_method === 'btc'  ? settings.btc_address
                  : settings.etransfer_email;
    const subtotal = data.subtotal || 0;
    const shipping = calcShipping(subtotal);
    const total = subtotal + shipping;

    // ── Validate inventory before placing order ───────────────────────────────
    if (data.items && data.items.length) {
      for (const item of data.items) {
        const inv = db.prepare(`SELECT quantity, in_stock, name, dose FROM inventory WHERE id=?`).get(item.id);
        if (!inv) continue;
        if (!inv.in_stock || inv.quantity <= 0) {
          return json(res, { ok:false, error:`${inv.name} ${inv.dose} is currently out of stock.` }, 400);
        }
        const qty = item.qty || 1;
        if (qty > inv.quantity) {
          return json(res, { ok:false, error:`Only ${inv.quantity} unit${inv.quantity!==1?'s':''} of ${inv.name} ${inv.dose} available. You requested ${qty}.` }, 400);
        }
      }
    }

    // Handle account creation if password provided
    let accountId = null;
    if (data.password && data.email) {
      const existing = db.prepare(`SELECT id FROM customer_accounts WHERE email=?`).get(data.email);
      if (existing) {
        accountId = existing.id;
      } else {
        const r = db.prepare(`INSERT INTO customer_accounts(name,email,password_hash,phone,address,city,province,postal)
          VALUES(?,?,?,?,?,?,?,?)`).run(data.name||'', data.email, hashPassword(data.password),
          data.phone||'', data.address||'', data.city||'', data.province||'', data.postal||'');
        accountId = r.lastInsertRowid;
      }
    }

    try {
      db.prepare(`INSERT INTO orders(order_ref,customer_name,customer_email,customer_address,customer_city,customer_province,customer_postal,customer_phone,items,subtotal,shipping,total,payment_method,payment_address,status,account_id)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,'submitted',?)`)
        .run(ref, data.name||'', data.email||'', data.address||'', data.city||'', data.province||'', data.postal||'', data.phone||'',
             JSON.stringify(data.items||[]), subtotal, shipping, total,
             data.payment_method||'usdc', payAddr||'', accountId);
      upsertCustomer(data.name, data.email, data.address);
      if (data.items) {
        for (const item of data.items) {
          db.prepare(`UPDATE inventory SET quantity=MAX(0,quantity-?), in_stock=CASE WHEN MAX(0,quantity-?) = 0 THEN 0 ELSE in_stock END WHERE id=?`).run(item.qty||1, item.qty||1, item.id);
        }
      }
      // Create session if account created
      let sessionToken = null;
      if (accountId && data.password) sessionToken = createCustomerSession(accountId);
      return json(res, { ok:true, ref, payment_address:payAddr, shipping, total, sessionToken });
    } catch(e) {
      return json(res, { ok:false, error:e.message }, 400);
    }
  }

  // ── Public: shipping calc ────────────────────────────────────────────────
  if (pathname === '/api/shipping' && method === 'POST') {
    const data = await body(req);
    return json(res, { shipping: calcShipping(data.subtotal || 0) });
  }

  // ── Customer account: register ───────────────────────────────────────────
  if (pathname === '/api/account/register' && method === 'POST') {
    const data = await body(req);
    if (!data.email || !data.password || !data.name) return json(res, { ok:false, error:'Missing fields' }, 400);
    const existing = db.prepare(`SELECT id FROM customer_accounts WHERE email=?`).get(data.email);
    if (existing) return json(res, { ok:false, error:'Email already registered' }, 400);
    const r = db.prepare(`INSERT INTO customer_accounts(name,email,password_hash) VALUES(?,?,?)`).run(data.name, data.email, hashPassword(data.password));
    const token = createCustomerSession(r.lastInsertRowid);
    res.writeHead(200, { 'Content-Type':'application/json', 'Set-Cookie':`peppy_customer=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000` });
    return res.end(JSON.stringify({ ok:true }));
  }

  // ── Customer account: login ──────────────────────────────────────────────
  if (pathname === '/api/account/login' && method === 'POST') {
    const data = await body(req);
    const acct = db.prepare(`SELECT * FROM customer_accounts WHERE email=? AND password_hash=?`).get(data.email||'', hashPassword(data.password||''));
    if (!acct) return json(res, { ok:false, error:'Invalid email or password' }, 401);
    const token = createCustomerSession(acct.id);
    res.writeHead(200, { 'Content-Type':'application/json', 'Set-Cookie':`peppy_customer=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000` });
    return res.end(JSON.stringify({ ok:true, name: acct.name }));
  }

  // ── Customer account: logout ─────────────────────────────────────────────
  if (pathname === '/api/account/logout' && method === 'POST') {
    const token = getCookie(req, 'peppy_customer');
    if (token) db.prepare(`DELETE FROM customer_sessions WHERE token=?`).run(token);
    res.writeHead(200, { 'Content-Type':'application/json', 'Set-Cookie':'peppy_customer=; Path=/; Max-Age=0' });
    return res.end(JSON.stringify({ ok:true }));
  }

  // ── Customer account: me ─────────────────────────────────────────────────
  if (pathname === '/api/account/me' && method === 'GET') {
    const acct = getCustomerFromSession(req);
    if (!acct) return json(res, { ok:false }, 401);
    return json(res, { ok:true, name:acct.name, email:acct.email });
  }

  // ── Customer account: my orders ──────────────────────────────────────────
  if (pathname === '/api/account/orders' && method === 'GET') {
    const acct = getCustomerFromSession(req);
    if (!acct) return json(res, { ok:false }, 401);
    const orders = db.prepare(`SELECT order_ref,status,tracking_number,total,shipping,subtotal,created_at,items,payment_method FROM orders WHERE account_id=? OR customer_email=? ORDER BY created_at DESC`).all(acct.id, acct.email);
    return json(res, orders);
  }

  // ── Customer account: lookup order by ref ────────────────────────────────
  if (pathname.match(/^\/api\/order\/[A-Z0-9-]+$/) && method === 'GET') {
    const ref = pathname.split('/').pop();
    const email = new URL(req.url, 'http://x').searchParams.get('email') || '';
    const order = db.prepare(`SELECT order_ref,status,tracking_number,total,shipping,subtotal,created_at,items,payment_method,customer_name FROM orders WHERE order_ref=? AND (customer_email=? OR ?='')`).get(ref, email, email);
    if (!order) return json(res, { ok:false, error:'Order not found' }, 404);
    return json(res, { ok:true, order });
  }

  // ── Public: get payment addresses ────────────────────────────────────────
  if (pathname === '/api/settings/public' && method === 'GET') {
    const rows = db.prepare(`SELECT key,value FROM settings WHERE key IN ('usdc_address','btc_address','etransfer_email','site_name')`).all();
    const out = {};
    for (const r of rows) out[r.key] = r.value;
    return json(res, out);
  }

  // ── Public: serve COA PDF from DB ───────────────────────────────────────
  const coaMatch = pathname.match(/^\/coa\/([^/]+)\/(.+\.pdf)$/i);
  if (coaMatch) {
    const productId = coaMatch[1];
    const filename  = coaMatch[2];
    const row = db.prepare(`SELECT data FROM coa_files WHERE product_id=? AND filename=?`).get(productId, filename);
    if (row) {
      res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${filename}"` });
      return res.end(Buffer.from(row.data));
    }
    // Fall through to static file serving (for files in public/coa/)
  }

  // ── Public: notify me ───────────────────────────────────────────────────
  if (pathname === '/api/notify' && method === 'POST') {
    const data = await body(req);
    if (!data.email || !data.product_id) return json(res, { ok:false, error:'Missing fields' }, 400);
    db.prepare(`INSERT INTO notify_requests(product_id,email) VALUES(?,?)`).run(data.product_id, data.email);
    return json(res, { ok:true });
  }

  // ── Public: stock check ──────────────────────────────────────────────────
  if (pathname === '/api/stock' && method === 'GET') {
    const rows = db.prepare(`SELECT id,in_stock,quantity FROM inventory`).all();
    const out = {};
    for (const r of rows) out[r.id] = { in_stock: !!r.in_stock, qty: r.quantity };
    return json(res, out);
  }

  // ── Static (public folder) ───────────────────────────────────────────────
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api')) {
    let fp = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
    if (serveStatic(res, fp)) return;
    fp = path.join(__dirname, 'public', 'index.html');
    if (serveStatic(res, fp)) return;
    res.writeHead(404); res.end('Not found');
    return;
  }

  // ── Admin login ───────────────────────────────────────────────────────────
  if (pathname === '/admin/login') {
    if (method === 'GET') {
      res.writeHead(200, { 'Content-Type':'text/html' });
      return res.end(loginPage());
    }
    if (method === 'POST') {
      // Read raw body once, then try JSON then form-encoded
      const raw = await new Promise(r => {
        let d=''; req.on('data',c=>d+=c); req.on('end',()=>r(d));
      });
      let pass = null;
      try { pass = JSON.parse(raw).password; } catch {}
      if (!pass) pass = new URLSearchParams(raw).get('password');
      if (pass === ADMIN_PASS) {
        const token = createSession();
        res.writeHead(302, {
          'Set-Cookie': `peppy_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800`,
          Location: '/admin'
        });
        return res.end();
      }
      res.writeHead(200, { 'Content-Type':'text/html' });
      return res.end(loginPage('Incorrect password'));
    }
  }

  if (pathname === '/admin/logout') {
    const token = getCookie(req, 'peppy_session');
    if (token) db.prepare(`DELETE FROM sessions WHERE token=?`).run(token);
    res.writeHead(302, { 'Set-Cookie':'peppy_session=; Path=/; Max-Age=0', Location:'/admin/login' });
    return res.end();
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────
  const sessionToken = getCookie(req, 'peppy_session');
  if (!validSession(sessionToken)) {
    if (pathname.startsWith('/api/admin')) return json(res, { error:'Unauthorized' }, 401);
    return redirect(res, '/admin/login');
  }

  // ── Admin API ─────────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/admin')) {
    // Orders
    if (pathname === '/api/admin/orders' && method === 'GET') {
      const status = url.searchParams.get('status') || 'all';
      const q = status === 'all'
        ? db.prepare(`SELECT * FROM orders ORDER BY created_at DESC`).all()
        : db.prepare(`SELECT * FROM orders WHERE status=? ORDER BY created_at DESC`).all(status);
      return json(res, q);
    }
    if (pathname.match(/^\/api\/admin\/orders\/\d+\/status$/) && method === 'PATCH') {
      const id = pathname.split('/')[4];
      const data = await body(req);
      // If transitioning to paid, decrement inventory if not already done
      const order = db.prepare(`SELECT * FROM orders WHERE id=?`).get(id);
      if (data.status === 'paid' && order && order.status !== 'paid') {
        const items = JSON.parse(order.items || '[]');
        for (const item of items) {
          db.prepare(`UPDATE inventory SET quantity=MAX(0,quantity-?) WHERE id=?`).run(item.qty||1, item.id);
        }
      }
      db.prepare(`UPDATE orders SET status=?,updated_at=datetime('now') WHERE id=?`).run(data.status, id);
      return json(res, { ok:true });
    }
    if (pathname.match(/^\/api\/admin\/orders\/\d+\/notes$/) && method === 'PATCH') {
      const id = pathname.split('/')[4];
      const data = await body(req);
      db.prepare(`UPDATE orders SET notes=?,updated_at=datetime('now') WHERE id=?`).run(data.notes, id);
      return json(res, { ok:true });
    }
    if (pathname.match(/^\/api\/admin\/orders\/\d+\/tracking$/) && method === 'PATCH') {
      const id = pathname.split('/')[4];
      const data = await body(req);
      db.prepare(`UPDATE orders SET tracking_number=?,updated_at=datetime('now') WHERE id=?`).run(data.tracking_number, id);
      return json(res, { ok:true });
    }
    if (pathname.match(/^\/api\/admin\/orders\/\d+$/) && method === 'GET') {
      const id = pathname.split('/')[4];
      const order = db.prepare(`SELECT * FROM orders WHERE id=?`).get(id);
      return json(res, order || {});
    }

    // Customers
    if (pathname === '/api/admin/customers' && method === 'GET') {
      const rows = db.prepare(`SELECT c.*, COUNT(o.id) as order_count, SUM(o.subtotal) as total_spent
        FROM customers c LEFT JOIN orders o ON o.customer_email=c.email
        GROUP BY c.id ORDER BY c.created_at DESC`).all();
      return json(res, rows);
    }
    if (pathname.match(/^\/api\/admin\/customers\/\d+\/notes$/) && method === 'PATCH') {
      const id = pathname.split('/')[4];
      const data = await body(req);
      db.prepare(`UPDATE customers SET notes=? WHERE id=?`).run(data.notes, id);
      return json(res, { ok:true });
    }

    // Inventory
    if (pathname === '/api/admin/inventory' && method === 'GET') {
      return json(res, db.prepare(`SELECT * FROM inventory ORDER BY name,dose`).all());
    }
    if (pathname.match(/^\/api\/admin\/inventory\/[^/]+$/) && method === 'PATCH') {
      const id = decodeURIComponent(pathname.split('/')[4]);
      const data = await body(req);
      if (data.quantity !== undefined) {
        const qty = Number(data.quantity);
        db.prepare(`UPDATE inventory SET quantity=?, in_stock=? WHERE id=?`).run(qty, qty > 0 ? 1 : 0, id);
      }
      if (data.price !== undefined)
        db.prepare(`UPDATE inventory SET price=? WHERE id=?`).run(data.price, id);
      return json(res, { ok:true });
    }

    // Settings
    if (pathname === '/api/admin/settings' && method === 'GET') {
      const rows = db.prepare(`SELECT key,value FROM settings`).all();
      const out = {};
      for (const r of rows) out[r.key] = r.value;
      return json(res, out);
    }
    if (pathname === '/api/admin/settings' && method === 'POST') {
      const data = await body(req);
      const stmt = db.prepare(`INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)`);
      for (const [k,v] of Object.entries(data)) stmt.run(k, v);
      return json(res, { ok:true });
    }

    // Notify requests
    if (pathname === '/api/admin/notify-requests' && method === 'GET') {
      return json(res, db.prepare(`SELECT * FROM notify_requests ORDER BY created_at DESC`).all());
    }
    if (pathname.match(/^\/api\/admin\/notify-requests\/\d+$/) && method === 'DELETE') {
      const id = pathname.split('/')[4];
      db.prepare(`DELETE FROM notify_requests WHERE id=?`).run(id);
      return json(res, { ok:true });
    }
    if (pathname === '/api/admin/notify-requests/clear' && method === 'DELETE') {
      const data = await body(req);
      if (data.product_id) {
        db.prepare(`DELETE FROM notify_requests WHERE product_id=?`).run(data.product_id);
      } else {
        db.prepare(`DELETE FROM notify_requests`).run();
      }
      return json(res, { ok:true });
    }

    // Stats
    if (pathname === '/api/admin/stats' && method === 'GET') {
      const total   = db.prepare(`SELECT COUNT(*) as c FROM orders`).get().c;
      const pending = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status='pending'`).get().c;
      const revenue = db.prepare(`SELECT COALESCE(SUM(subtotal),0) as s FROM orders WHERE status!='cancelled'`).get().s;
      const custs   = db.prepare(`SELECT COUNT(*) as c FROM customers`).get().c;
      return json(res, { total, pending, revenue, customers: custs });
    }

    // COAs — list all
    if (pathname === '/api/admin/coas' && method === 'GET') {
      return json(res, db.prepare(`SELECT id,product_id,filename,label,lab,date,purity,is_current,uploaded_at FROM coa_files ORDER BY product_id, is_current DESC, uploaded_at DESC`).all());
    }
    // COAs — list for a product
    if (pathname.match(/^\/api\/admin\/coas\/[^/]+$/) && method === 'GET') {
      const productId = pathname.split('/')[4];
      return json(res, db.prepare(`SELECT id,product_id,filename,label,lab,date,purity,is_current,uploaded_at FROM coa_files WHERE product_id=? ORDER BY is_current DESC, uploaded_at DESC`).all(productId));
    }
    // COAs — upload (multipart/form-data parsed manually)
    if (pathname === '/api/admin/coas/upload' && method === 'POST') {
      const chunks = [];
      await new Promise((resolve, reject) => {
        req.on('data', c => chunks.push(c));
        req.on('end', resolve);
        req.on('error', reject);
      });
      const rawBody = Buffer.concat(chunks);
      const ct = req.headers['content-type'] || '';
      const boundaryMatch = ct.match(/boundary=(.+)/);
      if (!boundaryMatch) return json(res, { error: 'No boundary' }, 400);
      const boundary = Buffer.from('--' + boundaryMatch[1].trim());
      // Parse multipart
      const parts = [];
      let start = 0;
      while (true) {
        const idx = rawBody.indexOf(boundary, start);
        if (idx === -1) break;
        const partStart = idx + boundary.length + 2; // skip \r\n
        const nextIdx = rawBody.indexOf(boundary, partStart);
        if (nextIdx === -1) break;
        const partEnd = nextIdx - 2; // skip \r\n before next boundary
        const part = rawBody.slice(partStart, partEnd);
        // Split headers and body
        const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
        if (headerEnd === -1) { start = nextIdx; continue; }
        const headers = part.slice(0, headerEnd).toString();
        const partBody = part.slice(headerEnd + 4);
        const nameMatch = headers.match(/name="([^"]+)"/);
        const filenameMatch = headers.match(/filename="([^"]+)"/);
        parts.push({ name: nameMatch?.[1], filename: filenameMatch?.[1], body: partBody, isFile: !!filenameMatch });
        start = nextIdx;
      }
      const fields = {};
      let fileData = null, fileName = null;
      for (const p of parts) {
        if (p.isFile) { fileData = p.body; fileName = p.filename; }
        else fields[p.name] = p.body.toString().trim();
      }
      if (!fileData || !fileName) return json(res, { error: 'No file' }, 400);
      const productId = fields.product_id;
      if (!productId) return json(res, { error: 'No product_id' }, 400);
      // If marked current, unset others
      if (fields.is_current === '1') db.prepare(`UPDATE coa_files SET is_current=0 WHERE product_id=?`).run(productId);
      db.prepare(`INSERT INTO coa_files(product_id,filename,label,lab,date,purity,is_current,data) VALUES(?,?,?,?,?,?,?,?)`)
        .run(productId, fileName, fields.label||fileName, fields.lab||'', fields.date||'', fields.purity||'', fields.is_current==='1'?1:0, fileData);
      return json(res, { ok: true });
    }
    // COAs — set current
    if (pathname.match(/^\/api\/admin\/coas\/\d+\/current$/) && method === 'PATCH') {
      const id = pathname.split('/')[4];
      const row = db.prepare(`SELECT product_id FROM coa_files WHERE id=?`).get(id);
      if (row) db.prepare(`UPDATE coa_files SET is_current=0 WHERE product_id=?`).run(row.product_id);
      db.prepare(`UPDATE coa_files SET is_current=1 WHERE id=?`).run(id);
      return json(res, { ok: true });
    }
    // COAs — delete
    if (pathname.match(/^\/api\/admin\/coas\/\d+$/) && method === 'DELETE') {
      const id = pathname.split('/')[4];
      db.prepare(`DELETE FROM coa_files WHERE id=?`).run(id);
      return json(res, { ok: true });
    }

    return json(res, { error:'Not found' }, 404);
  }

  // ── Admin Pages ───────────────────────────────────────────────────────────
  res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8' });

  if (pathname === '/admin' || pathname === '/admin/') {
    // Orders page
    res.end(adminHTML('orders') + `
<main>
  <div class="stats" id="stats-row">
    <div class="stat"><div class="stat-label">Total Orders</div><div class="stat-value" id="s-total">—</div></div>
    <div class="stat"><div class="stat-label">Pending</div><div class="stat-value" id="s-pending">—</div></div>
    <div class="stat"><div class="stat-label">Revenue</div><div class="stat-value" id="s-revenue">—</div></div>
    <div class="stat"><div class="stat-label">Customers</div><div class="stat-value" id="s-custs">—</div></div>
  </div>
  <div class="card">
    <div class="card-header">
      <h2>Orders</h2>
      <select id="status-filter" onchange="loadOrders()" style="width:auto;padding:6px 12px;font-size:13px">
        <option value="all">All statuses</option>
        <option value="pending">Pending</option>
        <option value="paid">Paid</option>
        <option value="shipped">Shipped</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>
    <div id="orders-table"></div>
  </div>
</main>

<!-- Order detail modal -->
<div class="modal-overlay" id="order-modal">
  <div class="modal">
    <div class="modal-header">
      <h2 id="m-ref">Order</h2>
      <button class="close-btn" onclick="closeModal('order-modal')">✕</button>
    </div>
    <div class="modal-body" id="m-body"></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('order-modal')">Close</button>
      <button class="btn btn-primary" id="m-save-notes" onclick="saveNotes()">Save Notes</button>
    </div>
  </div>
</div>

<script>
const STATUSES = ['submitted','received','payment_confirmed','shipped','delivered','cancelled'];
let currentOrderId = null;

async function loadStats() {
  const s = await api('/api/admin/stats');
  document.getElementById('s-total').textContent = s.total;
  document.getElementById('s-pending').textContent = s.pending;
  document.getElementById('s-revenue').textContent = 'CA$' + Number(s.revenue).toFixed(0);
  document.getElementById('s-custs').textContent = s.customers;
}

async function loadOrders() {
  const filter = document.getElementById('status-filter').value;
  const orders = await api('/api/admin/orders?status=' + filter);
  if (!orders.length) {
    document.getElementById('orders-table').innerHTML = '<div class="empty">No orders found</div>';
    return;
  }
  document.getElementById('orders-table').innerHTML = \`
    <table>
      <thead><tr>
        <th>Ref</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th></th>
      </tr></thead>
      <tbody>\${orders.map(o => {
        const items = JSON.parse(o.items || '[]');
        const itemStr = items.map(i => i.name + (i.dose?' '+i.dose:'') + ' ×' + (i.qty||1)).join(', ');
        return \`<tr>
          <td><span class="tag">\${o.order_ref}</span></td>
          <td><div>\${o.customer_name||'—'}</div><div style="color:#888;font-size:12px">\${o.customer_email||''}</div></td>
          <td style="max-width:200px;font-size:12px;color:#555">\${itemStr}</td>
          <td style="font-weight:600">CA$\${Number(o.subtotal).toFixed(0)}</td>
          <td style="text-transform:uppercase;font-size:12px">\${o.payment_method}</td>
          <td>
            <select class="status-select badge badge-\${o.status}" onchange="updateStatus(\${o.id},this.value,this)" style="cursor:pointer">
              \${STATUSES.map(s=>\`<option value="\${s}"\${s===o.status?' selected':''}>\${s.charAt(0).toUpperCase()+s.slice(1)}</option>\`).join('')}
            </select>
          </td>
          <td style="color:#888;font-size:12px">\${o.created_at.slice(0,10)}</td>
          <td><button class="btn btn-ghost btn-sm" onclick="openOrder(\${o.id})">View</button></td>
        </tr>\`;
      }).join('')}
      </tbody>
    </table>\`;
}

async function updateStatus(id, status, el) {
  const r = await api('/api/admin/orders/'+id+'/status','PATCH',{status});
  if (r.ok) { toast('Status updated'); el.className='status-select badge badge-'+status; loadStats(); }
  else toast('Error: '+r.error, true);
}

async function openOrder(id) {
  currentOrderId = id;
  const o = await api('/api/admin/orders/'+id);
  document.getElementById('m-ref').textContent = o.order_ref;
  const items = JSON.parse(o.items || '[]');
  const statusLabel = {submitted:'Submitted',received:'Received',payment_confirmed:'Payment Confirmed',shipped:'Shipped',delivered:'Delivered',cancelled:'Cancelled'};
  document.getElementById('m-body').innerHTML = \`
    <div class="grid-2" style="margin-bottom:16px">
      <div><label>Customer</label><div>\${o.customer_name||'—'}</div></div>
      <div><label>Email</label><div>\${o.customer_email||'—'}</div></div>
      <div><label>Address</label><div>\${o.customer_address||''} \${o.customer_city||''} \${o.customer_province||''} \${o.customer_postal||''}</div></div>
      <div><label>Status</label><span class="badge badge-\${o.status}">\${statusLabel[o.status]||o.status}</span></div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <table>
        <thead><tr><th>Product</th><th>Qty</th><th>Price</th></tr></thead>
        <tbody>\${items.map(i=>\`<tr><td>\${i.name} \${i.dose||''}</td><td>\${i.qty||1}</td><td>CA$\${Number(i.price||0).toFixed(0)}</td></tr>\`).join('')}</tbody>
      </table>
    </div>
    <div class="grid-2" style="margin-bottom:16px">
      <div><label>Subtotal</label><div style="font-size:18px;font-weight:700">CA$\${Number(o.subtotal||0).toFixed(0)}</div></div>
      <div><label>Shipping</label><div style="font-size:18px;font-weight:700">\${Number(o.shipping||0)===0?'Free':'CA$'+Number(o.shipping||0).toFixed(0)}</div></div>
      <div><label>Total</label><div style="font-size:22px;font-weight:700;color:#3B6FD4">CA$\${Number(o.total||o.subtotal||0).toFixed(0)}</div></div>
      <div><label>Payment</label><div style="text-transform:uppercase">\${o.payment_method}</div>
        \${o.payment_address?'<div style="font-size:11px;color:#888;word-break:break-all">'+o.payment_address+'</div>':''}
      </div>
    </div>
    <div class="form-row">
      <label>Tracking Number</label>
      <input id="m-tracking" value="\${o.tracking_number||''}" placeholder="Enter courier tracking number">
    </div>
    <div class="form-row">
      <label>Admin Notes</label>
      <textarea id="m-notes" rows="3" placeholder="Internal notes...">\${o.notes||''}</textarea>
    </div>
  \`;
  openModal('order-modal');
}

async function saveNotes() {
  const notes = document.getElementById('m-notes').value;
  const tracking = document.getElementById('m-tracking') ? document.getElementById('m-tracking').value : '';
  await api('/api/admin/orders/'+currentOrderId+'/notes','PATCH',{notes});
  if (tracking !== undefined) await api('/api/admin/orders/'+currentOrderId+'/tracking','PATCH',{tracking_number:tracking});
  if (r.ok) toast('Saved');
}

loadStats(); loadOrders();
</script></body></html>`);
    return;
  }

  if (pathname === '/admin/customers') {
    res.end(adminHTML('customers') + `
<main>
  <div class="card" style="margin-bottom:24px">
    <div class="card-header"><h2>Customers</h2></div>
    <div id="customers-table"><div class="empty">Loading...</div></div>
  </div>
  <div class="card">
    <div class="card-header"><h2>Notify Me Requests</h2><span style="font-size:12px;color:#888">Customers who want to be notified when a product is back</span>
      <button class="btn btn-danger btn-sm" style="margin-left:auto" onclick="clearAllNotify()">Clear All</button>
    </div>
    <div id="notify-table"><div class="empty">Loading...</div></div>
  </div>
</main>
<script>
let currentCustId = null;
async function load() {
  const custs = await api('/api/admin/customers');
  if (!custs || !custs.length) {
    document.getElementById('customers-table').innerHTML='<div class="empty">No customers yet</div>';
  } else {
    document.getElementById('customers-table').innerHTML = \`<table>
      <thead><tr><th>Name</th><th>Email</th><th>Orders</th><th>Spent</th><th>Joined</th><th></th></tr></thead>
      <tbody>\${custs.map(c=>\`<tr>
        <td style="font-weight:600">\${c.name||'—'}</td>
        <td>\${c.email||'—'}</td>
        <td>\${c.order_count||0}</td>
        <td style="font-weight:600">CA$\${Number(c.total_spent||0).toFixed(0)}</td>
        <td style="color:#888;font-size:12px">\${(c.created_at||'').slice(0,10)}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="openCust(\${c.id})">View</button></td>
      </tr>\`).join('')}
      </tbody></table>\`;
  }
  await loadNotify();
}
async function loadNotify() {
  const notifies = await api('/api/admin/notify-requests');
  if (!notifies || !notifies.length) {
    document.getElementById('notify-table').innerHTML='<div class="empty">No notify requests yet</div>';
    return;
  }
  const PROD = {'retatrutide-10mg':'Retatrutide 10mg','retatrutide-20mg':'Retatrutide 20mg','mots-c-10mg':'MOTS-c 10mg','mots-c-40mg':'MOTS-c 40mg','klow-80mg':'KLOW 80mg','glow-70mg':'GLOW 70mg','tesamorelin-10mg':'Tesamorelin 10mg','cjc-ipamorelin-10mg':'CJC-1295/Ipamorelin 10mg','nad-500mg':'NAD+ 500mg','nad-1000mg':'NAD+ 1000mg','5amino1mq-50mg':'5-Amino-1MQ 50mg','semax-10mg':'Semax 10mg','selank-10mg':'Selank 10mg'};
  document.getElementById('notify-table').innerHTML = \`<table>
    <thead><tr><th>Product</th><th>Email</th><th>Date</th><th></th></tr></thead>
    <tbody>\${notifies.map(n=>\`<tr>
      <td style="font-weight:600">\${PROD[n.product_id]||n.product_id}</td>
      <td>\${n.email}</td>
      <td style="color:#888;font-size:12px">\${(n.created_at||'').slice(0,10)}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteNotify(\${n.id})">Dismiss</button></td>
    </tr>\`).join('')}
    </tbody></table>\`;
}
async function deleteNotify(id) {
  const r = await api('/api/admin/notify-requests/'+id,'DELETE');
  if (r.ok) { toast('Dismissed'); await loadNotify(); } else toast('Error',true);
}
async function clearAllNotify() {
  if (!confirm('Clear all notify requests?')) return;
  const r = await api('/api/admin/notify-requests/clear','DELETE');
  if (r.ok) { toast('All cleared'); await loadNotify(); } else toast('Error',true);
}
async function openCust(id) {
  currentCustId = id;
  const custs = await api('/api/admin/customers');
  const c = (custs||[]).find(x=>x.id===id)||{};
  document.getElementById('cm-name').textContent = c.name || 'Customer';
  document.getElementById('cm-body').innerHTML = \`
    <div class="grid-2" style="margin-bottom:16px">
      <div><label>Email</label><div>\${c.email||'—'}</div></div>
      <div><label>Address</label><div>\${c.address||'—'}</div></div>
      <div><label>Last Order</label><div>\${(c.last_order_at||'—').slice(0,10)}</div></div>
      <div><label>Joined</label><div>\${(c.created_at||'—').slice(0,10)}</div></div>
    </div>
    <div class="grid-2" style="margin-bottom:16px">
      <div class="stat"><div class="stat-label">Orders</div><div class="stat-value">\${c.order_count||0}</div></div>
      <div class="stat"><div class="stat-label">Total Spent</div><div class="stat-value">CA$\${Number(c.total_spent||0).toFixed(0)}</div></div>
    </div>
    <div class="form-row"><label>Notes</label><textarea id="cm-notes" rows="3">\${c.notes||''}</textarea></div>
  \`;
  openModal('cust-modal');
}
async function saveCustNotes() {
  const notes = document.getElementById('cm-notes').value;
  await api('/api/admin/customers/'+currentCustId+'/notes','PATCH',{notes});
  toast('Saved'); closeModal('cust-modal'); load();
}
load();
</script>
<!-- Customer modal -->
<div class="modal-overlay" id="cust-modal">
  <div class="modal">
    <div class="modal-header"><h2 id="cm-name">Customer</h2><button class="close-btn" onclick="closeModal('cust-modal')">✕</button></div>
    <div class="modal-body" id="cm-body"></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('cust-modal')">Close</button>
      <button class="btn btn-primary" onclick="saveCustNotes()">Save Notes</button>
    </div>
  </div>
</div>
</body></html>`);
    return;
  }

  if (pathname === '/admin/inventory') {
    res.end(adminHTML('inventory') + `
<main>
  <div class="card">
    <div class="card-header"><h2>Inventory</h2><span style="font-size:12px;color:#888">Changes save automatically</span></div>
    <div id="inv-table"><div class="empty">Loading...</div></div>
  </div>
</main>
<script>
async function load() {
  const inv = await api('/api/admin/inventory');
  document.getElementById('inv-table').innerHTML = \`<table>
    <thead><tr><th>Product</th><th>Dose</th><th>Price (CA$)</th><th>On-Hand Qty</th><th>Status</th></tr></thead>
    <tbody>\${inv.map(p=>\`<tr>
      <td style="font-weight:600">\${p.name}</td>
      <td>\${p.dose||'—'}</td>
      <td><input type="number" value="\${p.price}" min="0" style="width:90px" onchange="save('\${p.id}',{price:+this.value})"></td>
      <td><input type="number" value="\${p.quantity}" min="0" style="width:80px" onchange="saveQty('\${p.id}',+this.value,this)"></td>
      <td id="status-\${p.id}">\${p.quantity>0
        ? '<span class="badge badge-paid">In Stock</span>'
        : '<span class="badge badge-cancelled">Out of Stock</span>'}</td>
    </tr>\`).join('')}
    </tbody></table>\`;
}
async function saveQty(id, qty, input) {
  const r = await api('/api/admin/inventory/'+encodeURIComponent(id),'PATCH',{quantity:qty});
  if (r.ok) {
    toast('Saved');
    const el = document.getElementById('status-'+id);
    if (el) el.innerHTML = qty > 0
      ? '<span class="badge badge-paid">In Stock</span>'
      : '<span class="badge badge-cancelled">Out of Stock</span>';
  } else toast('Error',true);
}
async function save(id, data) {
  const r = await api('/api/admin/inventory/'+encodeURIComponent(id),'PATCH',data);
  if (r.ok) toast('Saved'); else toast('Error',true);
}
load();
</script></body></html>`);
    return;
  }

  if (pathname === '/admin/settings') {
    res.end(adminHTML('settings') + `
<main>
  <div class="card" style="max-width:600px">
    <div class="card-header"><h2>Settings</h2></div>
    <div class="card-body">
      <div id="settings-form"><div class="empty">Loading...</div></div>
    </div>
  </div>
</main>
<script>
async function load() {
  const s = await api('/api/admin/settings');
  document.getElementById('settings-form').innerHTML = \`
    <div class="form-row"><label>USDC Wallet Address</label><input id="usdc" value="\${s.usdc_address||''}" placeholder="0x..."></div>
    <div class="form-row"><label>BTC Wallet Address</label><input id="btc" value="\${s.btc_address||''}" placeholder="bc1..."></div>
    <div class="form-row"><label>e-Transfer Email</label><input id="etransfer" value="\${s.etransfer_email||''}" placeholder="payments@..."></div>
    <div class="form-row"><label>Site Name</label><input id="site_name" value="\${s.site_name||'Peppy'}"></div>
    <button class="btn btn-primary" onclick="save()">Save Settings</button>
  \`;
}
async function save() {
  const data = {
    usdc_address: document.getElementById('usdc').value.trim(),
    btc_address:  document.getElementById('btc').value.trim(),
    etransfer_email: document.getElementById('etransfer').value.trim(),
    site_name:    document.getElementById('site_name').value.trim(),
  };
  const r = await api('/api/admin/settings','POST',data);
  if (r.ok) toast('Settings saved'); else toast('Error',true);
}
load();
</script></body></html>`);
    return;
  }

  if (pathname === '/admin/coas') {
    const PRODUCTS_LIST = [
      { id:'retatrutide-10mg', name:'Retatrutide 10mg' },
      { id:'retatrutide-20mg', name:'Retatrutide 20mg' },
      { id:'mots-c-10mg',      name:'MOTS-c 10mg' },
      { id:'mots-c-40mg',      name:'MOTS-c 40mg' },
      { id:'klow-80mg',        name:'KLOW 80mg' },
      { id:'glow-70mg',        name:'GLOW 70mg' },
      { id:'tesamorelin-10mg', name:'Tesamorelin 10mg' },
      { id:'cjc-ipamorelin-10mg', name:'CJC-1295 / Ipamorelin 10mg' },
      { id:'nad-500mg',        name:'NAD+ 500mg' },
      { id:'nad-1000mg',       name:'NAD+ 1000mg' },
      { id:'5amino1mq-50mg',   name:'5-Amino-1MQ 50mg' },
      { id:'semax-10mg',       name:'Semax 10mg' },
      { id:'selank-10mg',      name:'Selank 10mg' },
    ];
    res.end(adminHTML('coas') + `
<main>
  <div class="card" style="max-width:900px;margin-bottom:32px">
    <div class="card-header"><h2>Upload New COA</h2></div>
    <div class="card-body">
      <div class="grid-2">
        <div class="form-row">
          <label>Product</label>
          <select id="up-product">
            ${PRODUCTS_LIST.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-row"><label>Lab Name</label><input id="up-lab" placeholder="e.g. Janoshik"></div>
        <div class="form-row"><label>Date</label><input id="up-date" type="date"></div>
        <div class="form-row"><label>Purity %</label><input id="up-purity" placeholder="e.g. 99.64%"></div>
        <div class="form-row"><label>Label / Description</label><input id="up-label" placeholder="e.g. Purity Analysis · Lot 2026-07"></div>
        <div class="form-row" style="display:flex;align-items:center;gap:10px;padding-top:24px">
          <input type="checkbox" id="up-current" style="width:auto">
          <label style="margin:0">Set as current batch</label>
        </div>
      </div>
      <div class="form-row">
        <label>PDF File</label>
        <input type="file" id="up-file" accept=".pdf" style="padding:8px 0">
      </div>
      <button class="btn btn-blue" onclick="uploadCOA()">Upload COA</button>
    </div>
  </div>

  <div class="card" style="max-width:900px">
    <div class="card-header">
      <h2>All Uploaded COAs</h2>
      <button class="btn btn-ghost btn-sm" onclick="loadCOAs()">Refresh</button>
    </div>
    <div id="coa-table"><div class="empty">Loading...</div></div>
  </div>
</main>
<script>
async function uploadCOA() {
  const file = document.getElementById('up-file').files[0];
  if (!file) { toast('Select a PDF first', true); return; }
  const fd = new FormData();
  fd.append('product_id', document.getElementById('up-product').value);
  fd.append('lab',        document.getElementById('up-lab').value);
  fd.append('date',       document.getElementById('up-date').value);
  fd.append('purity',     document.getElementById('up-purity').value);
  fd.append('label',      document.getElementById('up-label').value || file.name);
  fd.append('is_current', document.getElementById('up-current').checked ? '1' : '0');
  fd.append('file',       file, file.name);
  const r = await fetch('/api/admin/coas/upload', { method:'POST', body:fd });
  const data = await r.json();
  if (data.ok) { toast('COA uploaded!'); loadCOAs(); document.getElementById('up-file').value=''; }
  else toast('Error: '+(data.error||'unknown'), true);
}

const PROD_NAMES = {
  'retatrutide-10mg':'Retatrutide 10mg','retatrutide-20mg':'Retatrutide 20mg',
  'mots-c-10mg':'MOTS-c 10mg','mots-c-40mg':'MOTS-c 40mg',
  'klow-80mg':'KLOW 80mg','glow-70mg':'GLOW 70mg',
  'tesamorelin-10mg':'Tesamorelin 10mg','cjc-ipamorelin-10mg':'CJC-1295 / Ipamorelin 10mg',
  'nad-500mg':'NAD+ 500mg','nad-1000mg':'NAD+ 1000mg',
  '5amino1mq-50mg':'5-Amino-1MQ 50mg','semax-10mg':'Semax 10mg','selank-10mg':'Selank 10mg'
};

async function loadCOAs() {
  const coas = await api('/api/admin/coas');
  if (!coas.length) {
    document.getElementById('coa-table').innerHTML = '<div class="empty">No COAs uploaded yet</div>';
    return;
  }
  // Group by product
  const groups = {};
  coas.forEach(function(c) {
    if (!groups[c.product_id]) groups[c.product_id] = [];
    groups[c.product_id].push(c);
  });
  const prodOrder = ['retatrutide-10mg','retatrutide-20mg','mots-c-10mg','mots-c-40mg','klow-80mg','glow-70mg','tesamorelin-10mg','cjc-ipamorelin-10mg','nad-500mg','nad-1000mg','5amino1mq-50mg','semax-10mg','selank-10mg'];
  let html = '';
  prodOrder.forEach(function(pid) {
    if (!groups[pid] || !groups[pid].length) return;
    html += \`<div style="margin-bottom:0">
      <div style="padding:12px 18px;background:#F7F9FF;border-bottom:1px solid #DDE6F5;font-weight:700;font-size:13px;color:#3B6FD4">\${PROD_NAMES[pid]||pid}</div>
      <table style="width:100%">
        <thead><tr><th>Label</th><th>Lab</th><th>Date</th><th>Purity</th><th>Status</th><th></th></tr></thead>
        <tbody>\${groups[pid].map(c=>\`<tr>
          <td style="font-size:12px;color:#555">\${c.label}</td>
          <td>\${c.lab||'—'}</td>
          <td style="white-space:nowrap">\${c.date||'—'}</td>
          <td style="color:#16A34A;font-weight:600">\${c.purity||'—'}</td>
          <td>\${c.is_current ? '<span class="badge badge-paid">Current</span>' : '<span style="color:#888;font-size:12px">—</span>'}</td>
          <td style="display:flex;gap:6px;white-space:nowrap">
            <a class="btn btn-ghost btn-sm" href="/coa/\${c.product_id}/\${c.filename}" target="_blank">View</a>
            \${!c.is_current ? \`<button class="btn btn-blue btn-sm" onclick="setCurrent(\${c.id})">Set Current</button>\` : ''}
            <button class="btn btn-danger btn-sm" onclick="deleteCOA(\${c.id})">Delete</button>
          </td>
        </tr>\`).join('')}
        </tbody>
      </table>
    </div>\`;
  });
  document.getElementById('coa-table').innerHTML = html;
}

async function setCurrent(id) {
  const r = await api('/api/admin/coas/'+id+'/current','PATCH');
  if (r.ok) { toast('Set as current batch'); loadCOAs(); }
  else toast('Error',true);
}

async function deleteCOA(id) {
  if (!confirm('Delete this COA?')) return;
  const r = await api('/api/admin/coas/'+id,'DELETE');
  if (r.ok) { toast('Deleted'); loadCOAs(); }
  else toast('Error',true);
}

loadCOAs();
</script></body></html>`);
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => console.log(`Peppy app listening on port ${PORT}`));
