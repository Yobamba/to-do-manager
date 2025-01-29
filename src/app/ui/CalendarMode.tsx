'use client';

import React, { useEffect, useState } from 'react';
import styles from '../page.module.css';
import { signIn, useSession } from 'next-auth/react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  initializeGoogleCalendarApi, 
  fetchCalendarEvents, 
  convertEventToTask,
  storeCalendarTasks,
  getStoredCalendarTasks,
  CalendarTask
} from '../utils/googleCalendar';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z" fill="#EA4335"/>
      <path d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z" fill="#4285F4"/>
      <path d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9.008 9.008 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z" fill="#FBBC05"/>
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z" fill="#34A853"/>
    </svg>
  );
}

export default function CalendarMode() {
  const { data: session, status } = useSession();
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      syncCalendarEvents();
    } else {
      setLoading(false);
    }
  }, [session]);

  const handleSignIn = async () => {
    try {
      await signIn('google', { 
        callbackUrl: window.location.origin,
        prompt: 'consent',
      });
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Failed to sign in with Google');
    }
  };

  const syncCalendarEvents = async () => {
    try {
      setLoading(true);
      const events = await fetchCalendarEvents();
      const newTasks = await Promise.all(events.map(convertEventToTask));
      const existingTasks = getStoredCalendarTasks();
      
      // Merge new tasks with existing ones, avoiding duplicates
      const mergedTasks = [...existingTasks];
      newTasks.forEach(newTask => {
        const existingIndex = mergedTasks.findIndex(t => t.eventId === newTask.eventId);
        if (existingIndex === -1) {
          mergedTasks.push(newTask);
        }
      });

      setTasks(mergedTasks);
      storeCalendarTasks(mergedTasks);
    } catch (err) {
      setError('Failed to sync calendar events');
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const updatedTasks = Array.from(tasks);
    const [movedTask] = updatedTasks.splice(source.index, 1);
    movedTask.status = destination.droppableId;
    updatedTasks.splice(destination.index, 0, movedTask);
    
    setTasks(updatedTasks);
    storeCalendarTasks(updatedTasks);
  };

  if (status === 'loading' || loading) {
    return <div className={styles.loading}>Loading calendar...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button onClick={syncCalendarEvents}>Retry</button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.auth}>
        <h2>Connect to Google Calendar</h2>
        <p>To view and manage your calendar events as tasks, please connect your Google Calendar account. Your data will be kept private and secure.</p>
        <button onClick={handleSignIn} className={styles.googleButton}>
          <GoogleIcon />
          <span className={styles.buttonText}>Sign in with Google</span>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.calendarContainer}>
      <button onClick={syncCalendarEvents} className={styles.syncButton}>
        Sync
      </button>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className={styles.board}>
          <div className={styles.column}>
            <div className={styles.columnHeader}>To Do</div>
            <Droppable droppableId="To_Do">
              {(provided) => (
                <div 
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={styles.columnContent}
                >
                  {tasks
                    .filter(task => task.status === 'To_Do')
                    .map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={styles.task}
                          >
                            <div className={styles.taskText}>{task.text}</div>
                            <div className={styles.dueDate}>
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
          <div className={styles.column}>
            <div className={styles.columnHeader}>Doing</div>
            <Droppable droppableId="Doing">
              {(provided) => (
                <div 
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={styles.columnContent}
                >
                  {tasks
                    .filter(task => task.status === 'Doing')
                    .map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={styles.task}
                          >
                            <div className={styles.taskText}>{task.text}</div>
                            <div className={styles.dueDate}>
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
          <div className={styles.column}>
            <div className={styles.columnHeader}>Done</div>
            <Droppable droppableId="Done">
              {(provided) => (
                <div 
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={styles.columnContent}
                >
                  {tasks
                    .filter(task => task.status === 'Done')
                    .map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={styles.task}
                          >
                            <div className={styles.taskText}>{task.text}</div>
                            <div className={styles.dueDate}>
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
