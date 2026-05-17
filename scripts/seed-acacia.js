const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'campops-prod-sim.db');
const db = new Database(dbPath);

const id = 'acacia-1';
const slug = 'acacia';
const name = 'Acacia Camp';
const now = new Date().toISOString();

const stmt = db.prepare(`
  INSERT OR REPLACE INTO properties 
  (id, slug, name, description, short_description, city, country, is_active, 
   custom_domain, domain_verified, plan, currency_code, branding, settings, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 0, 'premium', 'USD', ?, ?, ?)
`);

stmt.run(
  id,
  slug,
  name,
  'Experience the beauty of Sinai at Acacia Camp. A serene desert oasis offering authentic Bedouin hospitality, comfortable accommodations, and unforgettable adventures.',
  'Desert oasis with authentic Bedouin hospitality',
  'Dahab',
  'Egypt',
  'acaciacamp.com',
  JSON.stringify({
    name: 'Acacia Camp',
    tagline: 'Your Desert Oasis Awaits',
    colors: { primary: '#0f172a', secondary: '#3b82f6', accent: '#10b981' },
    logo: { url: '' },
    images: { hero: '' },
    contact: { email: 'info@acaciacamp.com', phone: '+20 100 123 4567' },
    business: { currency: 'USD', timezone: 'Africa/Cairo' },
  }),
  JSON.stringify({}),
  now
);

console.log('Acacia property created successfully');
const row = db.prepare('SELECT * FROM properties WHERE slug = ?').get('acacia');
console.log(JSON.stringify(row, null, 2));
db.close();
