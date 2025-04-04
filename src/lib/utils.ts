import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Format date to a readable string
export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

// Check if a string contains a document reference pattern
export function containsDocumentReference(text: string): boolean {
    // Match patterns like [doc:123] or [document:some-id]
    const docPattern = /\[(doc|document):([^\]]+)\]/g;
    return docPattern.test(text);
}

// Extract document references from text
export function extractDocumentReferences(text: string): { id: string; text: string }[] {
    const docPattern = /\[(doc|document):([^\]]+)\]\(([^)]+)\)/g;
    const matches = [...text.matchAll(docPattern)];

    return matches.map((match) => ({
        id: match[2],
        text: match[3]
    }));
}

// Replace document references with links
export function replaceDocumentReferences(text: string): string {
    // Replace [doc:id](text) with <span class="document-link" data-doc-id="id">text</span>
    return text.replace(
        /\[(doc|document):([^\]]+)\]\(([^)]+)\)/g,
        '<span class="document-link" data-doc-id="$2">$3</span>'
    );
}