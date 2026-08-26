import Database from 'better-sqlite3';
const db = new Database(':memory:');

db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE parent (id TEXT PRIMARY KEY NOT NULL);
  CREATE TABLE child (id TEXT PRIMARY KEY NOT NULL, parent_id TEXT REFERENCES parent(id) ON DELETE CASCADE);
  INSERT INTO parent (id) VALUES ('1');
  INSERT INTO child (id, parent_id) VALUES ('1', '1');
`);

db.exec(`
  ALTER TABLE parent RENAME TO parent_old;
  CREATE TABLE parent (id TEXT PRIMARY KEY NOT NULL);
  INSERT INTO parent SELECT * FROM parent_old;
`);
console.log("Child rows after rename:", db.prepare("SELECT * FROM child").all());
try {
  db.exec("DROP TABLE parent_old;");
  console.log("Child rows after drop old:", db.prepare("SELECT * FROM child").all());
} catch (e) {
  console.log("Error dropping:", e.message);
}
