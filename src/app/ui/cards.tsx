'use client';

import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import styles from "../page.module.css";

// Define the types for the task and column
interface Task {
  id: string;
  text: string;
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

type Columns = Record<string, Column>;

export default function Cards() {
  const [newTask, setNewTask] = useState("");
  const [columns, setColumns] = useState<Columns>({
    'To_Do': {
      id: 'To_Do',
      title: 'To_Do',
      tasks: [],
    },
    'Doing': {
      id: 'Doing',
      title: 'Doing',
      tasks: [],
    },
    'Done': {
      id: 'Done',
      title: 'Done',
      tasks: [],
    },
  });

  useEffect(() => {
    loadTasksFromLocalStorage();
  }, []);

  const saveTasksToLocalStorage = (columns: Columns) => {
    const tasksData = Object.values(columns).flatMap(column => 
      column.tasks.map(task => ({
        id: task.id,
        text: task.text,
        status: column.id,
      }))
    );
    localStorage.setItem("tasks", JSON.stringify(tasksData));
  };

  const loadTasksFromLocalStorage = () => {
    const savedTasks = localStorage.getItem("tasks");
    if (savedTasks) {
      const tasksData: { id?: string, text: string, status: string }[] = JSON.parse(savedTasks);
      const newColumns: Columns = {
        'To_Do': { id: 'To_Do', title: 'To_Do', tasks: [] },
        'Doing': { id: 'Doing', title: 'Doing', tasks: [] },
        'Done': { id: 'Done', title: 'Done', tasks: [] },
      };

      tasksData.forEach(task => {
        if (newColumns[task.status]) {
          const taskId = task.id || `task-${Date.now()}-${Math.random()}`;
          newColumns[task.status].tasks.push({ id: taskId, text: task.text });
        }
      });

      setColumns(newColumns);
    }
  };

  const handleAddTask = () => {
    if (newTask.trim() === "") return;

    const newTaskId = `task-${Date.now()}`;
    const newTaskObj: Task = { id: newTaskId, text: newTask };

    const newColumns = { ...columns };
    newColumns['To_Do'].tasks.push(newTaskObj);

    setColumns(newColumns);
    saveTasksToLocalStorage(newColumns);
    setNewTask("");
  };

  const clearAllTasks = () => {
    const newColumns: Columns = {
      'To_Do': { id: 'To_Do', title: 'To_Do', tasks: [] },
      'Doing': { id: 'Doing', title: 'Doing', tasks: [] },
      'Done': { id: 'Done', title: 'Done', tasks: [] },
    };
    setColumns(newColumns);
    localStorage.removeItem("tasks");
  };

  const clearDoneTasks = () => {
    const newColumns = { ...columns };
    newColumns['Done'].tasks = [];
    setColumns(newColumns);
    saveTasksToLocalStorage(newColumns);
  };

  const resetAllTasks = () => {
    const allTasks = Object.values(columns).flatMap(column => column.tasks);
    const newColumns: Columns = {
      'To_Do': { id: 'To_Do', title: 'To_Do', tasks: allTasks },
      'Doing': { id: 'Doing', title: 'Doing', tasks: [] },
      'Done': { id: 'Done', title: 'Done', tasks: [] },
    };
    setColumns(newColumns);
    saveTasksToLocalStorage(newColumns);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddTask();
  };

  const onDragEnd = (result: any) => {
    const { source, destination } = result;

    if (!destination) return;

    if (source.droppableId === destination.droppableId) {
      // Reordering within the same column
      const column = columns[source.droppableId];
      const newTasks = Array.from(column.tasks);
      const [removed] = newTasks.splice(source.index, 1);
      newTasks.splice(destination.index, 0, removed);

      const newColumns = {
        ...columns,
        [source.droppableId]: {
          ...column,
          tasks: newTasks,
        },
      };
      setColumns(newColumns);
      saveTasksToLocalStorage(newColumns);
    } else {
      // Moving from one column to another
      const sourceColumn = columns[source.droppableId];
      const destColumn = columns[destination.droppableId];
      const sourceTasks = Array.from(sourceColumn.tasks);
      const destTasks = Array.from(destColumn.tasks);
      const [removed] = sourceTasks.splice(source.index, 1);
      destTasks.splice(destination.index, 0, removed);

      const newColumns = {
        ...columns,
        [source.droppableId]: {
          ...sourceColumn,
          tasks: sourceTasks,
        },
        [destination.droppableId]: {
          ...destColumn,
          tasks: destTasks,
        },
      };
      setColumns(newColumns);
      saveTasksToLocalStorage(newColumns);
    }
  };

  return (
    <>
      <div>
        <div className={`${styles.newTaskContainer}`}>
          <form className={`${styles.formCSS}`} onSubmit={handleFormSubmit}>
            <label htmlFor="newTaskInput" className={`${styles.taskHeading1}`}>
              New Task:
            </label>
            <input
              className={`${styles.inputArea}`}
              type="text"
              id="newTaskInput"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Type your new task here"
            />
            <button type="submit" className={`${styles.inputArea}`}>Add Task</button>
          </form>
        </div>

        <div className={`${styles.newTaskContainer2}`}>
          <button id="clearAll" onClick={clearAllTasks} className={`${styles.inputArea2}`}>Clear All Tasks</button>
          <button onClick={resetAllTasks} className={`${styles.inputArea2}`}>Reset All Tasks</button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className={styles.board}>
          {Object.values(columns).map(column => (
            <div key={column.id} className={`${styles.container} container ${column.id}`}>
              <h4 className={`${styles.taskHeading}`}>{column.title.replace('_', ' ')}</h4>
              {column.id === 'Done' && (
                <button onClick={clearDoneTasks} className={`${styles.inputArea}`}>Clear</button>
              )}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={styles.columnContent}
                
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`${styles.task} ${snapshot.isDragging ? styles.dragging : ''}`}
                            style={{
                              userSelect: "none",
                              padding: 16,
                              margin: "0 0 8px 0",
                              minHeight: "50px",
                              backgroundColor: snapshot.isDragging ? "#263B4A" : "#456C86",
                              color: "white",
                              ...provided.draggableProps.style,
                            }}
                          >
                            {task.text}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </>
  );
}