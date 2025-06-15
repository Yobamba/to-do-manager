'use client';

import React, { useEffect, useState, useRef } from 'react';
import styles from './matrix-mode.module.css';
import { initializeDraggable } from './cardjs.js';

interface Task {
  text: string;
  status: string;
  quadrant?: number;
}

export default function MatrixMode() {
  const [newTask, setNewTask] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const draggedItem = useRef<HTMLParagraphElement | null>(null);

  const quadrantTitles = {
    1: { title: 'Urgent & Important', subtitle: 'Do First' },
    2: { title: 'Not Urgent & Important', subtitle: 'Schedule' },
    3: { title: 'Urgent & Not Important', subtitle: 'Delegate' },
    4: { title: 'Not Urgent & Not Important', subtitle: 'Eliminate' }
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

  // Save tasks to localStorage
  const saveTasks = (updatedTasks: Task[]) => {
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    setTasks(updatedTasks);
  };

  // Apply task styles based on status
  const getTaskStyles = (task: Task) => {
    const baseStyles = {
      padding: '1rem',
      border: '1px solid black',
      borderRadius: '5px',
      cursor: 'move',
      width: '100%',
      marginBottom: '0.5rem',
      color: 'black'
    };

    if (task.status === 'Done') {
      return {
        ...baseStyles,
        textDecoration: 'line-through',
        backgroundColor: '#f0f0f0',
        opacity: '0.7'
      };
    } else if (task.status === 'Doing') {
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

  // Handle quadrant drop
  const handleDrop = (e: React.DragEvent, quadrant: number) => {
    e.preventDefault();
    const draggedIndex = parseInt(e.dataTransfer.getData('taskIndex'));
    
    const updatedTasks = [...tasks];
    updatedTasks[draggedIndex].quadrant = quadrant;
    saveTasks(updatedTasks);
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('taskIndex', index.toString());
  };

  // Allow drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // Render tasks for a specific quadrant
  const renderQuadrantTasks = (quadrant: number) => {
    return tasks
      .filter(task => task.quadrant === quadrant)
      .map((task, index) => {
        const taskIndex = tasks.findIndex(t => t === task);
        return (
          <p
            key={taskIndex}
            className={`${styles.draggable} draggable`}
            draggable
            onDragStart={(e) => handleDragStart(e, taskIndex)}
            style={getTaskStyles(task)}
          >
            {task.text}
          </p>
        );
      });
  };

  return (
    <div className={styles.matrixContainer}>
      <div className={styles.header}>
        <h2>Eisenhower Matrix</h2>
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