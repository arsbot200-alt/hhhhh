import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

// Replace the runningBots map to also store processes
code = code.replace(
    'const runningBots = new Map<string, { client: TelegramClient, tgCall?: GramTGCalls }>();',
    'const runningBots = new Map<string, { client: TelegramClient, tgCall?: GramTGCalls, audioProcess?: any, videoProcess?: any }>();'
);

// When starting, store processes
code = code.replace(
    'runningBots.set(botId, { client, tgCall });',
    'runningBots.set(botId, { client, tgCall, audioProcess, videoProcess });'
);

// When stopping, kill processes
code = code.replace(
    `        if (bot.tgCall) {
            await bot.tgCall.stop();
        }`,
    `        if (bot.tgCall) {
            await bot.tgCall.stop();
        }
        if (bot.audioProcess) {
            bot.audioProcess.kill('SIGKILL');
        }
        if (bot.videoProcess) {
            bot.videoProcess.kill('SIGKILL');
        }`
);

fs.writeFileSync('server.ts', code);
console.log("Patched kill logic");
