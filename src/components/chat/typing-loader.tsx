import React from 'react';

const TypingLoader: React.FC = () => {
    return (
        <div className="flex justify-start mb-4 px-4">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 max-w-[85%] sm:max-w-[80%] animate-fade-in">
                <div className="text-sm font-medium mb-2 flex justify-between items-center">
                    <span>Ассистент</span>
                    <span className="text-xs opacity-70">печатает...</span>
                </div>
                <div className="flex items-center space-x-2 py-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-portal-blue animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-portal-blue animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-portal-blue animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>
        </div>
    );
};

export default TypingLoader;