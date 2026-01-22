/**
 * Centralized Status Color Configuration
 * Provides consistent styling for status badges across the application
 */

export interface StatusStyle {
  bg: string;
  text: string;
  dark?: string;
  border?: string;
}

export const STATUS_COLORS: Record<string, StatusStyle> = {
  // Task statuses
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", dark: "dark:bg-yellow-900 dark:text-yellow-200" },
  in_progress: { bg: "bg-blue-100", text: "text-blue-800", dark: "dark:bg-blue-900 dark:text-blue-200" },
  completed: { bg: "bg-green-100", text: "text-green-800", dark: "dark:bg-green-900 dark:text-green-200" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-800", dark: "dark:bg-gray-900 dark:text-gray-200" },
  overdue: { bg: "bg-red-100", text: "text-red-800", dark: "dark:bg-red-900 dark:text-red-200" },

  // Deal/Pipeline statuses
  open: { bg: "bg-blue-100", text: "text-blue-800" },
  won: { bg: "bg-green-100", text: "text-green-800" },
  lost: { bg: "bg-red-100", text: "text-red-800" },
  qualification: { bg: "bg-slate-100", text: "text-slate-800" },
  discovery: { bg: "bg-blue-100", text: "text-blue-800" },
  proposal: { bg: "bg-purple-100", text: "text-purple-800" },
  negotiation: { bg: "bg-orange-100", text: "text-orange-800" },
  closed_won: { bg: "bg-green-100", text: "text-green-800" },
  closed_lost: { bg: "bg-red-100", text: "text-red-800" },

  // Lead/Contact statuses
  lead: { bg: "bg-gray-100", text: "text-gray-800" },
  qualified: { bg: "bg-blue-100", text: "text-blue-800" },
  customer: { bg: "bg-green-100", text: "text-green-800" },
  new: { bg: "bg-purple-100", text: "text-purple-800" },
  contacted: { bg: "bg-cyan-100", text: "text-cyan-800" },

  // Quote statuses
  draft: { bg: "bg-gray-100", text: "text-gray-800" },
  sent: { bg: "bg-blue-100", text: "text-blue-800" },
  accepted: { bg: "bg-green-100", text: "text-green-800" },
  rejected: { bg: "bg-red-100", text: "text-red-800" },
  expired: { bg: "bg-orange-100", text: "text-orange-800" },

  // Automation/Workflow statuses
  active: { bg: "bg-green-100", text: "text-green-800" },
  inactive: { bg: "bg-gray-100", text: "text-gray-800" },
  paused: { bg: "bg-yellow-100", text: "text-yellow-800" },
  error: { bg: "bg-red-100", text: "text-red-800" },
  running: { bg: "bg-blue-100", text: "text-blue-800" },

  // Import job statuses
  processing: { bg: "bg-blue-100", text: "text-blue-800" },
  failed: { bg: "bg-red-100", text: "text-red-800" },
  rolled_back: { bg: "bg-orange-100", text: "text-orange-800" },

  // Call statuses
  scheduled: { bg: "bg-blue-100", text: "text-blue-800" },
  completed_call: { bg: "bg-green-100", text: "text-green-800" },
  no_answer: { bg: "bg-yellow-100", text: "text-yellow-800" },
  voicemail: { bg: "bg-purple-100", text: "text-purple-800" },
  callback: { bg: "bg-cyan-100", text: "text-cyan-800" },

  // Priority levels
  low: { bg: "bg-gray-100", text: "text-gray-600" },
  medium: { bg: "bg-blue-100", text: "text-blue-700" },
  high: { bg: "bg-orange-100", text: "text-orange-700" },
  urgent: { bg: "bg-red-100", text: "text-red-700" },
} as const;

/**
 * Get status colors for a given status string
 * Falls back to a neutral gray if status not found
 */
export function getStatusColor(status: string | null | undefined): StatusStyle {
  if (!status) {
    return STATUS_COLORS.pending;
  }

  const normalizedStatus = status.toLowerCase().replace(/[- ]/g, "_");
  return STATUS_COLORS[normalizedStatus] || { bg: "bg-gray-100", text: "text-gray-800" };
}

/**
 * Get className string for a status badge
 */
export function getStatusClassName(status: string | null | undefined, includeDark = false): string {
  const colors = getStatusColor(status);
  const classes = [colors.bg, colors.text];
  if (includeDark && colors.dark) {
    classes.push(colors.dark);
  }
  return classes.join(" ");
}

/**
 * Get status display name (formatted for display)
 */
export function getStatusDisplayName(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return status
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
