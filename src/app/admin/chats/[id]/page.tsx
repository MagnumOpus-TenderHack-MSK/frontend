"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AdminHeader } from "@/components/admin/admin-header"
import { ChatMessage } from "@/components/chat/chat-message"
import { useAuth } from "@/contexts/auth-context"
import { ArrowLeft } from "lucide-react"
import type { ChatMessage as ChatMessageType } from "@/lib/types"

export default function AdminChatView() {
  const { id } = useParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [chat, setChat] = useState<{
    id: string
    title: string
    user: {
      id: string
      username: string
      email: string
    }
    created_at: string
    updated_at: string
    messages: ChatMessageType[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // No admin check for demo purposes
  // useEffect(() => {
  //   if (!authLoading && (!user || !user.is_admin)) {
  //     router.push("/")
  //   }
  // }, [user, authLoading, router])

  useEffect(() => {
    const fetchChat = async () => {
      setIsLoading(true)
      try {
        // In a real implementation, this would fetch from your API
        // For now, we'll use mock data
        setTimeout(() => {
          const mockMessages: ChatMessageType[] = [
            {
              id: "msg-1",
              chat_id: id as string,
              content: "Здравствуйте! Как мне зарегистрироваться на портале поставщиков?",
              message_type: "USER",
              status: "COMPLETED",
              created_at: new Date(Date.now() - 30 * 60000).toISOString(),
              updated_at: new Date(Date.now() - 30 * 60000).toISOString(),
            },
            {
              id: "msg-2",
              chat_id: id as string,
              content:
                  "Для регистрации на Портале поставщиков вам необходимо:\n\n1. Нажать кнопку 'Зарегистрироваться' в правом верхнем углу сайта\n2. Заполнить форму регистрации, указав данные организации\n3. Загрузить необходимые документы\n4. Подтвердить регистрацию по электронной почте\n\nПосле проверки данных администратором вы получите доступ к личному кабинету.",
              message_type: "AI",
              status: "COMPLETED",
              created_at: new Date(Date.now() - 29 * 60000).toISOString(),
              updated_at: new Date(Date.now() - 29 * 60000).toISOString(),
              reactions: [
                {
                  id: "reaction-1",
                  message_id: "msg-2",
                  reaction_type: "LIKE",
                  created_at: new Date(Date.now() - 28 * 60000).toISOString(),
                },
              ],
            },
            {
              id: "msg-3",
              chat_id: id as string,
              content: "Какие документы нужны для регистрации юридического лица?",
              message_type: "USER",
              status: "COMPLETED",
              created_at: new Date(Date.now() - 27 * 60000).toISOString(),
              updated_at: new Date(Date.now() - 27 * 60000).toISOString(),
            },
            {
              id: "msg-4",
              chat_id: id as string,
              content:
                  "Для регистрации юридического лица на Портале поставщиков вам потребуются следующие документы:\n\n- ИНН организации\n- ОГРН\n- Документ, подтверждающий полномочия руководителя\n- Электронная подпись (КЭП)\n- Учредительные документы\n\nВсе документы должны быть загружены в формате PDF. Максимальный размер каждого файла - 10 МБ.",
              message_type: "AI",
              status: "COMPLETED",
              created_at: new Date(Date.now() - 26 * 60000).toISOString(),
              updated_at: new Date(Date.now() - 26 * 60000).toISOString(),
            },
          ]

          setChat({
            id: id as string,
            title: "Вопрос по регистрации юридического лица",
            user: {
              id: "user-1",
              username: "company123",
              email: "company@example.com",
            },
            created_at: new Date(Date.now() - 30 * 60000).toISOString(),
            updated_at: new Date(Date.now() - 26 * 60000).toISOString(),
            messages: mockMessages,
          })

          setIsLoading(false)
        }, 1000)
      } catch (error) {
        console.error("Error fetching chat:", error)
        setIsLoading(false)
      }
    }

    if (id) {
      fetchChat()
    }
  }, [id])

  const handleBack = () => {
    router.back()
  }

  // No admin check for demo purposes
  // if (authLoading || !user?.is_admin) {
  //   return null // Will redirect in useEffect
  // }

  return (
      <div className="flex min-h-screen flex-col bg-background">
        <AdminHeader />

        <main className="flex-1 p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <Button variant="outline" onClick={handleBack} className="flex items-center gap-2 w-fit">
                <ArrowLeft size={16} />
                Назад
              </Button>

              {isLoading ? <Skeleton className="h-8 w-64" /> : <h1 className="text-2xl font-bold">{chat?.title}</h1>}
            </div>
          </div>

          {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
          ) : chat ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Информация о чате</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">ID чата</dt>
                        <dd className="break-all">{chat.id}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Пользователь</dt>
                        <dd className="break-all">
                          {chat.user.username} ({chat.user.email})
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Создан</dt>
                        <dd>{new Date(chat.created_at).toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Последнее сообщение</dt>
                        <dd>{new Date(chat.updated_at).toLocaleString()}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>История сообщений</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {chat.messages.map((message) => (
                          <ChatMessage key={message.id} message={message} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
          ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Чат не найден</p>
              </div>
          )}
        </main>
      </div>
  )
}

