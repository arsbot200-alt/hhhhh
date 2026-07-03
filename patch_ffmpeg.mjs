import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
`                    '-pix_fmt', 'yuv420p',
                    '-vf', \\\`scale=\\\${w}:\\\${h}:force_original_aspect_ratio=decrease,pad=\\\${w}:\\\${h}:(ow-iw)/2:(oh-ih)/2\\\`,`,
`                    '-pix_fmt', 'yuv420p',
                    '-sws_flags', 'fast_bilinear',
                    '-vf', \\\`scale=\\\${w}:\\\${h}:force_original_aspect_ratio=decrease,pad=\\\${w}:\\\${h}:(ow-iw)/2:(oh-ih)/2\\\`,`
);

fs.writeFileSync('server.ts', code);
