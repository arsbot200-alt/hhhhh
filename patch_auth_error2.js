import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const regex = /if \(!chatEntity\) \{\s*if \(err\.message && err\.message\.includes\("AUTH_KEY_UNREGISTERED"\)\) \{\s*throw new Error\("Your Telegram session has expired\. Please log out and log in again\."\);\s*\}\s*throw new Error\(\`Failed to find group or channel for link: \$\{groupLink\}\`\);\s*\}/g;

code = code.replace(regex, `
             if (!chatEntity) {
                 throw new Error(\`Failed to find group or channel for link: \${groupLink}\`);
             }
`);

// now we want to add the err check in the catch blocks
code = code.replace(/console\.error\("Entity resolution failed:", err\.message\);/g, `
                     console.error("Entity resolution failed:", err.message);
                     if (err.message && err.message.includes("AUTH_KEY_UNREGISTERED")) {
                         throw new Error("Your Telegram session has expired. Please log out and log in again.");
                     }
`);

code = code.replace(/console\.error\("Fallback entity resolution failed:", err\.message\);/g, `
                         console.error("Fallback entity resolution failed:", err.message);
                         if (err.message && err.message.includes("AUTH_KEY_UNREGISTERED")) {
                             throw new Error("Your Telegram session has expired. Please log out and log in again.");
                         }
`);

code = code.replace(/console\.error\("Failed to resolve numeric chat ID:", err\.message\);/g, `
                     console.error("Failed to resolve numeric chat ID:", err.message);
                     if (err.message && err.message.includes("AUTH_KEY_UNREGISTERED")) {
                         throw new Error("Your Telegram session has expired. Please log out and log in again.");
                     }
`);

code = code.replace(/console\.error\("Failed to resolve private message link chat ID:", err\.message\);/g, `
                         console.error("Failed to resolve private message link chat ID:", err.message);
                         if (err.message && err.message.includes("AUTH_KEY_UNREGISTERED")) {
                             throw new Error("Your Telegram session has expired. Please log out and log in again.");
                         }
`);


fs.writeFileSync('server.ts', code);
console.log("Patched server.ts for auth error cleanly");
