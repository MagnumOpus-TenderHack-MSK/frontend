"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/admin/date-range-picker"
import { ClusterRequestsChart } from "@/components/admin/cluster-requests-chart"
import { FeedbackChart } from "@/components/admin/feedback-chart"
import { ChatsList } from "@/components/admin/chats-list"
import { AdminHeader } from "@/components/admin/admin-header"
import { AdminStats } from "@/components/admin/admin-stats"
import { ArrowLeft, ChevronRight } from "lucide-react"

export default function AdminDashboard() {
  const router = useRouter()
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 100), // Last 3 days
    to: new Date(),
  })
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null)
  const [selectedSubCluster, setSelectedSubCluster] = useState<string | null>(null)

  const handleClusterClick = (cluster: string) => {
    setSelectedCluster(cluster)
    setSelectedSubCluster(null)
  }

  const handleSubClusterClick = (subCluster: string) => {
    setSelectedSubCluster(subCluster)
  }

  const handleBackToMain = () => {
    setSelectedCluster(null)
    setSelectedSubCluster(null)
  }

  const handleBackToCluster = () => {
    setSelectedSubCluster(null)
  }

  // Render breadcrumb navigation
  const renderBreadcrumb = () => {
    if (!selectedCluster) return null

    return (
        <div className="flex items-center text-sm text-muted-foreground mb-2">
        <span className="cursor-pointer hover:text-foreground" onClick={handleBackToMain}>
          Все категории
        </span>
          <ChevronRight className="h-4 w-4 mx-1" />
          {selectedSubCluster ? (
              <>
            <span className="cursor-pointer hover:text-foreground" onClick={handleBackToCluster}>
              {selectedCluster}
            </span>
                <ChevronRight className="h-4 w-4 mx-1" />
                <span>{selectedSubCluster}</span>
              </>
          ) : (
              <span>{selectedCluster}</span>
          )}
        </div>
    )
  }

  return (
      <div className="flex min-h-screen flex-col bg-background">
        <AdminHeader />

        <main className="flex-1 p-4 md:p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {selectedSubCluster
                    ? `Категория: ${selectedCluster}`
                    : selectedCluster
                        ? `Подкатегории в ${selectedCluster}`
                        : "Панель администратора"}
              </h1>
              <p className="text-muted-foreground">
                {selectedSubCluster
                    ? `Просмотр чатов в подкатегории ${selectedSubCluster}`
                    : selectedCluster
                        ? "Анализ запросов по подкатегориям"
                        : "Аналитика и управление чатами"}
              </p>
              {renderBreadcrumb()}
            </div>

            <div className="flex flex-col md:flex-row gap-2 md:items-center">
              {(selectedCluster || selectedSubCluster) && (
                  <Button
                      variant="outline"
                      onClick={selectedSubCluster ? handleBackToCluster : handleBackToMain}
                      className="flex items-center gap-2"
                  >
                    <ArrowLeft size={16} />
                    {selectedSubCluster ? "К категории" : "К общему обзору"}
                  </Button>
              )}

              <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
            </div>
          </div>

          {!selectedCluster && !selectedSubCluster && (
              <>
                <AdminStats dateRange={dateRange} />

                <Tabs defaultValue="clusters" className="space-y-4">
                  <TabsList className="bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground">
                    <TabsTrigger value="clusters">Запросы по кластерам</TabsTrigger>
                    <TabsTrigger value="feedback">Обратная связь</TabsTrigger>
                  </TabsList>

                  <TabsContent value="clusters" className="space-y-4">
                    <Card className="bg-card text-card-foreground dark:bg-card dark:text-card-foreground">
                      <CardHeader>
                        <CardTitle>Распределение запросов по категориям</CardTitle>
                        <CardDescription>Нажмите на категорию для просмотра подкатегорий</CardDescription>
                      </CardHeader>
                      <CardContent className="h-[400px]">
                        <ClusterRequestsChart dateRange={dateRange} onClusterClick={handleClusterClick} />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="feedback" className="space-y-4">
                    <Card className="bg-card text-card-foreground dark:bg-card dark:text-card-foreground">
                      <CardHeader>
                        <CardTitle>Обратная связь пользователей</CardTitle>
                        <CardDescription>Динамика оценок пользователей за выбранный период</CardDescription>
                      </CardHeader>
                      <CardContent className="h-[400px]">
                        <FeedbackChart dateRange={dateRange} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
          )}

          {selectedCluster && !selectedSubCluster && (
              <Card className="bg-card text-card-foreground dark:bg-card dark:text-card-foreground">
                <CardHeader>
                  <CardTitle>Подкатегории в категории {selectedCluster}</CardTitle>
                  <CardDescription>Нажмите на подкатегорию для просмотра чатов</CardDescription>
                </CardHeader>
                <CardContent className="h-[500px]">
                  <ClusterRequestsChart
                      dateRange={dateRange}
                      parentCluster={selectedCluster}
                      onClusterClick={handleSubClusterClick}
                  />
                </CardContent>
              </Card>
          )}

          {selectedCluster && selectedSubCluster && (
              <Card className="bg-card text-card-foreground dark:bg-card dark:text-card-foreground">
                <CardHeader>
                  <CardTitle>Чаты в подкатегории {selectedSubCluster}</CardTitle>
                  <CardDescription>Нажмите на чат для просмотра диалога</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChatsList dateRange={dateRange} cluster={selectedCluster} subCluster={selectedSubCluster} />
                </CardContent>
              </Card>
          )}
        </main>
      </div>
  )
}