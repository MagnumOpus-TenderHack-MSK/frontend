import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react"
import { adminApi, AdminChat } from "@/lib/admin-api" // Import AdminChat type
import { format } from "date-fns"

interface ChatsListProps {
  dateRange: { from: Date; to: Date }
  cluster: string
  subCluster: string
}

export function ChatsList({ dateRange, cluster, subCluster }: ChatsListProps) {
  const [chats, setChats] = useState<AdminChat[]>([]) // Use AdminChat type
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const router = useRouter()

  const fetchChats = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const fromDate = format(dateRange.from, "yyyy-MM-dd")
      const toDate = format(dateRange.to, "yyyy-MM-dd")

      console.log(`Fetching chats for cluster: ${cluster}, subCluster: ${subCluster}, from: ${fromDate}, to: ${toDate}`)

      const response = await adminApi.getChats(
          0, // skip
          50, // limit
          cluster,
          subCluster,
          fromDate,
          toDate
      )

      console.log("ChatsList API response:", response);

      // Check if response has items and total properties
      if (response && typeof response.total === 'number' && Array.isArray(response.items)) {
        setChats(response.items);
        setTotal(response.total);
      } else {
        console.warn("Unexpected API response structure for chats:", response);
        setChats([]);
        setTotal(0);
        // You might want to set an error state here if the response is invalid
        // setError("Invalid data received from server");
      }

    } catch (error: any) {
      console.error("Error fetching chats:", error)
      setError(error.message || "Failed to load chat data")
      setChats([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Fetch only if cluster and subCluster are provided
    if (cluster && subCluster) {
      fetchChats()
    } else {
      // Optionally clear state or show a message if required props are missing
      setChats([]);
      setTotal(0);
      setIsLoading(false);
    }
  }, [dateRange, cluster, subCluster]) // Re-fetch when props change

  const handleViewChat = (chatId: string) => {
    router.push(`/admin/chats/${chatId}`)
  }

  const formatDateSafe = (dateString: string | undefined) => {
    if (!dateString) return "Неизвестно";
    try {
      return format(new Date(dateString), "dd.MM.yyyy HH:mm")
    } catch (e) {
      return dateString // Return original string if formatting fails
    }
  }

  const getUserDisplay = (user: AdminChat['user']) => {
    if (!user) return "Неизвестно";
    if (typeof user === 'string') return user; // Handle case where user is just a string/ID
    return user.username || user.email || "Неизвестно"; // Prioritize username, fallback to email
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

  if (total === 0) {
    return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Нет чатов для подкатегории "{subCluster}" в категории "{cluster}" за выбранный период
          </p>
          <Button variant="outline" onClick={fetchChats} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Обновить данные
          </Button>
        </div>
    )
  }

  return (
      <div className="overflow-x-auto">
        <div className="text-sm text-muted-foreground mb-2">
          Найдено {total} чатов в подкатегории "{subCluster}". Нажмите на чат для просмотра диалога.
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
                    <TableCell className="font-medium">{chat.title || "Без заголовка"}</TableCell>
                    <TableCell>{getUserDisplay(chat.user)}</TableCell>
                    <TableCell>{formatDateSafe(chat.created_at)}</TableCell>
                    <TableCell>{formatDateSafe(chat.updated_at)}</TableCell>
                    <TableCell>{chat.message_count ?? 0}</TableCell> {/* Use nullish coalescing */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <ThumbsUp size={14} className="text-green-500 dark:text-green-400" />
                      {chat.likes ?? 0}
                    </span>
                        <span className="flex items-center gap-1">
                      <ThumbsDown size={14} className="text-red-500 dark:text-red-400" />
                          {chat.dislikes ?? 0}
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
                <div className="font-medium mb-2">{chat.title || "Без заголовка"}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Пользователь:</div>
                  <div>{getUserDisplay(chat.user)}</div>

                  <div className="text-muted-foreground">Создан:</div>
                  <div>{formatDateSafe(chat.created_at)}</div>

                  <div className="text-muted-foreground">Обновлен:</div>
                  <div>{formatDateSafe(chat.updated_at)}</div>

                  <div className="text-muted-foreground">Сообщений:</div>
                  <div>{chat.message_count ?? 0}</div>

                  <div className="text-muted-foreground">Оценка:</div>
                  <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <ThumbsUp size={14} className="text-green-500 dark:text-green-400" />
                  {chat.likes ?? 0}
                </span>
                    <span className="flex items-center gap-1">
                  <ThumbsDown size={14} className="text-red-500 dark:text-red-400" />
                      {chat.dislikes ?? 0}
                </span>
                  </div>
                </div>
              </div>
          ))}
        </div>
      </div>
  )
}