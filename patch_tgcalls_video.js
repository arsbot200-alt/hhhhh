import fs from 'fs';

let code = fs.readFileSync('node_modules/tgcalls/lib/stream.js', 'utf8');

code = code.replace(
    /this\.videoSource\.onFrame\(\{/,
    `if (buffer.length === 0) return;
                    this.videoSource.onFrame({`
);

fs.writeFileSync('node_modules/tgcalls/lib/stream.js', code);
console.log("Patched tgcalls stream.js video");
