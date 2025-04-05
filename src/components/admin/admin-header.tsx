"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/contexts/auth-context"
import { LogOut, Menu, X, Home } from "lucide-react"

export function AdminHeader() {
  const { logout } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/auth")
  }

  return (
    <header className="border-b border-border bg-background sticky top-0 z-30">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>

          <Link href="/admin" className="flex items-center gap-2">
            <span className="font-bold text-xl">Портал Поставщиков</span>
            <span className="bg-portal-red text-white text-xs px-2 py-0.5 rounded">Админ</span>
          </Link>
        </div>

        <nav
          className={`${mobileMenuOpen ? "absolute top-16 left-0 right-0 border-b bg-background p-4 flex flex-col gap-2" : "hidden md:flex"} items-center gap-6`}
        >
          <Link href="/" className="flex items-center gap-1 text-sm font-medium">
            <Home size={16} />
            <span>На главную</span>
          </Link>
          <Link href="/admin" className="text-sm font-medium">
            Дашборд
          </Link>
          <Link href="/admin/chats" className="text-sm font-medium">
            Все чаты
          </Link>
          <Link href="/admin/users" className="text-sm font-medium">
            Пользователи
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Выйти">
            <LogOut size={20} />
          </Button>
        </div>
      </div>
    </header>
  )
}

