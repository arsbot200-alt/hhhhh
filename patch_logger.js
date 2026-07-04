import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    'const botId = crypto.randomUUID();',
    `client.setLogLevel("none");\n        const botId = crypto.randomUUID();`
);

code = code.replace(
    'const client = new TelegramClient(new StringSession(\'\'), Number(apiId), apiHash, {',
    `const client = new TelegramClient(new StringSession(''), Number(apiId), apiHash, {`
);

fs.writeFileSync('server.ts', code);
console.log("Patched logger");
