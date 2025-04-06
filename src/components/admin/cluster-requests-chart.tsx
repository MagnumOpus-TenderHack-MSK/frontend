import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BarChart2, LineChart as LineChartIcon, Clock, Calendar, RefreshCw } from "lucide-react";
import { adminApi, ClusterStat } from "@/lib/admin-api";
import { format } from "date-fns";

interface ClusterRequestsChartProps {
  dateRange: { from: Date; to: Date }
  parentCluster?: string
  onClusterClick: (cluster: string) => void
}

type GranularityType = "hour" | "day" | "week";

export function ClusterRequestsChart({ dateRange, parentCluster, onClusterClick }: ClusterRequestsChartProps) {
  const [barData, setBarData] = useState<ClusterStat[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [viewType, setViewType] = useState<"area" | "bar">(() => {
    // Use localStorage if available to persist view preference
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("chartViewType");
      return stored === "area" ? "area" : "bar";
    }
    return "bar"; // Default to bar
  });

  const [granularity, setGranularity] = useState<GranularityType>("hour"); // Default to hourly
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Format date label based on granularity
  const formatDateLabel = useCallback((dateLabel: string) => {
    if (!dateLabel) return "";

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
  }, [granularity]);

  // This function gets available cluster names from time series data
  const getAvailableClustersFromTimeSeries = useCallback((data: any[]) => {
    const clusters = new Set<string>();

    // Extract all property names from all data points that aren't "date"
    data.forEach(dataPoint => {
      Object.keys(dataPoint).forEach(key => {
        if (key !== "date" && dataPoint[key] > 0) {
          clusters.add(key);
        }
      });
    });

    return Array.from(clusters);
  }, []);

  // Function to get a unique color for a cluster
  const getColorForCluster = useCallback((clusterName: string, barData: ClusterStat[]) => {
    // First try to find color in bar data
    const clusterInBarData = barData.find(item => item.name === clusterName);
    if (clusterInBarData?.color) {
      return clusterInBarData.color;
    }

    // Fallback to hash-based color (deterministic based on name)
    let hash = 0;
    for (let i = 0; i < clusterName.length; i++) {
      hash = clusterName.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
  }, []);

  // Get non-zero data points from time series data
  const nonZeroTimeSeriesData = useMemo(() => {
    // First, identify which dates have at least one non-zero value
    const datesWithData = timeSeriesData.filter(item => {
      for (const key in item) {
        if (key !== "date" && item[key] > 0) {
          return true;
        }
      }
      return false;
    });

    // Then for each of those dates, only include categories with non-zero values
    return datesWithData.map(item => {
      const nonZeroItem: any = { date: item.date };
      for (const key in item) {
        if (key !== "date" && item[key] > 0) {
          nonZeroItem[key] = item[key];
        }
      }
      return nonZeroItem;
    });
  }, [timeSeriesData]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");

      // First fetch the bar data (clusters or subclusters based on parent)
      let clusterResponse;
      if (parentCluster) {
        console.log(`Fetching subclusters for parent: ${parentCluster}`);
        clusterResponse = await adminApi.getClusters(parentCluster);
      } else {
        console.log("Fetching general clusters");
        clusterResponse = await adminApi.getClusters();
      }

      console.log("Clusters response:", clusterResponse);

      let clustersData: ClusterStat[] = [];

      if (parentCluster) {
        // For subclusters, use the sub_clusters array
        if (clusterResponse.sub_clusters && Array.isArray(clusterResponse.sub_clusters)) {
          // Include all subclusters in the visualization, even those with zero requests
          clustersData = clusterResponse.sub_clusters;
          console.log(`Loaded ${clustersData.length} subclusters for ${parentCluster}`);
        } else {
          console.warn("No subclusters found in response");
        }
      } else {
        // For top-level view, use general_clusters array
        if (clusterResponse.general_clusters && Array.isArray(clusterResponse.general_clusters)) {
          clustersData = clusterResponse.general_clusters;
          console.log(`Loaded ${clustersData.length} general clusters`);
        } else {
          console.warn("No general clusters found in response");
        }
      }

      // Always set data even if empty - will handle empty case in rendering
      setBarData(clustersData);

      // Then fetch time series data
      try {
        const timeseries = await adminApi.getClusterTimeseries(startDate, endDate, granularity);
        console.log("Timeseries data:", timeseries);

        // Save timeseries data
        if (Array.isArray(timeseries)) {
          setTimeSeriesData(timeseries);
        } else {
          console.warn("Timeseries response is not an array");
          setTimeSeriesData([]);
        }
      } catch (timeseriesError) {
        console.error("Error fetching timeseries data:", timeseriesError);
        setTimeSeriesData([]);
      }
    } catch (error) {
      console.error("Error fetching cluster data:", error);
      setError("Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, parentCluster, granularity]);

  useEffect(() => {
    fetchData();
  }, [fetchData, retryCount]);

  const handleRefresh = () => {
    setRetryCount(prev => prev + 1);
  };

  // Filter bar data to only include non-zero values for display
  const nonZeroBarData = useMemo(() => {
    return barData.filter(item => item.requests > 0);
  }, [barData]);

  // Get available clusters for each chart type
  const barChartClusters = useMemo(() => nonZeroBarData.map(item => item.name), [nonZeroBarData]);

  const areaChartClusters = useMemo(() =>
          getAvailableClustersFromTimeSeries(nonZeroTimeSeriesData),
      [nonZeroTimeSeriesData, getAvailableClustersFromTimeSeries]
  );

  // Check if we have data for each chart type
  const hasBarData = nonZeroBarData.length > 0;
  const hasAreaData = nonZeroTimeSeriesData.length > 0 && areaChartClusters.length > 0;

  // Handle bar click and pass the exact category name to parent component
  const handleBarClick = useCallback((data: any, index: number) => {
    if (data && data.name) {
      console.log(`Bar clicked: ${data.name} at index ${index}`);
      setActiveIndex(index);
      // Pass the exact category/cluster name to the parent
      onClusterClick(data.name);
    }
  }, [onClusterClick]);

  const toggleViewType = useCallback(() => {
    const newType = viewType === "area" ? "bar" : "area";
    setViewType(newType);
    if (typeof window !== "undefined") {
      localStorage.setItem("chartViewType", newType);
    }
  }, [viewType]);

  const changeGranularity = useCallback((newGranularity: GranularityType) => {
    setGranularity(newGranularity);
  }, []);

  if (isLoading) {
    return <Skeleton className="w-full h-[400px]" />;
  }

  // Custom tooltip for bar chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    // Calculate total for percentage calculation
    // (only include displayed bars to match what user sees)
    const total = nonZeroBarData.reduce((sum, item) => sum + item.requests, 0);

    return (
        <div className="bg-background border rounded p-2 shadow-md text-sm z-50">
          <p className="font-medium">{`${label}`}</p>
          <p className="text-sm">{`${payload[0].value} запросов (${((payload[0].value / total) * 100).toFixed(1)}%)`}</p>
        </div>
    );
  };

  // Custom tooltip for area chart
  const CustomAreaTooltip = ({ active, payload, label }: any) => {
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

  // Function to render the appropriate chart
  const renderChart = () => {
    if (viewType === "bar" && hasBarData) {
      return (
          <ResponsiveContainer width="100%" height="90%">
            <BarChart
                data={nonZeroBarData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 12 }}
                  interval={0}
              />
              <YAxis />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend />
              <Bar
                  dataKey="requests"
                  name="Количество запросов"
                  onClick={handleBarClick}
                  cursor="pointer"
              >
                {nonZeroBarData.map((entry, index) => (
                    <Cell
                        key={`cell-${index}`}
                        fill={activeIndex === index ? "#ff7300" : entry.color}
                        opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                    />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
      );
    } else if (viewType === "area" && hasAreaData) {
      return (
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart
                data={nonZeroTimeSeriesData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                  dataKey="date"
                  tickFormatter={formatDateLabel}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip content={<CustomAreaTooltip />} />
              <Legend />
              {areaChartClusters.map((clusterName) => {
                const color = getColorForCluster(clusterName, nonZeroBarData);
                return (
                    <Area
                        key={clusterName}
                        type="monotone"
                        dataKey={clusterName}
                        name={clusterName}
                        stackId="1"
                        stroke={color}
                        fill={color}
                        onClick={() => onClusterClick(clusterName)}
                        style={{ cursor: "pointer" }}
                    />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
      );
    } else {
      // No data available for the selected view type
      return (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <p className="text-muted-foreground mb-6">
              {barData.length > 0
                  ? "Нет данных для выбранного типа графика"
                  : parentCluster
                      ? `Нет подкатегорий с данными для категории "${parentCluster}"`
                      : "Нет категорий с данными"}
            </p>
            {viewType === "area" && (
                <Button
                    variant="outline"
                    onClick={toggleViewType}
                    className="flex items-center gap-2"
                >
                  <BarChart2 size={16} />
                  Переключить на гистограмму
                </Button>
            )}
          </div>
      );
    }
  };

  // Check if we have any data to display
  const hasData = hasBarData || hasAreaData;

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button variant="outline" onClick={handleRefresh} className="flex items-center gap-2">
            <RefreshCw size={16} />
            Обновить данные
          </Button>
        </div>
    );
  }

  return (
      <div className="w-full h-full">
        <div className="flex justify-between mb-4">
          {/* Granularity toggle */}
          <div className="flex gap-2">
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

          {/* View type toggle */}
          {hasData && (
              <Button variant="outline" size="sm" onClick={toggleViewType} className="flex items-center gap-2">
                {viewType === "area" ? (
                    <>
                      <BarChart2 size={16} />
                      <span className="hidden sm:inline">Гистограмма</span>
                    </>
                ) : (
                    <>
                      <LineChartIcon size={16} />
                      <span className="hidden sm:inline">График</span>
                    </>
                )}
              </Button>
          )}
        </div>

        {/* Render the appropriate chart */}
        {renderChart()}
      </div>
  );
}