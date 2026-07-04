import fs from 'fs';

let calls = fs.readFileSync('node_modules/tgcalls-gramjs/lib/calls.js', 'utf8');

calls = calls.replace(
    /'ssrc-groups': \[\s*\{\s*semantics: 'FID',\s*sources: payload\.sourceGroup,\s*\},\s*\],/,
    `'ssrc-groups': payload.sourceGroup ? [
                    {
                        semantics: 'FID',
                        sources: payload.sourceGroup,
                    },
                ] : [],
                video_ssrc: payload.videoSource,
                'video_ssrc-groups': payload.videoSourceGroup ? [
                    {
                        semantics: 'FID',
                        sources: payload.videoSourceGroup,
                    }
                ] : undefined,`
);

fs.writeFileSync('node_modules/tgcalls-gramjs/lib/calls.js', calls);
console.log("Patched tgcalls-gramjs calls.js");
