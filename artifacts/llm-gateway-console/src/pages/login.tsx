import { useState, type FormEvent } from 'react';
import { useLocation } from 'wouter';
import { LockKeyhole, Terminal } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { refresh } = useAuth();
  const [, navigate] = useLocation();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ key: key.trim() }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && body.ok) {
        await refresh();
        navigate('/dashboard');
      } else {
        setError(body.error ?? 'Login failed. Check your operator key and try again.');
      }
    } catch {
      setError('Network error — is the API server running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-9 h-9 rounded-md bg-amber-500 flex items-center justify-center">
          <Terminal className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-white font-semibold text-lg tracking-tight">Command Post</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-[#111827] border border-white/10 rounded-xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <LockKeyhole className="w-5 h-5 text-cyan-400" />
          </div>
          <h1 className="text-white text-xl font-semibold">Operator login</h1>
          <p className="text-white/50 text-sm mt-1 text-center">
            Enter your operator key to access the control plane.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="operator-key"
              className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider"
            >
              Operator key
            </label>
            <input
              id="operator-key"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-••••••••••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-[#0a0f1a] font-semibold text-sm rounded-lg py-2.5 transition-colors"
          >
            {loading ? 'Verifying…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="text-white/25 text-xs mt-8 text-center max-w-xs">
        Set <code className="text-white/40">COMMAND_POST_OPERATOR_API_KEY</code> and{' '}
        <code className="text-white/40">SESSION_SECRET</code> on the API server to enable login.
      </p>
    </div>
  );
}
