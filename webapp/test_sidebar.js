const fs = require('fs');
const code = fs.readFileSync('sidebar.js', 'utf8');
try {
    new Function(code);
    console.log("Syntax is valid");
} catch (e) {
    console.log("Error:", e);
}
