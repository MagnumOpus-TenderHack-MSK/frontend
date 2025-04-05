import { NextResponse } from "next/server"

export async function GET(request: Request) {
  // Parse query parameters
  const url = new URL(request.url)
  const fromDate = url.searchParams.get("from")
  const toDate = url.searchParams.get("to")

  // Generate mock feedback data
  const data = [
    { date: "01.04", likes: 65, dislikes: 12, neutral: 43 },
    { date: "02.04", likes: 72, dislikes: 8, neutral: 51 },
    { date: "03.04", likes: 58, dislikes: 15, neutral: 47 },
    { date: "04.04", likes: 63, dislikes: 10, neutral: 38 },
    { date: "05.04", likes: 80, dislikes: 7, neutral: 55 },
    { date: "06.04", likes: 75, dislikes: 9, neutral: 49 },
    { date: "07.04", likes: 68, dislikes: 11, neutral: 52 },
  ]

  return NextResponse.json(data)
}

