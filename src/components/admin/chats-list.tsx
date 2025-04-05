import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react"
import { adminApi } from "@/lib/admin-api"
import { format } from "date-fns"

interface ChatsListProps {
  dateRange: { from: Date; to: Date }
  cluster: string
  subCluster: string
}

export function ChatsList({ dateRange, cluster, subCluster }: ChatsListProps) {
  const [chats, setChats] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const router = useRouter()

  const fetchChats = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Format dates for API
      const fromDate = format(dateRange.from, "yyyy-MM-dd")
      const toDate = format(dateRange.to, "yyyy-MM-dd")

      console.log(`Fetching chats for cluster: ${cluster}, subCluster: ${subCluster}, from: ${fromDate}, to: ${toDate}`)

      // Fetch chats filtered by cluster and subcluster
      const response = await adminApi.getChats(
          0, // skip
          50, // limit
          cluster,
          subCluster,
          fromDate,
          toDate
      )

      if (Array.isArray(response)) {
        // Handle case where API returns array directly
        const filteredChats = response.filter(chat => {
          // Only show chats that belong to this subcluster
          return chat.subcategories &&
              chat.subcategories.includes(subCluster);
        });

        setChats(filteredChats)
        setTotal(filteredChats.length)
      } else {
        // Handle paginated response
        const filteredChats = response.items.filter(chat => {
          // Only show chats that belong to this subcluster
          return chat.subcategories &&
              chat.subcategories.includes(subCluster);
        });

        setChats(filteredChats)
        setTotal(filteredChats.length)
      }
    } catch (error) {
      console.error("Error fetching chats:", error)
      setError("Failed to load chat data")
      setChats([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchChats()
  }, [dateRange, cluster, subCluster])

  const handleViewChat = (chatId: string) => {
    router.push(`/admin/chats/${chatId}`)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd.MM.yyyy HH:mm")
    } catch (e) {
      return dateString
    }
  }

  if (isLoading) {
    return (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-12" />
          ))}
        </div>
    )
  }

  if (error) {
    return (
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchChats}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Попробовать снова
          </Button>
        </div>
    )
  }

  if (chats.length === 0) {
    return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Нет чатов для подкатегории "{subCluster}" в выбранный период</p>
        </div>
    )
  }

  return (
      <div className="overflow-x-auto">
        <div className="text-sm text-muted-foreground mb-2">
          {total > 0 ? `Найдено ${total} чатов в подкатегории "${subCluster}". Нажмите на чат для просмотра диалога` : 'Нет чатов для отображения'}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block rounded-md border dark:border-gray-700">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/50 dark:hover:bg-muted/50">
                <TableHead className="text-muted-foreground dark:text-muted-foreground">Заголовок</TableHead>
                <TableHead className="text-muted-foreground dark:text-muted-foreground">Пользователь</TableHead>
                <TableHead className="text-muted-foreground dark:text-muted-foreground">Создан</TableHead>
                <TableHead className="text-muted-foreground dark:text-muted-foreground">Обновлен</TableHead>
                <TableHead className="text-muted-foreground dark:text-muted-foreground">Сообщений</TableHead>
                <TableHead className="text-muted-foreground dark:text-muted-foreground">Оценка</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chats.map((chat) => (
                  <TableRow
                      key={chat.id}
                      className="cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/50"
                      onClick={() => handleViewChat(chat.id)}
                  >
                    <TableCell className="font-medium">{chat.title}</TableCell>
                    <TableCell>{chat.user}</TableCell>
                    <TableCell>{formatDate(chat.created_at)}</TableCell>
                    <TableCell>{formatDate(chat.updated_at)}</TableCell>
                    <TableCell>{chat.message_count}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <ThumbsUp size={14} className="text-green-500 dark:text-green-400" />
                      {chat.likes || 0}
                    </span>
                        <span className="flex items-center gap-1">
                      <ThumbsDown size={14} className="text-red-500 dark:text-red-400" />
                          {chat.dislikes || 0}
                    </span>
                      </div>
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {chats.map((chat) => (
              <div
                  key={chat.id}
                  className="border dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/50"
                  onClick={() => handleViewChat(chat.id)}
              >
                <div className="font-medium mb-2">{chat.title}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Пользователь:</div>
                  <div>{chat.user}</div>

                  <div className="text-muted-foreground">Создан:</div>
                  <div>{formatDate(chat.created_at)}</div>

                  <div className="text-muted-foreground">Обновлен:</div>
                  <div>{formatDate(chat.updated_at)}</div>

                  <div className="text-muted-foreground">Сообщений:</div>
                  <div>{chat.message_count}</div>

                  <div className="text-muted-foreground">Оценка:</div>
                  <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <ThumbsUp size={14} className="text-green-500 dark:text-green-400" />
                  {chat.likes || 0}
                </span>
                    <span className="flex items-center gap-1">
                  <ThumbsDown size={14} className="text-red-500 dark:text-red-400" />
                      {chat.dislikes || 0}
                </span>
                  </div>
                </div>
              </div>
          ))}
        </div>
      </div>
  )
}