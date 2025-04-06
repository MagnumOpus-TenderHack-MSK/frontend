"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminHeader } from "@/components/admin/admin-header";
import { adminApi, AdminUser, PaginatedResponse } from "@/lib/admin-api"; // Import AdminUser and PaginatedResponse
import { format } from "date-fns"; // Import format
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function AdminUsersPage() {
  const { push } = useRouter();
  const [usersResponse, setUsersResponse] = useState<PaginatedResponse<AdminUser> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getUsers(); // Assuming getUsers returns PaginatedResponse
      setUsersResponse(data);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      setError(error.message || "Failed to load users");
      setUsersResponse(null); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserClick = (userId: string) => {
    // Navigate to user detail page (if it exists)
    // push(`/admin/users/${userId}`);
    console.log("User clicked:", userId); // Placeholder action
  };

  const formatDateSafe = (dateString: string | undefined) => {
    if (!dateString) return "Неизвестно";
    try {
      // Ensure dateString is treated as UTC if no timezone is specified
      const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
      return format(date, "dd.MM.yyyy HH:mm");
    } catch (e) {
      return dateString;
    }
  };


  return (
      <div className="flex min-h-screen flex-col bg-background">
        <AdminHeader />
        <main className="flex-1 p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Пользователи</h1>
              <p className="text-muted-foreground">Управление пользователями системы</p>
            </div>
          </div>

          {isLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="w-full h-12 rounded-md" />
                ))}
              </div>
          ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-500 mb-4">{error}</p>
                <Button variant="outline" onClick={fetchUsers}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Попробовать снова
                </Button>
              </div>
          ) : usersResponse && usersResponse.items.length > 0 ? (
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя пользователя</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Полное имя</TableHead>
                      <TableHead>Дата регистрации</TableHead>
                      <TableHead>Админ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersResponse.items.map((user) => (
                        <TableRow
                            key={user.id}
                            // className="cursor-pointer hover:bg-muted/80" // Optional: make rows clickable later
                            // onClick={() => handleUserClick(user.id)}
                        >
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.full_name || "Не указано"}</TableCell>
                          <TableCell>{formatDateSafe(user.created_at)}</TableCell>
                          <TableCell>{user.is_admin ? "Да" : "Нет"}</TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* TODO: Add pagination if needed based on usersResponse.total */}
              </div>
          ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Пользователи не найдены.</p>
              </div>
          )}
        </main>
      </div>
  );
}