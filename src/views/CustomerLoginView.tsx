import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, Phone, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { KitchenCruzeLogo } from '../components/KitchenCruzeLogo';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

interface CustomerLoginViewProps {
  onNavigate: (path: string) => void;
}

export const CustomerLoginView: React.FC<CustomerLoginViewProps> = ({ onNavigate }) => {
  const { loginCustomer } = useAuth();
  const { settings } = useSettings();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Please enter your mobile number or email and password');
      return;
    }

    setLoading(true);
    const result = await loginCustomer(identifier.trim(), password);
    setLoading(false);

    if (result.success) {
      onNavigate('/');
    } else {
      setError(result.error || 'Invalid login credentials');
    }
  };

  return (
    <div
      id="customer-login-page"
      className="min-h-screen bg-gradient-to-b from-amber-50/40 via-slate-50 to-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8"
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <KitchenCruzeLogo
          variant="dark"
          size="xl"
          customLogoUrl={settings.logo}
          onClick={() => onNavigate('/')}
          className="justify-center mx-auto"
        />
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Welcome to {settings.name}
        </h1>
        <p className="text-sm text-slate-600 max-w-sm mx-auto">
          Sign in to your customer account to explore the artisanal menu and order delicious food.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80">
          {error && (
            <div
              id="customer-login-error"
              className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center space-x-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mobile / Email Input */}
            <div>
              <label
                htmlFor="customer-login-identifier"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Mobile Number or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="customer-login-identifier"
                  type="text"
                  required
                  placeholder="e.g. your@email.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="customer-login-password"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Password
                </label>
                <button
                  id="customer-forgot-password-link"
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="customer-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                />
                <button
                  type="button"
                  id="customer-toggle-password-visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              id="customer-login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 active:scale-99 text-white font-bold text-sm rounded-xl shadow-md shadow-amber-500/20 transition flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Login to Kitchen Cruze</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold">New to Kitchen Cruze?</span>
            </div>
          </div>

          {/* Create Account CTA */}
          <button
            id="customer-switch-to-signup-btn"
            type="button"
            onClick={() => onNavigate('/signup')}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition text-center"
          >
            Create New Customer Account
          </button>

          {/* Staff Login Link */}
          <div className="mt-6 text-center pt-4 border-t border-slate-100">
            <button
              id="customer-login-to-admin-link"
              onClick={() => onNavigate('/admin/login')}
              className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Restaurant Staff &amp; Admin Login</span>
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">Reset Password</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If you have forgotten your password or need account assistance, please contact restaurant support{settings.phone ? <> at <strong>{settings.phone}</strong></> : ''}.
            </p>
            <button
              onClick={() => setForgotModalOpen(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
