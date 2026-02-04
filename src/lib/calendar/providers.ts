import {
  CalendarProvider,
  CalendarEvent,
  CalendarCredentials,
  CalendarProviderConfig,
  CalendarAttendee,
} from "./types";

// Abstract calendar provider interface
export interface ICalendarProvider {
  provider: CalendarProvider;
  getAuthUrl(state: string): string;
  exchangeCodeForTokens(code: string): Promise<CalendarCredentials>;
  refreshAccessToken(refreshToken: string): Promise<CalendarCredentials>;
  listCalendars(credentials: CalendarCredentials): Promise<{ id: string; name: string; primary: boolean }[]>;
  createEvent(credentials: CalendarCredentials, event: CalendarEvent): Promise<CalendarEvent>;
  updateEvent(credentials: CalendarCredentials, eventId: string, event: CalendarEvent): Promise<CalendarEvent>;
  deleteEvent(credentials: CalendarCredentials, eventId: string): Promise<void>;
  getEvent(credentials: CalendarCredentials, eventId: string): Promise<CalendarEvent | null>;
  listEvents(
    credentials: CalendarCredentials,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]>;
}

// Google Calendar provider
export class GoogleCalendarProvider implements ICalendarProvider {
  provider: CalendarProvider = "google";
  private config: CalendarProviderConfig;

  constructor() {
    this.config = {
      clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "",
      redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || "",
      scopes: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
      ],
    };
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: this.config.scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<CalendarCredentials> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.config.redirectUri,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${data.error_description || data.error}`);
    }

    return {
      provider: "google",
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<CalendarCredentials> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
    }

    return {
      provider: "google",
      accessToken: data.access_token,
      refreshToken: refreshToken,
      tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async listCalendars(credentials: CalendarCredentials): Promise<{ id: string; name: string; primary: boolean }[]> {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`List calendars failed: ${data.error?.message || "Unknown error"}`);
    }

    return (data.items || []).map((cal: { id: string; summary: string; primary?: boolean }) => ({
      id: cal.id,
      name: cal.summary,
      primary: cal.primary || false,
    }));
  }

  async createEvent(credentials: CalendarCredentials, event: CalendarEvent): Promise<CalendarEvent> {
    const calendarId = credentials.calendarId || "primary";
    const googleEvent = this.toGoogleEvent(event);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleEvent),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Create event failed: ${data.error?.message || "Unknown error"}`);
    }

    return this.fromGoogleEvent(data);
  }

  async updateEvent(
    credentials: CalendarCredentials,
    eventId: string,
    event: CalendarEvent
  ): Promise<CalendarEvent> {
    const calendarId = credentials.calendarId || "primary";
    const googleEvent = this.toGoogleEvent(event);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleEvent),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Update event failed: ${data.error?.message || "Unknown error"}`);
    }

    return this.fromGoogleEvent(data);
  }

  async deleteEvent(credentials: CalendarCredentials, eventId: string): Promise<void> {
    const calendarId = credentials.calendarId || "primary";

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      }
    );

    if (!response.ok && response.status !== 404) {
      const data = await response.json();
      throw new Error(`Delete event failed: ${data.error?.message || "Unknown error"}`);
    }
  }

  async getEvent(credentials: CalendarCredentials, eventId: string): Promise<CalendarEvent | null> {
    const calendarId = credentials.calendarId || "primary";

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      }
    );

    if (response.status === 404) return null;

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Get event failed: ${data.error?.message || "Unknown error"}`);
    }

    return this.fromGoogleEvent(data);
  }

  async listEvents(
    credentials: CalendarCredentials,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const calendarId = credentials.calendarId || "primary";
    const params = new URLSearchParams({
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`List events failed: ${data.error?.message || "Unknown error"}`);
    }

    return (data.items || []).map((event: GoogleCalendarEvent) => this.fromGoogleEvent(event));
  }

  private toGoogleEvent(event: CalendarEvent): GoogleCalendarEvent {
    const googleEvent: GoogleCalendarEvent = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: event.isAllDay
        ? { date: event.startTime.toISOString().split("T")[0] }
        : { dateTime: event.startTime.toISOString(), timeZone: event.timezone || "UTC" },
      end: event.isAllDay
        ? { date: event.endTime.toISOString().split("T")[0] }
        : { dateTime: event.endTime.toISOString(), timeZone: event.timezone || "UTC" },
    };

    if (event.attendees?.length) {
      googleEvent.attendees = event.attendees.map((a) => ({
        email: a.email,
        displayName: a.name,
        optional: a.optional,
      }));
    }

    if (event.conferenceUrl) {
      googleEvent.conferenceData = {
        entryPoints: [{ entryPointType: "video", uri: event.conferenceUrl }],
      };
    }

    if (event.reminders?.length) {
      googleEvent.reminders = {
        useDefault: false,
        overrides: event.reminders.map((r) => ({
          method: r.method === "popup" ? "popup" : "email",
          minutes: r.minutes,
        })),
      };
    }

    return googleEvent;
  }

  private fromGoogleEvent(event: GoogleCalendarEvent): CalendarEvent {
    const startTime = event.start.dateTime
      ? new Date(event.start.dateTime)
      : new Date(event.start.date + "T00:00:00");
    const endTime = event.end.dateTime
      ? new Date(event.end.dateTime)
      : new Date(event.end.date + "T23:59:59");

    const attendees: CalendarAttendee[] = (event.attendees || []).map((a) => ({
      email: a.email,
      name: a.displayName,
      responseStatus: a.responseStatus as CalendarAttendee["responseStatus"],
      optional: a.optional,
    }));

    return {
      externalId: event.id,
      title: event.summary || "",
      description: event.description,
      location: event.location,
      startTime,
      endTime,
      timezone: event.start.timeZone,
      isAllDay: !event.start.dateTime,
      attendees,
      conferenceUrl: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
      status: event.status as CalendarEvent["status"],
    };
  }
}

