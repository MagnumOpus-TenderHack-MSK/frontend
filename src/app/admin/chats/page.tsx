"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { AdminHeader } from "@/components/admin/admin-header"
import { DateRangePicker } from "@/components/admin/date-range-picker"
import { useAuth } from "@/contexts/auth-context"
import { formatDate } from "@/lib/utils"
import { ThumbsUp, ThumbsDown } from "lucide-react"

export default function AdminChatsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [chats, setChats] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date(),
  })

  // No admin check for demo purposes
  // useEffect(() => {
  //   if (!authLoading && (!user || !user.is_admin)) {
  //     router.push("/");
  //   }
  // }, [user, authLoading, router]);

  useEffect(() => {
    const fetchChats = async () => {
      setIsLoading(true)
      try {
        // In a real implementation, this would fetch from your API
        // For now, we'll use mock data
        setTimeout(() => {
          const mockChats = Array.from({ length: 20 }, (_, i) => ({
            id: `chat-${i + 1}`,
            title: `Чат #${i + 1} - ${["Регистрация", "Закупки", "Техподдержка", "Документы", "Оплата"][Math.floor(Math.random() * 5)]}`,
            user: `user${Math.floor(Math.random() * 10) + 1}@example.com`,
            created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            message_count: Math.floor(Math.random() * 30) + 2,
            likes: Math.floor(Math.random() * 5),
            dislikes: Math.floor(Math.random() * 3),
            cluster: ["Регистрация", "Закупки", "Техподдержка", "Документы", "Оплата"][Math.floor(Math.random() * 5)],
            subcluster: ["Вопрос", "Проблема", "Запрос", "Консультация", "Помощь"][Math.floor(Math.random() * 5)],
          }))
          setChats(mockChats)
          setIsLoading(false)
        }, 1000)
      } catch (error) {
        console.error("Error fetching chats:", error)
        setIsLoading(false)
      }
    }

    fetchChats()
  }, [dateRange])

  const handleViewChat = (chatId: string) => {
    router.push(`/admin/chats/${chatId}`)
  }

  // No admin check for demo purposes
  // if (authLoading || !user?.is_admin) {
  //   return null; // Will redirect in useEffect
  // }

  return (
      <div className="flex min-h-screen flex-col bg-background">
        <AdminHeader />

        <main className="flex-1 p-4 md:p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Все чаты</h1>
              <p className="text-muted-foreground">Просмотр и управление чатами пользователей</p>
            </div>

            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>

          <div className="text-sm text-muted-foreground mb-2">Нажмите на чат для просмотра диалога</div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-md border">
            {isLoading ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="w-full h-12" />
                  ))}
                </div>
            ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Заголовок</TableHead>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead>Подкатегория</TableHead>
                      <TableHead>Создан</TableHead>
                      <TableHead>Обновлен</TableHead>
                      <TableHead>Сообщений</TableHead>
                      <TableHead>Оценка</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chats.map((chat) => (
                        <TableRow
                            key={chat.id}
                            className="cursor-pointer hover:bg-muted/80"
                            onClick={() => handleViewChat(chat.id)}
                        >
                          <TableCell className="font-medium">{chat.title}</TableCell>
                          <TableCell>{chat.user}</TableCell>
                          <TableCell>{chat.cluster}</TableCell>
                          <TableCell>{chat.subcluster}</TableCell>
                          <TableCell>{formatDate(new Date(chat.created_at))}</TableCell>
                          <TableCell>{formatDate(new Date(chat.updated_at))}</TableCell>
                          <TableCell>{chat.message_count}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <ThumbsUp size={14} className="text-green-500" />
                          {chat.likes}
                        </span>
                              <span className="flex items-center gap-1">
                          <ThumbsDown size={14} className="text-red-500" />
                                {chat.dislikes}
                        </span>
                            </div>
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-full h-32" />)
                : chats.map((chat) => (
                    <div
                        key={chat.id}
                        className="border rounded-lg p-4 cursor-pointer hover:bg-muted/80"
                        onClick={() => handleViewChat(chat.id)}
                    >
                      <div className="font-medium mb-2">{chat.title}</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">Пользователь:</div>
                        <div className="truncate">{chat.user}</div>

                        <div className="text-muted-foreground">Категория:</div>
                        <div>{chat.cluster}</div>

                        <div className="text-muted-foreground">Подкатегория:</div>
                        <div>{chat.subcluster}</div>

                        <div className="text-muted-foreground">Создан:</div>
                        <div>{formatDate(new Date(chat.created_at))}</div>

                        <div className="text-muted-foreground">Сообщений:</div>
                        <div>{chat.message_count}</div>

                        <div className="text-muted-foreground">Оценка:</div>
                        <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <ThumbsUp size={14} className="text-green-500" />
                        {chat.likes}
                      </span>
                          <span className="flex items-center gap-1">
                        <ThumbsDown size={14} className="text-red-500" />
                            {chat.dislikes}
                      </span>
                        </div>
                      </div>
                    </div>
                ))}
          </div>
        </main>
      </div>
  )
}

