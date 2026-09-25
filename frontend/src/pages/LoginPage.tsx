import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your authorized email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(trimmedEmail, password);
      if (!result.success) {
        setError(result.error || 'Invalid credentials. Please verify your email and password.');
      }
    } catch {
      setError('Unable to sign in. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50/80 text-slate-900 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* ATMOSPHERIC PASTEL LIGHTING & GLOW ORBS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft multi-stop ambient canvas gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 via-slate-50 to-amber-50/30" />

        {/* Top-Center Indigo Luminous Halo */}
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[650px] h-[450px] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none" />

        {/* Left Warm Amber/Gold Ambient Bloom */}
        <div className="absolute top-1/3 -left-20 w-[400px] h-[400px] bg-amber-200/35 rounded-full blur-[120px] pointer-events-none" />

        {/* Bottom Right Soft Violet Bloom */}
        <div className="absolute -bottom-20 -right-20 w-[450px] h-[450px] bg-purple-200/35 rounded-full blur-[130px] pointer-events-none" />

        {/* Subtle Geometric Dot Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#4f46e5 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="w-full max-w-[440px] relative z-10 my-8">
        {/* BRAND / LOGO HEADER */}
        <div className="text-center mb-6 sm:mb-7">
          <div className="relative inline-flex items-center justify-center p-2 group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-indigo-400/10 to-amber-400/10 rounded-2xl blur-lg opacity-60 group-hover:opacity-90 transition-opacity duration-300" />
            <img
              src="/oruma-avenue-logo.png"
              alt="Oruma Avenue Auditorium"
              className="relative h-16 sm:h-20 w-auto object-contain max-w-[280px] sm:max-w-[320px] transition-transform duration-300 hover:scale-[1.02]"
            />
          </div>
        </div>

        {/* FROSTED GLASSMORPHY CARD */}
        <div className="relative rounded-3xl bg-white/70 sm:bg-white/75 border border-white/80 backdrop-blur-2xl p-6 sm:p-9 shadow-[0_20px_50px_rgba(15,23,42,0.07),0_0_25px_rgba(99,102,241,0.05)] ring-1 ring-slate-900/[0.04] overflow-hidden">
          {/* Top Glass Specular Highlight Sheen */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent" />

          {/* Subtle Top-Right Ambient Corner Light */}
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-400/15 rounded-full blur-xl pointer-events-none" />

          {/* Card Title Header */}
          <div className="mb-6 text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Sign In
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-normal">
              Enter your credentials to access the management portal
            </p>
          </div>

          {/* Error Alert Box */}
          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-3 text-rose-700 text-xs sm:text-sm animate-in fade-in zoom-in-95 duration-200 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email-input"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 pl-0.5"
              >
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email-input"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@auditorium.local"
                  className="w-full pl-10 pr-4 py-3 bg-white/60 hover:bg-white/80 focus:bg-white border border-slate-200/80 focus:border-indigo-500/80 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/15 transition-all duration-200 shadow-xs"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password-input"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 pl-0.5"
              >
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-white/60 hover:bg-white/80 focus:bg-white border border-slate-200/80 focus:border-indigo-500/80 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/15 transition-all duration-200 shadow-xs tracking-wider"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3.5 px-5 bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-500 hover:via-indigo-500 hover:to-indigo-600 active:from-indigo-700 active:to-indigo-800 text-white font-bold rounded-2xl text-sm transition-all duration-200 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 active:scale-[0.98] flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-indigo-400/20 group relative overflow-hidden"
            >
              {/* Button Shimmer Sweep Effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-200" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4 text-indigo-200 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Card Footer: Security Note */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-500 text-[11px] text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Restricted portal. Authorized auditorium personnel only.</span>
          </div>
        </div>

        {/* Global Footer Note & Legal Links */}
        <div className="mt-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
            <a
              href="/privacy-policy"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState(null, '', '/privacy-policy');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="hover:text-indigo-600 transition-colors underline-offset-4 hover:underline"
            >
              Privacy Policy
            </a>
            <span className="text-slate-300">•</span>
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState(null, '', '/terms');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="hover:text-indigo-600 transition-colors underline-offset-4 hover:underline"
            >
              Terms of Service
            </a>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            © {new Date().getFullYear()} Oruma Avenue Auditorium. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  );
};
