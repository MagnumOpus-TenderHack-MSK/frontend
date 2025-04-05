"use client"

import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateRangePickerProps {
    dateRange: DateRange
    onDateRangeChange: (range: DateRange) => void
    className?: string
}

export function DateRangePicker({ dateRange, onDateRangeChange, className }: DateRangePickerProps) {
    const [open, setOpen] = useState(false)
    const calendarRef = useRef<HTMLDivElement>(null)

    // Add keyboard shortcuts for calendar navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!open) return

            // Close on escape
            if (e.key === 'Escape') {
                setOpen(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open])

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant="outline"
                        className={cn(
                            "w-[260px] md:w-[300px] justify-start text-left font-normal transition-all",
                            !dateRange.from && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                    {format(dateRange.from, "d MMMM yyyy", { locale: ru })} -{" "}
                                    {format(dateRange.to, "d MMMM yyyy", { locale: ru })}
                                </>
                            ) : (
                                format(dateRange.from, "d MMMM yyyy", { locale: ru })
                            )
                        ) : (
                            <span>Выберите период</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto p-0"
                    align="start"
                    ref={calendarRef}
                >
                    <div className="p-3 space-y-4 bg-background border-0 rounded-md">
                        <div className="grid gap-2">
                            <h4 className="font-medium text-sm">Выберите диапазон дат</h4>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => {
                                        const today = new Date();
                                        const weekAgo = new Date();
                                        weekAgo.setDate(today.getDate() - 7);
                                        onDateRangeChange({ from: weekAgo, to: today });
                                        setOpen(false);
                                    }}
                                >
                                    7 дней
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => {
                                        const today = new Date();
                                        const monthAgo = new Date();
                                        monthAgo.setMonth(today.getMonth() - 1);
                                        onDateRangeChange({ from: monthAgo, to: today });
                                        setOpen(false);
                                    }}
                                >
                                    30 дней
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => {
                                        const today = new Date();
                                        const threeMonthsAgo = new Date();
                                        threeMonthsAgo.setMonth(today.getMonth() - 3);
                                        onDateRangeChange({ from: threeMonthsAgo, to: today });
                                        setOpen(false);
                                    }}
                                >
                                    90 дней
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:space-x-4 min-h-[350px]">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={(range) => {
                                    onDateRangeChange(range || { from: new Date(), to: new Date() })
                                    if (range?.from && range?.to) {
                                        setTimeout(() => setOpen(false), 300)
                                    }
                                }}
                                numberOfMonths={2}
                                locale={ru}
                                classNames={{
                                    months: "flex flex-col md:flex-row space-y-4 md:space-x-4 md:space-y-0",
                                    month: "space-y-4",
                                    caption: "flex justify-center pt-1 relative items-center px-2",
                                    caption_label: "text-sm font-medium",
                                    nav: "space-x-1 flex items-center",
                                    nav_button: cn(
                                        "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 transition-opacity",
                                        "border border-border rounded-md flex items-center justify-center hover:bg-accent",
                                        "dark:text-muted-foreground dark:hover:text-foreground"
                                    ),
                                    nav_button_previous: "absolute left-1",
                                    nav_button_next: "absolute right-1",
                                    table: "w-full border-collapse space-y-1",
                                    head_row: "flex w-full",
                                    head_cell: "text-muted-foreground rounded-md w-9 font-normal text-xs",
                                    row: "flex w-full mt-2",
                                    cell: "h-9 w-9 text-center text-sm p-0 relative",
                                    day: cn(
                                        "h-9 w-9 p-0 font-normal rounded-md transition-colors",
                                        "aria-selected:opacity-100 hover:bg-muted focus:bg-muted"
                                    ),
                                    day_today: "bg-accent text-accent-foreground",
                                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                                    day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground"
                                }}
                            />
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}