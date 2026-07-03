import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { AppState } from './types';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    sessionString: localStorage.getItem('tg_session') || null,
    apiId: localStorage.getItem('tg_api_id') || '',
    apiHash: localStorage.getItem('tg_api_hash') || '',
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('app_authenticated') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'tasbeel') {
      localStorage.setItem('app_authenticated', 'true');
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
  };

  useEffect(() => {
    // Initialize Telegram Web App
    if (WebApp.initData) {
      WebApp.ready();
      WebApp.expand();
      if (WebApp.colorScheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    }

    // Keep-alive to ensure network proxy/router stays active
    const interval = setInterval(() => {
      fetch('/ping').catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLoginSuccess = (sessionString: string, apiId: string, apiHash: string) => {
    localStorage.setItem('tg_session', sessionString);
    localStorage.setItem('tg_api_id', apiId);
    localStorage.setItem('tg_api_hash', apiHash);
    setAppState({ sessionString, apiId, apiHash });
  };

  const handleLogout = () => {
    localStorage.removeItem('tg_session');
    setAppState({ ...appState, sessionString: null });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-6 tracking-tight">Enter Password</h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Password"
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-white text-slate-900 font-semibold py-3 rounded-xl hover:bg-slate-100 transition-colors shadow-lg shadow-white/10"
            >
              Unlock
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-blue-500/30">
      <header className="px-6 py-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.18-.08-.05-.19-.02-.27 0-.11.03-1.84 1.18-5.22 3.47-.49.33-.94.5-1.34.49-.45-.01-1.3-.25-1.94-.46-.78-.26-1.4-.4-1.35-.85.03-.23.33-.47.92-.72 3.6-1.56 5.99-2.59 7.18-3.09 3.42-1.42 4.13-1.67 4.59-1.68.1 0 .32.02.44.11.1.07.13.16.14.25.01.07 0 .15-.01.24z"/>
            </svg>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">StreamBot Control</h1>
        </div>
        {appState.sessionString && (
          <button 
            onClick={handleLogout}
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Logout
          </button>
        )}
      </header>

      <main className="flex-1 p-6 flex flex-col max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          {!appState.sessionString ? (
            <LoginForm 
              key="login" 
              onSuccess={handleLoginSuccess} 
              savedApiId={appState.apiId}
              savedApiHash={appState.apiHash}
            />
          ) : (
            <Dashboard 
              key="dashboard" 
              appState={appState} 
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
