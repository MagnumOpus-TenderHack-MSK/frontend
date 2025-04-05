import { NextResponse } from "next/server"

export async function GET(request: Request) {
  // Parse query parameters
  const url = new URL(request.url)
  const fromDate = url.searchParams.get("from")
  const toDate = url.searchParams.get("to")
  const cluster = url.searchParams.get("cluster")
  const subCluster = url.searchParams.get("subCluster")

  // Generate mock chats data based on filters
  const chats = Array.from({ length: 10 }, (_, i) => ({
    id: `chat-${i + 1}`,
    title: `Чат #${i + 1} - ${cluster || "Общий"} ${subCluster ? `- ${subCluster}` : ""}`,
    user: `user${Math.floor(Math.random() * 10) + 1}@example.com`,
    created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString(),
    message_count: Math.floor(Math.random() * 20) + 3,
    likes: Math.floor(Math.random() * 3),
    dislikes: Math.floor(Math.=random() * 2),
    cluster:
      cluster || ["Регистрация", "Закупки", "Техподдержка", "Документы", "Оплата"][Math.floor(Math.random() * 5)],
    subCluster: subCluster || ["Вопрос", "Проблема", "Запрос", "Консультация", "Помощь"][Math.floor(Math.random() * 5)],
  }))

  return NextResponse.json(chats)
}

