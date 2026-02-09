import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  date,
  onDateChange,
  disabled,
  placeholder = "Wybierz datę",
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(
    date ? format(date, "dd.MM.yyyy") : ""
  );
  const [month, setMonth] = React.useState<Date>(date || new Date());

  // Update input when date prop changes
  React.useEffect(() => {
    if (date) {
      setInputValue(format(date, "dd.MM.yyyy"));
      setMonth(date);
    } else {
      setInputValue("");
    }
  }, [date]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Try to parse the date (supports dd.MM.yyyy, dd/MM/yyyy, dd-MM-yyyy)
    const parsedDate = parse(value, "dd.MM.yyyy", new Date());
    if (isValid(parsedDate) && (!disabled || !disabled(parsedDate))) {
      onDateChange?.(parsedDate);
      setMonth(parsedDate);
    }
  };

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onDateChange?.(selectedDate);
      setInputValue(format(selectedDate, "dd.MM.yyyy"));
      setMonth(selectedDate);
      setOpen(false);
    }
  };

  const currentYear = month.getFullYear();
  const currentMonth = month.getMonth();

  // Generate year options (current year - 1 to current year + 10)
  const yearOptions = Array.from({ length: 12 }, (_, i) => currentYear - 1 + i);

  const handleYearChange = (year: string) => {
    const newDate = new Date(month);
    newDate.setFullYear(parseInt(year));
    setMonth(newDate);
  };

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(month);
    newDate.setMonth(parseInt(monthIndex));
    setMonth(newDate);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Input
        type="text"
        placeholder="dd.mm.rrrr"
        value={inputValue}
        onChange={handleInputChange}
        className="flex-1"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "px-3",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-3 border-b">
            <div className="flex gap-2">
              <Select
                value={currentMonth.toString()}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {format(new Date(2000, i, 1), "LLLL", { locale: pl })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={currentYear.toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            disabled={disabled}
            locale={pl}
            month={month}
            onMonthChange={setMonth}
            className="w-[280px]"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4 w-full",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
              ),
              table: "w-full border-collapse",
              head_row: "flex w-full",
              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: cn(
                "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
              ),
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
