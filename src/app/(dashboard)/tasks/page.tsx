"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared";
import {
  Plus,
  CheckSquare,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
  AlertCircle,
  Repeat,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Task, TaskStatus, Priority, User } from "@/types";
import { format, isPast, isToday, isTomorrow } from "date-fns";

const statusLabels: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const statusColors: Record<TaskStatus, string> = {
  TODO: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const priorityLabels: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const priorityColors: Record<Priority, string> = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "MEDIUM" as Priority,
    status: "TODO" as TaskStatus,
    isRecurring: false,
    recurrencePattern: "" as string,
    recurrenceInterval: "1",
    recurrenceEndDate: "",
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success) {
        setTasks(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      !search || task.title.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      !statusFilter || statusFilter === "all" || task.status === statusFilter;

    const matchesPriority =
      !priorityFilter || priorityFilter === "all" || task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleOpenForm = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || "",
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().split("T")[0]
          : "",
        priority: task.priority,
        status: task.status,
        isRecurring: (task as Task & { isRecurring?: boolean }).isRecurring || false,
        recurrencePattern: (task as Task & { recurrencePattern?: string }).recurrencePattern || "",
        recurrenceInterval: String((task as Task & { recurrenceInterval?: number }).recurrenceInterval || 1),
        recurrenceEndDate: (task as Task & { recurrenceEndDate?: string }).recurrenceEndDate
          ? new Date((task as Task & { recurrenceEndDate: string }).recurrenceEndDate).toISOString().split("T")[0]
          : "",
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: "",
        description: "",
        dueDate: "",
        priority: "MEDIUM",
        status: "TODO",
        isRecurring: false,
        recurrencePattern: "",
        recurrenceInterval: "1",
        recurrenceEndDate: "",
      });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTask ? `/api/tasks/${editingTask.id}` : "/api/tasks";
      const method = editingTask ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          dueDate: formData.dueDate || null,
          priority: formData.priority,
          status: formData.status,
          isRecurring: formData.isRecurring,
          recurrencePattern: formData.isRecurring ? (formData.recurrencePattern || "daily") : null,
          recurrenceInterval: formData.isRecurring ? parseInt(formData.recurrenceInterval) || 1 : null,
          recurrenceEndDate: formData.isRecurring && formData.recurrenceEndDate ? formData.recurrenceEndDate : null,
        }),
      });

      if (res.ok) {
        fetchTasks();
        setIsFormOpen(false);
      }
    } catch (error) {
      console.error("Failed to save task:", error);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === "COMPLETED" ? "TODO" : "COMPLETED";
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleDelete = async (task: Task) => {
    if (!window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const getDueDateDisplay = (dueDate: Date | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);

    if (isToday(date)) {
      return <span className="text-orange-600 font-medium">Today</span>;
    }
    if (isTomorrow(date)) {
      return <span className="text-blue-600">Tomorrow</span>;
    }
    if (isPast(date)) {
      return <span className="text-red-600 font-medium">Overdue</span>;
    }
    return <span className="text-gray-600">{format(date, "MMM d, yyyy")}</span>;
  };

  // Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== "COMPLETED"
  ).length;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Tasks"
          subtitle={`${completedTasks}/${totalTasks} completed${overdueTasks > 0 ? ` | ${overdueTasks} overdue` : ""}`}
          actions={
            <Button onClick={() => handleOpenForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-lg border p-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tasks..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter || "all"} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter || "all"} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Task List */}
            {loading ? (
              <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
                Loading...
              </div>
            ) : filteredTasks.length > 0 ? (
              <div className="bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow
                        key={task.id}
                        className={task.status === "COMPLETED" ? "opacity-60" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={task.status === "COMPLETED"}
                            onCheckedChange={() => handleToggleComplete(task)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div
                              className={`font-medium ${
                                task.status === "COMPLETED" ? "line-through" : ""
                              }`}
                            >
                              {task.title}
                            </div>
                            {task.description && (
                              <div className="text-sm text-gray-500 truncate max-w-md">
                                {task.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[task.status]}>
                            {statusLabels[task.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={priorityColors[task.priority]}>
                            {priorityLabels[task.priority]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {getDueDateDisplay(task.dueDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenForm(task)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(task)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="bg-white rounded-lg border">
                <EmptyState
                  icon={<CheckSquare className="h-12 w-12" />}
                  title="No tasks found"
                  description={
                    search || statusFilter || priorityFilter
                      ? "Try adjusting your filters to find what you're looking for."
                      : "Get started by adding your first task."
                  }
                  action={
                    !search && !statusFilter && !priorityFilter
                      ? { label: "Add Task", onClick: () => handleOpenForm() }
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Task Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Follow up with client"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md text-sm resize-none"
                rows={3}
                placeholder="Add more details..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value as Priority })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as TaskStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recurrence Settings */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isRecurring: !!checked })
                  }
                />
                <Label htmlFor="isRecurring" className="flex items-center gap-1.5 cursor-pointer">
                  <Repeat className="w-4 h-4" />
                  Recurring Task
                </Label>
              </div>

              {formData.isRecurring && (
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="recurrencePattern">Frequency</Label>
                    <Select
                      value={formData.recurrencePattern || "daily"}
                      onValueChange={(value) =>
                        setFormData({ ...formData, recurrencePattern: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recurrenceInterval">
                      Every N {formData.recurrencePattern === "daily" ? "days" : formData.recurrencePattern === "weekly" ? "weeks" : "months"}
                    </Label>
                    <Input
                      id="recurrenceInterval"
                      type="number"
                      min="1"
                      max="52"
                      value={formData.recurrenceInterval}
                      onChange={(e) =>
                        setFormData({ ...formData, recurrenceInterval: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="recurrenceEndDate">End Date (optional)</Label>
                    <Input
                      id="recurrenceEndDate"
                      type="date"
                      value={formData.recurrenceEndDate}
                      onChange={(e) =>
                        setFormData({ ...formData, recurrenceEndDate: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingTask ? "Update" : "Create"} Task
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
