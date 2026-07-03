import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AppState, BotConfig } from '../types';
import { Play, Square, Settings2, Video, MessageSquare, KeyRound, AlertCircle } from 'lucide-react';

interface DashboardProps {
  key?: string;
  appState: AppState;
}

export function Dashboard({ appState }: DashboardProps) {
  const [config, setConfig] = useState<BotConfig>({
    groupLink: localStorage.getItem('bot_groupLink') || '',
    streamVideo: localStorage.getItem('bot_streamVideo') === 'true',
    enableAutoReply: localStorage.getItem('bot_enableAutoReply') === 'true',
    autoReplyText: localStorage.getItem('bot_autoReplyText') || 'Hello! I am currently away.',
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'failed' | 'success'>('idle');
  const [uploadedChunks, setUploadedChunks] = useState(0);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [botId, setBotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-save config
  useEffect(() => {
    localStorage.setItem('bot_groupLink', config.groupLink);
    localStorage.setItem('bot_streamVideo', String(config.streamVideo));
    localStorage.setItem('bot_enableAutoReply', String(config.enableAutoReply));
    localStorage.setItem('bot_autoReplyText', config.autoReplyText);
  }, [config]);

  const updateConfig = (key: keyof BotConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const uploadVideoChunks = async (file: File, startChunkIndex: number = 0) => {
    setUploadStatus('uploading');
    setError('');
    
    const CHUNK_SIZE = 1024 * 512; // 512KB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const fileId = `${file.name}-${file.size}`.replace(/[^a-zA-Z0-9.-]/g, '_');
    let chunkIndex = startChunkIndex;

    try {
      while (chunkIndex < totalChunks) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        let retries = 3;
        let success = false;
        let isComplete = false;
        let finalFilePath = '';
        
        while (retries > 0 && !success) {
          try {
            const formData = new FormData();
            formData.append('chunk', chunk);
            formData.append('fileId', fileId);
            formData.append('chunkIndex', String(chunkIndex));
            formData.append('totalChunks', String(totalChunks));

            const res = await fetch('/api/upload/chunk', {
              method: 'POST',
              body: formData
            });

            if (!res.ok) {
               const data = await res.json().catch(() => ({}));
               throw new Error(data.error || 'Chunk upload failed');
            }

            const data = await res.json();
            isComplete = data.isComplete;
            finalFilePath = data.filePath;
            success = true;
          } catch (err) {
            retries--;
            if (retries === 0) throw err;
            await new Promise(r => setTimeout(r, 2000));
          }
        }
        
        chunkIndex++;
        setUploadedChunks(chunkIndex);
        setUploadProgress(Math.round((chunkIndex / totalChunks) * 100));

        if (isComplete && finalFilePath) {
           setUploadStatus('success');
           setUploadedFilePath(finalFilePath);
           return finalFilePath;
        }
      }
    } catch (err: any) {
      setUploadStatus('failed');
      throw err;
    }
    return '';
  };

  const startBotService = async (videoPath?: string) => {
      const formData = new FormData();
      formData.append('sessionString', appState.sessionString || '');
      formData.append('apiId', appState.apiId);
      formData.append('apiHash', appState.apiHash);
      formData.append('groupLink', config.groupLink);
      formData.append('streamVideo', String(config.streamVideo));
      formData.append('enableAutoReply', String(config.enableAutoReply));
      formData.append('autoReplyText', config.autoReplyText);
      if (videoPath) {
          formData.append('videoPath', videoPath);
      }

      const res = await fetch('/api/bot/start', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setBotId(data.botId);
      setIsRunning(true);
  };

  const toggleBot = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (isRunning && botId) {
        // Stop Bot
        const res = await fetch('/api/bot/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botId })
        });
        if (!res.ok) {
           const data = await res.json();
           throw new Error(data.error);
        }
        setIsRunning(false);
        setBotId(null);
      } else {
        // Start Bot
        if (config.streamVideo && videoFile) {
            if (uploadStatus === 'success' && uploadedFilePath) {
                await startBotService(uploadedFilePath);
            } else {
                const vPath = await uploadVideoChunks(videoFile, uploadStatus === 'failed' ? uploadedChunks : 0);
                if (vPath) {
                    await startBotService(vPath);
                }
            }
        } else {
            await startBotService();
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6 h-full"
    >
      {/* Status Card */}
      <div className="bg-slate-800/80 backdrop-blur-sm rounded-3xl p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="relative flex h-5 w-5">
            {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-5 w-5 ${isRunning ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{isRunning ? 'Bot is Active' : 'Bot is Offline'}</h3>
            <p className="text-sm text-slate-400 mt-0.5">{isRunning ? 'Listening for messages & streaming' : 'Configure and start the bot service'}</p>
          </div>
        </div>
        
        <button
          onClick={toggleBot}
          disabled={loading || uploadStatus === 'uploading'}
          className={`flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-medium transition-all active:scale-95 disabled:opacity-50 ${
            isRunning 
            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' 
            : 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white hover:opacity-90 shadow-lg shadow-emerald-500/20 border border-white/10'
          }`}
        >
          {loading ? (
             <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isRunning ? (
             <><Square className="w-4 h-4 fill-current" /> Stop Service</>
          ) : (
             <><Play className="w-4 h-4 fill-current" /> Start Service</>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
           <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
           <span>{error}</span>
        </div>
      )}

      {/* Config Sections */}
      <div className="flex-1 space-y-6 overflow-y-auto pb-8 pr-2 custom-scrollbar">

        {/* Auto Reply Settings */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-300 pb-2 border-b border-white/5">
            <MessageSquare className="w-4 h-4" />
            <h3 className="text-sm font-medium">Auto-Responder (First DM)</h3>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`relative w-10 h-6 transition-colors rounded-full ${config.enableAutoReply ? 'bg-blue-500' : 'bg-slate-700'}`}>
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${config.enableAutoReply ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <input 
                type="checkbox" 
                className="hidden"
                checked={config.enableAutoReply}
                disabled={isRunning}
                onChange={e => updateConfig('enableAutoReply', e.target.checked)}
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Enable Auto-Reply</span>
            </label>

            {config.enableAutoReply && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-2"
              >
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400 ml-1">Auto-Reply Text</label>
                  <textarea 
                    value={config.autoReplyText}
                    onChange={e => updateConfig('autoReplyText', e.target.value)}
                    placeholder="Hello! I am currently unavailable..."
                    disabled={isRunning}
                    rows={3}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none disabled:opacity-50"
                  />
                  <p className="text-[10px] text-slate-500 ml-1">This message will be sent only once to new private conversations.</p>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* Video Streaming Settings */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-300 pb-2 border-b border-white/5">
            <Video className="w-4 h-4" />
            <h3 className="text-sm font-medium">Voice Chat Video Stream</h3>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`relative w-10 h-6 transition-colors rounded-full ${config.streamVideo ? 'bg-blue-500' : 'bg-slate-700'}`}>
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${config.streamVideo ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <input 
                type="checkbox" 
                className="hidden"
                checked={config.streamVideo}
                disabled={isRunning}
                onChange={e => updateConfig('streamVideo', e.target.checked)}
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Enable Video Streaming</span>
            </label>

            {config.streamVideo && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-2"
              >
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400 ml-1">Target Group Link</label>
                  <input 
                    type="text" 
                    value={config.groupLink}
                    onChange={e => updateConfig('groupLink', e.target.value)}
                    placeholder="https://t.me/+AbCdEfGhIjK"
                    disabled={isRunning}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400 ml-1">Video File (mp4)</label>
                  <input 
                    type="file"
                    accept="video/mp4" 
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        setVideoFile(e.target.files[0]);
                        setUploadStatus('idle');
                        setUploadProgress(0);
                        setUploadedChunks(0);
                      } else {
                        setVideoFile(null);
                      }
                    }}
                    disabled={isRunning || uploadStatus === 'uploading'}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 disabled:opacity-50"
                  />

                  {uploadStatus !== 'idle' && (
                    <div className="mt-4 p-5 bg-slate-900/50 border border-white/5 rounded-2xl shadow-inner">
                        <div className="flex items-center justify-between text-sm font-medium text-slate-300 mb-3">
                            <span className="flex items-center gap-2">
                              {uploadStatus === 'uploading' && <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
                              Upload Progress
                            </span>
                            <span className={uploadStatus === 'failed' ? 'text-red-400' : 'text-blue-400'}>{uploadProgress}%</span>
                        </div>
                        <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden shadow-inner">
                            <motion.div 
                                className={`h-full ${uploadStatus === 'failed' ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-blue-400'}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                        {uploadStatus === 'failed' && (
                            <div className="mt-4 flex flex-col items-start gap-2">
                              <span className="text-xs text-red-400">Network error during upload.</span>
                              <button 
                                  onClick={async () => {
                                      if (videoFile) {
                                          try {
                                              const p = await uploadVideoChunks(videoFile, uploadedChunks);
                                              if (p) await startBotService(p);
                                          } catch (err: any) {
                                              setError(err.message);
                                          }
                                      }
                                  }}
                                  className="text-sm bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl text-red-400 font-medium hover:bg-red-500/20 transition-colors"
                              >
                                  Resume Upload
                              </button>
                            </div>
                        )}
                        {uploadStatus === 'uploading' && (
                            <div className="text-xs text-slate-400 mt-3 text-center">Transferring video chunks... Please wait.</div>
                        )}
                        {uploadStatus === 'success' && (
                            <div className="text-xs text-emerald-400 mt-3 text-center font-medium">Upload completed successfully!</div>
                        )}
                    </div>
                  )}

                  <div className="p-4 mt-6 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                     <p className="text-xs text-slate-400 leading-relaxed mb-2">
                       <strong className="text-blue-400">Note on Video Streaming:</strong> The bot will join the VC and use FFmpeg to continuously loop and stream the uploaded video and audio to the chat.
                     </p>
                     <p className="text-xs text-slate-400 leading-relaxed">
                       <strong className="text-emerald-400">File Size:</strong> There is no strict upload limit, but we recommend keeping files under <strong>100MB</strong> for optimal performance and upload reliability.
                     </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </section>

      </div>
    </motion.div>
  );
}
