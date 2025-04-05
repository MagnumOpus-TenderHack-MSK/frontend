"use client";

import { useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/admin-api";

interface ClusterTimeseriesChartProps {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
}

export function ClusterTimeseriesChart({ startDate, endDate }: ClusterTimeseriesChartProps) {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const timeseries = await adminApi.getClusterTimeseries(startDate, endDate);
                setData(timeseries);
            } catch (error) {
                console.error("Error fetching cluster timeseries:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [startDate, endDate]);

    if (isLoading) {
        return <Skeleton className="w-full h-[400px]" />;
    }

    // Get all cluster names from data (excluding the 'date' field)
    const clusterNames = data.length > 0 ? Object.keys(data[0]).filter(key => key !== "date") : [];

    return (
        <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {clusterNames.map((name, index) => (
                    <Line key={name} type="monotone" dataKey={name} stroke={["#8884d8", "#82ca9d", "#ffc658", "#ff8042"][index % 4]} strokeWidth={2} activeDot={{ r: 8 }} />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
