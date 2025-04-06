"use client"

import React, { useState, useEffect } from "react"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface CitationProps {
    id: string
    title?: string
    url?: string
    className?: string
    messageId?: string
    children?: React.ReactNode
}

export function Citation({ id, title, url, className, messageId, children }: CitationProps) {
    const [isHovered, setIsHovered] = useState(false)
    const [showDialog, setShowDialog] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [imageError, setImageError] = useState(false)
    const [apiBaseUrl, setApiBaseUrl] = useState<string>('http://localhost:8000/api')

    // Get API base URL from environment variable
    useEffect(() => {
        const envUrl = process.env.NEXT_PUBLIC_API_URL;
        if (envUrl) {
            setApiBaseUrl(envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`);
        }
    }, [])

    const handleClick = () => {
        if (url && messageId) {
            setShowDialog(true)
            setIsLoading(true)
            setImageError(false)
        }
    }

    const handleImageError = () => {
        setImageError(true)
        setIsLoading(false)
    }

    const handleImageLoad = () => {
        setIsLoading(false)
    }

    return (
        <>
            <TooltipProvider>
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <span
                            className={cn(
                                "inline-flex items-center text-primary hover:text-primary/80 cursor-pointer mx-0.5 group",
                                isHovered && "underline",
                                className,
                            )}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            onClick={handleClick}
                        >
                            <Info size={14} className="mr-0.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                            {children || `[${id}]`}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                        <div className="text-sm">
                            <p className="font-medium">{title || `Ссылка ${id}`}</p>
                            {url && <p className="text-xs text-muted-foreground truncate">Нажмите, чтобы просмотреть документ</p>}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Document preview dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>{title || `Ссылка ${id}`}</DialogTitle>
                    </DialogHeader>
                    <div className="relative flex flex-col items-center">
                        {isLoading && (
                            <div className="flex items-center justify-center w-full h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                            </div>
                        )}

                        {imageError ? (
                            <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                                <p className="text-amber-700 dark:text-amber-400">
                                    Документ еще обрабатывается. Пожалуйста, повторите попытку позже.
                                </p>
                            </div>
                        ) : (
                            <img
                                src={`${apiBaseUrl}/documents/reference/${messageId}/${url}`}
                                alt={title || `Ссылка ${id}`}
                                className={cn("max-w-full rounded-md border", isLoading ? "hidden" : "block")}
                                onError={handleImageError}
                                onLoad={handleImageLoad}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}