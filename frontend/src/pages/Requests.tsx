import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import type { JoinRequest } from '../types';
import { ArrowRight, Check, X, Bell, Send } from 'lucide-react';

export const Requests: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Fetch Incoming
    const { data: incoming = [], isLoading: loadingIn } = useQuery<JoinRequest[]>({
        queryKey: ['incoming-requests'],
        queryFn: () => apiClient.get<JoinRequest[]>('/requests/incoming'),
        refetchInterval: 15000,
    });

    // Fetch Outgoing
    const { data: outgoing = [], isLoading: loadingOut } = useQuery<JoinRequest[]>({
        queryKey: ['outgoing-requests'],
        queryFn: () => apiClient.get<JoinRequest[]>('/requests/outgoing'),
        refetchInterval: 15000,
    });

    const handleRequestAction = useMutation({
        mutationFn: async ({ id, action }: { id: string; action: 'accept' | 'reject' | 'cancel' }) => {
            return apiClient.post<JoinRequest>(`/requests/${id}/${action}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incoming-requests'] });
            queryClient.invalidateQueries({ queryKey: ['outgoing-requests'] });
            queryClient.invalidateQueries({ queryKey: ['my-trips'] });
            queryClient.invalidateQueries({ queryKey: ['trip'] });
        },
        onError: (err: any) => {
            setErrorMsg(err?.detail || 'Failed to process request action.');
            setTimeout(() => setErrorMsg(null), 5000);
        },
    });

    const isLoading = activeTab === 'incoming' ? loadingIn : loadingOut;
    const requests = activeTab === 'incoming' ? incoming : outgoing;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wide">Seat Requests</h2>
                <p className="text-xs text-slate-400">Manage trip requests & coordinates</p>
            </div>

            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-xs rounded-xl p-3">
                    {errorMsg}
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('incoming')}
                    className={`flex-1 py-3 text-center text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'incoming'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                >
                    <span className="inline-flex items-center space-x-1.5">
                        <Bell size={13} />
                        <span>Received ({incoming.length})</span>
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('outgoing')}
                    className={`flex-1 py-3 text-center text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'outgoing'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-405 hover:text-slate-200'
                        }`}
                >
                    <span className="inline-flex items-center space-x-1.5">
                        <Send size={13} />
                        <span>Sent ({outgoing.length})</span>
                    </span>
                </button>
            </div>

            {/* Requests List */}
            {isLoading ? (
                <div className="flex justify-center p-8">
                    <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
                    No requests in this tab.
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((req) => (
                        <div
                            key={req.id}
                            className="bg-slate-905 p-4 rounded-xl border border-slate-800 space-y-3 shadow-sm hover:border-slate-750 transition-colors"
                        >
                            {/* Trip details heading */}
                            {req.trip && (
                                <div className="flex items-center text-xs font-bold text-slate-200 border-b border-slate-850 pb-2">
                                    <span>{req.trip.origin.name}</span>
                                    <ArrowRight size={12} className="mx-1.5 text-slate-500" />
                                    <span>{req.trip.destination.name}</span>
                                </div>
                            )}

                            {/* Requester or Status */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center font-bold text-slate-400 text-xs border border-slate-700">
                                        {req.requester.avatar_url ? (
                                            <img src={req.requester.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            req.requester.name.charAt(0)
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-sm font-semibold text-slate-100 block">{req.requester.name}</span>
                                        <span className="text-[10px] text-slate-400 block mt-0.5">
                                            Submitted {new Date(req.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <span
                                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${req.status === 'PENDING'
                                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                            : req.status === 'ACCEPTED'
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : req.status === 'REJECTED'
                                                    ? 'bg-red-500/10 text-red-400 border border-red-505/20'
                                                    : 'bg-slate-830 text-slate-400'
                                            }`}
                                    >
                                        {req.status}
                                    </span>
                                </div>
                            </div>

                            {/* Requester details messaging */}
                            {req.message && (
                                <p className="bg-slate-850/40 p-2.5 rounded-lg text-xs text-slate-300 italic border border-slate-800">
                                    "{req.message}"
                                </p>
                            )}

                            {/* Action Buttons */}
                            {req.status === 'PENDING' && (
                                <div className="flex justify-end space-x-2 pt-1">
                                    {activeTab === 'incoming' ? (
                                        <>
                                            <button
                                                onClick={() => handleRequestAction.mutate({ id: req.id, action: 'reject' })}
                                                disabled={handleRequestAction.isPending}
                                                className="py-1.5 px-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                            >
                                                <X size={12} />
                                                <span>Decline</span>
                                            </button>
                                            <button
                                                onClick={() => handleRequestAction.mutate({ id: req.id, action: 'accept' })}
                                                disabled={handleRequestAction.isPending}
                                                className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-450 text-slate-950 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                                            >
                                                <Check size={12} />
                                                <span>Accept</span>
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleRequestAction.mutate({ id: req.id, action: 'cancel' })}
                                            disabled={handleRequestAction.isPending}
                                            className="py-1.5 px-3 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                        >
                                            Cancel Request
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Requests;
