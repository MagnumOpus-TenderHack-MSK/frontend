import { useState, useEffect, useCallback } from "react"; // Added useCallback
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line
} from "recharts"; // Use recharts directly
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, RefreshCw } from "lucide-react"; // Added RefreshCw
import { adminApi, FeedbackStat } from "@/lib/admin-api"; // Use FeedbackStat type
import { format } from "date-fns";

interface FeedbackChartProps {
  dateRange: { from: Date; to: Date };
}

type GranularityType = "hour" | "day" | "week";

export function FeedbackChart({ dateRange }: FeedbackChartProps) {
  const [data, setData] = useState<FeedbackStat[]>([]); // Use FeedbackStat type
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<GranularityType>("hour"); // Default to hourly
  const [retryCount, setRetryCount] = useState(0);

  // Format date label based on granularity
  const formatDateLabel = useCallback((dateLabel: string) => {
    if (!dateLabel) return "";
    try {
      const date = new Date(dateLabel);
      if (granularity === "hour") return format(date, "HH:00");
      if (granularity === "week") return `W${format(date, "w")}`; // Show Week number
      return format(date, "MM/dd"); // Show Month/Day for daily
    } catch (e) {
      return dateLabel; // Fallback
    }
  }, [granularity]);

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd");

      console.log(`Fetching feedback stats from ${fromDate} to ${toDate}, granularity: ${granularity}`);
      const feedback = await adminApi.getFeedbackStats(fromDate, toDate, granularity);
      console.log("Feedback API response:", feedback);

      // Filter out entries where both likes and dislikes are zero for cleaner chart
      const filteredFeedback = feedback.filter(item => item.likes > 0 || item.dislikes > 0);

      if (filteredFeedback.length === 0) {
        setData([]); // Set empty data
        setError("Нет данных об обратной связи для выбранного периода.");
        console.log("No non-zero feedback data found.");
      } else {
        setData(filteredFeedback); // Set filtered data
        console.log(`Displaying ${filteredFeedback.length} feedback data points.`);
      }

    } catch (error: any) {
      console.error("Error fetching feedback stats:", error);
      setError(error.message || "Failed to fetch feedback data");
      setData([]); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, granularity, retryCount]); // Add retryCount dependency

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]); // Use the memoized fetch function

  const changeGranularity = (newGranularity: GranularityType) => {
    setGranularity(newGranularity);
    setRetryCount(prev => prev + 1); // Trigger refetch on granularity change
  };

  const handleRefresh = () => {
    setRetryCount(prev => prev + 1); // Trigger refetch
  };

  if (isLoading) {
    return <Skeleton className="w-full h-[400px]" />;
  }

  // Custom tooltip component (same as before)
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    let formattedDate = label;
    try {
      const date = new Date(label);
      if (!isNaN(date.getTime())) {
        if (granularity === "hour") formattedDate = format(date, "yyyy-MM-dd HH:00");
        else if (granularity === "week") formattedDate = `Week of ${format(date, "yyyy-MM-dd")}`;
        else formattedDate = format(date, "yyyy-MM-dd");
      }
    } catch (e) { /* Use original label */ }

    return (
        <div className="bg-background border rounded p-3 shadow-md text-sm">
          <p className="font-medium mb-1">{`Дата: ${formattedDate}`}</p>
          {payload.map((entry: any, index: number) => (
              <p key={`item-${index}`} style={{ color: entry.color }} className="flex items-center text-sm gap-2" >
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span>{`${entry.name}: ${entry.value}`}</span>
              </p>
          ))}
        </div>
    );
  };

  return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between mb-4 flex-wrap gap-2">
          {/* Granularity toggle buttons */}
          <div className="flex gap-2">
            <Button variant={granularity === "hour" ? "default" : "outline"} size="sm" onClick={() => changeGranularity("hour")} className="flex items-center gap-1"> <Clock size={14} /> <span className="hidden sm:inline">Часы</span> </Button>
            <Button variant={granularity === "day" ? "default" : "outline"} size="sm" onClick={() => changeGranularity("day")} className="flex items-center gap-1"> <Calendar size={14} /> <span className="hidden sm:inline">Дни</span> </Button>
            <Button variant={granularity === "week" ? "default" : "outline"} size="sm" onClick={() => changeGranularity("week")} className="flex items-center gap-1"> <Calendar size={14} /> <span className="hidden sm:inline">Недели</span> </Button>
          </div>
          {/* Refresh button */}
          {error && (
              <Button variant="outline" size="sm" onClick={handleRefresh} className="flex items-center gap-1">
                <RefreshCw size={14} /> <span className="hidden sm:inline">Обновить</span>
              </Button>
          )}
        </div>

        {/* Chart or Error/No Data Message */}
        <div className="flex-grow min-h-0">
          {error && !isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-red-500">{error}</p>
              </div>
          ) : data.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-muted-foreground">Нет данных для отображения.</p>
              </div>
          ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 60 }} >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={formatDateLabel} angle={-45} textAnchor="end" height={70} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: 10 }}/>
                  <Line type="monotone" dataKey="likes" name="Положительные" stroke="#4ade80" strokeWidth={2} activeDot={{ r: 6, stroke: 'hsl(var(--background))', strokeWidth: 2 }} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="dislikes" name="Отрицательные" stroke="#f87171" strokeWidth={2} activeDot={{ r: 6, stroke: 'hsl(var(--background))', strokeWidth: 2 }} dot={{ r: 3 }} />
                  {/* Conditionally render neutral line if data exists */}
                  {data[0]?.neutral !== undefined && (
                      <Line type="monotone" dataKey="neutral" name="Нейтральные" stroke="#94a3b8" strokeWidth={2} activeDot={{ r: 6, stroke: 'hsl(var(--background))', strokeWidth: 2 }} dot={{ r: 3 }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
          )}
        </div>
      </div>
  );
}