import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, ArrowLeft, AlertCircle } from 'lucide-react';

export const ResetPassword: React.FC = () => {
    const { resetPassword } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!token) {
            setError('Missing reset token. Please request another reset link.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setLoading(true);
        try {
            await resetPassword(token, password);
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setError(err?.detail || 'Invalid or expired reset token. Please request another reset.');
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

                {/* Back Link */}
                <Link
                    to="/login"
                    className="inline-flex items-center text-xs text-slate-400 hover:text-emerald-400 mb-6 transition-colors self-start"
                >
                    <ArrowLeft size={14} className="mr-1" />
                    <span>Back to Sign In</span>
                </Link>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Set New Password</h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Choose a strong password with at least 8 characters.
                    </p>
                </div>

                {success ? (
                    <div className="bg-emerald-500/8 border border-emerald-500/25 rounded-xl p-4 text-emerald-300 text-sm text-center">
                        <p className="font-semibold mb-2">Password Successfully Reset!</p>
                        <p className="text-xs text-slate-400">Redirecting to Login…</p>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="bg-red-500/8 border border-red-500/25 rounded-xl p-3 flex items-start gap-2 text-red-300 text-xs mb-5">
                                <AlertCircle className="shrink-0 text-red-400 mt-0.5" size={14} />
                                <span>{error}</span>
                            </div>
                        )}

                        {!token ? (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm text-center">
                                <p className="font-semibold mb-1">Invalid Link</p>
                                <p className="text-xs text-slate-400 leading-normal">
                                    The password reset token is missing from the URL. Please verify the link you clicked.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-slate-350 text-xs font-semibold uppercase tracking-wider mb-2">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                                            <Lock size={16} />
                                        </span>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="At least 8 characters"
                                            className="glass-input w-full pl-10 pr-4 py-3 rounded-xl text-slate-200 text-sm"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-slate-350 text-xs font-semibold uppercase tracking-wider mb-2">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                                            <Lock size={16} />
                                        </span>
                                        <input
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
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
                                        <span>Reset Password</span>
                                    )}
                                </button>
                            </form>
                        )}
                    </>
                )}

            </div>
        </div>
    );
};

export default ResetPassword;
