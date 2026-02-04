// Calendar integration type definitions

export type CalendarProvider = "google" | "outlook" | "apple";

export interface CalendarCredentials {
  provider: CalendarProvider;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  calendarId?: string;
  email?: string;
}

export interface CalendarEvent {
  id?: string;
  externalId?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  timezone?: string;
  isAllDay?: boolean;
  attendees?: CalendarAttendee[];
  reminders?: CalendarReminder[];
  recurrence?: string; // RRULE format
  conferenceUrl?: string;
  status?: "confirmed" | "tentative" | "cancelled";
}

export interface CalendarAttendee {
  email: string;
  name?: string;
  responseStatus?: "accepted" | "declined" | "tentative" | "needsAction";
  optional?: boolean;
}

export interface CalendarReminder {
  method: "email" | "popup" | "sms";
  minutes: number;
}

export interface CalendarSyncResult {
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
}

export interface CalendarProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

// OAuth state for calendar connection
export interface CalendarOAuthState {
  provider: CalendarProvider;
  userId: string;
  businessId?: string;
  returnUrl?: string;
}

export interface CalendarConnection {
  id: string;
  userId: string;
  provider: CalendarProvider;
  email: string;
  calendarId: string;
  calendarName: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  syncEnabled: boolean;
  lastSyncAt?: Date;
  createdAt: Date;
}
