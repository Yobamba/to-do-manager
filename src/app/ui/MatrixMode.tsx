'use client';

import React, { useEffect, useState, useRef } from 'react';
import styles from './matrix-mode.module.css';
import { signIn, useSession } from 'next-auth/react';
import { 
  fetchCalendarEvents, 
  convertEventToTask,
  CalendarTask,
  getStoredCalendarTasks,
  storeCalendarTasks,
  mergeTasks
} from '../utils/googleCalendar';

interface Task {
  text: string;
  status: string;
  quadrant?: number;
}

interface CalendarTaskWithQuadrant extends CalendarTask {
  quadrant?: number;
}

type MatrixModeType = 'simple' | 'calendar';

export default function MatrixMode() {
  const { data: session, status } = useSession();
  const [newTask, setNewTask] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarTasks, setCalendarTasks] = useState<CalendarTaskWithQuadrant[]>([]);
  const [matrixMode, setMatrixMode] = useState<MatrixModeType>('simple');
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draggedItem = useRef<HTMLParagraphElement | null>(null);

  const quadrantTitles = {
    1: { title: 'Urgent & Important', subtitle: 'Do First' },
    2: { title: 'Not Urgent & Important', subtitle: 'Schedule' },
    3: { title: 'Urgent & Not Important', subtitle: 'Delegate' },
    4: { title: 'Not Urgent & Not Important', subtitle: 'Eliminate' }
  };

  // Load calendar quadrant assignments
  const loadCalendarQuadrants = () => {
    const stored = localStorage.getItem('calendarQuadrants');
    return stored ? JSON.parse(stored) : {};
  };

  // Save calendar quadrant assignments
  const saveCalendarQuadrants = (quadrants: Record<string, number>) => {
    localStorage.setItem('calendarQuadrants', JSON.stringify(quadrants));
  };

  // Load tasks from localStorage
  const loadTasks = () => {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks);
      // Ensure all tasks have a quadrant field, default to 4
      const tasksWithQuadrant = parsedTasks.map((task: Task) => ({
        ...task,
        quadrant: task.quadrant || 4
      }));
      setTasks(tasksWithQuadrant);
      
      // Save back with quadrant field
      localStorage.setItem('tasks', JSON.stringify(tasksWithQuadrant));
    }
  };

  // Load calendar tasks with quadrant assignments
  const loadCalendarTasks = () => {
    const storedTasks = getStoredCalendarTasks();
    const quadrants = loadCalendarQuadrants();
    
    // Assign quadrants to calendar tasks
    const tasksWithQuadrants = storedTasks.map(task => ({
      ...task,
      quadrant: quadrants[task.id] || 4
    }));
    
    setCalendarTasks(tasksWithQuadrants);
  };

  // Sync calendar events
  const syncCalendarEvents = async () => {
    if (isSyncing || !session) return;
    
    try {
      setIsSyncing(true);
      setError(null);
      
      const events = await fetchCalendarEvents();
      const newTasks = await Promise.all(events.map(convertEventToTask));
      const existingTasks = getStoredCalendarTasks();
      
      // Merge tasks
      const mergedTasks = mergeTasks(existingTasks, newTasks);
      
      // Apply quadrant assignments
      const quadrants = loadCalendarQuadrants();
      const tasksWithQuadrants = mergedTasks.map(task => ({
        ...task,
        quadrant: quadrants[task.id] || 4
      }));
      
      setCalendarTasks(tasksWithQuadrants);
      storeCalendarTasks(mergedTasks);
      
      // Clean up quadrants for deleted events
      const validEventIds = new Set(mergedTasks.map(t => t.id));
      const updatedQuadrants: Record<string, number> = {};
      Object.keys(quadrants).forEach(id => {
        if (validEventIds.has(id)) {
          updatedQuadrants[id] = quadrants[id];
        }
      });
      saveCalendarQuadrants(updatedQuadrants);
    } catch (err) {
      console.error('Sync error:', err);
      setError('Failed to sync calendar events');
    } finally {
      setIsSyncing(false);
    }
  };

  // Save tasks to localStorage
  const saveTasks = (updatedTasks: Task[]) => {
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    setTasks(updatedTasks);
  };

  // Apply task styles based on status
  const getTaskStyles = (task: Task | CalendarTaskWithQuadrant, isCalendar: boolean = false) => {
    const baseStyles = {
      padding: '1rem',
      border: '1px solid black',
      borderRadius: '5px',
      cursor: 'move',
      width: '100%',
      marginBottom: '0.5rem',
      color: 'black',
      position: 'relative' as const
    };

    if (isCalendar) {
      return {
        ...baseStyles,
        backgroundColor: '#e3f2fd',
        border: '1px solid #1976d2'
      };
    }

    const simpleTask = task as Task;
    if (simpleTask.status === 'Done') {
      return {
        ...baseStyles,
        textDecoration: 'line-through',
        backgroundColor: '#f0f0f0',
        opacity: '0.7'
      };
    } else if (simpleTask.status === 'Doing') {
      return {
        ...baseStyles,
        backgroundColor: 'lightsteelblue'
      };
    } else {
      return {
        ...baseStyles,
        backgroundColor: 'white'
      };
    }
  };

  // Handle adding new task
  const handleAddTask = () => {
    if (newTask.trim() === '') return;

    const newTaskItem: Task = {
      text: newTask,
      status: 'To_Do',
      quadrant: 4 // Default to quadrant 4
    };

    const updatedTasks = [...tasks, newTaskItem];
    saveTasks(updatedTasks);
    setNewTask('');
  };

  // Handle quadrant drop for simple tasks
  const handleSimpleDrop = (e: React.DragEvent, quadrant: number) => {
    e.preventDefault();
    const draggedIndex = parseInt(e.dataTransfer.getData('taskIndex'));
    
    const updatedTasks = [...tasks];
    updatedTasks[draggedIndex].quadrant = quadrant;
    saveTasks(updatedTasks);
  };

  // Handle quadrant drop for calendar tasks
  const handleCalendarDrop = (e: React.DragEvent, quadrant: number) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('calendarTaskId');
    
    const updatedTasks = calendarTasks.map(task => 
      task.id === draggedId ? { ...task, quadrant } : task
    );
    setCalendarTasks(updatedTasks);
    
    // Update quadrant assignments
    const quadrants = loadCalendarQuadrants();
    quadrants[draggedId] = quadrant;
    saveCalendarQuadrants(quadrants);
  };

  // Handle drop based on mode
  const handleDrop = (e: React.DragEvent, quadrant: number) => {
    if (matrixMode === 'simple') {
      handleSimpleDrop(e, quadrant);
    } else {
      handleCalendarDrop(e, quadrant);
    }
  };

  // Handle drag start for simple tasks
  const handleSimpleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('taskIndex', index.toString());
  };

  // Handle drag start for calendar tasks
  const handleCalendarDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('calendarTaskId', taskId);
  };

  // Allow drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Format date for display
  const formatEventDate = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  // Sign in handler
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

  useEffect(() => {
    loadTasks();
    loadCalendarTasks();
  }, []);

  useEffect(() => {
    if (session && matrixMode === 'calendar') {
      syncCalendarEvents();
    }
  }, [session, matrixMode]);

  // Render simple tasks for a specific quadrant
  const renderSimpleQuadrantTasks = (quadrant: number) => {
    return tasks
      .filter(task => task.quadrant === quadrant)
      .map((task, index) => {
        const taskIndex = tasks.findIndex(t => t === task);
        return (
          <p
            key={taskIndex}
            className={`${styles.draggable} draggable`}
            draggable
            onDragStart={(e) => handleSimpleDragStart(e, taskIndex)}
            style={getTaskStyles(task)}
          >
            {task.text}
          </p>
        );
      });
  };

  // Render calendar tasks for a specific quadrant
  const renderCalendarQuadrantTasks = (quadrant: number) => {
    return calendarTasks
      .filter(task => task.quadrant === quadrant)
      .map((task) => (
        <div
          key={task.id}
          className={`${styles.draggable} ${styles.calendarTask} draggable`}
          draggable
          onDragStart={(e) => handleCalendarDragStart(e, task.id)}
          style={getTaskStyles(task, true)}
        >
          <div className={styles.calendarIcon}>📅</div>
          <div className={styles.taskContent}>
            <p className={styles.taskTitle}></p>
            <span className={styles.taskDate}>
              {/* TODO: "uncomment this line" {formatEventDate(task.start.dateTime)} */}
            </span>
          </div>
        </div>
      ));
  };

  // Render tasks based on mode
  const renderQuadrantTasks = (quadrant: number) => {
    if (matrixMode === 'simple') {
      return renderSimpleQuadrantTasks(quadrant);
    } else {
      return renderCalendarQuadrantTasks(quadrant);
    }
  };

  return (
    <div className={styles.matrixContainer}>
      <div className={styles.header}>
        <h2>Eisenhower Matrix</h2>
        
        {/* Mode Toggle */}
        <div className={styles.modeToggleContainer}>
          <button
            className={`${styles.modeButton} ${matrixMode === 'simple' ? styles.active : ''}`}
            onClick={() => setMatrixMode('simple')}
          >
            Simple Tasks
          </button>
          <button
            className={`${styles.modeButton} ${matrixMode === 'calendar' ? styles.active : ''}`}
            onClick={() => setMatrixMode('calendar')}
          >
            Calendar Events
          </button>
        </div>

        {/* Add Task / Auth Section */}
        {matrixMode === 'simple' ? (
          <div className={styles.newTaskContainer}>
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="Type your new task here"
              className={styles.taskInput}
            />
            <button onClick={handleAddTask} className={styles.addButton}>
              Add Task
            </button>
          </div>
        ) : (
          <div className={styles.calendarControls}>
            {status === 'authenticated' ? (
              <button 
                onClick={syncCalendarEvents} 
                className={styles.syncButton}
                disabled={isSyncing}
              >
                {isSyncing ? 'Syncing...' : 'Sync Calendar'}
              </button>
            ) : (
              <button onClick={handleSignIn} className={styles.authButton}>
                Sign in with Google
              </button>
            )}
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </div>

      <div className={styles.matrixGrid}>
        {[1, 2, 3, 4].map(quadrant => (
          <div
            key={quadrant}
            className={`${styles.quadrant} ${styles[`quadrant${quadrant}`]}`}
            onDrop={(e) => handleDrop(e, quadrant)}
            onDragOver={handleDragOver}
          >
            <div className={styles.quadrantHeader}>
              <h3>{quadrantTitles[quadrant as keyof typeof quadrantTitles].title}</h3>
              <span className={styles.subtitle}>
                {quadrantTitles[quadrant as keyof typeof quadrantTitles].subtitle}
              </span>
            </div>
            <div className={styles.quadrantContent}>
              {renderQuadrantTasks(quadrant)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}