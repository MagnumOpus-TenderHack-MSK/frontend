import React, { useState, useEffect, useRef } from "react"
import { Info, ZoomIn, ZoomOut, Move } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

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

    // Zooming related states
    const [isZoomed, setIsZoomed] = useState(false)
    const [scale, setScale] = useState(1)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null)
    const imageRef = useRef<HTMLImageElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Get API base URL from environment variable
    // Effect to track mouse position for custom cursor
    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (isZoomed) {
                document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`)
                document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`)
            }
        }

        window.addEventListener('mousemove', handleGlobalMouseMove)
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove)
        }
    }, [isZoomed])

    // Effect to get API base URL
    useEffect(() => {
        const envUrl = process.env.NEXT_PUBLIC_API_URL;
        if (envUrl) {
            setApiBaseUrl(envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`);
        }
    }, [])

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent default link behavior

        if (url && messageId) {
            setShowDialog(true)
            setIsLoading(true)
            setImageError(false)
            // Reset zoom state when opening dialog
            setIsZoomed(false)
            setScale(1)
            setPosition({ x: 0, y: 0 })
        }
    }

    const handleImageError = () => {
        setImageError(true)
        setIsLoading(false)
    }

    const handleImageLoad = () => {
        setIsLoading(false)
    }

    // Toggle zoom state
    const toggleZoom = (e: React.MouseEvent<HTMLImageElement>) => {
        if (isZoomed) {
            // Reset to normal view
            setIsZoomed(false)
            setScale(1)
            setPosition({ x: 0, y: 0 })
        } else {
            // Calculate zoom position based on click location
            if (imageRef.current && containerRef.current) {
                const rect = imageRef.current.getBoundingClientRect()
                const containerRect = containerRef.current.getBoundingClientRect()

                // Calculate click position relative to image
                const offsetX = (e.clientX - rect.left) / rect.width
                const offsetY = (e.clientY - rect.top) / rect.height

                // Set zoom scale (2x by default)
                setScale(2)
                setIsZoomed(true)

                // Center the zoomed point
                const newX = (containerRect.width / 2) - (offsetX * rect.width * 2)
                const newY = (containerRect.height / 2) - (offsetY * rect.height * 2)

                setPosition({ x: newX, y: newY })
            }
        }
    }

    // Mouse move handler for automatic panning when zoomed
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isZoomed && containerRef.current && imageRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect()
            const imageRect = imageRef.current.getBoundingClientRect()

            // Calculate the center of the container
            const containerCenterX = containerRect.width / 2
            const containerCenterY = containerRect.height / 2

            // Calculate mouse position relative to container center
            const mouseX = e.clientX - containerRect.left
            const mouseY = e.clientY - containerRect.top

            // Calculate the offset from center (normalized from -1 to 1)
            const offsetX = (mouseX - containerCenterX) / (containerRect.width / 2)
            const offsetY = (mouseY - containerCenterY) / (containerRect.height / 2)

            // Calculate image movement (inverse of mouse movement with dampening)
            // The larger the divisor, the slower the movement
            const moveFactor = imageRect.width * scale / 3
            const moveX = -offsetX * moveFactor
            const moveY = -offsetY * moveFactor

            setPosition({ x: moveX, y: moveY })
        }
    }

    // Empty handlers to maintain interface consistency
    const handleMouseDown = () => {}
    const handleMouseUp = () => {}

    // Touch handlers for mobile
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (isZoomed && e.touches.length === 1) {
            const touch = e.touches[0]
            setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y })
        }
    }

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (dragStart && isZoomed && e.touches.length === 1) {
            const touch = e.touches[0]
            const newX = touch.clientX - dragStart.x
            const newY = touch.clientY - dragStart.y
            setPosition({ x: newX, y: newY })
            e.preventDefault() // Prevent scrolling while panning
        }
    }

    const handleTouchEnd = () => {
        setDragStart(null)
    }

    // Double-tap to zoom (for mobile)
    const lastTapTimeRef = useRef<number>(0)
    const handleTap = (e: React.TouchEvent<HTMLImageElement>) => {
        const currentTime = new Date().getTime()
        const tapLength = currentTime - lastTapTimeRef.current

        if (tapLength < 300 && tapLength > 0) {
            // Double tap detected
            if (isZoomed) {
                // Reset to normal view
                setIsZoomed(false)
                setScale(1)
                setPosition({ x: 0, y: 0 })
            } else if (imageRef.current && containerRef.current) {
                // Calculate tap position for zoom
                const rect = imageRef.current.getBoundingClientRect()
                const containerRect = containerRef.current.getBoundingClientRect()
                const touch = e.touches[0] || e.changedTouches[0]

                const offsetX = (touch.clientX - rect.left) / rect.width
                const offsetY = (touch.clientY - rect.top) / rect.height

                setScale(2)
                setIsZoomed(true)

                const newX = (containerRect.width / 2) - (offsetX * rect.width * 2)
                const newY = (containerRect.height / 2) - (offsetY * rect.height * 2)

                setPosition({ x: newX, y: newY })
            }
            e.preventDefault()
        }

        lastTapTimeRef.current = currentTime
    }

    return (
        <>
            <TooltipProvider>
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <a
                            href="#"
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
                        </a>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                        <div className="text-sm">
                            <p className="font-medium">{title || `Ссылка ${id}`}</p>
                            {url && <p className="text-xs text-muted-foreground truncate">Нажмите, чтобы просмотреть документ</p>}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Document preview dialog with zoom functionality */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <DialogTitle>{title || `Ссылка ${id}`}</DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!imageRef.current || isLoading || imageError}
                                onClick={() => {
                                    if (isZoomed) {
                                        setIsZoomed(false)
                                        setScale(1)
                                        setPosition({ x: 0, y: 0 })
                                    } else {
                                        setIsZoomed(true)
                                        setScale(2)
                                        setPosition({ x: 0, y: 0 })
                                    }
                                }}
                                className="flex items-center gap-1"
                            >
                                {isZoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
                                <span className="hidden sm:inline">{isZoomed ? "Уменьшить" : "Увеличить"}</span>
                            </Button>
                            {isZoomed && (
                                <div className="text-xs flex items-center gap-1 text-muted-foreground">
                                    <Move size={12} />
                                    <span className="hidden sm:inline">Перемещайте изображение</span>
                                </div>
                            )}
                        </div>
                    </DialogHeader>
                    <div
                        ref={containerRef}
                        className={cn(
                            "relative flex flex-col items-center overflow-hidden h-[70vh]",
                            isZoomed ? "cursor-none" : "cursor-zoom-in"
                        )}
                        onMouseMove={handleMouseMove}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
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
                            <div
                                className="relative w-full h-full flex items-center justify-center"
                                style={{ touchAction: isZoomed ? 'none' : 'auto' }}
                            >
                                <img
                                    ref={imageRef}
                                    src={`${apiBaseUrl}/documents/reference/${messageId}/${url}`}
                                    alt={title || `Ссылка ${id}`}
                                    className={cn(
                                        "max-w-full max-h-full object-contain rounded-md border transition-transform",
                                        isLoading ? "hidden" : "block"
                                    )}
                                    style={{
                                        transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                                        transformOrigin: 'center',
                                        transition: dragStart ? 'none' : 'transform 0.2s ease-out'
                                    }}
                                    onClick={toggleZoom}
                                    onTouchStart={handleTap}
                                    onError={handleImageError}
                                    onLoad={handleImageLoad}
                                />
                            </div>
                        )}
                        {isZoomed && (
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                                <div className="bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                                    Двигайте курсор для перемещения • Нажмите для возврата
                                </div>
                            </div>
                        )}

                        {/* Custom cursor when zoomed */}
                        {isZoomed && (
                            <div
                                className="fixed w-8 h-8 rounded-full border-2 border-white bg-black/20 pointer-events-none z-10"
                                style={{
                                    left: `calc(var(--mouse-x, 0px) - 16px)`,
                                    top: `calc(var(--mouse-y, 0px) - 16px)`,
                                }}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}