const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

// ─── Client : Turso en production, SQLite local en dev ───────────────────────
// En local sans accès réseau à Turso, on force SQLite local
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;

const db = createClient(
  isVercel
    ? {
        url:       process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }
    : {
        url: 'file:./database/pharmacy.db',
      }
);

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function run(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return { lastID: Number(result.lastInsertRowid), changes: result.rowsAffected };
}

async function get(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  if (!result.rows.length) return undefined;
  return rowToObject(result.columns, result.rows[0]);
}

async function all(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result.rows.map(row => rowToObject(result.columns, row));
}

function rowToObject(columns, row) {
  const obj = {};
  columns.forEach((col, i) => { obj[col] = row[i]; });
  return obj;
}

// ─── Init / Migrations ───────────────────────────────────────────────────────
async function init() {
  // PRAGMAs only supported by local SQLite, not Turso remote
  if (!isVercel) {
    await run('PRAGMA foreign_keys = ON');
    await run('PRAGMA journal_mode = WAL');
  }

  // Migrations — ajouter colonnes si absentes
  try { await run("ALTER TABLE products ADD COLUMN tags TEXT DEFAULT '[]'"); } catch {}
  try { await run("ALTER TABLE products ADD COLUMN meta_title TEXT DEFAULT ''"); } catch {}
  try { await run("ALTER TABLE products ADD COLUMN meta_description TEXT DEFAULT ''"); } catch {}
  try { await run("ALTER TABLE products ADD COLUMN variants TEXT DEFAULT '[]'"); } catch {}

  // ── Tables ──────────────────────────────────────────────────────────────────
  await run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, value TEXT DEFAULT ''
  )`);

  await run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '', image_url TEXT DEFAULT '', parent_id INTEGER,
    sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '', short_description TEXT DEFAULT '',
    price REAL NOT NULL, sale_price REAL, stock INTEGER DEFAULT 0,
    category_id INTEGER, images TEXT DEFAULT '[]',
    is_featured INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
    requires_prescription INTEGER DEFAULT 0,
    brand TEXT DEFAULT '', dosage TEXT DEFAULT '', package_size TEXT DEFAULT '', sku TEXT DEFAULT '',
    tags TEXT DEFAULT '[]', meta_title TEXT DEFAULT '', meta_description TEXT DEFAULT '',
    variants TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL, customer_email TEXT NOT NULL, customer_phone TEXT DEFAULT '',
    shipping_address TEXT NOT NULL, items TEXT NOT NULL,
    subtotal REAL NOT NULL, shipping_cost REAL DEFAULT 0, total REAL NOT NULL,
    status TEXT DEFAULT 'pending', payment_method TEXT DEFAULT 'cod', notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin', is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, subtitle TEXT,
    image_url TEXT, link TEXT, button_text TEXT DEFAULT 'Shop Now',
    is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── Settings par défaut ─────────────────────────────────────────────────────
  const defaults = [
    ['site_name','13-Pills'],['site_tagline','Your online pharmacy'],
    ['site_description','Buy your medications and health products online'],
    ['logo_url',''],['favicon_url',''],
    ['contact_email','contact@13pills.com'],['contact_phone','+44 20 0000 0000'],
    ['contact_address','123 Health Street, London'],
    ['working_hours','Mon-Fri: 8am-8pm, Sat: 9am-5pm'],
    ['currency','GBP'],['currency_symbol','£'],
    ['primary_color','#0066CC'],['secondary_color','#00A651'],
    ['free_shipping_threshold','50'],['shipping_cost','4.99'],
    ['meta_title','13-Pills - Online Pharmacy'],
    ['meta_description','Buy your medications online'],
    ['google_analytics_id',''],['facebook_url',''],['instagram_url',''],
    ['twitter_url',''],['whatsapp_number',''],
    ['payment_cod_enabled','1'],['payment_bank_enabled','1'],
    ['bank_details','Bank: HSBC\nIBAN: GB00 XXXX\nBIC: MIDLGB22'],
    ['footer_text','© 2024 13-Pills. All rights reserved.']
  ];
  for (const [k, v] of defaults) {
    await run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [k, v]);
  }

  // ── Admin user ──────────────────────────────────────────────────────────────
  const admin = await get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    await run(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?,?,?,?)',
      ['admin', 'admin@13pills.com', hash, 'admin']
    );
  }

  // ── Catégories ──────────────────────────────────────────────────────────────
  const catCnt = await get('SELECT COUNT(*) as c FROM categories');
  if (!catCnt.c) {
    const cats = [
      ['Uncategorised',           'uncategorised',          'Uncategorised products',                    1],
      ['Accessories',             'accessories',            'Medical accessories',                       2],
      ['ADHD',                    'adhd',                   'ADHD medications',                          3],
      ['Anti-Anxiety',            'anti-anxiety',           'Anti-anxiety medications',                  4],
      ['Antifungal',              'antifungal',             'Antifungal treatments',                     5],
      ['Anxiety Medications',     'anxiety',                'Anxiety treatments',                        6],
      ['Beauty & Personal Care',  'beauty-care',            'Beauty and personal care products',         7],
      ['Blush',                   'blush',                  'Blush makeup products',                     8],
      ['Body Care',               'body-care',              'Body care products',                        9],
      ['Cough, Cold & Allergy',   'cough-cold-allergy',     'Cough, cold and allergy treatments',       10],
      ['Face Powder',             'face-powder',            'Face powders',                             11],
      ['Perfume',                 'perfume',                'Perfumes and fragrances',                  12],
      ['Gloves',                  'gloves',                 'Medical gloves',                           13],
      ['Hair Care',               'hair-care',              'Hair care products',                       14],
      ['Hand Sanitisers',         'hand-sanitisers',        'Hand sanitisers',                          15],
      ['Healthcare',              'healthcare',             'General healthcare products',              16],
      ['Infection Prevention',    'infection-prevention',   'Infection prevention products',            17],
      ['Makeup',                  'makeup',                 'Makeup products',                          18],
      ['Muscle Relaxants',        'muscle-relaxants',       'Muscle relaxant medications',              19],
      ['Pain & Fever Relief',     'pain-fever-relief',      'Analgesics and antipyretics',              20],
      ['Analgesic',               'analgesic',              'Analgesic medications',                    21],
      ['Research Chemicals',      'research-chemicals',     'Research chemicals',                       22],
      ['Safety Goggles',          'safety-goggles',         'Safety goggles',                           23],
      ['Shampoo',                 'shampoo',                'Medical shampoos',                         24],
      ['Skin Care',               'skin-care',              'Dermatological products',                  25],
      ['Sleep Aids',              'sleep-aids',             'Sleep aid medications',                    26],
      ['Stomach Remedies',        'stomach-remedies',       'Gastrointestinal treatments',              27],
      ['Sunscreen',               'sunscreen',              'Sunscreen and sun protection',             28],
      ['Surgical Capsules',       'surgical-capsules',      'Surgical capsules',                        29],
      ['Surgical Clothing',       'surgical-clothing',      'Surgical clothing',                        30],
      ['Surgical Masks',          'surgical-masks',         'Surgical masks',                           31],
      ['Weight Loss Pills',       'weight-loss',            'Weight loss medications',                  32],
    ];
    for (const [n, s, d, o] of cats) {
      await run(
        'INSERT INTO categories (name,slug,description,sort_order) VALUES (?,?,?,?)',
        [n, s, d, o]
      );
    }
  }

  // ── Produits de démonstration ───────────────────────────────────────────────
  const prodCnt = await get('SELECT COUNT(*) as c FROM products');
  if (!prodCnt.c) {
    const c = await all('SELECT id, slug FROM categories');
    const cm = {};
    for (const x of c) cm[x.slug] = x.id;

    const prods = [
      ['Doliprane 1000mg','doliprane-1000mg','Paracetamol 1000mg - Box of 8 tablets','Analgesic and antipyretic based on paracetamol.',3.50,null,150,'analgesic',1,0,'Sanofi','1000mg','Box of 8 tablets'],
      ['Ibuprofen 400mg','ibuprofene-400mg','Anti-inflammatory 400mg','Non-steroidal anti-inflammatory drug for pain and fever.',4.20,3.50,89,'pain-fever-relief',1,0,'Biogaran','400mg','Box of 12 tablets'],
      ['Amoxicillin 500mg','amoxicilline-500mg','Prescription antibiotic','Penicillin antibiotic for bacterial infections.',8.50,null,45,'infection-prevention',0,1,'EG Labo','500mg','Box of 12 capsules'],
      ['Hydrocortisone 1% Cream','hydrocortisone-creme','Anti-inflammatory skin cream','Relieves itching and skin irritations.',5.80,null,60,'skin-care',1,0,'Cooper','1%','30g tube'],
      ['Smecta Orange','smecta-orange','Diarrhoea treatment','Antidiarrhoeal based on diosmectite.',7.20,6.50,120,'stomach-remedies',0,0,'Ipsen','3g','30 sachets'],
      ['Voltaren Gel 1%','voltaren-gel','Local anti-inflammatory gel','NSAID for muscle and joint pain.',7.80,6.80,72,'analgesic',1,0,'GSK','1%','50g tube'],
      ['SPF50 Sunscreen','creme-solaire-spf50','High protection sunscreen','SPF50+ sunscreen for the whole family.',14.50,11.90,80,'sunscreen',1,0,'La Roche-Posay','SPF50+','100ml tube'],
      ['Surgical Mask','masque-chirurgical','Medical protection mask','Certified Type IIR surgical masks.',8.90,null,200,'surgical-masks',0,0,'Kolmi','Type IIR','Box of 50'],
      ['Hand Gel 500ml','gel-hydro-500','500ml hand sanitiser','70% alcohol disinfectant gel.',6.50,5.50,150,'hand-sanitisers',1,0,'Sanytol','70%','500ml bottle'],
      ['Anti-Dandruff Shampoo','shampooing-pellicules','Anti-dandruff treatment','Medical shampoo against dandruff.',9.20,null,65,'shampoo',0,0,'Ducray','2%','200ml bottle'],
    ];
    for (const [n, s, sd, d, p, sp, st, cs, f, rx, b, dos, pk] of prods) {
      await run(
        'INSERT INTO products (name,slug,short_description,description,price,sale_price,stock,category_id,is_featured,requires_prescription,brand,dosage,package_size) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [n, s, sd, d, p, sp, st, cm[cs] || null, f, rx, b, dos, pk]
      );
    }
  }

  console.log('✅ Turso database initialised');
}

const initPromise = init().catch(e => { console.error('DB init error:', e); });

module.exports = { run, get, all, initPromise };