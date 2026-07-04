import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
    /if \(vw && vh\) \{[\s\S]*?h = Math\.floor\(h \/ 2\) \* 2;\n\s*\}/,
    `if (vw && vh) {
                        if (vw > vh) {
                            w = 640; h = 360;
                        } else {
                            w = 360; h = 640;
                        }
                     }`
);

fs.writeFileSync('server.ts', code);
console.log("Patched resolution");
