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
  backgroundColor?: string;
  foregroundColor?: string;
}

export interface CalendarTask {
  id: string;
  text: string;
  status: string;
  dueDate: string;
  eventId: string;
  calendarId: string;
  backgroundColor?: string;
  foregroundColor?: string;
  lastUpdated?: number;
  position?: number;
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

export async function fetchCalendarEvents(days: number = 1): Promise<CalendarEvent[]> {
  try {
    const response = await fetch(`/api/calendar/events?days=${days}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
}

export async function convertEventToTask(event: CalendarEvent): Promise<CalendarTask> {
  // Get stored tasks to preserve status and position
  const storedTasks = getStoredCalendarTasks();
  const existingTask = storedTasks.find(t => t.eventId === event.id);

  return {
    id: `cal_${event.id}`,
    text: event.summary,
    status: existingTask?.status || 'To_Do',
    dueDate: event.end.dateTime,
    eventId: event.id,
    calendarId: 'primary',
    backgroundColor: event.backgroundColor,
    foregroundColor: event.foregroundColor,
    lastUpdated: existingTask?.lastUpdated || Date.now(),
    position: existingTask?.position
  };
}

export function storeCalendarTasks(tasks: CalendarTask[]) {
  try {
    // Update positions before storing
    const updatedTasks = tasks.map((task, index) => ({
      ...task,
      position: index
    }));

    localStorage.setItem('calendarTasks', JSON.stringify(updatedTasks));
    return true;
  } catch (error) {
    console.error('Error storing calendar tasks:', error);
    return false;
  }
}

export function getStoredCalendarTasks(): CalendarTask[] {
  try {
    const stored = localStorage.getItem('calendarTasks');
    if (!stored) return [];

    const tasks = JSON.parse(stored);
    return tasks.sort((a: CalendarTask, b: CalendarTask) => {
      // First sort by status
      const statusOrder = { 'To_Do': 0, 'Doing': 1, 'Done': 2 };
      const statusDiff = statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
      
      if (statusDiff !== 0) return statusDiff;
      
      // Then by position if available
      if (a.position !== undefined && b.position !== undefined) {
        return a.position - b.position;
      }
      
      // Finally by due date
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  } catch (error) {
    console.error('Error reading stored calendar tasks:', error);
    return [];
  }
}

export function mergeTasks(existingTasks: CalendarTask[], newTasks: CalendarTask[]): CalendarTask[] {
  const mergedTasks = [...existingTasks];
  const now = Date.now();
  const TWO_HOURS = 2 * 60 * 60 * 1000;

  newTasks.forEach(newTask => {
    const existingIndex = mergedTasks.findIndex(t => t.eventId === newTask.eventId);
    
    if (existingIndex === -1) {
      // Add new task
      mergedTasks.push({
        ...newTask,
        position: mergedTasks.length
      });
    } else {
      const existingTask = mergedTasks[existingIndex];
      // Only update if the task hasn't been modified recently
      if (!existingTask.lastUpdated || (now - existingTask.lastUpdated) > TWO_HOURS) {
        mergedTasks[existingIndex] = {
          ...newTask,
          status: existingTask.status,
          position: existingTask.position,
          lastUpdated: existingTask.lastUpdated
        };
      }
    }
  });

  return mergedTasks;
}
