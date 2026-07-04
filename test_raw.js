import { spawn } from 'child_process';
const ffmpeg = spawn('ffmpeg', [
    '-f', 'lavfi', '-i', 'color=c=red:s=218x320',
    '-f', 'rawvideo', '-pix_fmt', 'yuv420p',
    '-vframes', '1',
    'pipe:1'
]);
let size = 0;
ffmpeg.stdout.on('data', d => size += d.length);
ffmpeg.on('close', () => console.log('Size:', size, 'Expected:', 218*320*1.5));
