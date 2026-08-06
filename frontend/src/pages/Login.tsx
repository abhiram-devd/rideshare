import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await login(email, password);
            navigate('/');
        } catch (err: any) {
            setError(err?.detail || 'Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient gradient */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/8 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-teal-500/6 rounded-full blur-[100px]" />
            </div>

            {/* Card */}
            <div className="relative z-10 w-full max-w-sm sm:max-w-md glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40">

                {/* Brand */}
                <div className="flex flex-col items-center mb-7">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-xl sm:text-2xl text-slate-950 shadow-lg shadow-emerald-500/25 mb-3">
                        R
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">Welcome back</h2>
                    <p className="text-slate-500 text-sm mt-1">Split costs, discover travel partners</p>
                </div>

                {error && (
                    <div className="bg-red-500/8 border border-red-500/25 rounded-xl p-3 flex items-start gap-2 text-red-300 text-xs mb-5">
                        <AlertCircle className="shrink-0 text-red-400 mt-0.5" size={14} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
                            Email Address
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                                <Mail size={16} />
                            </span>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="glass-input w-full pl-10 pr-4 py-3 rounded-xl text-slate-200 text-sm"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-slate-500 text-xs font-semibold uppercase tracking-wider">
                                Password
                            </label>
                            <Link to="/forgot-password" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                                Forgot?
                            </Link>
                        </div>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                                <Lock size={16} />
                            </span>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="glass-input w-full pl-10 pr-4 py-3 rounded-xl text-slate-200 text-sm"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 active:scale-[0.98]"
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Sign In</span>
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center mt-7">
                    <p className="text-slate-500 text-xs">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">
                            Sign up now
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
