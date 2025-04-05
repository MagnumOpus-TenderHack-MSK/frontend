"use client";

import { useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/admin-api";

interface FeedbackChartProps {
  dateRange: { from: Date; to: Date };
}

export function FeedbackChart({ dateRange }: FeedbackChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      setIsLoading(true);
      try {
        const feedback = await adminApi.getFeedbackStats();
        setData(feedback);
      } catch (error) {
        console.error("Error fetching feedback stats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeedback();
  }, [dateRange]);

  if (isLoading) {
    return <Skeleton className="w-full h-[400px]" />;
  }

  return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="likes" stroke="#4ade80" strokeWidth={2} activeDot={{ r: 8 }} />
          <Line type="monotone" dataKey="dislikes" stroke="#f87171" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
  );
}
