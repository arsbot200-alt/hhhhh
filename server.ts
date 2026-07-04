import express from 'express';
import { createServer as createViteServer } from 'vite';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage } from 'telegram/events';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';
import util from 'util';
import { GramTGCalls } from 'tgcalls-gramjs';

const execPromise = util.promisify(exec);

// Preload wrtc to prevent timeout on first API request
console.log("Preloading wrtc (this takes ~30s)...");
try {
    const tempClient = new TelegramClient(new StringSession(''), 0, '', {});
    // GramTGCalls instantiates TGCalls, which imports wrtc
    new GramTGCalls(tempClient, 'me');
} catch (e) {
    // ignore
}
console.log("wrtc preloaded.");

const upload = multer({ dest: 'uploads/' });

const app = express();
app.use(express.json());

app.get("/ping", (req, res) => {
  res.send("pong");
});

const PORT = Number(process.env.PORT || 3000);

// Store active pending authentications
const activeClients = new Map<string, { client: TelegramClient, phoneCodeHash: string }>();

// Store running bots
const runningBots = new Map<string, { client: TelegramClient, groupLink: string, tgCall?: GramTGCalls, repliedUsers: Set<string> }>();

app.post('/api/tg/send-code', async (req, res) => {
  try {
    const { phoneNumber, apiId, apiHash } = req.body;
    if (!phoneNumber || !apiId || !apiHash) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    const client = new TelegramClient(new StringSession(''), Number(apiId), apiHash, {
      connectionRetries: 5,
    });
    
    await client.connect();

    const result = await client.invoke(
      new Api.auth.SendCode({
        phoneNumber: phoneNumber,
        apiId: Number(apiId),
        apiHash: apiHash,
        settings: new Api.CodeSettings({
          allowFlashcall: false,
          currentNumber: false,
          allowAppHash: false,
        }),
      })
    );

    const sessionId = crypto.randomUUID();
    // @ts-ignore
    activeClients.set(sessionId, { client, phoneCodeHash: result.phoneCodeHash });

    res.json({ sessionId, isCodeViaApp: (result as any).type instanceof Api.auth.SentCodeTypeApp });
  } catch (error: any) {
    console.error(error);
    if (error.errorMessage && error.errorMessage.includes('FLOOD_WAIT')) {
      const seconds = error.seconds || error.errorMessage.split('_').pop();
      res.status(429).json({ error: `Telegram rate limit exceeded. Please wait ${seconds} seconds before trying again.` });
    } else {
      res.status(500).json({ error: error.errorMessage || error.message || 'An unknown error occurred.' });
    }
  }
});

app.post('/api/tg/verify-code', async (req, res) => {
  try {
    const { sessionId, phoneNumber, phoneCode } = req.body;
    const session = activeClients.get(sessionId);

    if (!session) {
      return res.status(400).json({ error: 'Invalid or expired session' });
    }

    try {
      await session.client.invoke(
        new Api.auth.SignIn({
          phoneNumber,
          phoneCodeHash: session.phoneCodeHash,
          phoneCode,
        })
      );

      const sessionString = session.client.session.save();
      activeClients.delete(sessionId);
      res.json({ sessionString });
    } catch (error: any) {
      if (error.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        res.status(401).json({ requiresPassword: true });
      } else if (error.errorMessage && error.errorMessage.includes('FLOOD_WAIT')) {
        const seconds = error.seconds || error.errorMessage.split('_').pop();
        res.status(429).json({ error: `Telegram rate limit exceeded. Please wait ${seconds} seconds before trying again.` });
      } else {
        res.status(400).json({ error: error.errorMessage || error.message });
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: error.errorMessage || error.message });
  }
});

app.post('/api/tg/verify-password', async (req, res) => {
  try {
    const { sessionId, password } = req.body;
    const session = activeClients.get(sessionId);

    if (!session) {
      return res.status(400).json({ error: 'Invalid or expired session' });
    }

    await session.client.signInWithPassword({
        apiId: session.client.apiId,
        apiHash: session.client.apiHash,
      },
      {
        password: async () => password,
        onError: (err) => {
          throw err;
        },
      }
    );

    const sessionString = session.client.session.save();
    activeClients.delete(sessionId);
    res.json({ sessionString });
  } catch (error: any) {
    res.status(400).json({ error: error.errorMessage || error.message || 'Failed to verify password' });
  }
});

