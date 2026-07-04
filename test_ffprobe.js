import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

async function test() {
    try {
        await execPromise(`ffmpeg -f lavfi -i anullsrc -t 1 -c:a aac test_audio.mp4 -y`);
        const { stdout } = await execPromise(`ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of default=nw=1:nk=1 "test_audio.mp4"`);
        console.log("codec_type:", stdout.trim());
    } catch(e) {
        console.error(e);
    }
}
test();
