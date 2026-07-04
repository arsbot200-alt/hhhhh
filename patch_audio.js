import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const regex = /const audioProcess = spawn\('ffmpeg', \[\s*'-re',\s*'-stream_loop', '-1',\s*'-i', finalVideoPath,\s*'-f', 's16le',\s*'-ac', '1',\s*'-ar', '65000',\s*'pipe:1',\s*\]\);/g;

const replacement = `
                 let hasAudio = false;
                 try {
                     const { stdout } = await execPromise(\`ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of default=nw=1:nk=1 "\${finalVideoPath}"\`);
                     if (stdout.trim().toLowerCase() === 'audio') {
                         hasAudio = true;
                     }
                 } catch(e) {
                     console.error("ffprobe audio check failed, assuming no audio", e.message);
                 }

                 const audioArgs = hasAudio ? [
                    '-re',
                    '-stream_loop', '-1',
                    '-i', finalVideoPath,
                    '-f', 's16le',
                    '-ac', '1',
                    '-ar', '65000',
                    'pipe:1',
                 ] : [
                    '-re',
                    '-f', 'lavfi',
                    '-i', 'anullsrc=r=65000:cl=mono',
                    '-f', 's16le',
                    '-ac', '1',
                    '-ar', '65000',
                    'pipe:1'
                 ];

                 const audioProcess = spawn('ffmpeg', audioArgs);
`;

code = code.replace(regex, replacement);

code = code.replace(
    `audioProcess.stderr.on('data', (data) => {\n                     // console.log(\`[FFmpeg Audio]: \${data.toString()}\`);\n                 });`,
    `audioProcess.stderr.on('data', (data) => {\n                     const str = data.toString();\n                     if (str.toLowerCase().includes('error')) {\n                        console.error(\`[FFmpeg Audio Error]: \${str}\`);\n                     }\n                 });`
);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts audio fallback");
