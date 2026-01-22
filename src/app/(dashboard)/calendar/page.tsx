"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Video,
  Users as UsersIcon,
  Edit2,
  Trash2,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  parseISO,
} from "date-fns";

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  meetingUrl: string | null;
  startTime: string;
  endTime: string;
  timezone: string;
  contact?: { id: string; firstName: string; lastName: string };
  deal?: { id: string; title: string };
  attendees: { email: string; name: string }[];
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
}

interface Deal {
  id: string;
  title: string;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    meetingUrl: "",
    startDate: "",
    startTime: "",
    endTime: "",
    contactId: "",
    dealId: "",
  });

  useEffect(() => {
    fetchMeetings();
    fetchContacts();
    fetchDeals();
  }, [currentDate]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      const response = await fetch(
        `/api/meetings?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      );
      const data = await response.json();
      if (data.success) {
        setMeetings(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await fetch("/api/contacts?limit=100");
      const data = await response.json();
      if (data.success) {
        setContacts(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    }
  };

  const fetchDeals = async () => {
    try {
      const response = await fetch("/api/deals?limit=100");
      const data = await response.json();
      if (data.success) {
        setDeals(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch deals:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.startDate}T${formData.endTime}`);

      const payload = {
        title: formData.title,
        description: formData.description || null,
        location: formData.location || null,
        meetingUrl: formData.meetingUrl || null,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        contactId: formData.contactId || null,
        dealId: formData.dealId || null,
        organizerId: "system", // Would come from auth in real app
      };

      const url = editingMeeting
        ? `/api/meetings/${editingMeeting.id}`
        : "/api/meetings";

      const response = await fetch(url, {
        method: editingMeeting ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        fetchMeetings();
        setShowDialog(false);
        resetForm();
      }
    } catch (error) {
      console.error("Failed to save meeting:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this meeting?")) return;

    try {
      const response = await fetch(`/api/meetings/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchMeetings();
      }
    } catch (error) {
      console.error("Failed to delete meeting:", error);
    }
  };

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    const startDate = parseISO(meeting.startTime);
    const endDate = parseISO(meeting.endTime);

    setFormData({
      title: meeting.title,
      description: meeting.description || "",
      location: meeting.location || "",
      meetingUrl: meeting.meetingUrl || "",
      startDate: format(startDate, "yyyy-MM-dd"),
      startTime: format(startDate, "HH:mm"),
      endTime: format(endDate, "HH:mm"),
      contactId: meeting.contact?.id || "",
      dealId: meeting.deal?.id || "",
    });
    setShowDialog(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setFormData((prev) => ({
      ...prev,
      startDate: format(date, "yyyy-MM-dd"),
      startTime: "09:00",
      endTime: "10:00",
    }));
    setEditingMeeting(null);
    setShowDialog(true);
  };

  const resetForm = () => {
    setEditingMeeting(null);
    setFormData({
      title: "",
      description: "",
      location: "",
      meetingUrl: "",
      startDate: "",
      startTime: "",
      endTime: "",
      contactId: "",
      dealId: "",
    });
  };

  // Calendar rendering
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getMeetingsForDay = (date: Date) => {
    return meetings.filter((meeting) =>
      isSameDay(parseISO(meeting.startTime), date)
    );
  };

  const goToPrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Calendar"
          subtitle="Schedule and manage meetings"
          actions={
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Meeting
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingMeeting ? "Edit Meeting" : "Schedule Meeting"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Meeting title"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData({ ...formData, startDate: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) =>
                          setFormData({ ...formData, startTime: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) =>
                          setFormData({ ...formData, endTime: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Location (optional)</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      placeholder="Office, Conference Room A, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Meeting URL (optional)</Label>
                    <Input
                      value={formData.meetingUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, meetingUrl: e.target.value })
                      }
                      placeholder="https://zoom.us/..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Contact</Label>
                      <Select
                        value={formData.contactId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, contactId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None</SelectItem>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.firstName} {contact.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Deal</Label>
                      <Select
                        value={formData.dealId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, dealId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select deal..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None</SelectItem>
                          {deals.map((deal) => (
                            <SelectItem key={deal.id} value={deal.id}>
                              {deal.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm"
                      placeholder="Meeting agenda or notes..."
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingMeeting ? "Update Meeting" : "Schedule Meeting"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Calendar */}
            <div className="col-span-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={goToPrevMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-xl font-semibold">
                      {format(currentDate, "MMMM yyyy")}
                    </h2>
                    <Button variant="outline" size="icon" onClick={goToNextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" onClick={goToToday}>
                    Today
                  </Button>
                </CardHeader>
                <CardContent>
                  {/* Week days header */}
                  <div className="grid grid-cols-7 gap-px mb-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-medium text-muted-foreground py-2"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-px bg-border">
                    {days.map((day) => {
                      const dayMeetings = getMeetingsForDay(day);
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const isTodayDate = isToday(day);

                      return (
                        <div
                          key={day.toISOString()}
                          className={`min-h-[100px] bg-background p-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                            !isCurrentMonth ? "text-muted-foreground bg-muted/20" : ""
                          }`}
                          onClick={() => handleDateClick(day)}
                        >
                          <div
                            className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                              isTodayDate ? "bg-primary text-white" : ""
                            }`}
                          >
                            {format(day, "d")}
                          </div>
                          <div className="space-y-1">
                            {dayMeetings.slice(0, 3).map((meeting) => (
                              <div
                                key={meeting.id}
                                className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5 truncate"
                                title={meeting.title}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(meeting);
                                }}
                              >
                                {format(parseISO(meeting.startTime), "h:mm a")}{" "}
                                {meeting.title}
                              </div>
                            ))}
                            {dayMeetings.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{dayMeetings.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming meetings sidebar */}
            <div className="col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Meetings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : meetings.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No meetings scheduled
                    </p>
                  ) : (
                    meetings
                      .filter(
                        (m) => new Date(m.startTime) >= new Date()
                      )
                      .slice(0, 5)
                      .map((meeting) => (
                        <div
                          key={meeting.id}
                          className="border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <h3 className="font-medium">{meeting.title}</h3>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(meeting)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDelete(meeting.id)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(meeting.startTime), "MMM d, h:mm a")} -{" "}
                            {format(parseISO(meeting.endTime), "h:mm a")}
                          </div>
                          {meeting.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {meeting.location}
                            </div>
                          )}
                          {meeting.meetingUrl && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Video className="h-3 w-3" />
                              <a
                                href={meeting.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Join meeting
                              </a>
                            </div>
                          )}
                          {meeting.contact && (
                            <Badge variant="outline" className="text-xs">
                              <UsersIcon className="h-3 w-3 mr-1" />
                              {meeting.contact.firstName} {meeting.contact.lastName}
                            </Badge>
                          )}
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
