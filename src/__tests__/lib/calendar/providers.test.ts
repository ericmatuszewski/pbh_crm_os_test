import {
  GoogleCalendarProvider,
  OutlookCalendarProvider,
  getCalendarProvider,
} from "@/lib/calendar/providers";
import { CalendarEvent, CalendarCredentials } from "@/lib/calendar/types";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("getCalendarProvider", () => {
  it("should return GoogleCalendarProvider for 'google'", () => {
    const provider = getCalendarProvider("google");
    expect(provider).toBeInstanceOf(GoogleCalendarProvider);
    expect(provider.provider).toBe("google");
  });

  it("should return OutlookCalendarProvider for 'outlook'", () => {
    const provider = getCalendarProvider("outlook");
    expect(provider).toBeInstanceOf(OutlookCalendarProvider);
    expect(provider.provider).toBe("outlook");
  });

  it("should throw error for unsupported provider", () => {
    expect(() => getCalendarProvider("apple" as any)).toThrow("Unsupported calendar provider: apple");
  });
});

describe("GoogleCalendarProvider", () => {
  let provider: GoogleCalendarProvider;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      GOOGLE_CALENDAR_CLIENT_ID: "test-client-id",
      GOOGLE_CALENDAR_CLIENT_SECRET: "test-client-secret",
      GOOGLE_CALENDAR_REDIRECT_URI: "https://app.example.com/callback",
    };
    provider = new GoogleCalendarProvider();
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getAuthUrl", () => {
    it("should generate valid Google OAuth URL", () => {
      const url = provider.getAuthUrl("test-state-123");

      expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(url).toContain("client_id=test-client-id");
      expect(url).toContain("redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback");
      expect(url).toContain("response_type=code");
      expect(url).toContain("access_type=offline");
      expect(url).toContain("prompt=consent");
      expect(url).toContain("state=test-state-123");
    });

    it("should include required scopes", () => {
      const url = provider.getAuthUrl("state");
      expect(url).toContain("https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar");
      expect(url).toContain("https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events");
    });

    it("should URL-encode the state parameter", () => {
      const url = provider.getAuthUrl("state with spaces & special=chars");
      expect(url).toContain("state=state+with+spaces+%26+special%3Dchars");
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("should exchange authorization code for tokens", async () => {
      const mockResponse = {
        access_token: "access-token-123",
        refresh_token: "refresh-token-456",
        expires_in: 3600,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.exchangeCodeForTokens("auth-code-789");

      expect(result.provider).toBe("google");
      expect(result.accessToken).toBe("access-token-123");
      expect(result.refreshToken).toBe("refresh-token-456");
      expect(result.tokenExpiry).toBeInstanceOf(Date);
      expect(result.tokenExpiry!.getTime()).toBeGreaterThan(Date.now());

      expect(mockFetch).toHaveBeenCalledWith(
        "https://oauth2.googleapis.com/token",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        })
      );
    });

    it("should throw error on failed token exchange", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "invalid_grant", error_description: "Code expired" }),
      });

      await expect(provider.exchangeCodeForTokens("invalid-code")).rejects.toThrow(
        "Token exchange failed: Code expired"
      );
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh the access token", async () => {
      const mockResponse = {
        access_token: "new-access-token",
        expires_in: 3600,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.refreshAccessToken("refresh-token-456");

      expect(result.provider).toBe("google");
      expect(result.accessToken).toBe("new-access-token");
      expect(result.refreshToken).toBe("refresh-token-456"); // Preserved from input
    });

    it("should throw error on refresh failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "invalid_grant" }),
      });

      await expect(provider.refreshAccessToken("bad-refresh-token")).rejects.toThrow(
        "Token refresh failed"
      );
    });
  });

  describe("listCalendars", () => {
    const credentials: CalendarCredentials = {
      provider: "google",
      accessToken: "test-access-token",
    };

    it("should list user calendars", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              { id: "primary", summary: "Primary Calendar", primary: true },
              { id: "work@group.calendar", summary: "Work Calendar" },
            ],
          }),
      });

      const calendars = await provider.listCalendars(credentials);

      expect(calendars).toHaveLength(2);
      expect(calendars[0]).toEqual({ id: "primary", name: "Primary Calendar", primary: true });
      expect(calendars[1]).toEqual({ id: "work@group.calendar", name: "Work Calendar", primary: false });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        expect.objectContaining({
          headers: { Authorization: "Bearer test-access-token" },
        })
      );
    });

    it("should return empty array when no calendars", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });

      const calendars = await provider.listCalendars(credentials);
      expect(calendars).toEqual([]);
    });

    it("should throw error on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: "Unauthorized" } }),
      });

      await expect(provider.listCalendars(credentials)).rejects.toThrow(
        "List calendars failed: Unauthorized"
      );
    });
  });

  describe("createEvent", () => {
    const credentials: CalendarCredentials = {
      provider: "google",
      accessToken: "test-access-token",
    };

    const event: CalendarEvent = {
      title: "Team Meeting",
      description: "Weekly sync",
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T11:00:00Z"),
      timezone: "America/New_York",
    };

    it("should create an event in the primary calendar", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "event-id-123",
            summary: "Team Meeting",
            description: "Weekly sync",
            start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "America/New_York" },
            end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "America/New_York" },
          }),
      });

      const result = await provider.createEvent(credentials, event);

      expect(result.externalId).toBe("event-id-123");
      expect(result.title).toBe("Team Meeting");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-access-token",
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("should use specified calendar ID", async () => {
      const credsWithCalendar: CalendarCredentials = {
        ...credentials,
        calendarId: "work@group.calendar",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "event-123", summary: "Meeting", start: { dateTime: "" }, end: { dateTime: "" } }),
      });

      await provider.createEvent(credsWithCalendar, event);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("work%40group.calendar"),
        expect.any(Object)
      );
    });

    it("should create all-day event", async () => {
      const allDayEvent: CalendarEvent = {
        title: "Company Holiday",
        startTime: new Date("2024-01-15"),
        endTime: new Date("2024-01-15"),
        isAllDay: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "event-id",
            summary: "Company Holiday",
            start: { date: "2024-01-15" },
            end: { date: "2024-01-15" },
          }),
      });

      const result = await provider.createEvent(credentials, allDayEvent);
      expect(result.isAllDay).toBe(true);
    });

    it("should include attendees", async () => {
      const eventWithAttendees: CalendarEvent = {
        ...event,
        attendees: [
          { email: "john@example.com", name: "John Doe", optional: false },
          { email: "jane@example.com", name: "Jane Smith", optional: true },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "event-id",
            summary: "Team Meeting",
            start: { dateTime: "" },
            end: { dateTime: "" },
            attendees: [
              { email: "john@example.com", displayName: "John Doe" },
              { email: "jane@example.com", displayName: "Jane Smith", optional: true },
            ],
          }),
      });

      await provider.createEvent(credentials, eventWithAttendees);

      const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
      expect(callBody.attendees).toHaveLength(2);
      expect(callBody.attendees[0].email).toBe("john@example.com");
    });

    it("should include reminders", async () => {
      const eventWithReminders: CalendarEvent = {
        ...event,
        reminders: [
          { method: "popup", minutes: 15 },
          { method: "email", minutes: 60 },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "event-id", summary: "Meeting", start: { dateTime: "" }, end: { dateTime: "" } }),
      });

      await provider.createEvent(credentials, eventWithReminders);

      const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
      expect(callBody.reminders.useDefault).toBe(false);
      expect(callBody.reminders.overrides).toHaveLength(2);
    });

    it("should throw error on create failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: "Quota exceeded" } }),
      });

      await expect(provider.createEvent(credentials, event)).rejects.toThrow(
        "Create event failed: Quota exceeded"
      );
    });
  });

  describe("updateEvent", () => {
    const credentials: CalendarCredentials = {
      provider: "google",
      accessToken: "test-access-token",
    };

    const event: CalendarEvent = {
      title: "Updated Meeting",
      startTime: new Date("2024-01-15T14:00:00Z"),
      endTime: new Date("2024-01-15T15:00:00Z"),
    };

    it("should update an existing event", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "event-id-123",
            summary: "Updated Meeting",
            start: { dateTime: "2024-01-15T14:00:00Z" },
            end: { dateTime: "2024-01-15T15:00:00Z" },
          }),
      });

      const result = await provider.updateEvent(credentials, "event-id-123", event);

      expect(result.title).toBe("Updated Meeting");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events/event-id-123",
        expect.objectContaining({ method: "PUT" })
      );
    });

    it("should throw error on update failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: "Event not found" } }),
      });

      await expect(provider.updateEvent(credentials, "nonexistent", event)).rejects.toThrow(
        "Update event failed: Event not found"
      );
    });
  });

  describe("deleteEvent", () => {
    const credentials: CalendarCredentials = {
      provider: "google",
      accessToken: "test-access-token",
    };

    it("should delete an event", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await expect(provider.deleteEvent(credentials, "event-id-123")).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events/event-id-123",
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("should succeed silently if event already deleted (404)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(provider.deleteEvent(credentials, "already-deleted")).resolves.toBeUndefined();
    });

    it("should throw error on other failures", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: "Server error" } }),
      });

      await expect(provider.deleteEvent(credentials, "event-id")).rejects.toThrow(
        "Delete event failed: Server error"
      );
    });
  });

  describe("getEvent", () => {
    const credentials: CalendarCredentials = {
      provider: "google",
      accessToken: "test-access-token",
    };

    it("should get a single event", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: "event-id-123",
            summary: "My Event",
            start: { dateTime: "2024-01-15T10:00:00Z" },
            end: { dateTime: "2024-01-15T11:00:00Z" },
          }),
      });

      const event = await provider.getEvent(credentials, "event-id-123");

      expect(event).not.toBeNull();
      expect(event!.externalId).toBe("event-id-123");
      expect(event!.title).toBe("My Event");
    });

    it("should return null if event not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const event = await provider.getEvent(credentials, "nonexistent");
      expect(event).toBeNull();
    });

    it("should throw error on other failures", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: "Server error" } }),
      });

      await expect(provider.getEvent(credentials, "event-id")).rejects.toThrow(
        "Get event failed: Server error"
      );
    });
  });

  describe("listEvents", () => {
    const credentials: CalendarCredentials = {
      provider: "google",
      accessToken: "test-access-token",
    };

    it("should list events in date range", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                id: "event-1",
                summary: "Meeting 1",
                start: { dateTime: "2024-01-15T10:00:00Z" },
                end: { dateTime: "2024-01-15T11:00:00Z" },
              },
              {
                id: "event-2",
                summary: "Meeting 2",
                start: { dateTime: "2024-01-16T14:00:00Z" },
                end: { dateTime: "2024-01-16T15:00:00Z" },
              },
            ],
          }),
      });

      const startDate = new Date("2024-01-15");
      const endDate = new Date("2024-01-20");

      const events = await provider.listEvents(credentials, startDate, endDate);

      expect(events).toHaveLength(2);
      expect(events[0].externalId).toBe("event-1");
      expect(events[1].externalId).toBe("event-2");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("timeMin="),
        expect.any(Object)
      );
    });

    it("should return empty array when no events", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });

      const events = await provider.listEvents(credentials, new Date(), new Date());
      expect(events).toEqual([]);
    });
  });
});

