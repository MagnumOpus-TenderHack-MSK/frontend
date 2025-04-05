export interface ClusterStat {
    name: string;
    requests: number;
    color?: string;
}

export interface ClustersResponse {
    general_clusters: ClusterStat[];
    sub_clusters: { name: string; requests: number }[];
}

export interface TimeseriesData {
    date: string;
    [cluster: string]: number | string;
}

export interface AdminChat {
    id: string;
    title: string;
    user: string;
    categories: string[];
    subcategories: string[];
    created_at: string;
    updated_at: string;
    message_count: number;
    likes: number;
    dislikes: number;
}

export interface AdminChatDetail {
    id: string;
    title: string;
    user: {
        id: string;
        username: string;
        email: string;
    };
    categories: string[];
    subcategories: string[];
    created_at: string;
    updated_at: string;
    messages: any[];
}

export interface FeedbackStat {
    date: string;
    likes: number;
    dislikes: number;
}

export interface AdminUser {
    id: string;
    username: string;
    email: string;
    full_name: string | null;
    is_active: boolean;
    is_admin: boolean;
    created_at: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const adminApi = {
    getClusters: async (): Promise<ClustersResponse> => {
        const res = await fetch(`${API_BASE_URL}/api/admin/clusters`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
        });
        if (!res.ok) throw new Error("Failed to fetch clusters stats");
        return res.json();
    },

    getClusterTimeseries: async (startDate: string, endDate: string): Promise<TimeseriesData[]> => {
        const res = await fetch(`${API_BASE_URL}/api/admin/cluster-timeseries?start_date=${startDate}&end_date=${endDate}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
        });
        if (!res.ok) throw new Error("Failed to fetch cluster timeseries");
        return res.json();
    },

    getChats: async (skip = 0, limit = 100): Promise<{ items: AdminChat[]; total: number }> => {
        const res = await fetch(`${API_BASE_URL}/api/admin/chats?skip=${skip}&limit=${limit}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
        });
        if (!res.ok) throw new Error("Failed to fetch admin chats");
        return res.json();
    },

    getChatDetail: async (chatId: string): Promise<AdminChatDetail> => {
        const res = await fetch(`${API_BASE_URL}/api/admin/chats/${chatId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
        });
        if (!res.ok) throw new Error("Failed to fetch chat detail");
        return res.json();
    },

    getFeedbackStats: async (): Promise<FeedbackStat[]> => {
        const res = await fetch(`${API_BASE_URL}/api/admin/feedback`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
        });
        if (!res.ok) throw new Error("Failed to fetch feedback stats");
        return res.json();
    },

    getUsers: async (skip = 0, limit = 100): Promise<{ items: AdminUser[]; total: number }> => {
        const res = await fetch(`${API_BASE_URL}/api/admin/users?skip=${skip}&limit=${limit}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
        });
        if (!res.ok) throw new Error("Failed to fetch admin users");
        return res.json();
    }
};

export default adminApi;
