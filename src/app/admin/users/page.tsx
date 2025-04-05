"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { AdminHeader } from "@/components/admin/admin-header"
import { useAuth } from "@/contexts/auth-context"
import { formatDate } from "@/lib/utils"

export default function AdminUsersPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // No admin check for demo purposes
  // useEffect(() => {
  //   if (!authLoading && (!user || !user.is_admin)) {
  //     router.push("/");
  //   }
  // }, [user, authLoading, router]);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true)
      try {
        // In a real implementation, this would fetch from your API
        // For now, we'll use mock data
        setTimeout(() => {
          const mockUsers = Array.from({ length: 10 }, (_, i) => ({
            id: `user-${i + 1}`,
            username: `user${i + 1}`,
            email: `user${i + 1}@example.com`,
            full_name: `User ${i + 1}`,
            is_active: Math.random() > 0.2,
            is_admin: i === 0,
            created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
            chat_count: Math.floor(Math.random() * 20),
          }))
          setUsers(mockUsers)
          setIsLoading(false)
        }, 1000)
      } catch (error) {
        console.error("Error fetching users:", error)
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const handleUserClick = (userId: string) => {
    router.push(`/admin/users/${userId}`)
  }

  // No admin check for demo purposes
  // if (authLoading || !user?.is_admin) {
  //   return null; // Will redirect in useEffect
  // }

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

          {/* Desktop Table */}
          <div className="hidden md:block rounded-md border">
            {isLoading ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="w-full h-12" />
                  ))}
                </div>
            ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя пользователя</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Полное имя</TableHead>
                      <TableHead>Дата регистрации</TableHead>
                      <TableHead>Чатов</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                        <TableRow
                            key={user.id}
                            className="cursor-pointer hover:bg-muted/80"
                            onClick={() => handleUserClick(user.id)}
                        >
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.full_name}</TableCell>
                          <TableCell>{formatDate(new Date(user.created_at))} </TableCell>
                          <TableCell>{user.chat_count}</TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-full h-32" />)
                : users.map((user) => (
                    <div
                        key={user.id}
                        className="border rounded-lg p-4 cursor-pointer hover:bg-muted/80"
                        onClick={() => handleUserClick(user.id)}
                    >
                      <div className="font-medium mb-2">{user.username}</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">Email:</div>
                        <div className="truncate">{user.email}</div>

                        <div className="text-muted-foreground">Полное имя:</div>
                        <div className="truncate">{user.full_name}</div>

                        <div className="text-muted-foreground">Дата регистрации:</div>
                        <div>{formatDate(new Date(user.created_at))}</div>

                        <div className="text-muted-foreground">Чатов:</div>
                        <div>{user.chat_count}</div>
                      </div>
                    </div>
                ))}
          </div>
        </main>
      </div>
  )
}

