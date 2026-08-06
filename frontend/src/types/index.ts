export interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
    email_verified: boolean;
    phone_verified: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Location {
    id: string;
    name: string;
    slug: string;
    location_type: string;
    is_active: boolean;
}

export interface TripMember {
    id: string;
    trip_id: string;
    user_id: string;
    user: User;
    role: 'OWNER' | 'MEMBER';
    status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
    joined_at: string;
}

export interface Trip {
    id: string;
    creator_id: string;
    creator: User;
    origin: Location;
    destination: Location;
    travel_date: string; // ISO date-time string
    time_tolerance_minutes: number;
    max_passengers: number;
    estimated_total_cost: string; // Float numbers represented safely as string
    status: 'OPEN' | 'FULL' | 'CANCELLED' | 'COMPLETED';
    notes?: string;
    created_at: string;
    updated_at: string;
    members: TripMember[];
}

export interface JoinRequest {
    id: string;
    trip_id: string;
    requester_id: string;
    requester: User;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
    message?: string;
    created_at: string;
    responded_at?: string;
    // Included in detailed response join lists
    trip?: {
        origin: Location;
        destination: Location;
    };
}

export interface Report {
    id: string;
    reporter_id: string;
    reported_user_id: string;
    trip_id?: string;
    reason: string;
    description?: string;
    status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
    created_at: string;
}

export interface Block {
    id: string;
    blocker_id: string;
    blocked_id: string;
    created_at: string;
}
