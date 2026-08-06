import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import type { Location, Trip } from '../types';
import { Search, MapPin, Calendar, Clock, Plus, ArrowRight, User as UserIcon } from 'lucide-react';

export const Home: React.FC = () => {
    const navigate = useNavigate();
    const [originId, setOriginId] = useState('');
    const [destinationId, setDestinationId] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [tolerance, setTolerance] = useState('60');

    // Search Results States
    const [searchResults, setSearchResults] = useState<Trip[] | null>(null);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    // Fetch Locations list
    const { data: locations = [] } = useQuery<Location[]>({
        queryKey: ['locations'],
        queryFn: () => apiClient.get<Location[]>('/locations/'),
    });

    // Fetch My Upcoming Trips
    const { data: upcomingTrips = [], isLoading: loadingTrips } = useQuery<Trip[]>({
        queryKey: ['my-trips'],
        queryFn: () => apiClient.get<Trip[]>('/trips/my'),
    });

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setSearchError(null);
        setSearchResults(null);

        if (!originId || !destinationId) {
            setSearchError('Please select both Origin and Destination.');
            return;
        }
        if (originId === destinationId) {
            setSearchError('Origin and destination cannot be identical.');
            return;
        }
        if (!date || !time) {
            setSearchError('Please specify departure date and time.');
            return;
        }

        setSearching(true);
        try {
            const localDateTime = new Date(`${date}T${time}`);
            const travelDateIso = localDateTime.toISOString();

            const results = await apiClient.get<Trip[]>(
                `/trips/search?origin_id=${originId}&destination_id=${destinationId}&travel_date=${travelDateIso}&time_tolerance_minutes=${tolerance}`
            );
            setSearchResults(results);
        } catch (err: any) {
            setSearchError(err?.detail || 'Failed to search trips. Please try again.');
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="space-y-5">

            {/* Welcome & Create Trip Quick CTA */}
            <div className="flex justify-between items-center glass p-4 rounded-2xl">
                <div>
                    <h2 className="text-base font-bold text-slate-100">Find a Ride Partner</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Share fuel costs &amp; commute together</p>
                </div>
                <Link
                    to="/rides/create"
                    className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 rounded-xl flex items-center space-x-1.5 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105 active:scale-95"
                >
                    <Plus size={15} />
                    <span>Publish</span>
                </Link>
            </div>

            {/* Main Search Panel — dark glass, no white tint */}
            <div className="glass-panel p-5 rounded-2xl">
                <h3 className="text-slate-100 font-bold mb-4 flex items-center gap-1.5 text-sm">
                    <Search size={15} className="text-emerald-400" />
                    Search Commutes
                </h3>

                {searchError && (
                    <div className="bg-red-500/10 border border-red-500/25 text-red-300 text-xs rounded-xl p-3 mb-4">
                        {searchError}
                    </div>
                )}

                <form onSubmit={handleSearch} className="space-y-3.5">

                    {/* Origin & Destination */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-slate-500 text-xs mb-1.5 font-medium">From</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                                    <MapPin size={15} />
                                </span>
                                <select
                                    value={originId}
                                    onChange={(e) => setOriginId(e.target.value)}
                                    className="glass-input w-full pl-9 pr-3 py-2.5 rounded-xl text-slate-200 text-sm"
                                >
                                    <option value="">Select origin...</option>
                                    {locations.map((loc) => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-500 text-xs mb-1.5 font-medium">To</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                                    <MapPin size={15} />
                                </span>
                                <select
                                    value={destinationId}
                                    onChange={(e) => setDestinationId(e.target.value)}
                                    className="glass-input w-full pl-9 pr-3 py-2.5 rounded-xl text-slate-200 text-sm"
                                >
                                    <option value="">Select destination...</option>
                                    {locations.map((loc) => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-slate-500 text-xs mb-1.5 font-medium">Date</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                                    <Calendar size={13} />
                                </span>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="glass-input w-full pl-9 pr-3 py-2.5 rounded-xl text-slate-200 text-xs"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-500 text-xs mb-1.5 font-medium">Time</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                                    <Clock size={13} />
                                </span>
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="glass-input w-full pl-9 pr-3 py-2.5 rounded-xl text-slate-200 text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Time Tolerance */}
                    <div>
                        <label className="block text-slate-500 text-xs mb-1.5 font-medium">Time Window</label>
                        <select
                            value={tolerance}
                            onChange={(e) => setTolerance(e.target.value)}
                            className="glass-input w-full px-3 py-2.5 rounded-xl text-slate-200 text-sm"
                        >
                            <option value="30">± 30 minutes</option>
                            <option value="60">± 1 hour</option>
                            <option value="120">± 2 hours</option>
                            <option value="240">± 4 hours</option>
                            <option value="480">± 8 hours</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={searching}
                        className="w-full py-2.5 mt-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {searching ? (
                            <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <Search size={15} />
                                <span>Search Matches</span>
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Search Results */}
            {searchResults !== null && (
                <div className="space-y-2.5">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
                        Matching Commutes ({searchResults.length})
                    </h4>

                    {searchResults.length === 0 ? (
                        <div className="glass p-6 rounded-2xl text-center text-slate-500 text-xs">
                            No matching rides found. Try widening your time window or publish a new trip.
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {searchResults.map((trip) => {
                                const confirmedCount = trip.members.filter((m) => m.status === 'CONFIRMED').length;
                                const costSplit = (parseFloat(trip.estimated_total_cost) / Math.max(confirmedCount, 1)).toFixed(0);

                                return (
                                    <div
                                        key={trip.id}
                                        onClick={() => navigate(`/rides/${trip.id}`)}
                                        className="p-4 glass glass-hover rounded-xl cursor-pointer transition-all border border-slate-800/60 hover:border-emerald-500/20"
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] uppercase font-semibold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                                {trip.status}
                                            </span>
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                <Clock size={11} />
                                                {new Date(trip.travel_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <div className="text-slate-100 font-semibold text-sm flex items-center gap-1.5 mb-2.5">
                                            <span className="truncate">{trip.origin.name}</span>
                                            <ArrowRight size={13} className="text-slate-600 shrink-0" />
                                            <span className="truncate">{trip.destination.name}</span>
                                        </div>

                                        <div className="flex justify-between items-center text-xs text-slate-500 pt-2.5 border-t border-slate-800/60">
                                            <span className="flex items-center gap-1">
                                                <UserIcon size={11} />
                                                {confirmedCount}/{trip.max_passengers} seats
                                            </span>
                                            <span className="text-emerald-400 font-bold">
                                                ₹{costSplit}/head
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* My Active Rides */}
            <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">My Active Rides</h4>
                {loadingTrips ? (
                    <div className="min-h-16 flex items-center justify-center">
                        <span className="w-5 h-5 border-2 border-emerald-500/40 border-t-emerald-500 rounded-full animate-spin" />
                    </div>
                ) : upcomingTrips.length === 0 ? (
                    <div className="glass p-5 rounded-xl border border-dashed border-slate-800/60 text-center text-slate-500 text-xs">
                        No upcoming commutes. Publish a ride or search for matches.
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {upcomingTrips.slice(0, 3).map((trip) => {
                            const confirmed = trip.members.filter((m) => m.status === 'CONFIRMED').length;
                            return (
                                <div
                                    key={trip.id}
                                    onClick={() => navigate(`/rides/${trip.id}`)}
                                    className="p-4 glass glass-hover rounded-xl cursor-pointer transition-all border border-slate-800/60 hover:border-emerald-500/15"
                                >
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                                            {trip.creator_id === apiClient.getAccessToken() ? 'Owner' : 'Passenger'}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                            {new Date(trip.travel_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="text-slate-100 text-sm font-bold truncate mb-1.5">
                                        {trip.origin.name} → {trip.destination.name}
                                    </div>
                                    <div className="text-xs text-slate-500 flex justify-between">
                                        <span>Departs {new Date(trip.travel_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span>{confirmed}/{trip.max_passengers} confirmed</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
};

export default Home;
