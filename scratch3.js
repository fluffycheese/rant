import Database from 'better-sqlite3';
const db = new Database(':memory:');

db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE sites (id TEXT PRIMARY KEY NOT NULL);
  CREATE TABLE devices (id TEXT PRIMARY KEY NOT NULL);
  INSERT INTO sites (id) VALUES ('s1');
  INSERT INTO devices (id) VALUES ('d1');
`);

try {
  db.exec(`ALTER TABLE devices ADD COLUMN site_id TEXT REFERENCES sites(id) ON DELETE CASCADE;`);
  console.log("Success! Columns:", db.prepare("PRAGMA table_info(devices)").all());
} catch (e) {
  console.log("Error:", e.message);
}
