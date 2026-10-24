import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Key, AlertCircle } from 'lucide-react';
import { KitchenCruzeLogo } from '../../components/KitchenCruzeLogo';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

interface AdminLoginViewProps {
  onNavigate: (path: string) => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({ onNavigate }) => {
  const { loginStaff } = useAuth();
  const { settings } = useSettings();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Please provide administrative username and password');
      return;
    }

    setLoading(true);
    const result = await loginStaff(username.trim(), password, 'admin');
    setLoading(false);

    if (result.success) {
      onNavigate('/admin');
    } else {
      setError(result.error || 'Invalid administrator credentials');
    }
  };

  return (
    <div
      id="admin-login-page"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <KitchenCruzeLogo
          variant="light"
          size="xl"
          customLogoUrl={settings.logo}
          onClick={() => onNavigate('/')}
          className="mx-auto"
        />

        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Restricted Admin Portal</span>
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight">
          Restaurant Management Login
        </h1>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Authorization required to manage Kitchen Cruze menu, live orders, payments, reports, and restaurant settings.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-800 space-y-6">
          {error && (
            <div
              id="admin-login-error"
              className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-medium flex items-center space-x-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Admin Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="admin-username"
                  type="text"
                  required
                  placeholder="Kitchencruze12"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Admin Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password"
                  type="password"
                  required
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
                />
              </div>
            </div>

            <button
              id="admin-login-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 px-4 bg-amber-500 hover:bg-amber-600 active:scale-99 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Authenticate &amp; Enter</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={() => onNavigate('/')}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              &larr; Return to Customer Storefront
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
