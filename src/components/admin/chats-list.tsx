"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface ChatsListProps {
  dateRange: { from: Date; to: Date }
  cluster: string
  subCluster: string
}

interface ChatItem {
  id: string
  title: string
  user: string
  created_at: string
  updated_at: string
  message_count: number
  likes: number
  dislikes: number
}

export function ChatsList({ dateRange, cluster, subCluster }: ChatsListProps) {
  const [chats, setChats] = useState<ChatItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchChats = async () => {
      setIsLoading(true)
      try {
        // In a real implementation, this would fetch from your API
        // For now, we'll use mock data
        setTimeout(() => {
          const mockChats: ChatItem[] = Array.from({ length: 10 }, (_, i) => ({
            id: `chat-${i + 1}`,
            title: `Вопрос по ${subCluster.toLowerCase()} #${i + 1}`,
            user: `user${i + 1}@example.com`,
            created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString(),
            message_count: Math.floor(Math.random() * 20) + 3,
            likes: Math.floor(Math.random() * 3),
            dislikes: Math.floor(Math.random() * 2),
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
  }, [dateRange, cluster, subCluster])

  const handleViewChat = (chatId: string) => {
    router.push(`/admin/chats/${chatId}`)
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

  return (
      <div className="overflow-x-auto">
        <div className="text-sm text-muted-foreground mb-2">Нажмите на чат для просмотра диалога</div>

        {/* Desktop Table */}
        <div className="hidden md:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Заголовок</TableHead>
                <TableHead>Пользователь</TableHead>
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
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {chats.map((chat) => (
              <div
                  key={chat.id}
                  className="border rounded-lg p-4 cursor-pointer hover:bg-muted/80"
                  onClick={() => handleViewChat(chat.id)}
              >
                <div className="font-medium mb-2">{chat.title}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Пользователь:</div>
                  <div>{chat.user}</div>

                  <div className="text-muted-foreground">Создан:</div>
                  <div>{formatDate(new Date(chat.created_at))}</div>

                  <div className="text-muted-foreground">Обновлен:</div>
                  <div>{formatDate(new Date(chat.updated_at))}</div>

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
      </div>
  )
}

