"use client"

import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Citation } from "@/components/ui/citation"

interface Source {
    id: string
    title: string
    content?: string
    url?: string
}

interface MarkdownRendererProps {
    content: string
    messageId?: string
    sources?: Source[]
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, messageId, sources = [] }) => {
    // Process content to replace reference patterns with Citation components
    const processedContent = React.useMemo(() => {
        if (!content) return ""

        // First, find all the references in the text
        const referencePattern = /\[(\d+)\]/g
        const references: Array<{
            index: number
            length: number
            refNum: string
            source?: Source
        }> = []

        let match
        while ((match = referencePattern.exec(content)) !== null) {
            const refNum = match[1]
            const source = sources?.find((s) => s.url === refNum)

            references.push({
                index: match.index,
                length: match[0].length,
                refNum,
                source,
            })
        }

        // If no references found, return the original content
        if (references.length === 0) {
            return content
        }

        // Sort references by their position in the text (to process from end to start)
        references.sort((a, b) => b.index - a.index)

        // Create a React element array by processing the text
        const elements: React.ReactNode[] = []
        let remainingText = content

        // Process references from end to start to avoid index shifts
        for (const ref of references) {
            // Extract the part after the current reference
            const afterRefText = remainingText.slice(ref.index + ref.length)
            if (afterRefText) {
                elements.unshift(
                    <ReactMarkdown
                        key={`text-after-${ref.index}`}
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: ({node, ...props}) => <span {...props} />,
                        }}
                    >
                        {afterRefText}
                    </ReactMarkdown>
                )
            }

            // Add the citation component
            const source = ref.source
            const tooltipText = source
                ? `${source.title}${source.content ? ` - ${source.content}` : ""}`
                : `Ссылка ${ref.refNum}`

            elements.unshift(
                <Citation
                    key={`citation-${ref.index}`}
                    id={ref.refNum}
                    title={tooltipText}
                    url={source?.url}
                    messageId={messageId}
                />
            )

            // Update remaining text to be the part before the current reference
            remainingText = remainingText.slice(0, ref.index)
        }

        // Add the initial text segment if there's any left
        if (remainingText) {
            elements.unshift(
                <ReactMarkdown
                    key="text-start"
                    remarkPlugins={[remarkGfm]}
                    components={{
                        p: ({node, ...props}) => <span {...props} />,
                    }}
                >
                    {remainingText}
                </ReactMarkdown>
            )
        }

        return elements
    }, [content, messageId, sources])

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            {Array.isArray(processedContent) ? (
                processedContent
            ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{processedContent}</ReactMarkdown>
            )}
        </div>
    )
}

export default MarkdownRenderer