app.post('/api/upload/chunk', upload.single('chunk'), (req, res) => {
  try {
      const { fileId, chunkIndex, totalChunks } = req.body;
      const chunkPath = req.file?.path;
      
      if (!chunkPath) return res.status(400).json({ error: 'No chunk data' });

      // Create uploads directory if it doesn't exist
      if (!fs.existsSync('uploads')) {
          fs.mkdirSync('uploads');
      }

      const finalPath = path.join('uploads', `${fileId}`);
      
      if (Number(chunkIndex) === 0 && fs.existsSync(finalPath)) {
          fs.unlinkSync(finalPath);
      }

      const chunkData = fs.readFileSync(chunkPath);
      fs.appendFileSync(finalPath, chunkData);
      fs.unlinkSync(chunkPath);
      
      const isComplete = Number(chunkIndex) === Number(totalChunks) - 1;
      res.json({ success: true, isComplete, filePath: isComplete ? finalPath : undefined });
  } catch (e: any) {
      res.status(500).json({ error: e.message });
  }
});

app.post('/api/bot/start', upload.single('video'), async (req, res) => {
  try {
    const { sessionString, apiId, apiHash, groupLink, streamVideo, videoPath } = req.body;
    const finalVideoPath = videoPath || req.file?.path;
    
    if (!sessionString || !apiId || !apiHash) {
        return res.status(400).json({ error: 'Missing required configuration' });
    }

    const startPromise = (async () => {
        const client = new TelegramClient(new StringSession(sessionString), Number(apiId), apiHash, {
          connectionRetries: 5,
          requestRetries: 5,
          timeout: 30000
        });
        
        try {
            await client.connect();
        } catch (e: any) {
            console.error("Failed to connect client:", e);
            throw new Error("Failed to connect to Telegram: " + (e.message || "Unknown error"));
        }

        const botId = crypto.randomUUID();
        const repliedUsers = new Set<string>();

        const { enableAutoReply, autoReplyText } = req.body;
        if (enableAutoReply === 'true' && autoReplyText) {
           console.log(`[Bot] Enabling auto-responder. Text length: ${autoReplyText.length}`);
           client.addEventHandler(async (event: any) => {
             const message = event.message;
             if (message.out) return;
             
             let peerId = message.senderId?.toString();
             let isPrivate = message.isPrivate;
             if (message.peerId && message.peerId.className === 'PeerUser') {
                 isPrivate = true;
                 if (!peerId) peerId = message.peerId.userId?.toString();
             }

             if (isPrivate && peerId && !repliedUsers.has(peerId)) {
                 repliedUsers.add(peerId);
                 try {
                     await client.sendMessage(message.peerId, { message: autoReplyText });
                     console.log(`[Bot] Sent auto-reply to ${peerId}`);
                 } catch (err: any) {
                     console.error(`[Bot] Failed to send auto-reply to ${peerId}:`, err.message);
                 }
             }
           }, new NewMessage({ incoming: true }));
        }

        // Start Video Stream
        let tgCall: GramTGCalls | undefined;
        if (streamVideo === 'true' && groupLink && finalVideoPath) {
           console.log(`[Bot] Setting up video stream for group link ${groupLink}`);
           try {
             let chatEntity: any = null;
             
             if (groupLink.includes('joinchat/') || groupLink.includes('+')) {
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
                     throw new Error(`Failed to find group or channel for link: ${groupLink}`);
                 }
             }

             if (chatEntity) {
                 // Get video dimensions using ffprobe
                 let w = 320;
                 let h = 180;
                 let fps = 15;
                 try {
                     const { stdout } = await execPromise(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${finalVideoPath}"`);
                     let [vw, vh] = stdout.trim().split('x').map(Number);
                     
                     const { stdout: rotateOut } = await execPromise(`ffprobe -v error -select_streams v:0 -show_entries stream_tags=rotate -of default=nw=1:nk=1 "${finalVideoPath}"`);
                     const rotate = parseInt(rotateOut.trim());
                     if (rotate === 90 || rotate === -90 || rotate === 270 || rotate === -270) {
                         const temp = vw;
                         vw = vh;
                         vh = temp;
                     }

                     if (vw && vh) {
                         let MAX_DIM = 320;
                         if (vw > vh) {
                             // Landscape
                             if (vw > MAX_DIM) {
                                 w = MAX_DIM;
                                 h = Math.floor(vh * (MAX_DIM / vw));
                             } else {
                                 w = vw;
                                 h = vh;
                             }
                         } else {
                             // Portrait
                             if (vh > MAX_DIM) {
                                 h = MAX_DIM;
                                 w = Math.floor(vw * (MAX_DIM / vh));
                             } else {
                                 w = vw;
                                 h = vh;
                             }
                         }
                         // Ensure dimensions are multiples of 2
                         w = Math.floor(w / 2) * 2;
                         h = Math.floor(h / 2) * 2;
                     }
                 } catch (e: any) {
                     console.error("[ffprobe] failed to get video dimensions, falling back to 320x180", e.message);
                 }

                 console.log(`[Bot] Configuring video stream with resolution ${w}x${h} at ${fps} FPS`);

                 tgCall = new GramTGCalls(client, chatEntity);
                 
                 // Setup FFmpeg for audio
                 const audioProcess = spawn('ffmpeg', [
                    '-re',
                    '-stream_loop', '-1',
                    '-i', finalVideoPath,
                    '-f', 's16le',
                    '-ac', '1',
                    '-ar', '65000',
                    'pipe:1',
                 ]);

                 // Setup FFmpeg for video
                 const videoProcess = spawn('ffmpeg', [
                    '-re',
                    '-stream_loop', '-1',
                    '-i', finalVideoPath,
                    '-threads', '2',
                    '-f', 'rawvideo',
                    '-pix_fmt', 'yuv420p',
                    '-sws_flags', 'fast_bilinear',
                    '-vf', `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`,
                    '-r', `${fps}`,
                    'pipe:1',
                 ]);

                 audioProcess.stderr.on('data', (data) => {
                     // console.log(`[FFmpeg Audio]: ${data.toString()}`);
                 });
                 videoProcess.stderr.on('data', (data) => {
                     const str = data.toString();
                     if (str.toLowerCase().includes('error')) {
                        console.error(`[FFmpeg Video Error]: ${str}`);
                     }
                 });

                 audioProcess.on('exit', (code) => console.log('[FFmpeg Audio] exited with code', code));
                 videoProcess.on('exit', (code) => console.log('[FFmpeg Video] exited with code', code));

                 tgCall.stream(
                     { readable: audioProcess.stdio[1] },
                     { 
                         readable: videoProcess.stdio[1],
                         params: { width: w, height: h, framerate: fps }
                     },
                     {
                         join: {
                             videoStopped: false
                         }
                     }
                 ).then(async () => {
                     console.log("[Bot] Stream finished or started!");
                     try {
                         await tgCall!.editSelf({ videoStopped: false, videoPaused: false });
                         console.log("[Bot] Sent editSelf to ensure video is not stopped");
                     } catch (e: any) {
                         console.error("editSelf error:", e.message);
                     }
                 }).catch((err: any) => {
                     console.error("[Bot] Stream error:", err);
                 });
                 console.log("[Bot] Successfully started looped video stream in VC!");
             }
           } catch (err: any) {
             console.error("Group call error details:", err);
             throw new Error("Failed to start stream: " + err.message);
           }
        }

        runningBots.set(botId, { client, groupLink, tgCall, repliedUsers });
        return { success: true, botId };
    })();

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout: Telegram took too long to connect or resolve the chat. Please try again.")), 60000));
    const result = await Promise.race([startPromise, timeoutPromise]) as any;

    res.json(result);
  } catch (error: any) {
    if (error.errorMessage && error.errorMessage.includes('FLOOD_WAIT')) {
      const seconds = error.seconds || error.errorMessage.split('_').pop();
      res.status(429).json({ error: `Telegram rate limit exceeded. Please wait ${seconds} seconds before trying again.` });
    } else {
      res.status(500).json({ error: error.errorMessage || error.message || 'An unknown error occurred.' });
    }
  }
});

app.post('/api/bot/stop', async (req, res) => {
    const { botId } = req.body;
    const bot = runningBots.get(botId);
    if (bot) {
        if (bot.tgCall) {
            await bot.tgCall.stop();
        }
        await bot.client.disconnect();
        runningBots.delete(botId);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Bot not found' });
    }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
