"use client"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface DateRangePickerProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  className?: string
}

export function DateRangePicker({ dateRange, onDateRangeChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  return (
      <div className={cn("grid gap-2", className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
                id="date"
                variant={"outline"}
                className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
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
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 bg-background border-0 rounded-md">
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
                  className="bg-background text-foreground"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
  )
}

