import { NextResponse } from "next/server"

export async function GET(request: Request) {
  // Parse query parameters
  const url = new URL(request.url)
  const fromDate = url.searchParams.get("from")
  const toDate = url.searchParams.get("to")
  const parentCluster = url.searchParams.get("parentCluster")

  // Generate mock data based on parameters
  let data

  if (parentCluster) {
    // Return subclusters for the specified parent cluster
    switch (parentCluster) {
      case "Регистрация":
        data = [
          { name: "Регистрация юр. лиц", requests: 145, color: "#8884d8" },
          { name: "Регистрация ИП", requests: 89, color: "#82ca9d" },
          { name: "Изменение данных", requests: 67, color: "#ffc658" },
          { name: "Восстановление доступа", requests: 42, color: "#ff8042" },
        ]
        break
      case "Закупки":
        data = [
          { name: "Поиск закупок", requests: 212, color: "#8884d8" },
          { name: "Участие в тендерах", requests: 156, color: "#82ca9d" },
          { name: "Котировочные сессии", requests: 98, color: "#ffc658" },
          { name: "Оформление заявок", requests: 46, color: "#ff8042" },
        ]
        break
      case "Техподдержка":
        data = [
          { name: "Проблемы с входом", requests: 87, color: "#8884d8" },
          { name: "Ошибки системы", requests: 65, color: "#82ca9d" },
          { name: "Восстановление пароля", requests: 43, color: "#ffc658" },
          { name: "Другие вопросы", requests: 23, color: "#ff8042" },
        ]
        break
      default:
        data = [
          { name: "Подкатегория 1", requests: 45, color: "#8884d8" },
          { name: "Подкатегория 2", requests: 32, color: "#82ca9d" },
          { name: "Подкатегория 3", requests: 28, color: "#ffc658" },
          { name: "Подкатегория 4", requests: 15, color: "#ff8042" },
        ]
    }
  } else {
    // Return main clusters
    data = [
      { name: "Регистрация", requests: 343, color: "#8884d8" },
      { name: "Закупки", requests: 512, color: "#82ca9d" },
      { name: "Техподдержка", requests: 218, color: "#ffc658" },
      { name: "Документы", requests: 176, color: "#ff8042" },
      { name: "Оплата", requests: 132, color: "#0088FE" },
    ]
  }

  return NextResponse.json(data)
}

