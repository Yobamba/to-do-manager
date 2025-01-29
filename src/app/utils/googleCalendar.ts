export interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  status: string;
}

export interface CalendarTask {
  id: string;
  text: string;
  status: string;
  dueDate: string;
  eventId: string;
  calendarId: string;
}

export async function initializeGoogleCalendarApi() {
  try {
    const response = await fetch('/api/auth/google');
    const data = await response.json();
    return data.isAuthenticated;
  } catch (error) {
    console.error('Error initializing Google Calendar:', error);
    return false;
  }
}

export async function fetchCalendarEvents(days: number = 7): Promise<CalendarEvent[]> {
  try {
    const response = await fetch(`/api/calendar/events?days=${days}`);
    const data = await response.json();
    return data.events;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
}

export async function convertEventToTask(event: CalendarEvent): Promise<CalendarTask> {
  return {
    id: `cal_${event.id}`,
    text: event.summary,
    status: 'To_Do',
    dueDate: event.end.dateTime,
    eventId: event.id,
    calendarId: 'primary'
  };
}

export function storeCalendarTasks(tasks: CalendarTask[]) {
  localStorage.setItem('calendarTasks', JSON.stringify(tasks));
}

export function getStoredCalendarTasks(): CalendarTask[] {
  const stored = localStorage.getItem('calendarTasks');
  return stored ? JSON.parse(stored) : [];
}
