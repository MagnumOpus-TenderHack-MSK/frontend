"use client";

import React from "react";
import { FileText } from "lucide-react";
import { mockDocuments } from "@/lib/mock-data";

interface DocumentLinkProps {
    docId: string;
    children: React.ReactNode;
}

export function DocumentLink({ docId, children }: DocumentLinkProps) {
    const document = mockDocuments[docId as keyof typeof mockDocuments];

    if (!document) {
        return <span>{children}</span>;
    }

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        // In a real application, this would navigate to the document
        // or open a document viewer modal
        alert(`Открыт документ: ${document.title}`);
    };

    return (
        <a
            href={document.url}
            className="document-link"
            onClick={handleClick}
            title={document.title}
        >
            <FileText size={16} />
            <span>{children}</span>
        </a>
    );
}