import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

async function test() {
    try {
        const { stdout } = await execPromise(`ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=nw=1:nk=1 "uploads/test.mp4"`);
        console.log("Audio:", stdout.trim());
    } catch(e) {
        console.error(e);
    }
}
test();
