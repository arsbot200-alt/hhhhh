import fs from 'fs';

let calls = fs.readFileSync('node_modules/tgcalls-gramjs/lib/calls.js', 'utf8');

calls = calls.replace(
    /video_ssrc: payload\.videoSource,[\s\S]*?\] : undefined,/,
    `video_ssrc: payload.videoSource,
                'video_ssrc-groups': payload.videoSourceGroup ? [
                    {
                        semantics: 'FID',
                        sources: payload.videoSourceGroup,
                    }
                ] : undefined,
                video_ssrc_groups: payload.videoSourceGroup ? [
                    {
                        semantics: 'FID',
                        sources: payload.videoSourceGroup,
                    }
                ] : undefined,
                video_paused: false,
                presentation_paused: false,`
);

fs.writeFileSync('node_modules/tgcalls-gramjs/lib/calls.js', calls);
console.log("Patched tgcalls-gramjs calls.js 2");
