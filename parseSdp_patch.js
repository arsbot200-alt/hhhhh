import fs from 'fs';

let utils = fs.readFileSync('node_modules/tgcalls/lib/utils.js', 'utf8');

utils = utils.replace(
    /const rawSource = lookup\('a=ssrc:'\);\s*const rawSourceGroup = lookup\('a=ssrc-group:FID '\);/,
    `
    const getMediaBlock = (lines, type) => {
        let block = [];
        let inBlock = false;
        for (const line of lines) {
            if (line.startsWith('m=')) {
                inBlock = line.startsWith('m=' + type);
            }
            if (inBlock) block.push(line);
        }
        return block;
    };
    const audioBlock = getMediaBlock(lines, 'audio');
    const videoBlock = getMediaBlock(lines, 'video');

    const audioSsrc = audioBlock.find(l => l.startsWith('a=ssrc:'))?.substr(7);
    const videoSsrc = videoBlock.find(l => l.startsWith('a=ssrc:'))?.substr(7);
    const audioSsrcGroup = audioBlock.find(l => l.startsWith('a=ssrc-group:FID '))?.substr(17);
    const videoSsrcGroup = videoBlock.find(l => l.startsWith('a=ssrc-group:FID '))?.substr(17);

    const rawSource = audioSsrc;
    const rawSourceGroup = audioSsrcGroup;
    const videoSource = videoSsrc;
    const videoSourceGroup = videoSsrcGroup;
`
);

utils = utils.replace(
    /sourceGroup: rawSourceGroup[\s\S]*?\? rawSourceGroup\.split\(' '\)\.map\(Number\)[\s\S]*?: null,/,
    `sourceGroup: rawSourceGroup ? rawSourceGroup.split(' ').map(Number) : null,
        videoSource: videoSource ? Number(videoSource.split(' ')[0]) : null,
        videoSourceGroup: videoSourceGroup ? videoSourceGroup.split(' ').map(Number) : null,`
);

fs.writeFileSync('node_modules/tgcalls/lib/utils.js', utils);
console.log("Patched tgcalls utils.js");
