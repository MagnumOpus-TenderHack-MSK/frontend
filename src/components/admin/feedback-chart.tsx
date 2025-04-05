import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/admin-api";
import { format } from "date-fns";

interface FeedbackChartProps {
  dateRange: { from: Date; to: Date };
}

export function FeedbackChart({ dateRange }: FeedbackChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Format dates for API
        const fromDate = format(dateRange.from, "yyyy-MM-dd");
        const toDate = format(dateRange.to, "yyyy-MM-dd");

        // Fetch feedback data
        const feedback = await adminApi.getFeedbackStats(fromDate, toDate);

        if (feedback.length === 0) {
          setError("No feedback data available for the selected period");
        }

        setData(feedback);
      } catch (error) {
        console.error("Error fetching feedback stats:", error);
        setError("Failed to fetch feedback data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedback();
  }, [dateRange]);

  if (isLoading) {
    return <Skeleton className="w-full h-[400px]" />;
  }

  // Handle error state
  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <p className="text-muted-foreground">{error}</p>
        </div>
    );
  }

  // Handle no data case
  if (data.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-muted-foreground">Нет данных для отображения</p>
        </div>
    );
  }

  // Custom tooltip component with theme support
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="bg-background border rounded p-3 shadow-md text-sm">
          <p className="font-medium mb-1">{`Дата: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
              <p
                  key={`item-${index}`}
                  style={{ color: entry.color }}
                  className="flex items-center text-sm gap-2"
              >
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span>{`${entry.name}: ${entry.value}`}</span>
              </p>
          ))}
        </div>
    );
  };

  return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              stroke="var(--muted-foreground)"
          />
          <YAxis
              stroke="var(--muted-foreground)"
              tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
              wrapperStyle={{ paddingTop: 10 }}
          />
          <Line
              type="monotone"
              dataKey="likes"
              name="Положительные"
              stroke="#4ade80"
              strokeWidth={2}
              activeDot={{ r: 8 }}
              dot={{ r: 4 }}
          />
          <Line
              type="monotone"
              dataKey="dislikes"
              name="Отрицательные"
              stroke="#f87171"
              strokeWidth={2}
              dot={{ r: 4 }}
          />
          {data[0] && data[0].hasOwnProperty('neutral') && (
              <Line
                  type="monotone"
                  dataKey="neutral"
                  name="Нейтральные"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={{ r: 4 }}
              />
          )}
        </LineChart>
      </ResponsiveContainer>
  );
}