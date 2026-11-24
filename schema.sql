CREATE TABLE users(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, salt TEXT NOT NULL, pw TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', created_at INTEGER NOT NULL);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE categories(id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL);
CREATE TABLE businesses(id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, category_id INTEGER NOT NULL REFERENCES categories(id),
 description TEXT NOT NULL, area TEXT NOT NULL, town TEXT NOT NULL DEFAULT 'Murang''a', region TEXT NOT NULL DEFAULT 'Murang''a County', country TEXT NOT NULL DEFAULT 'Kenya',
 maps_url TEXT NOT NULL, lat REAL, lng REAL, contact TEXT, status TEXT NOT NULL DEFAULT 'pending', submitted_by INTEGER REFERENCES users(id), created_at INTEGER NOT NULL);
CREATE TABLE reviews(id INTEGER PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id),
 rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published', created_at INTEGER NOT NULL, UNIQUE(business_id,user_id));
CREATE TABLE votes(review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE, user_id INTEGER NOT NULL, PRIMARY KEY(review_id,user_id));
CREATE TABLE reports(id INTEGER PRIMARY KEY, kind TEXT NOT NULL, target_id INTEGER NOT NULL, reason TEXT NOT NULL, note TEXT, user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL);
CREATE TABLE rl(k TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX idx_rl ON rl(k,ts); CREATE INDEX idx_rev ON reviews(business_id,status); CREATE INDEX idx_biz ON businesses(status,category_id);
INSERT INTO categories(slug,name) VALUES('hotels','Hotels & Accommodation'),('restaurants','Restaurants & Food'),('cyber-cafes','Cyber Cafés & Printing'),('supermarkets','Supermarkets & Grocery'),('shops','Retail Shops'),('electronics','Electronics'),('salons-barbershops','Salons & Barbershops'),('repair','Repair & Maintenance'),('entertainment','Entertainment'),('other','Other Local Businesses');
