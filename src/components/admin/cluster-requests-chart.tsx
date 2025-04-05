"use client";

import { useState, useEffect } from "react";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, Cell } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/admin-api";

interface ClusterRequestsChartProps {
  dateRange: { from: Date; to: Date };
  onClusterClick: (cluster: string) => void;
}

export function ClusterRequestsChart({ dateRange, onClusterClick }: ClusterRequestsChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClusters = async () => {
      setIsLoading(true);
      try {
        const clustersResp = await adminApi.getClusters();
        // Use general clusters for the main chart
        setData(clustersResp.general_clusters);
      } catch (error) {
        console.error("Error fetching clusters:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClusters();
  }, [dateRange]);

  const handleBarClick = (data: any, index: number) => {
    setActiveIndex(index);
    onClusterClick(data.name);
  };

  if (isLoading) {
    return <Skeleton className="w-full h-[400px]" />;
  }

  return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="requests" onClick={handleBarClick} cursor="pointer">
            {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={activeIndex === index ? "#ff7300" : entry.color} opacity={activeIndex === null || activeIndex === index ? 1 : 0.6} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
  );
}
