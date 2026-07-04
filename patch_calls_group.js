import fs from 'fs';
let calls = fs.readFileSync('node_modules/tgcalls-gramjs/lib/calls.js', 'utf8');

calls = calls.replace(
    /'ssrc-groups': payload\.sourceGroup \? \[\s*\{\s*semantics: 'FID',\s*sources: payload\.sourceGroup,\s*\},\s*\] : \[\],/g,
    `'ssrc-groups': payload.sourceGroup ? [
                    {
                        semantics: 'FID',
                        sources: payload.sourceGroup,
                    },
                ] : undefined,`
);
fs.writeFileSync('node_modules/tgcalls-gramjs/lib/calls.js', calls);
console.log("Patched source groups undefined");
