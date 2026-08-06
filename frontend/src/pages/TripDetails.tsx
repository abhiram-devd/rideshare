import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Trip, JoinRequest } from '../types';
import { ArrowLeft, Calendar, Clock, Landmark, AlertTriangle, ShieldCheck, Mail, Phone, HelpCircle } from 'lucide-react';

export const TripDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const [requestMsg, setRequestMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // 1. Fetch Trip details
    const { data: trip, isLoading, error } = useQuery<Trip>({
        queryKey: ['trip', id],
        queryFn: () => apiClient.get<Trip>(`/trips/${id}`),
        enabled: !!id,
    });

    // 2. Fetch User's Outgoing Requests to check if user has already requested to join
    const { data: outgoingRequests = [] } = useQuery<JoinRequest[]>({
        queryKey: ['outgoing-requests'],
        queryFn: () => apiClient.get<JoinRequest[]>('/requests/outgoing'),
        enabled: !!user,
    });

    // Mutator to submit a join request
    const joinRequestMutation = useMutation({
        mutationFn: (message: string) =>
            apiClient.post<JoinRequest>(`/trips/${id}/requests`, { message: message || undefined }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['outgoing-requests'] });
            setSuccessMsg('Request submitted successfully! The owner will review it.');
            setRequestMsg('');
            setTimeout(() => setSuccessMsg(null), 5000);
        },
        onError: (err: any) => {
            setErrorMsg(err?.detail || 'Failed to submit join request.');
            setTimeout(() => setErrorMsg(null), 5000);
        },
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 min-h-[50vh]">
                <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="mt-4 text-xs text-slate-400">Loading trip details...</span>
            </div>
        );
    }

    if (error || !trip) {
        return (
            <div className="space-y-4">
                <Link to="/" className="inline-flex items-center text-xs text-emerald-400">
                    <ArrowLeft size={16} className="mr-1" />
                    <span>Back to Home</span>
                </Link>
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center text-red-250 text-xs">
                    The requested trip details could not be loaded. It may have been deleted or is incorrect.
                </div>
            </div>
        );
    }

    // Calculate confirmed passengers list
    const confirmedMembers = trip.members.filter((m) => m.status === 'CONFIRMED');
    const isOwner = trip.creator_id === user?.id;
    const isPassenger = confirmedMembers.some((m) => m.user_id === user?.id && m.role === 'MEMBER');
    const isConfirmed = isOwner || isPassenger;

    // Check if there is an active pending join request
    const existingPendingRequest = outgoingRequests.find(
        (req) => req.trip_id === trip.id && req.status === 'PENDING'
    );

    const costSplit = (parseFloat(trip.estimated_total_cost) / confirmedMembers.length).toFixed(0);

    const handleTripAction = async (action: 'cancel' | 'complete') => {
        if (!confirm(`Are you sure you want to ${action} this trip?`)) return;
        setActionLoading(true);
        setErrorMsg(null);
        try {
            await apiClient.post(`/trips/${trip.id}/${action}`);
            queryClient.invalidateQueries({ queryKey: ['trip', id] });
            queryClient.invalidateQueries({ queryKey: ['my-trips'] });
            setSuccessMsg(`Trip successfully marked as ${action === 'cancel' ? 'cancelled' : 'completed'}`);
        } catch (err: any) {
            setErrorMsg(err?.detail || `Failed to perform action.`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleJoinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        joinRequestMutation.mutate(requestMsg);
    };

    return (
        <div className="space-y-5">
            {/* Back Link */}
            <div className="flex items-center justify-between">
                <Link to="/" className="inline-flex items-center text-xs text-slate-400 hover:text-emerald-400 transition-colors">
                    <ArrowLeft size={16} className="mr-1" />
                    <span>Back to Commutes</span>
                </Link>

                {isOwner && trip.status !== 'CANCELLED' && trip.status !== 'COMPLETED' && (
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => handleTripAction('cancel')}
                            disabled={actionLoading}
                            className="px-2.5 py-1 text-[11px] font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded"
                        >
                            Cancel Trip
                        </button>
                        <button
                            onClick={() => handleTripAction('complete')}
                            disabled={actionLoading}
                            className="px-2.5 py-1 text-[11px] font-bold bg-emerald-500 hover:bg-emerald-450 text-slate-950 rounded"
                        >
                            Complete
                        </button>
                    </div>
                )}
            </div>

            {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-205 text-xs rounded-xl p-3">
                    {successMsg}
                </div>
            )}

            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-205 text-xs rounded-xl p-3">
                    {errorMsg}
                </div>
            )}

            {/* Main Details Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 glass">

                {/* Trip headers status */}
                <div className="flex justify-between items-center pb-3 border-b border-slate-850">
                    <div>
                        <span className="text-xs uppercase font-medium bg-slate-800 text-emerald-400 px-2 py-0.5 rounded">
                            {trip.status}
                        </span>
                    </div>
                    <span className="text-xs text-slate-400">
                        Created {new Date(trip.created_at).toLocaleDateString()}
                    </span>
                </div>

                {/* Origin to Destination Route */}
                <div className="space-y-3">
                    <div className="flex items-start">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                            A
                        </div>
                        <div className="ml-3">
                            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Departure Point</p>
                            <h4 className="text-slate-100 font-bold text-sm leading-tight mt-0.5">{trip.origin.name}</h4>
                        </div>
                    </div>

                    <div className="h-6 w-0.5 bg-slate-800 ml-2.5"></div>

                    <div className="flex items-start">
                        <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                            B
                        </div>
                        <div className="ml-3">
                            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Destination</p>
                            <h4 className="text-slate-100 font-bold text-sm leading-tight mt-0.5">{trip.destination.name}</h4>
                        </div>
                    </div>
                </div>

                {/* Date and Time info */}
                <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-850 text-xs">
                    <div className="space-y-1.5">
                        <span className="text-slate-450 flex items-center">
                            <Calendar size={13} className="mr-1" />
                            <span>Travel Date</span>
                        </span>
                        <p className="text-slate-200 font-semibold">
                            {new Date(trip.travel_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <span className="text-slate-450 flex items-center">
                            <Clock size={13} className="mr-1" />
                            <span>Target Time</span>
                        </span>
                        <p className="text-slate-200 font-semibold">
                            {new Date(trip.travel_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            <span className="text-[10px] text-slate-500 ml-1">
                                (+/- {trip.time_tolerance_minutes}m)
                            </span>
                        </p>
                    </div>
                </div>

                {/* Cost calculation display panel */}
                <div className="p-4 glass rounded-xl flex items-center justify-between border border-slate-800/60">
                    <div>
                        <div className="flex items-center text-slate-450 text-[10px] uppercase font-bold tracking-wide">
                            <Landmark size={12} className="mr-1 text-emerald-400" />
                            <span>Cost Sharing Calculator</span>
                        </div>
                        <div className="text-[20px] font-extrabold text-slate-100 mt-1">
                            ₹{costSplit} <span className="text-xs text-slate-400 font-normal">/ person</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Estimated total fare</span>
                        <span className="text-xs text-slate-300 font-bold">₹{trip.estimated_total_cost}</span>
                    </div>
                </div>

                {/* Notes (if any) */}
                {trip.notes && (
                    <div className="glass p-3.5 rounded-xl border border-slate-800/60 text-xs">
                        <span className="font-semibold text-slate-400 block mb-1">Notes from Host</span>
                        <p className="text-slate-300 antialiased leading-relaxed">{trip.notes}</p>
                    </div>
                )}
            </div>

            {/* Confirmed Group Members (Passenger List) */}
            <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
                    Travel Buddies ({confirmedMembers.length}/{trip.max_passengers})
                </h4>

                <div className="space-y-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 glass">
                    {confirmedMembers.map((member) => (
                        <div key={member.id} className="flex justify-between items-center py-2 border-b last:border-b-0 border-slate-850">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 border border-slate-700">
                                    {member.user.avatar_url ? (
                                        <img src={member.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        member.user.name.charAt(0)
                                    )}
                                </div>
                                <div>
                                    <div className="text-slate-200 text-sm font-semibold flex items-center">
                                        <span>{member.user.name}</span>
                                        {member.user_id === trip.creator_id && (
                                            <span className="ml-1.5 text-[9px] bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 px-1 rounded">Host</span>
                                        )}
                                    </div>
                                    {/* Privacy: Contact details ONLY visible to confirmed group members */}
                                    {isConfirmed ? (
                                        <div className="text-[10px] text-slate-400 flex space-x-2 mt-0.5">
                                            <span className="flex items-center"><Mail size={10} className="mr-0.5" />{member.user.email}</span>
                                            {member.user.phone && <span className="flex items-center"><Phone size={10} className="mr-0.5" />{member.user.phone}</span>}
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-slate-500 mt-0.5 italic flex items-center">
                                            <HelpCircle size={10} className="mr-0.5" /> Contact hidden until request is accepted
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Guest Join Request CTA Options */}
            {!isConfirmed && trip.status === 'OPEN' && (
                <div className="glass-panel rounded-2xl p-4">
                    {existingPendingRequest ? (
                        <div className="bg-yellow-500/10 border border-yellow-505/30 text-yellow-205 text-xs rounded-xl p-3 text-center">
                            Your request is currently pending host approval. You'll see their contact details once accepted.
                        </div>
                    ) : (
                        <form onSubmit={handleJoinSubmit} className="space-y-3">
                            <h4 className="text-slate-200 font-bold text-xs uppercase tracking-wide">Request to join this ride</h4>
                            <textarea
                                value={requestMsg}
                                onChange={(e) => setRequestMsg(e.target.value)}
                                placeholder="Hi, I'm heading in the same direction at this time. Can I split the fare with you?"
                                className="glass-input w-full p-3 rounded-xl text-slate-200 text-xs h-16 resize-none block text-left"
                                required
                            />
                            <button
                                type="submit"
                                disabled={joinRequestMutation.isPending}
                                className="w-full py-2 bg-emerald-500 hover:bg-emerald-450 disabled:bg-slate-705 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                                {joinRequestMutation.isPending ? 'Sending...' : 'Request Seat'}
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* Exclusivity notifications */}
            {trip.status === 'CANCELLED' && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl text-center flex items-center justify-center space-x-1.5">
                    <AlertTriangle size={14} />
                    <span>This commute has been cancelled by the host.</span>
                </div>
            )}

            {trip.status === 'COMPLETED' && (
                <div className="bg-slate-800/40 border border-slate-800 text-slate-400 text-xs p-3 rounded-xl text-center flex items-center justify-center space-x-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>This trip has concluded successfully.</span>
                </div>
            )}

        </div>
    );
};

export default TripDetails;
