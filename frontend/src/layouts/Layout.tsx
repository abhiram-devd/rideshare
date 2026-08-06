import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Bell, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Layout: React.FC = () => {
    const { pathname } = useLocation();
    const { logout, user } = useAuth();

    const handleLogout = async () => {
        if (confirm('Are you sure you want to log out?')) {
            await logout();
        }
    };

    const isActive = (path: string) => {
        if (path === '/') return pathname === '/';
        return pathname.startsWith(path);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center">

            {/* Ambient gradient background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/8 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-teal-500/6 rounded-full blur-[100px]" />
            </div>

            {/* Responsive container: full on mobile, max-2xl centered on desktop */}
            <div className="relative z-10 w-full max-w-2xl mx-auto min-h-screen flex flex-col
                            sm:border-x sm:border-slate-800/60 shadow-2xl shadow-black/40">

                {/* Top Header */}
                <header className="h-14 px-4 sm:px-6 border-b border-slate-800/60 glass flex items-center justify-between sticky top-0 z-40">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-emerald-500/20">
                            R
                        </div>
                        <span className="font-bold text-lg tracking-wide gradient-text">
                            RideShare
                        </span>
                    </div>
                    {user && (
                        <button
                            onClick={handleLogout}
                            className="p-1.5 hover:bg-slate-800/60 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </button>
                    )}
                </header>

                {/* Content Outlet */}
                <main className="flex-1 pb-24 sm:pb-20 p-4 sm:p-6 overflow-y-auto">
                    <Outlet />
                </main>

                {/* Mobile / Tablet Bottom Navigation Bar */}
                <nav className="h-16 border-t border-slate-800/60 glass fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 max-w-2xl mx-auto w-full">
                    <Link
                        to="/"
                        className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-all ${isActive('/')
                            ? 'text-emerald-400 font-semibold'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <div className={`p-1 rounded-lg transition-colors ${isActive('/') ? 'bg-emerald-500/12' : ''}`}>
                            <Home size={20} className={isActive('/') ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
                        </div>
                        <span className="mt-0.5">Home</span>
                    </Link>

                    <Link
                        to="/my-trips"
                        className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-all ${isActive('/my-trips')
                            ? 'text-emerald-400 font-semibold'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <div className={`p-1 rounded-lg transition-colors ${isActive('/my-trips') ? 'bg-emerald-500/12' : ''}`}>
                            <Calendar size={20} className={isActive('/my-trips') ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
                        </div>
                        <span className="mt-0.5">My Trips</span>
                    </Link>

                    <Link
                        to="/requests"
                        className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-all ${isActive('/requests')
                            ? 'text-emerald-400 font-semibold'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <div className={`p-1 rounded-lg transition-colors ${isActive('/requests') ? 'bg-emerald-500/12' : ''}`}>
                            <Bell size={20} className={isActive('/requests') ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
                        </div>
                        <span className="mt-0.5">Requests</span>
                    </Link>

                    <Link
                        to="/profile"
                        className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-all ${isActive('/profile')
                            ? 'text-emerald-400 font-semibold'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <div className={`p-1 rounded-lg transition-colors ${isActive('/profile') ? 'bg-emerald-500/12' : ''}`}>
                            <UserIcon size={20} className={isActive('/profile') ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
                        </div>
                        <span className="mt-0.5">Profile</span>
                    </Link>
                </nav>

            </div>
        </div>
    );
};
export default Layout;
