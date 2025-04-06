export interface ClusterStat {
    name: string;
    requests: number;
    color?: string;
}

export interface ClustersResponse {
    general_clusters?: ClusterStat[];
    sub_clusters?: ClusterStat[];
}

export interface TimeseriesData {
    date: string;
    [cluster: string]: number | string;
}

export interface AdminStats {
    totalUsers: number;
    activeChats: number;
    positiveReactions: number;
    negativeReactions: number;
    timestamp: string;
}

export interface AdminChat {
    id: string;
    title: string;
    user: string | {
        id: string;
        username: string;
        email: string;
    };
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
    messages: Array<{
        id: string;
        content: string;
        message_type: string;
        created_at: string;
        files?: Array<{
            id: string;
            name: string;
            file_type: string;
            preview_url?: string;
        }>;
        reactions?: Array<{
            id: string;
            reaction_type: string;
            created_at: string;
        }>;
    }>;
}

export interface FeedbackStat {
    date: string;
    likes: number;
    dislikes: number;
    neutral?: number;
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

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper function to get authorization headers
const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('jwt_token');
    return {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
    };
};

// Helper function to handle API errors and return fallback data
const handleApiResponse = async <T>(response: Response, fallback: T): Promise<T> => {
    if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        try {
            const errorText = await response.text();
            console.error(`Error response: ${errorText}`);
        } catch (e) {
            console.error("Could not read error response");
        }
        return fallback;
    }

    try {
        return await response.json() as T;
    } catch (error) {
        console.error('Error parsing JSON response:', error);
        return fallback;
    }
};

// Main admin API service with error handling
export const adminApi = {
    // Clusters endpoints
    getClusters: async (parentCluster?: string): Promise<ClustersResponse> => {
        try {
            // Properly encode the parentCluster parameter if provided
            const params = parentCluster ? `?parentCluster=${encodeURIComponent(parentCluster)}` : '';
            console.log(`Fetching clusters with params: ${params}`);

            const res = await fetch(`${API_BASE_URL}/api/admin/clusters${params}`, {
                headers: getAuthHeaders()
            });

            const result = await handleApiResponse(res, { general_clusters: [], sub_clusters: [] });
            console.log("Clusters API result:", result);
            return result;
        } catch (error) {
            console.error("Error fetching clusters:", error);
            return { general_clusters: [], sub_clusters: [] };
        }
    },

    getClusterTimeseries: async (
        startDate: string,
        endDate: string,
        granularity: string = "hour"  // Default to hourly
    ): Promise<TimeseriesData[]> => {
        try {
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate,
                granularity: granularity
            });

            const res = await fetch(
                `${API_BASE_URL}/api/admin/cluster-timeseries?${params.toString()}`,
                { headers: getAuthHeaders() }
            );

            return handleApiResponse(res, []);
        } catch (error) {
            console.error("Error fetching cluster timeseries:", error);
            return [];
        }
    },

    // Stats endpoint
    getStats: async (fromDate?: string, toDate?: string): Promise<AdminStats> => {
        try {
            const query = new URLSearchParams();
            if (fromDate) query.append('from', fromDate);
            if (toDate) query.append('to', toDate);

            const queryString = query.toString() ? `?${query.toString()}` : '';
            const res = await fetch(`${API_BASE_URL}/api/admin/stats${queryString}`, {
                headers: getAuthHeaders()
            });

            return handleApiResponse(res, {
                totalUsers: 0,
                activeChats: 0,
                positiveReactions: 0,
                negativeReactions: 0,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error fetching admin stats:", error);
            return {
                totalUsers: 0,
                activeChats: 0,
                positiveReactions: 0,
                negativeReactions: 0,
                timestamp: new Date().toISOString()
            };
        }
    },

    // Chats endpoints
    getChats: async (
        skip = 0,
        limit = 100,
        cluster?: string,
        subCluster?: string,
        fromDate?: string,
        toDate?: string
    ): Promise<PaginatedResponse<AdminChat>> => {
        try {
            const query = new URLSearchParams();
            query.append('skip', skip.toString());
            query.append('limit', limit.toString());

            // Ensure cluster and subCluster are properly encoded if provided
            if (cluster) query.append('cluster', cluster);
            if (subCluster) query.append('subCluster', subCluster);
            if (fromDate) query.append('from', fromDate);
            if (toDate) query.append('to', toDate);

            const apiUrl = `${API_BASE_URL}/api/admin/chats?${query.toString()}`;
            console.log(`API call: GET ${apiUrl}`);

            const res = await fetch(apiUrl, {
                headers: getAuthHeaders()
            });

            // Log response status
            console.log(`Response status: ${res.status}`);

            // If not found (404), return empty results instead of throwing an error
            if (res.status === 404) {
                console.warn("404 response from chats endpoint, returning empty results");
                return { items: [], total: 0 };
            }

            const data = await handleApiResponse(res, { items: [], total: 0 });
            return data;
        } catch (error) {
            console.error("Error fetching admin chats:", error);
            return { items: [], total: 0 };
        }
    },

    getChatDetail: async (chatId: string): Promise<AdminChatDetail | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/chats/${chatId}`, {
                headers: getAuthHeaders()
            });

            return handleApiResponse(res, null);
        } catch (error) {
            console.error("Error fetching chat detail:", error);
            return null;
        }
    },

    // Feedback endpoints
    getFeedbackStats: async (
        fromDate?: string,
        toDate?: string,
        granularity: string = "hour"  // Default to hourly
    ): Promise<FeedbackStat[]> => {
        try {
            const query = new URLSearchParams();
            if (fromDate) query.append('from', fromDate);
            if (toDate) query.append('to', toDate);
            query.append('granularity', granularity);

            const queryString = query.toString() ? `?${query.toString()}` : '';
            const res = await fetch(`${API_BASE_URL}/api/admin/feedback${queryString}`, {
                headers: getAuthHeaders()
            });

            return handleApiResponse(res, []);
        } catch (error) {
            console.error("Error fetching feedback stats:", error);
            return [];
        }
    },

    // Users endpoints
    getUsers: async (skip = 0, limit = 100): Promise<PaginatedResponse<AdminUser>> => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/users?skip=${skip}&limit=${limit}`, {
                headers: getAuthHeaders()
            });

            return handleApiResponse(res, { items: [], total: 0 });
        } catch (error) {
            console.error("Error fetching admin users:", error);
            return { items: [], total: 0 };
        }
    },

    getUserDetail: async (userId: string): Promise<AdminUser | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
                headers: getAuthHeaders()
            });

            return handleApiResponse(res, null);
        } catch (error) {
            console.error("Error fetching user detail:", error);
            return null;
        }
    }
};

export default adminApi;