// Google Calendar event type
interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: { email: string; displayName?: string; responseStatus?: string; optional?: boolean }[];
  reminders?: { useDefault: boolean; overrides?: { method: string; minutes: number }[] };
  conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
  hangoutLink?: string;
  status?: string;
}

// Outlook Calendar provider (skeleton - full implementation would use Microsoft Graph)
export class OutlookCalendarProvider implements ICalendarProvider {
  provider: CalendarProvider = "outlook";
  private config: CalendarProviderConfig;

  constructor() {
    this.config = {
      clientId: process.env.AZURE_AD_CLIENT_ID || "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
      redirectUri: process.env.OUTLOOK_CALENDAR_REDIRECT_URI || "",
      scopes: ["Calendars.ReadWrite", "offline_access"],
    };
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: this.config.scopes.join(" "),
      state,
    });
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<CalendarCredentials> {
    const response = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: this.config.redirectUri,
          scope: this.config.scopes.join(" "),
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${data.error_description || data.error}`);
    }

    return {
      provider: "outlook",
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<CalendarCredentials> {
    const response = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          scope: this.config.scopes.join(" "),
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
    }

    return {
      provider: "outlook",
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async listCalendars(credentials: CalendarCredentials): Promise<{ id: string; name: string; primary: boolean }[]> {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/calendars", {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`List calendars failed: ${data.error?.message || "Unknown error"}`);
    }

    return (data.value || []).map((cal: { id: string; name: string; isDefaultCalendar?: boolean }) => ({
      id: cal.id,
      name: cal.name,
      primary: cal.isDefaultCalendar || false,
    }));
  }

  // Stub implementations for other methods - would need full Graph API integration
  async createEvent(_credentials: CalendarCredentials, _event: CalendarEvent): Promise<CalendarEvent> {
    throw new Error("Outlook calendar integration not fully implemented");
  }

  async updateEvent(_credentials: CalendarCredentials, _eventId: string, _event: CalendarEvent): Promise<CalendarEvent> {
    throw new Error("Outlook calendar integration not fully implemented");
  }

  async deleteEvent(_credentials: CalendarCredentials, _eventId: string): Promise<void> {
    throw new Error("Outlook calendar integration not fully implemented");
  }

  async getEvent(_credentials: CalendarCredentials, _eventId: string): Promise<CalendarEvent | null> {
    throw new Error("Outlook calendar integration not fully implemented");
  }

  async listEvents(_credentials: CalendarCredentials, _startDate: Date, _endDate: Date): Promise<CalendarEvent[]> {
    throw new Error("Outlook calendar integration not fully implemented");
  }
}

// Factory function to get the appropriate provider
export function getCalendarProvider(provider: CalendarProvider): ICalendarProvider {
  switch (provider) {
    case "google":
      return new GoogleCalendarProvider();
    case "outlook":
      return new OutlookCalendarProvider();
    default:
      throw new Error(`Unsupported calendar provider: ${provider}`);
  }
}
