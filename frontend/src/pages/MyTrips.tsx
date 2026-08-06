import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import type { Trip } from '../types';
import { Calendar, ArrowRight } from 'lucide-react';

export const MyTrips: React.FC = () => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<'active' | 'past'>('active');

    const { data: trips = [], isLoading } = useQuery<Trip[]>({
        queryKey: ['my-trips'],
        queryFn: () => apiClient.get<Trip[]>('/trips/my'),
    });

    const activeTrips = trips.filter((t) => t.status === 'OPEN' || t.status === 'FULL');
    const pastTrips = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'CANCELLED');

    const displayedTrips = filter === 'active' ? activeTrips : pastTrips;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h2 className="text-base font-bold text-slate-100">My Travel Hub</h2>
                <p className="text-xs text-slate-500 mt-0.5">All commutes you are sharing with others</p>
            </div>

            {/* Tabs */}
            <div className="flex glass rounded-xl p-1 gap-1">
                <button
                    onClick={() => setFilter('active')}
                    className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${filter === 'active'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'text-slate-500 hover:text-slate-300'
                        }`}
                >
                    Active ({activeTrips.length})
                </button>
                <button
                    onClick={() => setFilter('past')}
                    className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${filter === 'past'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'text-slate-500 hover:text-slate-300'
                        }`}
                >
                    History ({pastTrips.length})
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8">
                    <div className="w-7 h-7 border-2 border-emerald-500/40 border-t-emerald-500 rounded-full animate-spin" />
                </div>
            ) : displayedTrips.length === 0 ? (
                <div className="glass p-6 rounded-xl border border-dashed border-slate-800/60 text-center text-slate-500 text-xs">
                    No commutes found in this tab.
                </div>
            ) : (
                <div className="space-y-2.5">
                    {displayedTrips.map((trip) => {
                        const confirmedCount = trip.members.filter((m) => m.status === 'CONFIRMED').length;

                        return (
                            <div
                                key={trip.id}
                                onClick={() => navigate(`/rides/${trip.id}`)}
                                className="p-4 glass glass-hover rounded-xl cursor-pointer transition-all border border-slate-800/60 hover:border-emerald-500/15"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${trip.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : trip.status === 'FULL' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                : trip.status === 'COMPLETED' ? 'bg-slate-800/60 text-slate-400 border-slate-700/40'
                                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                        {trip.status}
                                    </span>
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <Calendar size={11} />
                                        {new Date(trip.travel_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>

                                <div className="text-slate-100 font-bold text-sm flex items-center gap-1.5 mb-2.5">
                                    <span className="truncate">{trip.origin.name}</span>
                                    <ArrowRight size={13} className="text-slate-600 shrink-0" />
                                    <span className="truncate">{trip.destination.name}</span>
                                </div>

                                <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-800/60 pt-2.5">
                                    <span>
                                        {new Date(trip.travel_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="font-semibold text-emerald-400">
                                        {confirmedCount}/{trip.max_passengers} confirmed
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyTrips;
