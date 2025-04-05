"use client"

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
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { BarChart2, LineChart } from "lucide-react"

interface ClusterRequestsChartProps {
  dateRange: { from: Date; to: Date }
  parentCluster?: string
  onClusterClick: (cluster: string) => void
}

interface ClusterData {
  name: string
  requests: number
  color: string
}

interface TimeSeriesData {
  date: string
  [key: string]: number | string
}

// Generate random colors for clusters
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

// Store view type in localStorage to persist between sessions
const getStoredViewType = (): "area" | "bar" => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("chartViewType")
    return stored === "bar" ? "bar" : "area"
  }
  return "area"
}

const setStoredViewType = (type: "area" | "bar") => {
  if (typeof window !== "undefined") {
    localStorage.setItem("chartViewType", type)
  }
}

// Generate dates between two dates
const getDatesInRange = (startDate: Date, endDate: Date) => {
  const dates = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dates
}

// Format date to DD.MM
const formatDateShort = (date: Date) => {
  return `${date.getDate().toString().padStart(2, "0")}.${(date.getMonth() + 1).toString().padStart(2, "0")}`
}

export function ClusterRequestsChart({ dateRange, parentCluster, onClusterClick }: ClusterRequestsChartProps) {
  const [barData, setBarData] = useState<ClusterData[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [clusterColors, setClusterColors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [viewType, setViewType] = useState<"area" | "bar">(getStoredViewType())

  useEffect(() => {
    const fetchClusterData = async () => {
      setIsLoading(true)
      try {
        // In a real implementation, this would fetch from your API
        // For now, we'll use mock data
        setTimeout(() => {
          let clusters: ClusterData[] = []
          const colors: Record<string, string> = {}

          if (parentCluster) {
            // If parentCluster is provided, show subclusters
            clusters = [
              { name: "Регистрация юр. лиц", requests: 145, color: getRandomColor() },
              { name: "Регистрация ИП", requests: 89, color: getRandomColor() },
              { name: "Изменение данных", requests: 67, color: getRandomColor() },
              { name: "Восстановление доступа", requests: 42, color: getRandomColor() },
            ]
          } else {
            // Show main clusters
            clusters = [
              { name: "Регистрация", requests: 343, color: getRandomColor() },
              { name: "Закупки", requests: 512, color: getRandomColor() },
              { name: "Техподдержка", requests: 218, color: getRandomColor() },
              { name: "Документы", requests: 176, color: getRandomColor() },
              { name: "Оплата", requests: 132, color: getRandomColor() },
            ]
          }

          // Create color mapping
          clusters.forEach((cluster) => {
            colors[cluster.name] = cluster.color
          })

          setClusterColors(colors)
          setBarData(clusters)

          // Generate time series data for area chart
          const dates = getDatesInRange(dateRange.from, dateRange.to)
          const timeData: TimeSeriesData[] = dates.map((date) => {
            const dateObj: TimeSeriesData = { date: formatDateShort(date) }

            // Add random data for each cluster
            clusters.forEach((cluster) => {
              // Generate a value that's roughly proportional to the total requests
              // but varies day by day
              const baseValue = cluster.requests / dates.length
              const randomFactor = 0.5 + Math.random()
              dateObj[cluster.name] = Math.round(baseValue * randomFactor)
            })

            return dateObj
          })

          setTimeSeriesData(timeData)
          setIsLoading(false)
        }, 1000)
      } catch (error) {
        console.error("Error fetching cluster data:", error)
        setIsLoading(false)
      }
    }

    fetchClusterData()
  }, [dateRange, parentCluster])

  const handleBarClick = (data: any, index: number) => {
    setActiveIndex(index)
    onClusterClick(data.name)
  }

  const handleAreaClick = (props: any) => {
    // Extract the cluster name from the dataKey
    if (props && props.dataKey) {
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
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 12 }} interval={0} />
                <YAxis />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend />
                <Bar dataKey="requests" name="Количество запросов" onClick={handleBarClick} cursor="pointer">
                  {barData.map((entry, index) => (
                      <Cell
                          key={`cell-${index}`}
                          fill={activeIndex === index ? "#ff7300" : entry.color}
                          opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                      />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
        ) : (
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={timeSeriesData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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

