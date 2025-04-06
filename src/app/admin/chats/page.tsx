"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AdminHeader } from "@/components/admin/admin-header";
import { DateRangePicker } from "@/components/admin/date-range-picker";
import { adminApi, AdminChat } from "@/lib/admin-api"; // Use AdminChat type
import { format } from "date-fns";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { addDays } from "date-fns"; // Import addDays

export default function AdminChatsPage() {
  const router = useRouter();
  const [chats, setChats] = useState<AdminChat[]>([]); // Use AdminChat type
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30), // Default last 30 days
    to: new Date(),
  });
  const [error, setError] = useState<string | null>(null);

  const pageSize = 10;

  useEffect(() => {
    const fetchChats = async () => {
      setIsLoading(true);
      setError(null); // Reset error on new fetch
      try {
        const fromDate = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
        const toDate = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

        const response = await adminApi.getChats(
            currentPage * pageSize,
            pageSize,
            undefined, // No cluster filter on this page
            undefined, // No subCluster filter on this page
            fromDate,
            toDate
        );

        if (response && typeof response.total === 'number' && Array.isArray(response.items)) {
          setChats(response.items);
          setTotal(response.total);
        } else {
          console.warn("Unexpected API response structure for all chats:", response);
          setChats([]);
          setTotal(0);
          setError("Invalid data received from server");
        }

      } catch (error: any) {
        console.error("Error fetching admin chats:", error);
        setError(error.message || "Failed to load chats");
        setChats([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();
  }, [currentPage, dateRange]); // Rerun effect when page or date range changes

  const handleViewChat = (chatId: string) => {
    router.push(`/admin/chats/${chatId}`);
  };

  const formatDateSafe = (dateString: string | undefined) => {
    if (!dateString) return "Неизвестно";
    try {
      return format(new Date(dateString), "dd.MM.yyyy HH:mm");
    } catch (e) {
      return dateString; // Return original if formatting fails
    }
  };

  // Helper function to safely display user information
  const getUserDisplay = (user: AdminChat['user']): string => {
    if (!user) return "Неизвестно";
    if (typeof user === 'string') return user; // Handle case where user is just a string/ID
    return user.username || user.email || "Неизвестно"; // Prioritize username, fallback to email
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
      <div className="flex min-h-screen flex-col bg-background">
        <AdminHeader />
        <main className="flex-1 p-4 md:p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Все чаты</h1>
              <p className="text-muted-foreground">Просмотр и управление чатами пользователей</p>
            </div>
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            {isLoading ? "Загрузка..." : error ? (
                <span className="text-red-500">{error}</span>
            ) : total > 0 ? (
                `Найдено ${total} чатов. Нажмите на чат для просмотра диалога.`
            ) : (
                "Нет чатов для отображения в выбранный период."
            )}
          </div>

          {/* Desktop view */}
          <div className="hidden md:block rounded-md border dark:border-gray-700">
            {isLoading ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="w-full h-12" />
                  ))}
                </div>
            ) : chats.length > 0 ? ( // Render table only if there are chats
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-muted/50 dark:hover:bg-muted/50">
                      <TableHead className="text-muted-foreground">Заголовок</TableHead>
                      <TableHead className="text-muted-foreground">Пользователь</TableHead>
                      <TableHead className="text-muted-foreground">Категории</TableHead>
                      <TableHead className="text-muted-foreground">Создан</TableHead>
                      <TableHead className="text-muted-foreground">Обновлен</TableHead>
                      <TableHead className="text-muted-foreground">Сообщений</TableHead>
                      <TableHead className="text-muted-foreground">Оценка</TableHead>
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
                          {/* Use helper function to display user */}
                          <TableCell>{getUserDisplay(chat.user)}</TableCell>
                          <TableCell>{chat.categories?.join(", ") || "Нет"}</TableCell>
                          <TableCell>{formatDateSafe(chat.created_at)}</TableCell>
                          <TableCell>{formatDateSafe(chat.updated_at)}</TableCell>
                          <TableCell>{chat.message_count ?? 0}</TableCell>
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
            ) : null /* Don't render table if no chats */ }
          </div>

          {/* Mobile view */}
          <div className="md:hidden space-y-4">
            {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="w-full h-32" />
                ))
            ) : (
                chats.map((chat) => (
                    <div
                        key={chat.id}
                        className="border dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewChat(chat.id)}
                    >
                      <h3 className="font-medium mb-2">{chat.title || "Без заголовка"}</h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div className="text-muted-foreground">Пользователь:</div>
                        {/* Use helper function to display user */}
                        <div className="truncate">{getUserDisplay(chat.user)}</div>

                        <div className="text-muted-foreground">Категории:</div>
                        <div className="truncate">{chat.categories?.join(", ") || "Нет"}</div>

                        <div className="text-muted-foreground">Создан:</div>
                        <div>{formatDateSafe(chat.created_at)}</div>

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
                ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && !isLoading && ( // Hide pagination during loading
              <div className="flex justify-center mt-6">
                <div className="flex gap-2">
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                  >
                    Предыдущая
                  </Button>

                  <span className="text-sm p-2">
                 Стр. {currentPage + 1} из {totalPages}
               </span>

                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                      disabled={currentPage === totalPages - 1}
                  >
                    Следующая
                  </Button>
                </div>
              </div>
          )}
        </main>
      </div>
  );
}