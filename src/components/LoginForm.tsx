import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface LoginFormProps {
  key?: string;
  onSuccess: (session: string, apiId: string, apiHash: string) => void;
  savedApiId?: string;
  savedApiHash?: string;
}

export function LoginForm({ onSuccess, savedApiId, savedApiHash }: LoginFormProps) {
  const [step, setStep] = useState<'creds' | 'code' | 'password'>('creds');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [apiId, setApiId] = useState(savedApiId || '');
  const [apiHash, setApiHash] = useState(savedApiHash || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [password, setPassword] = useState('');
  const [sessionId, setSessionId] = useState('');

  const handleError = (err: any) => {
    let msg = err.message || 'An unknown error occurred';
    if (msg.includes('PHONE_PASSWORD_FLOOD')) {
      msg = 'Too many attempts. You have been rate-limited by Telegram. Please try again later.';
    } else if (msg.includes('FLOOD')) {
      msg = 'Rate limited by Telegram. Please wait before trying again.';
    } else if (msg.includes('PASSWORD_HASH_INVALID')) {
      msg = 'Incorrect 2FA password.';
    } else if (msg.includes('PHONE_NUMBER_INVALID')) {
      msg = 'Invalid phone number format.';
    }
    setError(msg);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tg/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiId, apiHash, phoneNumber })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSessionId(data.sessionId);
      setStep('code');
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tg/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, phoneNumber, phoneCode })
      });
      const data = await res.json();
      
      if (res.status === 401 && data.requiresPassword) {
        setStep('password');
      } else if (!res.ok) {
        throw new Error(data.error);
      } else {
        onSuccess(data.sessionString, apiId, apiHash);
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tg/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onSuccess(data.sessionString, apiId, apiHash);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-white">Connect Telegram</h2>
        <p className="text-sm text-slate-400">Log in to enable video streaming and auto-reply features.</p>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/5 shadow-xl">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {step === 'creds' && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 ml-1">API ID</label>
              <input 
                type="text" 
                value={apiId}
                onChange={e => setApiId(e.target.value)}
                placeholder="e.g. 1234567"
                required
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 ml-1">API Hash</label>
              <input 
                type="password" 
                value={apiHash}
                onChange={e => setApiHash(e.target.value)}
                placeholder="Your Telegram API Hash"
                required
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 ml-1">Phone Number</label>
              <input 
                type="tel" 
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                required
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all active:scale-[0.98]"
            >
              {loading ? 'Sending Code...' : 'Send Login Code'}
            </button>
            <p className="text-xs text-center text-slate-500 pt-2">
              Get your API ID and Hash from my.telegram.org
            </p>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 ml-1">Login Code</label>
              <input 
                type="text" 
                value={phoneCode}
                onChange={e => setPhoneCode(e.target.value)}
                placeholder="12345"
                required
                autoFocus
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-center tracking-widest text-lg"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all active:scale-[0.98]"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 ml-1">2FA Password</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your 2FA password"
                required
                autoFocus
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all active:scale-[0.98]"
            >
              {loading ? 'Verifying...' : 'Verify Password'}
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
}
