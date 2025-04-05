import React, { useState, useEffect, useRef } from "react";
import { MarkdownRenderer } from "./markdown-renderer";

interface TypingAnimationProps {
    content: string;                      // Full content to be displayed
    isCompleted: boolean;                 // Whether the full message has been received
    speed?: number;                       // Characters per tick
    initialDelay?: number;                // Delay before starting animation
    onComplete?: () => void;              // Callback when animation completes
}

export const TypingAnimation: React.FC<TypingAnimationProps> = ({
                                                                    content,
                                                                    isCompleted,
                                                                    speed = 70,
                                                                    initialDelay = 0,
                                                                    onComplete
                                                                }) => {
    // State for currently displayed text - this is what gets rendered
    const [displayedText, setDisplayedText] = useState("");

    // Refs to track animation state
    const contentRef = useRef(content);
    const typingPositionRef = useRef(0);
    const animationFrameRef = useRef<number | null>(null);
    const initialDelayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasCalledOnCompleteRef = useRef(false);

    // Debug logging helper
    const logDebug = (message: string) => {
        console.log(`[TypingAnimation] ${message}`);
    };

    // Simple animation function that steps through the text
    const animate = () => {
        // If we've typed all available content, stop animation
        if (typingPositionRef.current >= contentRef.current.length) {
            if (onComplete && !hasCalledOnCompleteRef.current) {
                hasCalledOnCompleteRef.current = true;
                onComplete();
            }
            animationFrameRef.current = null;
            return;
        }

        // Calculate how many characters to type in this frame
        const charsToAdd = Math.max(1, Math.floor(speed / 100));

        // Update the displayed text to include more characters
        const newPosition = Math.min(typingPositionRef.current + charsToAdd, contentRef.current.length);
        const newText = contentRef.current.substring(0, newPosition);
        setDisplayedText(newText);

        // Update the typing position for next frame
        typingPositionRef.current = newPosition;

        // Schedule next animation frame
        animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Track content changes
    useEffect(() => {
        // Always update our content reference
        contentRef.current = content;

        // If content has changed (new chunks arrived)
        if (content.length > typingPositionRef.current) {
            logDebug(`Content updated: ${content.length} chars (currently at position ${typingPositionRef.current})`);

            // If no animation is running, start one
            if (!animationFrameRef.current) {
                // If this is initial content, apply initialDelay
                if (typingPositionRef.current === 0 && initialDelay > 0) {
                    if (initialDelayTimeoutRef.current) {
                        clearTimeout(initialDelayTimeoutRef.current);
                    }
                    initialDelayTimeoutRef.current = setTimeout(() => {
                        animationFrameRef.current = requestAnimationFrame(animate);
                    }, initialDelay);
                } else {
                    // Otherwise start animation immediately
                    animationFrameRef.current = requestAnimationFrame(animate);
                }
            }
            // If animation is already running, it will continue to the new end
        }
    }, [content, initialDelay]);

    // Handle completion state changes
    useEffect(() => {
        if (isCompleted) {
            logDebug(`Message marked as complete, text length: ${displayedText.length}, content length: ${content.length}`);

            // If we haven't shown all text yet, show the full content immediately
            if (typingPositionRef.current < content.length) {
                setDisplayedText(content);
                typingPositionRef.current = content.length;

                // Cancel any pending animations
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }

                // Call completion callback
                if (onComplete && !hasCalledOnCompleteRef.current) {
                    hasCalledOnCompleteRef.current = true;
                    onComplete();
                }
            }
        }
    }, [isCompleted, content, onComplete, displayedText.length]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }

            if (initialDelayTimeoutRef.current) {
                clearTimeout(initialDelayTimeoutRef.current);
                initialDelayTimeoutRef.current = null;
            }
        };
    }, []);

    // Always render the displayed text, even if empty (fixed from previous version)
    return (
        <div className="message-content">
            {displayedText && <MarkdownRenderer content={displayedText} />}
            {!isCompleted && typingPositionRef.current < contentRef.current.length && (
                <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-blink"></span>
            )}
        </div>
    );
};