"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, User, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const scheduleCallFormSchema = z.object({
  contactId: z.string().min(1, "Please select a contact"),
  scheduledAt: z.string().min(1, "Please select a date and time"),
  notes: z.string().optional(),
  reminderMinutes: z.number().optional(),
  assignedToId: z.string().optional(),
});

type ScheduleCallFormData = z.infer<typeof scheduleCallFormSchema>;

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  company?: { name: string } | null;
}

interface User {
  id: string;
  name: string | null;
}

interface ScheduleCallFormProps {
  contacts?: Contact[];
  users?: User[];
  defaultContactId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ScheduleCallForm({
  contacts: initialContacts,
  users: initialUsers,
  defaultContactId,
  onSuccess,
  onCancel,
}: ScheduleCallFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts || []);
  const [users, setUsers] = useState<User[]>(initialUsers || []);
  const [contactSearchOpen, setContactSearchOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("09:00");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ScheduleCallFormData>({
    resolver: zodResolver(scheduleCallFormSchema),
    defaultValues: {
      contactId: defaultContactId || "",
      scheduledAt: "",
      notes: "",
      reminderMinutes: 15,
    },
  });

  const selectedContactId = watch("contactId");
  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  // Fetch contacts if not provided
  useEffect(() => {
    if (!initialContacts) {
      fetch("/api/contacts?limit=100")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setContacts(data.data);
          }
        });
    }
  }, [initialContacts]);

  // Fetch users if not provided
  useEffect(() => {
    if (!initialUsers) {
      fetch("/api/users")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUsers(data.data);
          }
        });
    }
  }, [initialUsers]);

  // Combine date and time into scheduledAt
  useEffect(() => {
    if (selectedDate && selectedTime) {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const dateTime = new Date(selectedDate);
      dateTime.setHours(hours, minutes, 0, 0);
      setValue("scheduledAt", dateTime.toISOString());
    }
  }, [selectedDate, selectedTime, setValue]);

  const onSubmit = async (data: ScheduleCallFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/calls/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Call scheduled successfully");
        onSuccess?.();
      } else {
        console.error("Failed to schedule call:", result.error);
        toast.error("Failed to schedule call", {
          description: result.error?.message || "Please try again"
        });
      }
    } catch (error) {
      console.error("Error scheduling call:", error);
      toast.error("Error scheduling call", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate time slots (every 30 minutes from 8 AM to 6 PM)
  const timeSlots = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (const minute of ["00", "30"]) {
      const time = `${hour.toString().padStart(2, "0")}:${minute}`;
      timeSlots.push(time);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Contact Selection */}
      <div className="space-y-2">
        <Label>Contact *</Label>
        <Popover open={contactSearchOpen} onOpenChange={setContactSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={contactSearchOpen}
              className="w-full justify-between"
            >
              {selectedContact ? (
                <span>
                  {selectedContact.firstName} {selectedContact.lastName}
                  {selectedContact.company?.name && (
                    <span className="text-muted-foreground ml-2">
                      ({selectedContact.company.name})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">Select a contact...</span>
              )}
              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search contacts..." />
              <CommandList>
                <CommandEmpty>No contacts found.</CommandEmpty>
                <CommandGroup>
                  {contacts
                    .filter((contact) => contact.phone)
                    .map((contact) => (
                      <CommandItem
                        key={contact.id}
                        value={`${contact.firstName} ${contact.lastName} ${contact.company?.name || ""}`}
                        onSelect={() => {
                          setValue("contactId", contact.id);
                          setContactSearchOpen(false);
                        }}
                      >
                        <User className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>
                            {contact.firstName} {contact.lastName}
                          </span>
                          {contact.company?.name && (
                            <span className="text-xs text-muted-foreground">
                              {contact.company.name}
                            </span>
                          )}
                        </div>
                        {contact.phone && (
                          <span className="ml-auto text-sm text-muted-foreground">
                            {contact.phone}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {errors.contactId && (
          <p className="text-sm text-red-600">{errors.contactId.message}</p>
        )}
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Time *</Label>
          <Select value={selectedTime} onValueChange={setSelectedTime}>
            <SelectTrigger>
              <Clock className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {errors.scheduledAt && (
        <p className="text-sm text-red-600">{errors.scheduledAt.message}</p>
      )}

      {/* Reminder */}
      <div className="space-y-2">
        <Label>Reminder</Label>
        <Select
          defaultValue="15"
          onValueChange={(value) => setValue("reminderMinutes", parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">No reminder</SelectItem>
            <SelectItem value="5">5 minutes before</SelectItem>
            <SelectItem value="10">10 minutes before</SelectItem>
            <SelectItem value="15">15 minutes before</SelectItem>
            <SelectItem value="30">30 minutes before</SelectItem>
            <SelectItem value="60">1 hour before</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assigned To */}
      {users.length > 0 && (
        <div className="space-y-2">
          <Label>Assign To</Label>
          <Select onValueChange={(value) => setValue("assignedToId", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a user (optional)" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          {...register("notes")}
          placeholder="Add any notes about this call..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Scheduling..." : "Schedule Call"}
        </Button>
      </div>
    </form>
  );
}
