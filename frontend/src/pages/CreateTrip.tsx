import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';
import type { Location, Trip } from '../types';
import { ArrowLeft, MapPin, Calendar, Clock, Sparkles } from 'lucide-react';

export const CreateTrip: React.FC = () => {
    const navigate = useNavigate();
    const [originId, setOriginId] = useState('');
    const [destinationId, setDestinationId] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [tolerance, setTolerance] = useState('60');
    const [maxPassengers, setMaxPassengers] = useState('4');
    const [cost, setCost] = useState('');
    const [notes, setNotes] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch Preseeded Locations lists
    const { data: locations = [] } = useQuery<Location[]>({
        queryKey: ['locations'],
        queryFn: () => apiClient.get<Location[]>('/locations/'),
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!originId || !destinationId) {
            setError('Please select both Origin and Destination.');
            return;
        }
        if (originId === destinationId) {
            setError('Origin and destination cannot be identical.');
            return;
        }
        if (!date || !time) {
            setError('Please specify the date and time of travel.');
            return;
        }

        setLoading(true);
        try {
            // Build ISO UTC datetime
            const localDateTime = new Date(`${date}T${time}`);
            const travelDateIso = localDateTime.toISOString();

            const newTrip = await apiClient.post<Trip>('/trips/', {
                origin_id: originId,
                destination_id: destinationId,
                travel_date: travelDateIso,
                time_tolerance_minutes: parseInt(tolerance),
                max_passengers: parseInt(maxPassengers),
                estimated_total_cost: parseFloat(cost),
                notes: notes || undefined,
            });

            navigate(`/rides/${newTrip.id}`);
        } catch (err: any) {
            setError(err?.detail || 'Failed to create trip. Please review inputs and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Back Header */}
            <div className="flex items-center space-x-2">
                <Link to="/" className="text-slate-400 hover:text-emerald-400 p-1 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <h2 className="text-lg font-bold text-slate-100">Publish Ride</h2>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 glass">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-xs rounded-xl p-3 mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Endpoint selections */}
                    <div>
                        <label className="block text-slate-400 text-xs mb-1 font-semibold uppercase tracking-wider">From (Origin)</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                                <MapPin size={16} />
                            </span>
                            <select
                                value={originId}
                                onChange={(e) => setOriginId(e.target.value)}
                                className="glass-input w-full pl-9 pr-3 py-2.5 rounded-xl text-slate-200 text-sm"
                                required
                            >
                                <option value="">Select origin...</option>
                                {locations.map((loc) => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs mb-1 font-semibold uppercase tracking-wider">To (Destination)</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                                <MapPin size={16} />
                            </span>
                            <select
                                value={destinationId}
                                onChange={(e) => setDestinationId(e.target.value)}
                                className="glass-input w-full pl-9 pr-3 py-2.5 rounded-xl text-slate-200 text-sm"
                                required
                            >
                                <option value="">Select destination...</option>
                                {locations.map((loc) => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Time and Limits */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-slate-400 text-xs mb-1 font-semibold uppercase tracking-wider">Departure Date</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-505">
                                    <Calendar size={14} />
                                </span>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="glass-input w-full pl-9 pr-3 py-2.5 rounded-xl text-slate-200 text-xs"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-400 text-xs mb-1 font-semibold uppercase tracking-wider">Target Time</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-505">
                                    <Clock size={14} />
                                </span>
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="glass-input w-full pl-9 pr-3 py-2.5 rounded-xl text-slate-200 text-xs"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-slate-400 text-xs mb-1 font-semibold uppercase tracking-wider">Tolerance Window</label>
                            <select
                                value={tolerance}
                                onChange={(e) => setTolerance(e.target.value)}
                                className="glass-input w-full px-3 py-2.5 rounded-xl text-slate-200 text-xs"
                            >
                                <option value="30">+/- 30m</option>
                                <option value="60">+/- 1h</option>
                                <option value="120">+/- 2h</option>
                                <option value="240">+/- 4h</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-slate-400 text-xs mb-1 font-semibold uppercase tracking-wider">Max Seats Link</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={maxPassengers}
                                onChange={(e) => setMaxPassengers(e.target.value)}
                                className="glass-input w-full px-3 py-2.5 rounded-xl text-slate-200 text-xs"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs mb-1 font-semibold uppercase tracking-wider">Estimated Total Cost (₹)</label>
                        <input
                            type="number"
                            min="0"
                            step="any"
                            value={cost}
                            onChange={(e) => setCost(e.target.value)}
                            placeholder="e.g. 500"
                            className="glass-input w-full px-3 py-2.5 rounded-xl text-slate-200 text-sm"
                            required
                        />
                        <span className="text-[10px] text-slate-450 mt-1 block">
                            Cost is divided equally among members in layout details.
                        </span>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs mb-1 font-semibold uppercase tracking-wider">Travel Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Luggage size, food rules, specific landmarks..."
                            className="glass-input w-full p-3 rounded-xl text-slate-200 text-sm h-20 resize-none text-left"
                            maxLength={500}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/15 active:scale-[0.98]"
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                <span>Publish Trip</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateTrip;
