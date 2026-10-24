import React, { useState } from 'react';
import { UtensilsCrossed, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { KitchenCruzeLogo } from '../components/KitchenCruzeLogo';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

interface ChefLoginViewProps {
  onNavigate: (path: string) => void;
}

export const ChefLoginView: React.FC<ChefLoginViewProps> = ({ onNavigate }) => {
  const { loginStaff } = useAuth();
  const { settings } = useSettings();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await loginStaff(username, password, 'chef');
      if (result.success) {
        onNavigate('/chef');
      } else {
        setError(result.error || 'Invalid chef kitchen username or password');
      }
    } catch {
      setError('Unable to authenticate kitchen display portal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <KitchenCruzeLogo variant="light" size="lg" customLogoUrl={settings.logo} className="justify-center mb-6" />
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-semibold uppercase tracking-wider mb-2 border border-orange-500/30">
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>Kitchen Display System</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Chef &amp; Kitchen Login
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Live ticket preparation, KDS timers, and food dispatch order controls.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-800/90 border border-slate-700/80 py-8 px-6 sm:px-10 rounded-2xl shadow-2xl backdrop-blur-sm">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-3 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Chef Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition"
                  placeholder="Cafekitchencruze12"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Kitchen Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition"
                  placeholder="Enter kitchen password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-xl transition shadow-lg shadow-orange-600/20 flex items-center justify-center space-x-2 text-sm"
            >
              <span>{loading ? 'Authenticating...' : 'Open Kitchen Display System'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => onNavigate('/')}
            className="text-xs text-slate-400 hover:text-slate-200 transition"
          >
            ← Return to Customer Website
          </button>
        </div>
      </div>
    </div>
  );
};
