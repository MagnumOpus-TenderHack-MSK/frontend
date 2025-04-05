"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/contexts/auth-context"
import { LogOut, Menu, X, Home, BarChart, MessageSquare, Users } from "lucide-react"

export function AdminHeader() {
  const { logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/auth")
  }

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/');
  };

  const navItems = [
    { href: "/", label: "На главную", icon: <Home size={16} /> },
    { href: "/admin", label: "Дашборд", icon: <BarChart size={16} /> },
    { href: "/admin/chats", label: "Все чаты", icon: <MessageSquare size={16} /> },
    { href: "/admin/users", label: "Пользователи", icon: <Users size={16} /> },
  ];

  return (
      <header className="border-b border-border bg-background sticky top-0 z-30">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>

            <Link href="/admin" className="flex items-center gap-2">
              <span className="font-bold text-xl">Портал Поставщиков</span>
              <span className="bg-portal-red text-white text-xs px-2 py-0.5 rounded">Админ</span>
            </Link>
          </div>

          <nav
              className={`${
                  mobileMenuOpen
                      ? "absolute top-16 left-0 right-0 border-b bg-background dark:bg-background p-4 flex flex-col gap-2 shadow-md"
                      : "hidden md:flex"
              } items-center gap-6 transition-all duration-200`}
          >
            {navItems.map(item => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1 text-sm font-medium transition-colors
                ${isActive(item.href)
                        ? "text-primary dark:text-primary"
                        : "text-muted-foreground hover:text-foreground dark:hover:text-foreground"}`}
                    onClick={() => setMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Выйти"
                className="text-muted-foreground hover:text-foreground"
            >
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </header>
  )
}