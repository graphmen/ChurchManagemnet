import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, LogIn, UserPlus, AlertCircle, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ email: '', password: '', fullName: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(form.email, form.password);
      } else {
        if (form.password !== form.confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        if (form.password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        await signUp(form.email, form.password, form.fullName);
        setSuccess('Account created! Please check your email to confirm, then sign in.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#11321c] via-[#1b4d2c] to-[#11321c] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#4CAF50]/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#FFC107]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#2E7D32]/5 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(rgba(76,175,80,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(76,175,80,0.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Branding */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20 shadow-2xl">
              <img src="/sda_logo.svg" alt="SDA Logo" className="w-full h-full object-contain" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-white tracking-tight leading-none">
                EZC <span className="text-[#4CAF50]">GeoMap</span>
              </h1>
              <p className="text-[#81C784] text-xs font-bold uppercase tracking-[0.25em] mt-0.5">
                East Zimbabwe Conference
              </p>
            </div>
          </div>
          <p className="text-white/50 text-sm font-medium">
            Geographic Information & Ministry Management System
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden"
        >
          {/* Tab switcher */}
          <div className="flex border-b border-white/10">
            {[
              { id: 'login', label: 'Sign In', icon: LogIn },
              { id: 'register', label: 'Register', icon: UserPlus },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setMode(tab.id); setError(''); setSuccess(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all ${
                  mode === tab.id
                    ? 'bg-[#2E7D32] text-white'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {mode === 'register' && (
                  <div>
                    <label className="block text-white/70 text-xs font-black uppercase tracking-wider mb-2">
                      Full Name
                    </label>
                    <input
                      name="fullName"
                      type="text"
                      required
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder="Pastor John Doe"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 text-sm font-medium focus:outline-none focus:border-[#4CAF50] focus:ring-1 focus:ring-[#4CAF50] transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-white/70 text-xs font-black uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="pastor@ezc.org"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 text-sm font-medium focus:outline-none focus:border-[#4CAF50] focus:ring-1 focus:ring-[#4CAF50] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-xs font-black uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPwd ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-white/30 text-sm font-medium focus:outline-none focus:border-[#4CAF50] focus:ring-1 focus:ring-[#4CAF50] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div>
                    <label className="block text-white/70 text-xs font-black uppercase tracking-wider mb-2">
                      Confirm Password
                    </label>
                    <input
                      name="confirmPassword"
                      type={showPwd ? 'text' : 'password'}
                      required
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 text-sm font-medium focus:outline-none focus:border-[#4CAF50] focus:ring-1 focus:ring-[#4CAF50] transition-all"
                    />
                  </div>
                )}

                {/* Error/Success messages */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-2 bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-3"
                    >
                      <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                      <p className="text-red-300 text-xs font-medium">{error}</p>
                    </motion.div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-2 bg-green-500/20 border border-green-500/40 rounded-xl px-4 py-3"
                    >
                      <MapPin size={16} className="text-green-400 mt-0.5 shrink-0" />
                      <p className="text-green-300 text-xs font-medium">{success}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#2E7D32] hover:bg-[#388E3C] disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl text-sm uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-[#2E7D32]/30 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : mode === 'login' ? (
                    <><LogIn size={18} /> Sign In</>
                  ) : (
                    <><UserPlus size={18} /> Create Account</>
                  )}
                </button>

                {mode === 'login' && (
                  <p className="text-center text-white/30 text-xs">
                    Access is granted by Conference Administration.{' '}
                    <button type="button" onClick={() => setMode('register')} className="text-[#81C784] hover:underline">
                      Request account
                    </button>
                  </p>
                )}
              </motion.form>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex items-center justify-center gap-3"
        >
          <div className="w-8 h-8 bg-white/10 rounded-lg p-1 border border-white/10">
            <img src="/graphmen.png" alt="Graphmen" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Powered by Graphmen Geospatial</p>
            <p className="text-[#4CAF50]/60 text-[10px] tracking-wider">+263 773 807 928</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
