import { useState, useEffect } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { BarChart2, LineChart } from "lucide-react"
import { adminApi, ClusterStat } from "@/lib/admin-api"
import { format } from "date-fns"

interface ClusterRequestsChartProps {
  dateRange: { from: Date; to: Date }
  parentCluster?: string
  onClusterClick: (cluster: string) => void
}

export function ClusterRequestsChart({ dateRange, parentCluster, onClusterClick }: ClusterRequestsChartProps) {
  const [barData, setBarData] = useState<ClusterStat[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([])
  const [clusterColors, setClusterColors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [viewType, setViewType] = useState<"area" | "bar">(() => {
    // Use localStorage if available to persist view preference
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("chartViewType")
      return stored === "bar" ? "bar" : "area"
    }
    return "area"
  })
  const [error, setError] = useState<string | null>(null)

  // Get random colors for clusters if not provided
  const getRandomColor = () => {
    const colors = [
      "#8884d8",
      "#82ca9d",
      "#ffc658",
      "#ff8042",
      "#0088FE",
      "#00C49F",
      "#FFBB28",
      "#FF8042",
      "#a4de6c",
      "#d0ed57",
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  // Store view type in localStorage
  const setStoredViewType = (type: "area" | "bar") => {
    if (typeof window !== "undefined") {
      localStorage.setItem("chartViewType", type)
    }
  }

  useEffect(() => {
    const fetchClusterData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch bar data (either main clusters or subclusters)
        const clustersResponse = await adminApi.getClusters(parentCluster)
        let clusters: ClusterStat[] = []

        // Use the appropriate data based on parent cluster
        if (parentCluster) {
          clusters = clustersResponse.sub_clusters || []
        } else {
          clusters = clustersResponse.general_clusters || []
        }

        // Filter out clusters with zero requests
        clusters = clusters.filter(cluster => cluster.requests > 0)

        // If no clusters with data, provide a message
        if (clusters.length === 0) {
          setError("No data available for the selected period")
        }

        // Add colors if not present
        const colors: Record<string, string> = {}
        clusters.forEach(cluster => {
          if (!cluster.color) {
            cluster.color = getRandomColor()
          }
          colors[cluster.name] = cluster.color
        })

        setClusterColors(colors)
        setBarData(clusters)

        // Format dates for the API request
        const startDate = format(dateRange.from, "yyyy-MM-dd")
        const endDate = format(dateRange.to, "yyyy-MM-dd")

        try {
          // Fetch time series data
          const timeseries = await adminApi.getClusterTimeseries(startDate, endDate)
          setTimeSeriesData(timeseries)
        } catch (timeseriesError) {
          console.error("Error fetching timeseries data:", timeseriesError)
          // Don't fail the whole component if just timeseries fails
          setTimeSeriesData([])
        }

      } catch (error) {
        console.error("Error fetching cluster data:", error)
        setError("Failed to load data. Please try again later.")
        setBarData([])
        setTimeSeriesData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchClusterData()
  }, [dateRange, parentCluster])

  const handleBarClick = (data: any, index: number) => {
    if (data && data.name) {
      setActiveIndex(index)
      onClusterClick(data.name)
    }
  }

  const handleAreaClick = (props: any) => {
    // Extract the cluster name from the dataKey
    if (props && props.dataKey && props.dataKey !== "date") {
      onClusterClick(props.dataKey)
    }
  }

  const toggleViewType = () => {
    const newType = viewType === "area" ? "bar" : "area"
    setViewType(newType)
    setStoredViewType(newType)
  }

  if (isLoading) {
    return <Skeleton className="w-full h-[400px]" />
  }

  if (error && barData.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-12 text-center">
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload Data
          </Button>
        </div>
    )
  }

  // Custom tooltip for bar chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    const total = barData.reduce((sum, item) => sum + item.requests, 0)

    return (
        <div className="bg-background border rounded p-2 shadow-md text-sm z-50">
          <p className="font-medium">{`${label}`}</p>
          <p className="text-sm">{`${payload[0].value} запросов (${((payload[0].value / total) * 100).toFixed(1)}%)`}</p>
        </div>
    )
  }

  // Custom tooltip for area chart
  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    return (
        <div className="bg-background border rounded p-2 shadow-md text-sm z-50">
          <p className="font-medium">{`Дата: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
              <p key={`item-${index}`} style={{ color: entry.color }} className="text-sm">
                {`${entry.name}: ${entry.value} запросов`}
              </p>
          ))}
        </div>
    )
  }

  // Handle no data case
  if (barData.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-muted-foreground">Нет данных для отображения</p>
        </div>
    )
  }

  return (
      <div className="w-full h-full">
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={toggleViewType} className="flex items-center gap-2">
            {viewType === "area" ? (
                <>
                  <BarChart2 size={16} />
                  <span className="hidden sm:inline">Гистограмма</span>
                </>
            ) : (
                <>
                  <LineChart size={16} />
                  <span className="hidden sm:inline">Временная шкала</span>
                </>
            )}
          </Button>
        </div>

        {viewType === "bar" ? (
            <ResponsiveContainer width="100%" height="90%">
              <BarChart
                  data={barData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  // Fixing 'this is undefined' error by using arrow function
                  onClick={(data) => { /*Do nothing, we handle in cell click*/ }}
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
                    // Fix method binding issues by using a function that calls handleBarClick
                    onClick={(data, index) => handleBarClick(data, index)}
                    cursor="pointer"
                >
                  {barData.map((entry, index) => (
                      <Cell
                          key={`cell-${index}`}
                          fill={activeIndex === index ? "#ff7300" : entry.color}
                          opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                          // Fix 'this is undefined' by using arrow function
                          onClick={() => handleBarClick(entry, index)}
                      />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
        ) : (
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart
                  data={timeSeriesData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<CustomAreaTooltip />} />
                <Legend />
                {barData.map((cluster) => (
                    <Area
                        key={cluster.name}
                        type="monotone"
                        dataKey={cluster.name}
                        name={cluster.name}
                        stackId="1"
                        stroke={cluster.color}
                        fill={cluster.color}
                        // Fix 'this is undefined' by using arrow function
                        onClick={() => onClusterClick(cluster.name)}
                        style={{ cursor: "pointer" }}
                    />
                ))}
              </AreaChart>
            </ResponsiveContainer>
        )}
      </div>
  )
}