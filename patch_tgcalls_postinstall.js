import fs from 'fs';

let code = fs.readFileSync('node_modules/tgcalls/lib/stream.js', 'utf8');

let modified = false;

if (!code.includes('if (samples.length === 0) return;')) {
    code = code.replace(
        /const samples = new Int16Array\(new Uint8Array\(buffer\)\.buffer\);\s*this\.audioSource\.onData\(\{/,
        `const samples = new Int16Array(new Uint8Array(buffer).buffer);\n                    if (samples.length === 0) return;\n                    this.audioSource.onData({`
    );
    modified = true;
}

if (!code.includes('if (buffer.byteLength === 0) return;')) {
    code = code.replace(
        /this\.videoSource\.onFrame\(\{/,
        `if (buffer.byteLength === 0) return;\n                    this.videoSource.onFrame({`
    );
    modified = true;
}

if (modified) {
    fs.writeFileSync('node_modules/tgcalls/lib/stream.js', code);
    console.log("Patched tgcalls stream.js");
}
