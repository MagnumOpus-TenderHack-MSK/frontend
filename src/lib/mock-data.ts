export type ChatMessage = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
};

export type Chat = {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
};

export type MessageSuggestion = {
    id: string;
    text: string;
    icon: string;
};

// Mock chat history data
export const mockChats: Chat[] = [
    {
        id: "chat-1",
        title: "Вопросы по регистрации",
        messages: [
            {
                id: "msg-1-1",
                role: "user",
                content: "Как мне зарегистрироваться на портале поставщиков?",
                timestamp: new Date("2025-04-03T10:15:00"),
            },
            {
                id: "msg-1-2",
                role: "assistant",
                content: "Для регистрации на Портале поставщиков вам необходимо нажать кнопку 'Зарегистрироваться' в правом верхнем углу сайта. Далее следуйте инструкциям, указанным в [doc:registration-guide](документе с инструкцией).",
                timestamp: new Date("2025-04-03T10:16:00"),
            },
            {
                id: "msg-1-3",
                role: "user",
                content: "Какие документы нужны для регистрации?",
                timestamp: new Date("2025-04-03T10:17:00"),
            },
            {
                id: "msg-1-4",
                role: "assistant",
                content: "Для регистрации на портале вам потребуются следующие документы:\n1. ИНН организации\n2. ОГРН/ОГРНИП\n3. Электронная подпись (КЭП)\n4. Документ, подтверждающий полномочия руководителя\n\nПодробная информация доступна в [doc:required-documents](списке необходимых документов).",
                timestamp: new Date("2025-04-03T10:18:00"),
            },
        ],
        createdAt: new Date("2025-04-03T10:15:00"),
        updatedAt: new Date("2025-04-03T10:18:00"),
    },
    {
        id: "chat-2",
        title: "Технические проблемы",
        messages: [
            {
                id: "msg-2-1",
                role: "user",
                content: "Не могу загрузить документ, выдает ошибку",
                timestamp: new Date("2025-04-03T14:20:00"),
            },
            {
                id: "msg-2-2",
                role: "assistant",
                content: "Извините за неудобства. Пожалуйста, убедитесь, что ваш документ соответствует следующим требованиям:\n- Формат файла: PDF, JPG, PNG или DOC/DOCX\n- Размер файла: не более 10 МБ\n\nЕсли проблема сохраняется, проверьте стабильность вашего интернет-соединения или попробуйте загрузить файл позже. Также вы можете ознакомиться с [doc:upload-troubleshooting](руководством по устранению проблем).",
                timestamp: new Date("2025-04-03T14:22:00"),
            },
        ],
        createdAt: new Date("2025-04-03T14:20:00"),
        updatedAt: new Date("2025-04-03T14:22:00"),
    },
    {
        id: "chat-3",
        title: "Вопрос о закупках",
        messages: [
            {
                id: "msg-3-1",
                role: "user",
                content: "Где я могу найти информацию о текущих закупках в Москве?",
                timestamp: new Date("2025-04-02T09:30:00"),
            },
            {
                id: "msg-3-2",
                role: "assistant",
                content: "Информацию о текущих закупках в Москве вы можете найти в разделе 'Реестр закупок' на главной странице портала. Там вы можете фильтровать закупки по региону, категории товаров или услуг, а также по заказчикам. Для Москвы доступно около 1000 активных закупок с годовым объемом около 54,5 млрд рублей, как указано в статистике региона.",
                timestamp: new Date("2025-04-02T09:32:00"),
            },
        ],
        createdAt: new Date("2025-04-02T09:30:00"),
        updatedAt: new Date("2025-04-02T09:32:00"),
    },
];

// Mock message suggestions
export const mockSuggestions: MessageSuggestion[] = [
    {
        id: "sug-1",
        text: "Как зарегистрироваться на портале?",
        icon: "user-plus",
    },
    {
        id: "sug-2",
        text: "Как найти активные закупки?",
        icon: "search",
    },
    {
        id: "sug-3",
        text: "Что такое котировочная сессия?",
        icon: "help-circle",
    },
    {
        id: "sug-4",
        text: "Как подать заявку на участие?",
        icon: "file-text",
    },
    {
        id: "sug-5",
        text: "Технические проблемы с входом",
        icon: "alert-triangle",
    },
];

// Mock document data
export const mockDocuments = {
    "registration-guide": {
        title: "Инструкция по регистрации на портале",
        url: "/documents/registration-guide.pdf",
    },
    "required-documents": {
        title: "Список необходимых документов",
        url: "/documents/required-documents.pdf",
    },
    "upload-troubleshooting": {
        title: "Руководство по устранению проблем при загрузке файлов",
        url: "/documents/upload-troubleshooting.pdf",
    },
};

// Mock responses
export const mockResponses = [
    "Я виртуальный ассистент Портала поставщиков. Готов ответить на ваши вопросы о регистрации, участии в закупках и работе с платформой.",
    "Это интересный вопрос! Давайте разберемся подробнее...",
    "По данным системы, на Портале зарегистрировано более 180 тысяч поставщиков и около 5 тысяч заказчиков. Ежедневно проводится множество котировочных сессий по различным категориям товаров и услуг.",
    "Для решения этого вопроса вам потребуется выполнить следующие шаги...",
    "В соответствии с регламентом работы Портала поставщиков, данная операция выполняется через личный кабинет в разделе 'Профиль'. Подробные инструкции доступны в соответствующей документации.",
];