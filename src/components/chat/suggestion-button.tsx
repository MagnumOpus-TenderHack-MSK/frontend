import React, { useState } from 'react';
import { MessageSuggestion } from '@/lib/types';
import { AlertTriangle, FileText, HelpCircle, MessageSquare, Search, UserPlus } from 'lucide-react';

interface SuggestionButtonProps {
    suggestion: MessageSuggestion;
    onClick: (text: string) => void;
    isAiSuggestion?: boolean;
    disabled?: boolean;
}

// Get icon for suggestion based on its icon property
const getIconComponent = (iconName: string) => {
    switch (iconName) {
        case 'user-plus':
            return <UserPlus size={14} className="text-blue-500 flex-shrink-0" />;
        case 'search':
            return <Search size={14} className="text-green-500 flex-shrink-0" />;
        case 'help-circle':
            return <HelpCircle size={14} className="text-purple-500 flex-shrink-0" />;
        case 'file-text':
            return <FileText size={14} className="text-orange-500 flex-shrink-0" />;
        case 'alert-triangle':
            return <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />;
        default:
            return <MessageSquare size={14} className="text-gray-500 flex-shrink-0" />;
    }
};

export const SuggestionButton: React.FC<SuggestionButtonProps> = ({
                                                                      suggestion,
                                                                      onClick,
                                                                      isAiSuggestion = false,
                                                                      disabled = false
                                                                  }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

    // For mobile: handle touch start with timer for long-press
    const handleTouchStart = () => {
        if (disabled) return;

        const timer = setTimeout(() => {
            setShowTooltip(true);
        }, 500); // Show tooltip after 500ms of press

        setLongPressTimer(timer);
    };

    // Clear timer on touch end
    const handleTouchEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }

        // Hide tooltip after a delay
        if (showTooltip) {
            setTimeout(() => setShowTooltip(false), 1500);
        }
    };

    // Hide tooltip when touch is moved (to avoid interfering with scrolling)
    const handleTouchMove = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => onClick(suggestion.text)}
                title={suggestion.text} // Native HTML tooltip for desktop
                className={`${
                    isAiSuggestion
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                } shadow-sm
         hover:bg-${
                    isAiSuggestion
                        ? 'blue-100 dark:hover:bg-blue-800/30'
                        : 'gray-50 dark:hover:bg-gray-700'
                } transition-colors py-2 px-3 rounded-2xl
         text-sm flex items-center gap-1.5 max-w-xs w-full`}
                disabled={disabled}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onTouchCancel={handleTouchEnd}
            >
                {getIconComponent(suggestion.icon)}
                <span className="truncate">{suggestion.text}</span>
            </button>

            {/* Custom tooltip for mobile devices */}
            {showTooltip && (
                <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 break-words">
                    {suggestion.text}
                </div>
            )}
        </div>
    );
};