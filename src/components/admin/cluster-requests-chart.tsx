import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie, Sector // Added PieChart related imports
} from "recharts"; // Using recharts directly
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BarChart2, LineChart as LineChartIcon, Clock, Calendar, RefreshCw } from "lucide-react";
import { adminApi, ClusterStat, TimeseriesData } from "@/lib/admin-api";
import { format } from "date-fns";

interface ClusterRequestsChartProps {
  dateRange: { from: Date; to: Date }
  parentCluster?: string | null
  onClusterClick: (cluster: string) => void
}

type GranularityType = "hour" | "day" | "week";
type ChartViewType = "area" | "bar"; // Define view types

// Function to get a unique color (same as before)
const getColorForCluster = (clusterName: string, index: number, barData: ClusterStat[]) => {
  const clusterInBarData = barData.find(item => item.name === clusterName);
  if (clusterInBarData?.color) return clusterInBarData.color;
  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F", "#FFBB28", "#a4de6c", "#d0ed57"];
  return colors[index % colors.length];
};

export function ClusterRequestsChart({ dateRange, parentCluster, onClusterClick }: ClusterRequestsChartProps) {
  const [barData, setBarData] = useState<ClusterStat[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeseriesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [granularity, setGranularity] = useState<GranularityType>("hour");

  // Determine initial view type (Bar for subclusters, Area for general)
  // Allow user to toggle ONLY in general view
  const [viewType, setViewType] = useState<ChartViewType>(parentCluster ? "bar" : "area");

  // --- Data Fetching & Processing (mostly same as before) ---
  const formatDateLabel = useCallback((dateLabel: string) => {
    if (!dateLabel) return "";
    try {
      const date = new Date(dateLabel);
      if (granularity === "hour") return format(date, "HH:00");
      if (granularity === "week") return `W${format(date, "w")}`;
      return format(date, "MM/dd");
    } catch (e) { return dateLabel; }
  }, [granularity]);

  const areaChartClusters = useMemo(() => {
    const clusters = new Set<string>();
    timeSeriesData.forEach(dataPoint => {
      Object.keys(dataPoint).forEach(key => {
        if (key !== "date" && typeof dataPoint[key] === 'number' && dataPoint[key] > 0) {
          clusters.add(key);
        }
      });
    });
    return Array.from(clusters);
  }, [timeSeriesData]);

  const fetchData = useCallback(async () => {
    setIsLoading(true); setError(null); setActiveIndex(null);
    try {
      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");

      if (parentCluster) {
        setViewType("bar"); // Force bar view for subclusters
        const clusterResponse = await adminApi.getClusters(parentCluster);
        setBarData(clusterResponse.sub_clusters || []);
        setTimeSeriesData([]);
      } else {
        // Fetch both for general view (timeseries for Area, bar for colors/Bar view)
        const [timeseries, clusterResponse] = await Promise.all([
          adminApi.getClusterTimeseries(startDate, endDate, granularity),
          adminApi.getClusters()
        ]);
        setTimeSeriesData(timeseries);
        setBarData(clusterResponse.general_clusters || []);
      }
    } catch (error: any) {
      console.error("Error fetching cluster data:", error);
      setError(error.message || "Failed to load data.");
      setBarData([]); setTimeSeriesData([]);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, parentCluster, granularity, retryCount]); // Added retryCount

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = () => { setRetryCount(prev => prev + 1); };

  const nonZeroBarData = useMemo(() => barData.filter(item => item.requests > 0), [barData]);
  const nonZeroTimeSeriesData = useMemo(() => timeSeriesData.filter(item => Object.keys(item).some(key => key !== "date" && typeof item[key] === 'number' && item[key] > 0)), [timeSeriesData]);
  const hasData = viewType === "bar" ? nonZeroBarData.length > 0 : nonZeroTimeSeriesData.length > 0 && areaChartClusters.length > 0;

  // --- Click Handlers ---
  const handleBarClick = useCallback((data: any, index: number) => {
    if (data?.name) {
      setActiveIndex(index); onClusterClick(data.name);
    }
  }, [onClusterClick]);

  const handleAreaClick = useCallback((chartData: any, index: number) => {
    // The payload for AreaChart onClick often contains the active tooltip payload
    if (chartData && chartData.activePayload && chartData.activePayload.length > 0) {
      // Find the segment with the highest value at this point, assuming that's the one clicked
      // Or, if only one segment has data at this point, use that one.
      // Recharts' AreaChart click doesn't easily give the specific segment clicked.
      // Let's trigger based on the *first* dataKey found in the payload.
      const clickedDataKey = chartData.activePayload[0]?.dataKey;
      if (clickedDataKey) {
        console.log(`Area segment clicked (approximated): ${clickedDataKey}`);
        const clusterIndex = barData.findIndex(item => item.name === clickedDataKey);
        setActiveIndex(clusterIndex !== -1 ? clusterIndex : null);
        onClusterClick(clickedDataKey); // Pass the category name
      } else {
        console.warn("Could not determine clicked area segment from payload:", chartData);
      }
    } else {
      console.warn("AreaChart click handler received no activePayload:", chartData);
    }
  }, [onClusterClick, barData]);

  // --- View Toggle ---
  const toggleViewType = useCallback(() => {
    if (!parentCluster) { // Only allow toggle in general view
      setViewType(prev => (prev === "area" ? "bar" : "area"));
    }
  }, [parentCluster]);

  // --- Tooltips (same as before) ---
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length || !nonZeroBarData.length) return null;
    const total = nonZeroBarData.reduce((sum, item) => sum + item.requests, 0);
    const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : 0;
    return (
        <div className="bg-background border rounded p-2 shadow-md text-sm z-50">
          <p className="font-medium">{`${label}`}</p>
          <p className="text-sm">{`${payload[0].value} запросов (${percentage}%)`}</p>
        </div>
    );
  };
  const CustomAreaTooltip = ({ active, payload, label }: any) => {
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
        <div className="bg-background border rounded p-2 shadow-md text-sm z-50">
          <p className="font-medium">{`Дата: ${formattedDate}`}</p>
          {payload.map((entry: any, index: number) => (
              <p key={`item-${index}`} style={{ color: entry.color }} className="text-sm">
                {`${entry.name}: ${entry.value} запросов`}
              </p>
          ))}
        </div>
    );
  };

  // --- Rendering Logic ---
  if (isLoading) return <Skeleton className="w-full h-[500px]" />; // Use consistent height
  if (error) return (
      <div className="flex flex-col items-center justify-center h-[500px] p-8 text-center">
        <p className="text-red-500 mb-6">{error}</p>
        <Button variant="outline" onClick={handleRefresh} className="flex items-center gap-2">
          <RefreshCw size={16} /> Попробовать снова
        </Button>
      </div>
  );

  const renderChartContent = () => {
    if (!hasData) return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <p className="text-muted-foreground mb-6">
            {parentCluster ? `Нет данных для подкатегорий "${parentCluster}"` : "Нет данных для отображения"}
          </p>
          <Button variant="outline" onClick={handleRefresh} className="flex items-center gap-2">
            <RefreshCw size={16} /> Обновить данные
          </Button>
        </div>
    );

    if (viewType === "bar") {
      return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={nonZeroBarData} margin={{ top: 5, right: 5, left: 5, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={90} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} interval={0} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'hsl(var(--accent))', fillOpacity: 0.3 }} />
              <Legend wrapperStyle={{ paddingTop: '10px' }}/>
              <Bar dataKey="requests" name="Количество запросов" onClick={handleBarClick} cursor="pointer" >
                {nonZeroBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColorForCluster(entry.name, index, barData)} opacity={activeIndex === null || activeIndex === index ? 1 : 0.6} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
      );
    } else { // AreaChart
      return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={nonZeroTimeSeriesData} margin={{ top: 5, right: 5, left: 5, bottom: 80 }} onClick={handleAreaClick} >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
              <XAxis dataKey="date" tickFormatter={formatDateLabel} angle={-45} textAnchor="end" height={90} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}/>
              <Tooltip content={<CustomAreaTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }} />
              <Legend wrapperStyle={{ paddingTop: '10px' }}/>
              {areaChartClusters.map((clusterName, index) => {
                const color = getColorForCluster(clusterName, index, barData);
                return (
                    <Area key={clusterName} type="monotone" dataKey={clusterName} name={clusterName} stackId="1" stroke={color} fill={color} fillOpacity={0.6} activeDot={{ r: 6, fill: color, stroke: 'hsl(var(--background))', strokeWidth: 2 }} style={{ cursor: "pointer" }} />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
      );
    }
  };

  return (
      <div className="w-full h-full flex flex-col">
        <div className="flex justify-between mb-4 flex-wrap gap-2">
          {/* Granularity toggle (only for Area chart) */}
          {viewType === "area" && !parentCluster && (
              <div className="flex gap-2">
                <Button variant={granularity === "hour" ? "default" : "outline"} size="sm" onClick={() => setGranularity("hour")} className="flex items-center gap-1"> <Clock size={14} /> <span className="hidden sm:inline">Часы</span> </Button>
                <Button variant={granularity === "day" ? "default" : "outline"} size="sm" onClick={() => setGranularity("day")} className="flex items-center gap-1"> <Calendar size={14} /> <span className="hidden sm:inline">Дни</span> </Button>
                <Button variant={granularity === "week" ? "default" : "outline"} size="sm" onClick={() => setGranularity("week")} className="flex items-center gap-1"> <Calendar size={14} /> <span className="hidden sm:inline">Недели</span> </Button>
              </div>
          )}
          {/* Spacer if granularity controls are not shown */}
          {!(viewType === "area" && !parentCluster) && <div/>}

          {/* View type toggle (only for general view and if data exists) */}
          {!parentCluster && hasData && (
              <Button variant="outline" size="sm" onClick={toggleViewType} className="flex items-center gap-2">
                {viewType === "area" ? (
                    <> <BarChart2 size={16} /> <span className="hidden sm:inline">Гистограмма</span> </>
                ) : (
                    <> <LineChartIcon size={16} /> <span className="hidden sm:inline">График</span> </>
                )}
              </Button>
          )}
          {/* Show disabled button for bar chart view if parentCluster is set */}
          {parentCluster && hasData && (
              <Button variant="outline" size="sm" disabled={true} className="flex items-center gap-2">
                <BarChart2 size={16} />
                <span className="hidden sm:inline">Гистограмма</span>
              </Button>
          )}
        </div>

        {/* Render the chart content */}
        <div className="flex-grow min-h-0"> {/* Make chart area flexible */}
          {renderChartContent()}
        </div>
      </div>
  );
}