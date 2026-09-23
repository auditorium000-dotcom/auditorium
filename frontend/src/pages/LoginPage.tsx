import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
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
    <div className="min-h-screen w-full bg-[#090d16] text-slate-100 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* ATMOSPHERIC BACKGROUND LIGHTING & GLOW ORBS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Deep ambient background gradient */}
        <div className="absolute inset-0 bg-radial-[circle_at_50%_0%] from-indigo-950/70 via-[#0a0e1a]/90 to-[#07090e]" />

        {/* Top-Center Royal Indigo Luminous Glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-600/20 rounded-full blur-[140px] animate-pulse" />

        {/* Left Warm Amber/Gold Ambient Glow (Echoing Oruma Avenue's signature gold) */}
        <div className="absolute top-1/3 -left-20 w-[420px] h-[420px] bg-amber-500/12 rounded-full blur-[130px]" />

        {/* Right Violet Glow */}
        <div className="absolute bottom-10 -right-20 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px]" />

        {/* Subtle Luxury Geometric Grid Overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="w-full max-w-[440px] relative z-10 my-8">
        {/* BRAND / LOGO HEADER */}
        <div className="text-center mb-7 sm:mb-8 space-y-3">
          {/* Logo container with subtle ambient halo */}
          <div className="relative inline-flex items-center justify-center p-2 group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-amber-500/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
            <img
              src="/oruma-avenue-logo.png"
              alt="Oruma Avenue Auditorium"
              className="relative h-16 sm:h-20 w-auto object-contain max-w-[290px] sm:max-w-[340px] drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-transform duration-300 hover:scale-[1.02]"
            />
          </div>

          {/* Luxury Badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-md shadow-inner text-[11px] font-semibold text-amber-300 tracking-wider uppercase">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Booking & Management Portal</span>
            </div>
          </div>
        </div>

        {/* GLASSMORPHY CARD */}
        <div className="relative rounded-3xl bg-white/[0.06] sm:bg-white/[0.05] border border-white/15 backdrop-blur-2xl p-6 sm:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(99,102,241,0.12)] ring-1 ring-white/10 overflow-hidden">
          {/* Top Glass Specular Highlight Sheen */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          {/* Corner Ambient Accent Light */}
          <div className="absolute -top-14 -right-14 w-28 h-28 bg-indigo-500/25 rounded-full blur-2xl pointer-events-none" />

          {/* Card Title */}
          <div className="mb-6 text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center justify-center sm:justify-start gap-2">
              <span>Sign In</span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 font-normal">
              Enter your credentials to access the management portal
            </p>
          </div>

          {/* Error Alert Box */}
          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 backdrop-blur-md flex items-start gap-3 text-rose-200 text-xs sm:text-sm animate-in fade-in zoom-in-95 duration-200 shadow-lg shadow-rose-950/40">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email-input"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 pl-0.5"
              >
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-400 transition-colors">
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
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.12] border border-white/15 focus:border-indigo-400/80 rounded-2xl text-white placeholder-slate-400/70 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 shadow-inner"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password-input"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 pl-0.5"
              >
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-400 transition-colors">
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
                  className="w-full pl-10 pr-11 py-3 bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.12] border border-white/15 focus:border-indigo-400/80 rounded-2xl text-white placeholder-slate-400/70 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 shadow-inner tracking-wider"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Glassmorphic Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3.5 px-5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 active:from-indigo-700 active:to-indigo-800 text-white font-bold rounded-2xl text-sm transition-all duration-200 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/50 active:scale-[0.98] flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-indigo-400/30 group relative overflow-hidden"
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
          <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center gap-1.5 text-slate-400 text-[11px] text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Restricted portal. Authorized auditorium personnel only.</span>
          </div>
        </div>

        {/* Global Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            © {new Date().getFullYear()} Oruma Avenue Auditorium. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
