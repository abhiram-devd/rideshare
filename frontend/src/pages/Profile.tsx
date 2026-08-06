import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Mail, Phone, Edit2, Save, X, ShieldAlert, Ban } from 'lucide-react';
import apiClient from '../api/client';

export const Profile: React.FC = () => {
    const { user, updateProfile } = useAuth();

    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // --- Report/Block Demo Section ---
    const [reportTarget, setReportTarget] = useState('');
    const [reportReason, setReportReason] = useState('INAPPROPRIATE_BEHAVIOR');
    const [reportDesc, setReportDesc] = useState('');
    const [blockTarget, setBlockTarget] = useState('');
    const [safetyMsg, setSafetyMsg] = useState<string | null>(null);
    const [safetyError, setSafetyError] = useState<string | null>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveError(null);
        setSaveSuccess(false);
        setSaving(true);
        try {
            await updateProfile(name, phone, avatarUrl || undefined);
            setSaveSuccess(true);
            setEditing(false);
            setTimeout(() => setSaveSuccess(false), 4000);
        } catch (err: any) {
            setSaveError(err?.detail || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const handleReport = async (e: React.FormEvent) => {
        e.preventDefault();
        setSafetyError(null);
        setSafetyMsg(null);
        try {
            await apiClient.post('/reports/', {
                reported_user_id: reportTarget,
                reason: reportReason,
                description: reportDesc || undefined,
            });
            setSafetyMsg('Report submitted successfully. Our team will review it shortly.');
            setReportTarget('');
            setReportDesc('');
        } catch (err: any) {
            setSafetyError(err?.detail || 'Failed to submit report.');
        }
    };

    const handleBlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setSafetyError(null);
        setSafetyMsg(null);
        try {
            await apiClient.post('/blocks/', { blocked_id: blockTarget });
            setSafetyMsg('User has been blocked.');
            setBlockTarget('');
        } catch (err: any) {
            setSafetyError(err?.detail || 'Failed to block user.');
        }
    };

    if (!user) return null;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wide">My Profile</h2>
                    <p className="text-xs text-slate-400">Manage your account information</p>
                </div>
                {!editing && (
                    <button
                        onClick={() => {
                            setName(user.name);
                            setPhone(user.phone || '');
                            setAvatarUrl(user.avatar_url || '');
                            setEditing(true);
                        }}
                        className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl transition-colors"
                    >
                        <Edit2 size={16} />
                    </button>
                )}
            </div>

            {/* Profile Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 glass space-y-4">
                {/* Avatar */}
                <div className="flex items-center space-x-4 pb-4 border-b border-slate-850">
                    <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xl font-bold text-slate-400 shrink-0">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            user.name.charAt(0)
                        )}
                    </div>
                    <div>
                        <h3 className="text-slate-100 font-bold text-base">{user.name}</h3>
                        <p className="text-xs text-slate-400">{user.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${user.email_verified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                {user.email_verified ? 'Email Verified' : 'Unverified'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Info / Edit form */}
                {saveSuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl p-2 text-center">
                        Profile updated successfully.
                    </div>
                )}
                {saveError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl p-2">
                        {saveError}
                    </div>
                )}

                {editing ? (
                    <form onSubmit={handleSave} className="space-y-3">
                        <div>
                            <label className="block text-slate-400 text-[11px] uppercase font-semibold tracking-wider mb-1">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="glass-input w-full px-3 py-2.5 rounded-xl text-slate-200 text-sm"
                                required
                                minLength={2}
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-[11px] uppercase font-semibold tracking-wider mb-1">Phone Number</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="glass-input w-full px-3 py-2.5 rounded-xl text-slate-200 text-sm"
                                placeholder="+91 98765 43210"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-[11px] uppercase font-semibold tracking-wider mb-1">Avatar URL</label>
                            <input
                                type="url"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                className="glass-input w-full px-3 py-2.5 rounded-xl text-slate-200 text-sm"
                                placeholder="https://..."
                            />
                        </div>
                        <div className="flex space-x-3 pt-1">
                            <button
                                type="button"
                                onClick={() => setEditing(false)}
                                className="flex-1 py-2 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1 hover:bg-slate-800 transition-colors"
                            >
                                <X size={14} />
                                <span>Cancel</span>
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-450 text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center space-x-1 transition-colors"
                            >
                                {saving ? (
                                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                                ) : (
                                    <>
                                        <Save size={14} />
                                        <span>Save Changes</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center space-x-3 text-slate-300">
                            <Mail size={16} className="text-slate-500 shrink-0" />
                            <span>{user.email}</span>
                        </div>
                        {user.phone && (
                            <div className="flex items-center space-x-3 text-slate-305">
                                <Phone size={16} className="text-slate-500 shrink-0" />
                                <span>{user.phone}</span>
                            </div>
                        )}
                        <div className="flex items-center space-x-3 text-slate-400">
                            <UserIcon size={16} className="text-slate-500 shrink-0" />
                            <span className="text-xs">Member since {new Date(user.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Safety Center */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 glass space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">Safety Center</h4>

                {safetyMsg && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl p-2">
                        {safetyMsg}
                    </div>
                )}
                {safetyError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl p-2">
                        {safetyError}
                    </div>
                )}

                {/* Report a User */}
                <div>
                    <div className="flex items-center space-x-2 mb-3">
                        <ShieldAlert size={14} className="text-orange-400" />
                        <span className="text-xs font-semibold text-slate-300">Report a User</span>
                    </div>
                    <form onSubmit={handleReport} className="space-y-2">
                        <input
                            type="text"
                            value={reportTarget}
                            onChange={(e) => setReportTarget(e.target.value)}
                            placeholder="User UUID to report..."
                            className="glass-input w-full px-3 py-2 rounded-xl text-slate-200 text-xs"
                            required
                        />
                        <select
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            className="glass-input w-full px-3 py-2 rounded-xl text-slate-200 text-xs"
                        >
                            <option value="INAPPROPRIATE_BEHAVIOR">Inappropriate Behavior</option>
                            <option value="HARASSMENT">Harassment</option>
                            <option value="SPAM">Spam / Fake Profile</option>
                            <option value="NO_SHOW">Did Not Show Up</option>
                            <option value="OTHER">Other</option>
                        </select>
                        <textarea
                            value={reportDesc}
                            onChange={(e) => setReportDesc(e.target.value)}
                            placeholder="Optional description..."
                            className="glass-input w-full px-3 py-2 rounded-xl text-slate-200 text-xs h-14 resize-none"
                        />
                        <button
                            type="submit"
                            className="w-full py-2 bg-orange-500/20 border border-orange-500/30 hover:bg-orange-500/30 text-orange-350 text-xs font-bold rounded-xl transition-colors"
                        >
                            Submit Report
                        </button>
                    </form>
                </div>

                {/* Block a User */}
                <div className="pt-2 border-t border-slate-850">
                    <div className="flex items-center space-x-2 mb-3">
                        <Ban size={14} className="text-red-400" />
                        <span className="text-xs font-semibold text-slate-300">Block a User</span>
                    </div>
                    <form onSubmit={handleBlock} className="flex space-x-2">
                        <input
                            type="text"
                            value={blockTarget}
                            onChange={(e) => setBlockTarget(e.target.value)}
                            placeholder="User UUID to block..."
                            className="glass-input flex-1 px-3 py-2 rounded-xl text-slate-200 text-xs"
                            required
                        />
                        <button
                            type="submit"
                            className="px-3 py-2 bg-red-500/15 border border-red-500/25 hover:bg-red-500/25 text-red-400 text-xs font-bold rounded-xl transition-colors"
                        >
                            Block
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;
