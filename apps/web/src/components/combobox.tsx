import { Button } from "@salary-management-system/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@salary-management-system/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@salary-management-system/ui/components/popover";
import { ChevronsUpDownIcon } from "lucide-react";
import { useState } from "react";

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  allLabel = "All",
  searchPlaceholder = "Search…",
  emptyText = "No results.",
}: {
  options: string[];
  value?: string;
  onChange: (next: string | undefined) => void;
  placeholder?: string;
  allLabel?: string;
  searchPlaceholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);

  const select = (next: string | undefined) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            className="w-44 justify-between font-normal"
            variant="outline"
          />
        }
      >
        <span className="truncate">{value ?? placeholder}</span>
        <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-44 p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => select(undefined)} value={allLabel}>
                {allLabel}
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  onSelect={() => select(option)}
                  value={option}
                >
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
