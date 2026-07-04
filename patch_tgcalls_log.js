import fs from 'fs';
let code = fs.readFileSync('node_modules/tgcalls/lib/stream.js', 'utf8');

code = code.replace(
    /if \(buffer\.byteLength === byteLength\) \{\n\s*this\.videoSource\.onFrame\(\{/,
    `if (buffer.byteLength === byteLength) {
                        if (!this.__loggedVideo) { console.log("[tgcalls] first video frame sent to onFrame", this.width, this.height); this.__loggedVideo = true; }
                    this.videoSource.onFrame({`
);

fs.writeFileSync('node_modules/tgcalls/lib/stream.js', code);
console.log("Patched tgcalls log");
