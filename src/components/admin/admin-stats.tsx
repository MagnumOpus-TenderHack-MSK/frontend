import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, MessageSquare, ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react"
import { adminApi } from "@/lib/admin-api"
import { format } from "date-fns"

interface AdminStatsProps {
  dateRange: { from: Date; to: Date }
}

export function AdminStats({ dateRange }: AdminStatsProps) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeChats: 0,
    positiveReactions: 0,
    negativeReactions: 0,
    isLoading: true,
    error: null as string | null
  })

  const fetchStats = async () => {
    try {
      setStats(prev => ({ ...prev, isLoading: true, error: null }))

      // Format dates for API
      const fromDate = format(dateRange.from, "yyyy-MM-dd")
      const toDate = format(dateRange.to, "yyyy-MM-dd")

      // Fetch stats from the backend
      const statsData = await adminApi.getStats(fromDate, toDate)

      setStats({
        totalUsers: statsData.totalUsers,
        activeChats: statsData.activeChats,
        positiveReactions: statsData.positiveReactions,
        negativeReactions: statsData.negativeReactions,
        isLoading: false,
        error: null
      })
    } catch (error) {
      console.error("Error fetching admin stats:", error)
      // If error occurs, maintain the previous data but mark as not loading
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: "Failed to load statistics"
      }))
    }
  }

  useEffect(() => {
    fetchStats()
  }, [dateRange])

  return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Users Card */}
        <Card className="bg-card text-card-foreground dark:bg-card dark:text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего пользователей</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
                <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            )}
            {stats.error && (
                <div className="mt-2 flex justify-between items-center">
                  <p className="text-xs text-red-500">{stats.error}</p>
                  <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchStats}
                      className="p-0 h-6 w-6"
                  >
                    <RefreshCw size={12} />
                  </Button>
                </div>
            )}
          </CardContent>
        </Card>

        {/* Active Chats Card */}
        <Card className="bg-card text-card-foreground dark:bg-card dark:text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные чаты</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
                <div className="text-2xl font-bold">{stats.activeChats.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>

        {/* Positive Reactions Card */}
        <Card className="bg-card text-card-foreground dark:bg-card dark:text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Положительные оценки</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
                <div className="text-2xl font-bold text-green-500 dark:text-green-400">
                  {stats.positiveReactions.toLocaleString()}
                </div>
            )}
          </CardContent>
        </Card>

        {/* Negative Reactions Card */}
        <Card className="bg-card text-card-foreground dark:bg-card dark:text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Отрицательные оценки</CardTitle>
            <ThumbsDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
                <div className="text-2xl font-bold text-red-500 dark:text-red-400">
                  {stats.negativeReactions.toLocaleString()}
                </div>
            )}
          </CardContent>
        </Card>
      </div>
  )
}