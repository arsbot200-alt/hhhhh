import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    'throw new Error(`Failed to find group or channel for link: ${groupLink}`);',
    `
                 if (err.message && err.message.includes("AUTH_KEY_UNREGISTERED")) {
                     throw new Error("Your Telegram session has expired. Please log out and log in again.");
                 }
                 throw new Error(\`Failed to find group or channel for link: \${groupLink}\`);
    `.trim()
);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts for auth error");
