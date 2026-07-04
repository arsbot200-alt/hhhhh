import fs from 'fs';
let calls = fs.readFileSync('node_modules/tgcalls-gramjs/lib/calls.js', 'utf8');

calls = calls.replace(
    /video_ssrc: payload.videoSource,[\s\S]*?presentation_paused: false,/g,
    `video_ssrc: payload.videoSource || undefined,
                'video_ssrc-groups': payload.videoSourceGroup ? [
                    {
                        semantics: 'FID',
                        sources: payload.videoSourceGroup,
                    }
                ] : undefined,
                video_paused: false,
                presentation_paused: false,`
);
fs.writeFileSync('node_modules/tgcalls-gramjs/lib/calls.js', calls);
console.log("Patched video props properly");
