import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
    content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    return (
        <ReactMarkdown
            className="prose prose-sm dark:prose-invert max-w-none break-words"
            remarkPlugins={[remarkGfm]}
            components={{
                // Override components to ensure proper styling
                a: ({ node, ...props }) => (
                    <a
                        {...props}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                        target="_blank"
                        rel="noreferrer noopener"
                    />
                ),
                ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-6 my-2" />,
                ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-6 my-2" />,
                li: ({ node, ...props }) => <li {...props} className="my-1" />,
                p: ({ node, ...props }) => <p {...props} className="my-2" />,
                h1: ({ node, ...props }) => <h1 {...props} className="text-xl font-bold my-3" />,
                h2: ({ node, ...props }) => <h2 {...props} className="text-lg font-bold my-3" />,
                h3: ({ node, ...props }) => <h3 {...props} className="text-md font-bold my-2" />,
                h4: ({ node, ...props }) => <h4 {...props} className="font-bold my-2" />,
                code: ({ node, inline, className, children, ...props }) => {
                    return inline ? (
                        <code
                            className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono"
                            {...props}
                        >
                            {children}
                        </code>
                    ) : (
                        <pre className="bg-gray-100 dark:bg-gray-800 p-2 my-2 rounded-md overflow-x-auto">
              <code className="text-sm font-mono" {...props}>
                {children}
              </code>
            </pre>
                    );
                }
            }}
        >
            {content}
        </ReactMarkdown>
    );
};

export default MarkdownRenderer;