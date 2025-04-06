import { useState, useEffect, useCallback } from "react";
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
import { Clock, Calendar, RefreshCw } from "lucide-react";
import { adminApi, FeedbackStat } from "@/lib/admin-api";
import { format } from "date-fns";

interface FeedbackChartProps {
  dateRange: { from: Date; to: Date };
}

type GranularityType = "hour" | "day" | "week";

export function FeedbackChart({ dateRange }: FeedbackChartProps) {
  const [data, setData] = useState<FeedbackStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<GranularityType>("hour");
  const [retryCount, setRetryCount] = useState(0);
  // Add state to track if the data received only contains zeros
  const [allDataIsZero, setAllDataIsZero] = useState(false);

  const formatDateLabel = useCallback((dateLabel: string) => {
    if (!dateLabel) return "";
    try {
      const date = new Date(dateLabel);
      if (granularity === "hour") return format(date, "HH:00");
      if (granularity === "week") return `W${format(date, "w")}`;
      return format(date, "MM/dd");
    } catch (e) { return dateLabel; }
  }, [granularity]);

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAllDataIsZero(false); // Reset zero flag
    try {
      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd");

      console.log(`Fetching feedback stats from ${fromDate} to ${toDate}, granularity: ${granularity}`); // Keep log
      const feedback = await adminApi.getFeedbackStats(fromDate, toDate, granularity);
      console.log("Feedback API response:", feedback); // Keep log

      // --- MODIFICATION START ---
      // Always set the data received from the API
      setData(feedback);

      // Check if the API returned data and if all values are zero
      if (feedback && feedback.length > 0) {
        const allZero = feedback.every(item => item.likes === 0 && item.dislikes === 0);
        setAllDataIsZero(allZero);
        if (allZero) {
          console.log("All feedback data points have zero likes/dislikes."); // Log info, don't error
          // You could set a specific message here if needed, e.g., using setError
          // setError("Нет оценок за выбранный период.");
        } else {
          console.log(`Displaying ${feedback.length} feedback data points (some non-zero).`);
        }
      } else {
        console.log("Feedback API returned empty array or invalid data.");
        setError("Нет данных об обратной связи для выбранного периода.");
      }
      // --- MODIFICATION END ---

    } catch (error: any) {
      console.error("Error fetching feedback stats:", error);
      setError(error.message || "Failed to fetch feedback data");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, granularity, retryCount]); // Keep dependencies

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const changeGranularity = (newGranularity: GranularityType) => {
    setGranularity(newGranularity);
    setRetryCount(prev => prev + 1);
  };

  const handleRefresh = () => {
    setRetryCount(prev => prev + 1);
  };

  if (isLoading) {
    return <Skeleton className="w-full h-[400px]" />;
  }

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
          {(error || allDataIsZero) && ( // Show refresh if error OR if data is all zeros
              <Button variant="outline" size="sm" onClick={handleRefresh} className="flex items-center gap-1">
                <RefreshCw size={14} /> <span className="hidden sm:inline">Обновить</span>
              </Button>
          )}
        </div>

        {/* Chart or Error/No Data Message */}
        <div className="flex-grow min-h-0">
          {error && !isLoading ? ( // Show error message first
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-red-500">{error}</p>
              </div>
          ) : allDataIsZero && !isLoading ? ( // Show specific message if all data is zero
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-muted-foreground">Нет оценок за выбранный период.</p>
              </div>
          ) : data.length === 0 && !isLoading ? ( // Show generic no data message if API returned empty
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-muted-foreground">Нет данных для отображения.</p>
              </div>
          ) : ( // Otherwise, render the chart
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