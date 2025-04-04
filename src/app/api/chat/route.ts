import { NextResponse } from "next/server";
import { mockResponses } from "@/lib/mock-data";

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // In a real application, this would connect to an AI service
        // For now, we'll just pick a random response from our mock data
        const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];

        // Create a ReadableStream to simulate streaming
        const stream = new ReadableStream({
            start(controller) {
                let index = 0;
                const interval = setInterval(() => {
                    if (index < randomResponse.length) {
                        // Stream one character at a time
                        controller.enqueue(new TextEncoder().encode(randomResponse[index]));
                        index++;
                    } else {
                        clearInterval(interval);
                        controller.close();
                    }
                }, 15); // Speed of typing
            },
        });

        return new NextResponse(stream);
    } catch (error) {
        console.error("Error in chat API:", error);
        return NextResponse.json(
            { error: "Произошла ошибка при обработке запроса" },
            { status: 500 }
        );
    }
}