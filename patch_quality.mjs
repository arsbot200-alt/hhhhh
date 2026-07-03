import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/let w = 480;\s*let h = 272;\s*let fps = 15;/g, 'let w = 1280;\n                 let h = 720;\n                 let fps = 30;');
code = code.replace(/w = 272;\s*h = 480;/g, 'w = 720;\n                             h = 1280;');
code = code.replace(/w = 480;\s*h = 272;/g, 'w = 1280;\n                             h = 720;');
code = code.replace(/falling back to 480x272/g, 'falling back to 1280x720');

// Remove fast_bilinear if we want better quality, but fast_bilinear is fine. Let's change it to bilinear or bicubic.
code = code.replace(/fast_bilinear/g, 'bicubic');

fs.writeFileSync('server.ts', code);
