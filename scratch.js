import Database from 'better-sqlite3';
const db = new Database(':memory:');

db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE parent (id TEXT PRIMARY KEY NOT NULL);
  CREATE TABLE child (id TEXT PRIMARY KEY NOT NULL, parent_id TEXT REFERENCES parent(id) ON DELETE CASCADE);
  INSERT INTO parent (id) VALUES ('1');
  INSERT INTO child (id, parent_id) VALUES ('1', '1');
`);

db.exec(`PRAGMA foreign_keys = OFF;`);
db.exec("DROP TABLE parent;");
console.log("After drop with FK OFF:", db.prepare("SELECT * FROM child").all());
