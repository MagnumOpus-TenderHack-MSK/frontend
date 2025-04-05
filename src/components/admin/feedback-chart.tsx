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
import { Button } from "@/components/ui/button";
import { Clock, Calendar } from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { format } from "date-fns";

interface FeedbackChartProps {
  dateRange: { from: Date; to: Date };
}

type GranularityType = "hour" | "day" | "week";

export function FeedbackChart({ dateRange }: FeedbackChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<GranularityType>("day"); // Default to daily view

  // Format date label based on granularity
  const formatDateLabel = (dateLabel: string) => {
    if (granularity === "hour") {
      // For hour format, we expect "YYYY-MM-DD HH:00"
      try {
        const [datePart, timePart] = dateLabel.split(" ");
        if (timePart) {
          return timePart.substring(0, 5); // Just show HH:00
        }
        return dateLabel;
      } catch (e) {
        return dateLabel;
      }
    } else if (granularity === "week") {
      // For week, show "Week of MM/DD"
      try {
        const date = new Date(dateLabel);
        return `Week of ${date.getMonth() + 1}/${date.getDate()}`;
      } catch (e) {
        return dateLabel;
      }
    } else {
      // For day, show MM/DD
      try {
        const date = new Date(dateLabel);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      } catch (e) {
        return dateLabel;
      }
    }
  }

  useEffect(() => {
    const fetchFeedback = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Format dates for API
        const fromDate = format(dateRange.from, "yyyy-MM-dd");
        const toDate = format(dateRange.to, "yyyy-MM-dd");

        // Fetch feedback data with specified granularity
        const feedback = await adminApi.getFeedbackStats(fromDate, toDate, granularity);

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
  }, [dateRange, granularity]);

  const changeGranularity = (newGranularity: GranularityType) => {
    setGranularity(newGranularity);
  };

  if (isLoading) {
    return <Skeleton className="w-full h-[400px]" />;
  }

  // Handle error state
  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <p className="text-muted-foreground">{error}</p>
          <Button
              variant="outline"
              className="mt-4"
              onClick={() => changeGranularity(granularity === "hour" ? "day" : granularity === "day" ? "week" : "hour")}
          >
            Try {granularity === "hour" ? "Daily" : granularity === "day" ? "Weekly" : "Hourly"} View
          </Button>
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

    // Format full date for tooltip based on granularity
    let formattedDate = label;
    try {
      if (granularity === "hour") {
        // For hour view, show full date and time
        const [datePart, timePart] = label.split(" ");
        const date = new Date(datePart);
        formattedDate = `${date.getMonth() + 1}/${date.getDate()} ${timePart}`;
      } else if (granularity === "day") {
        // For day view, show MM/DD/YYYY
        const date = new Date(label);
        formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
      }
    } catch (e) {
      // Use original label if parsing fails
    }

    return (
        <div className="bg-background border rounded p-3 shadow-md text-sm">
          <p className="font-medium mb-1">{`Дата: ${formattedDate}`}</p>
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
      <div className="h-full">
        {/* Granularity toggle buttons */}
        <div className="flex gap-2 mb-4">
          <Button
              variant={granularity === "hour" ? "default" : "outline"}
              size="sm"
              onClick={() => changeGranularity("hour")}
              className="flex items-center gap-1"
          >
            <Clock size={14} />
            <span className="hidden sm:inline">Часы</span>
          </Button>
          <Button
              variant={granularity === "day" ? "default" : "outline"}
              size="sm"
              onClick={() => changeGranularity("day")}
              className="flex items-center gap-1"
          >
            <Calendar size={14} />
            <span className="hidden sm:inline">Дни</span>
          </Button>
          <Button
              variant={granularity === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => changeGranularity("week")}
              className="flex items-center gap-1"
          >
            <Calendar size={14} />
            <span className="hidden sm:inline">Недели</span>
          </Button>
        </div>

        <ResponsiveContainer width="100%" height={360}>
          <LineChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                angle={-45}
                textAnchor="end"
                height={60}
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
      </div>
  );
}