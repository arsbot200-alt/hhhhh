import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const replacement = `
             let chatEntity: any = null;
             
             // Check if it's a numeric ID (e.g. -100123456789)
             if (/^\\-?\\d+$/.test(groupLink)) {
                 try {
                     chatEntity = await client.getEntity(BigInt(groupLink));
                 } catch(err: any) {
                     console.error("Failed to resolve numeric chat ID:", err.message);
                 }
             }
             // Check for private message links like https://t.me/c/1234567890/1
             else if (groupLink.includes('/c/')) {
                 const match = groupLink.match(/\\/c\\/(\\d+)/);
                 if (match && match[1]) {
                     const chatId = "-100" + match[1];
                     try {
                         chatEntity = await client.getEntity(BigInt(chatId));
                     } catch(err: any) {
                         console.error("Failed to resolve private message link chat ID:", err.message);
                     }
                 }
             }
             else if (groupLink.includes('joinchat/') || groupLink.includes('+')) {
                 const urlParts = groupLink.split('/').filter(Boolean);
                 const inviteHash = urlParts.pop()?.replace('+', '') || '';
                 try {
                     const inviteResult: any = await client.invoke(new Api.messages.CheckChatInvite({ hash: inviteHash }));
                     if (inviteResult.className === 'ChatInviteAlready') {
                         chatEntity = inviteResult.chat;
                     } else {
                         const joined: any = await client.invoke(new Api.messages.ImportChatInvite({ hash: inviteHash }));
                         chatEntity = joined.chats[0];
                     }
                 } catch(e: any) {
                     console.error("Invite resolution error, attempting fallback:", e.message);
                     try {
                         chatEntity = await client.getEntity(groupLink);
                     } catch(err: any) {
                         console.error("Fallback entity resolution failed:", err.message);
                     }
                 }
             } else {
                 let username = groupLink.split('/').filter(Boolean).pop() || groupLink;
                 if (username.startsWith('@')) username = username.slice(1);
                 
                 try {
                     const resolved: any = await client.invoke(new Api.contacts.ResolveUsername({ username }));
                     if (resolved && resolved.chats && resolved.chats.length > 0) {
                         chatEntity = resolved.chats[0];
                     } else if (resolved && resolved.users && resolved.users.length > 0) {
                         chatEntity = resolved.users[0];
                     } else {
                         chatEntity = await client.getEntity(username);
                     }
                 } catch(err: any) {
                     console.error("Entity resolution failed:", err.message);
                 }
             }
             
             if (!chatEntity) {
                 throw new Error(\`Failed to find group or channel for link: \${groupLink}\`);
             }
`;

// we need to replace the block
const startPattern = "let chatEntity: any = null;";
const endPattern = "if (chatEntity) {";

const startIndex = code.indexOf(startPattern);
const endIndex = code.indexOf(endPattern, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    code = code.substring(0, startIndex) + replacement.trim() + "\n\n             if (chatEntity) {" + code.substring(endIndex + endPattern.length);
    fs.writeFileSync('server.ts', code);
    console.log("Patched server.ts");
} else {
    console.log("Could not find patterns");
}
