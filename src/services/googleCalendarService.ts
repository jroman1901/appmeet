export interface GoogleCalendarEventInput {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  reminderMinutesBefore?: number;
}

interface GoogleEventReminders {
  useDefault: boolean;
  overrides?: { method: 'popup' | 'email'; minutes: number }[];
}

interface GoogleEventBody {
  summary: string;
  description?: string;
  start: { dateTime: string };
  end: { dateTime: string };
  reminders: GoogleEventReminders;
}

const EVENTS_BASE_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;

  private constructor() {}

  public static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  private buildReminders(minutesBefore?: number): GoogleEventReminders {
    if (!minutesBefore || minutesBefore <= 0) {
      return { useDefault: false, overrides: [] };
    }
    return {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: minutesBefore },
        { method: 'email', minutes: minutesBefore }
      ]
    };
  }

  buildEventBody(input: GoogleCalendarEventInput): GoogleEventBody {
    return {
      summary: input.summary,
      description: input.description || undefined,
      start: { dateTime: input.startTime.toISOString() },
      end: { dateTime: input.endTime.toISOString() },
      reminders: this.buildReminders(input.reminderMinutesBefore)
    };
  }

  async createEvent(accessToken: string, event: GoogleEventBody): Promise<string> {
    const response = await fetch(EVENTS_BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      throw new Error(`Error al crear el evento en Google Calendar (${response.status})`);
    }

    const data = await response.json();
    return data.id as string;
  }

  async updateEvent(accessToken: string, eventId: string, event: GoogleEventBody): Promise<void> {
    const response = await fetch(`${EVENTS_BASE_URL}/${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok && response.status !== 404 && response.status !== 410) {
      throw new Error(`Error al actualizar el evento en Google Calendar (${response.status})`);
    }
  }

  async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    const response = await fetch(`${EVENTS_BASE_URL}/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok && response.status !== 404 && response.status !== 410 && response.status !== 204) {
      throw new Error(`Error al eliminar el evento en Google Calendar (${response.status})`);
    }
  }
}
