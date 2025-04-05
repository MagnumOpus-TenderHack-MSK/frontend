"use client"

import { useState, useEffect } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

interface FeedbackChartProps {
  dateRange: { from: Date; to: Date }
}

interface FeedbackData {
  date: string
  likes: number
  dislikes: number
  neutral: number
}

export function FeedbackChart({ dateRange }: FeedbackChartProps) {
  const [data, setData] = useState<FeedbackData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFeedbackData = async () => {
      setIsLoading(true)
      try {
        // In a real implementation, this would fetch from your API
        // For now, we'll use mock data
        setTimeout(() => {
          const mockData: FeedbackData[] = [
            { date: "01.04", likes: 65, dislikes: 12, neutral: 43 },
            { date: "02.04", likes: 72, dislikes: 8, neutral: 51 },
            { date: "03.04", likes: 58, dislikes: 15, neutral: 47 },
            { date: "04.04", likes: 63, dislikes: 10, neutral: 38 },
            { date: "05.04", likes: 80, dislikes: 7, neutral: 55 },
            { date: "06.04", likes: 75, dislikes: 9, neutral: 49 },
            { date: "07.04", likes: 68, dislikes: 11, neutral: 52 },
          ]
          setData(mockData)
          setIsLoading(false)
        }, 1000)
      } catch (error) {
        console.error("Error fetching feedback data:", error)
        setIsLoading(false)
      }
    }

    fetchFeedbackData()
  }, [dateRange])

  if (isLoading) {
    return <Skeleton className="w-full h-[400px]" />
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="likes"
          name="Положительные"
          stroke="#4ade80"
          strokeWidth={2}
          activeDot={{ r: 8 }}
        />
        <Line type="monotone" dataKey="dislikes" name="Отрицательные" stroke="#f87171" strokeWidth={2} />
        <Line type="monotone" dataKey="neutral" name="Без оценки" stroke="#94a3b8" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}

