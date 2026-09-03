const fs = require('fs');
const file = 'src/services/importService.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /  if \(payload\.profiles\.length > 0\) \{[\s\S]*\} // End of executeImport/;

// Wait, let's just do a string replacement.
