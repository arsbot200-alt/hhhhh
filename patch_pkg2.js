import fs from 'fs';

let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.scripts.postinstall) {
    pkg.scripts.prebuild = pkg.scripts.postinstall;
    delete pkg.scripts.postinstall;
}
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log("Patched package.json prebuild");
