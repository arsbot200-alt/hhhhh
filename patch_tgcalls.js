import fs from 'fs';

let code = fs.readFileSync('node_modules/tgcalls/lib/stream.js', 'utf8');

code = code.replace(
    /const samples = new Int16Array\(new Uint8Array\(buffer\)\.buffer\);\s*this\.audioSource\.onData\(\{/,
    `const samples = new Int16Array(new Uint8Array(buffer).buffer);
                    if (samples.length === 0) return;
                    this.audioSource.onData({`
);

fs.writeFileSync('node_modules/tgcalls/lib/stream.js', code);
console.log("Patched tgcalls stream.js");
