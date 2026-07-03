import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/let w = 640;\s*let h = 360;\s*let fps = 20;/g, 'let w = 480;\n                 let h = 272;\n                 let fps = 15;');
code = code.replace(/w = 368;\s*h = 640;/g, 'w = 272;\n                             h = 480;');
code = code.replace(/w = 640;\s*h = 360;/g, 'w = 480;\n                             h = 272;');
code = code.replace(/falling back to 640x360/g, 'falling back to 480x272');

fs.writeFileSync('server.ts', code);
