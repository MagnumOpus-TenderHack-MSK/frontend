"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Shield } from "lucide-react"

export function MainNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      <Link
        href="/"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/" ? "text-primary" : "text-muted-foreground",
        )}
      >
        Главная
      </Link>
      <Link
        href="/help"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/help" ? "text-primary" : "text-muted-foreground",
        )}
      >
        Помощь
      </Link>
        <Link href="/admin">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Shield size={14} />
                Админ панель
            </Button>
        </Link>
    </nav>
  )
}

