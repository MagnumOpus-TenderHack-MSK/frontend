import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Админ панель - Портал Поставщиков",
  description: "Панель администратора для управления чатами и аналитики",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen bg-background">{children}</div>
}

