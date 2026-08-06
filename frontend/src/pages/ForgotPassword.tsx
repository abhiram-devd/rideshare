import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowLeft, AlertCircle } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
    const { forgotPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await forgotPassword(email);
            setSubmitted(true);
        } catch (err: any) {
            setError(err?.detail || 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/7 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-sm sm:max-w-md glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40">

                <Link to="/login" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-400 mb-6 transition-colors">
                    <ArrowLeft size={13} />
                    Back to Sign In
                </Link>

                <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">Reset Password</h2>
                    <p className="text-slate-500 text-sm mt-1">We'll send a secure reset link to your email.</p>
                </div>

                {submitted ? (
                    <div className="bg-emerald-500/8 border border-emerald-500/25 rounded-xl p-4 text-emerald-300 text-sm text-center">
                        <p className="font-semibold mb-2">Request Submitted!</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            If an account is associated with <strong>{email}</strong>, a reset link has been generated in the server logs.
                        </p>
                    </div>
                ) : (
                    <>
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
                                        placeholder="john@example.com"
                                        className="glass-input w-full pl-10 pr-4 py-3 rounded-xl text-slate-200 text-sm"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl flex items-center justify-center transition-all shadow-lg shadow-emerald-500/15 active:scale-[0.98]"
                            >
                                {loading ? (
                                    <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <span>Send Reset Link</span>
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
