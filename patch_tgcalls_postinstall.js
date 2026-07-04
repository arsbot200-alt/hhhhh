import fs from 'fs';

let code = fs.readFileSync('node_modules/tgcalls/lib/stream.js', 'utf8');

code = code.replace(
    /if \(buffer\.byteLength > 0\) \{/,
    `if (buffer.byteLength === byteLength) {`
);

code = code.replace(
    /if \(samples\.length > 0\) \{/,
    `if (buffer.byteLength === byteLength) {`
);

fs.writeFileSync('node_modules/tgcalls/lib/stream.js', code);
console.log("Patched exact match length");
