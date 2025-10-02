// apps/web/src/pages/Login.tsx
import { useState } from 'react';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import TelegramIcon from '@mui/icons-material/Telegram';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

type AuthMode = 'login' | 'signup';

export function Login() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mock auth - just redirect to calendar
    alert(`Auth not implemented yet! This is a mock UI for v0.3.5.\n\nYou entered:\nEmail: ${email}\nMode: ${mode}`);
    
    // In real implementation, this would call auth API
    // For now, just redirect to calendar
    window.location.hash = '#/calendar';
  };

  const handleTelegramAuth = () => {
    alert('Telegram auth not implemented yet! This will use Telegram-issued tokens in v0.3.3+');
  };

  return (
    <div className="h-screen flex items-center justify-center bg-black text-zinc-100 font-mono px-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <a
          href="#/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowBackIcon fontSize="small" />
          Back to Home
        </a>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              {mode === 'login' ? (
                <LoginIcon fontSize="large" className="text-white" />
              ) : (
                <PersonAddIcon fontSize="large" className="text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-sm text-zinc-400">
              {mode === 'login' 
                ? 'Sign in to continue to NeuroBoost' 
                : 'Join NeuroBoost and start organizing'
              }
            </p>
          </div>

          {/* Mock Notice */}
          <div className="mb-6 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded text-sm text-yellow-200">
            ⚠️ Authentication not implemented in v0.3.5. This is a mock UI only.
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-sm text-zinc-300 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-blue-400 hover:text-blue-300"
                  onClick={() => alert('Password reset not implemented yet!')}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-all flex items-center justify-center gap-2"
            >
              {mode === 'login' ? (
                <>
                  <LoginIcon fontSize="small" />
                  Sign In
                </>
              ) : (
                <>
                  <PersonAddIcon fontSize="small" />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-zinc-900 text-zinc-500">or</span>
            </div>
          </div>

          {/* Telegram Auth */}
          <button
            type="button"
            onClick={handleTelegramAuth}
            className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white rounded font-medium transition-all flex items-center justify-center gap-2"
          >
            <TelegramIcon fontSize="small" />
            Continue with Telegram
          </button>

          {/* Mode Toggle */}
          <div className="mt-6 text-center text-sm">
            <span className="text-zinc-400">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </span>
            {' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-zinc-500 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}