import { parseSdp } from './node_modules/tgcalls/lib/utils.js';
import fs from 'fs';
const sdp = fs.readFileSync('sdp2.txt', 'utf8');
console.log(parseSdp(sdp));
