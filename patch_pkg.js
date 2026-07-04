import fs from 'fs';

let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts.postinstall = "node patch_tgcalls_postinstall.js";
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log("Patched package.json");
