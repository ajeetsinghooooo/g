import React, { useState } from 'react';
import { User, AtSign, Phone, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { KitchenCruzeLogo } from '../components/KitchenCruzeLogo';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

interface CustomerSignupViewProps {
  onNavigate: (path: string) => void;
}

export const CustomerSignupView: React.FC<CustomerSignupViewProps> = ({ onNavigate }) => {
  const { registerCustomer } = useAuth();
  const { settings } = useSettings();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !username.trim() || !phone.trim() || !email.trim() || !password) {
      setError('Please fill in all required registration fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await registerCustomer({
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      password,
      confirmPassword,
    });
    setLoading(false);

    if (result.success) {
      onNavigate('/');
    } else {
      setError(result.error || 'Failed to create customer account');
    }
  };

  return (
    <div
      id="customer-signup-page"
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
          Create Customer Account
        </h1>
        <p className="text-sm text-slate-600 max-w-sm mx-auto">
          Join {settings.name || 'Kitchen Cruze'} for live order tracking and express culinary delivery.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80">
          {error && (
            <div
              id="customer-signup-error"
              className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center space-x-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Full Name */}
            <div>
              <label
                htmlFor="signup-fullname"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="signup-fullname"
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label
                htmlFor="signup-username"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <AtSign className="w-4 h-4" />
                </div>
                <input
                  id="signup-username"
                  type="text"
                  required
                  placeholder="e.g. rahul_foodie"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="signup-email"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="signup-email"
                  type="email"
                  required
                  placeholder="e.g. rahul@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label
                htmlFor="signup-phone"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="signup-phone"
                  type="tel"
                  required
                  placeholder="Enter 10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="signup-password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                />
                <button
                  type="button"
                  id="signup-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="signup-confirm-password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="signup-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="signup-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 px-4 bg-amber-500 hover:bg-amber-600 active:scale-99 text-white font-bold text-sm rounded-xl shadow-md shadow-amber-500/20 transition flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Register Customer Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="mt-6 text-center text-xs text-slate-600">
            <span>Already have an account? </span>
            <button
              id="signup-switch-to-login"
              type="button"
              onClick={() => onNavigate('/login')}
              className="font-bold text-amber-600 hover:underline"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