describe("OutlookCalendarProvider", () => {
  let provider: OutlookCalendarProvider;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      AZURE_AD_CLIENT_ID: "azure-client-id",
      AZURE_AD_CLIENT_SECRET: "azure-client-secret",
      OUTLOOK_CALENDAR_REDIRECT_URI: "https://app.example.com/outlook/callback",
    };
    provider = new OutlookCalendarProvider();
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getAuthUrl", () => {
    it("should generate valid Microsoft OAuth URL", () => {
      const url = provider.getAuthUrl("test-state");

      expect(url).toContain("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
      expect(url).toContain("client_id=azure-client-id");
      expect(url).toContain("redirect_uri=https%3A%2F%2Fapp.example.com%2Foutlook%2Fcallback");
      expect(url).toContain("response_type=code");
      expect(url).toContain("state=test-state");
    });

    it("should include required scopes", () => {
      const url = provider.getAuthUrl("state");
      expect(url).toContain("Calendars.ReadWrite");
      expect(url).toContain("offline_access");
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("should exchange authorization code for tokens", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "outlook-access-token",
            refresh_token: "outlook-refresh-token",
            expires_in: 3600,
          }),
      });

      const result = await provider.exchangeCodeForTokens("auth-code");

      expect(result.provider).toBe("outlook");
      expect(result.accessToken).toBe("outlook-access-token");
      expect(result.refreshToken).toBe("outlook-refresh-token");
    });

    it("should throw error on failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "invalid_client", error_description: "Bad credentials" }),
      });

      await expect(provider.exchangeCodeForTokens("bad-code")).rejects.toThrow(
        "Token exchange failed: Bad credentials"
      );
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh the access token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "new-outlook-token",
            refresh_token: "new-refresh-token",
            expires_in: 3600,
          }),
      });

      const result = await provider.refreshAccessToken("old-refresh-token");

      expect(result.accessToken).toBe("new-outlook-token");
      expect(result.refreshToken).toBe("new-refresh-token");
    });

    it("should preserve original refresh token if not returned", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "new-token",
            expires_in: 3600,
          }),
      });

      const result = await provider.refreshAccessToken("original-refresh");
      expect(result.refreshToken).toBe("original-refresh");
    });
  });

  describe("listCalendars", () => {
    const credentials: CalendarCredentials = {
      provider: "outlook",
      accessToken: "test-token",
    };

    it("should list calendars from Microsoft Graph", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            value: [
              { id: "cal-1", name: "Calendar", isDefaultCalendar: true },
              { id: "cal-2", name: "Work" },
            ],
          }),
      });

      const calendars = await provider.listCalendars(credentials);

      expect(calendars).toHaveLength(2);
      expect(calendars[0]).toEqual({ id: "cal-1", name: "Calendar", primary: true });
      expect(calendars[1]).toEqual({ id: "cal-2", name: "Work", primary: false });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/me/calendars",
        expect.any(Object)
      );
    });
  });

  describe("stub methods", () => {
    const credentials: CalendarCredentials = {
      provider: "outlook",
      accessToken: "test-token",
    };

    const event: CalendarEvent = {
      title: "Test",
      startTime: new Date(),
      endTime: new Date(),
    };

    it("createEvent should throw not implemented", async () => {
      await expect(provider.createEvent(credentials, event)).rejects.toThrow(
        "Outlook calendar integration not fully implemented"
      );
    });

    it("updateEvent should throw not implemented", async () => {
      await expect(provider.updateEvent(credentials, "id", event)).rejects.toThrow(
        "Outlook calendar integration not fully implemented"
      );
    });

    it("deleteEvent should throw not implemented", async () => {
      await expect(provider.deleteEvent(credentials, "id")).rejects.toThrow(
        "Outlook calendar integration not fully implemented"
      );
    });

    it("getEvent should throw not implemented", async () => {
      await expect(provider.getEvent(credentials, "id")).rejects.toThrow(
        "Outlook calendar integration not fully implemented"
      );
    });

    it("listEvents should throw not implemented", async () => {
      await expect(provider.listEvents(credentials, new Date(), new Date())).rejects.toThrow(
        "Outlook calendar integration not fully implemented"
      );
    });
  });
});
