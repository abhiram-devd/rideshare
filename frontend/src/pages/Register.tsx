import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Mail, Phone, Lock, AlertCircle, ArrowRight } from 'lucide-react';

export const Register: React.FC = () => {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

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
            await register(name, email, password, phone || undefined);
            setIsSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setError(err?.detail || 'Registration failed. Please verify credentials or try another email.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = 'glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-slate-200 text-sm';
    const labelClass = 'block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2';

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/7 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-teal-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-sm sm:max-w-md glass-panel rounded-2xl p-6 sm:p-8 my-4 shadow-2xl shadow-black/40">

                {/* Brand */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-xl text-slate-950 shadow-lg shadow-emerald-500/20 mb-3">
                        R
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">Create Account</h2>
                    <p className="text-slate-500 text-sm mt-1">Split transport costs, find travel partners</p>
                </div>

                {isSuccess ? (
                    <div className="bg-emerald-500/8 border border-emerald-500/25 rounded-xl p-4 text-emerald-300 text-sm text-center">
                        <p className="font-semibold mb-1">Registration Successful!</p>
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

                        <form onSubmit={handleSubmit} className="space-y-3.5">
                            {/* Full Name */}
                            <div>
                                <label className={labelClass}>Full Name</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none"><UserIcon size={16} /></span>
                                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                                        placeholder="John Doe" className={inputClass} disabled={loading} />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className={labelClass}>Email Address</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none"><Mail size={16} /></span>
                                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                        placeholder="john@example.com" className={inputClass} disabled={loading} />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className={labelClass}>Phone <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none"><Phone size={16} /></span>
                                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+91 98765 43210" className={inputClass} disabled={loading} />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className={labelClass}>Password</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none"><Lock size={16} /></span>
                                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                        placeholder="At least 8 characters" className={inputClass} disabled={loading} />
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className={labelClass}>Confirm Password</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none"><Lock size={16} /></span>
                                    <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••" className={inputClass} disabled={loading} />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/15 active:scale-[0.98]"
                            >
                                {loading ? (
                                    <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Create Account</span>
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    </>
                )}

                <div className="text-center mt-6">
                    <p className="text-slate-500 text-xs">
                        Already have an account?{' '}
                        <Link to="/login" className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
