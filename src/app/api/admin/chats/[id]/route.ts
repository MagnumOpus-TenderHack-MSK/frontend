import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id

  // Generate mock chat data
  const chat = {
    id,
    title: `Чат #${id} - Вопрос по регистрации`,
    user: {
      id: "user-1",
      username: "company123",
      email: "company@example.com",
    },
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60000).toISOString(),
    messages: [
      {
        id: "msg-1",
        chat_id: id,
        content: "Здравствуйте! Как мне зарегистрироваться на портале поставщиков?",
        message_type: "USER",
        status: "COMPLETED",
        created_at: new Date(Date.now() - 30 * 60000).toISOString(),
        updated_at: new Date(Date.now() - 30 * 60000).toISOString(),
      },
      {
        id: "msg-2",
        chat_id: id,
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
        chat_id: id,
        content: "Какие документы нужны для регистрации юридического лица?",
        message_type: "USER",
        status: "COMPLETED",
        created_at: new Date(Date.now() - 27 * 60000).toISOString(),
        updated_at: new Date(Date.now() - 27 * 60000).toISOString(),
      },
      {
        id: "msg-4",
        chat_id: id,
        content:
          "Для регистрации юридического лица на Портале поставщиков вам потребуются следующие документы:\n\n- ИНН организации\n- ОГРН\n- Документ, подтверждающий полномочия руководителя\n- Электронная подпись (КЭП)\n- Учредительные документы\n\nВсе документы должны быть загружены в формате PDF. Максимальный размер каждого файла - 10 МБ.",
        message_type: "AI",
        status: "COMPLETED",
        created_at: new Date(Date.now() - 26 * 60000).toISOString(),
        updated_at: new Date(Date.now() - 26 * 60000).toISOString(),
      },
    ],
  }

  return NextResponse.json(chat)
}

