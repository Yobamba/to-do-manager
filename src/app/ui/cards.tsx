'use client';

import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"  // Vertical dots icon
import styles from "../page.module.css";

// Define the types for the task and column
interface Task {
  id: string;
  text: string;
  isEditing?: boolean;
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

type Columns = Record<string, Column>;

export default function Cards() {
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

  const handleAddTask = (columnId: string) => {
    const newTaskId = `task-${Date.now()}`;
    const newTask: Task = { id: newTaskId, text: "", isEditing: true };

    const newColumns = { ...columns };
    newColumns[columnId].tasks.push(newTask);

    setColumns(newColumns);
  };

  const handleTaskChange = (columnId: string, taskId: string, newText: string) => {
    const newColumns = { ...columns };
    const taskIndex = newColumns[columnId].tasks.findIndex(t => t.id === taskId);
    if (taskIndex > -1) {
      newColumns[columnId].tasks[taskIndex].text = newText;
      setColumns(newColumns);
    }
  };

  const handleTaskBlur = (columnId: string, taskId: string) => {
    const newColumns = { ...columns };
    const taskIndex = newColumns[columnId].tasks.findIndex(t => t.id === taskId);
    if (taskIndex > -1) {
      newColumns[columnId].tasks[taskIndex].isEditing = false;
      // If the task is empty, remove it
      if (newColumns[columnId].tasks[taskIndex].text.trim() === "") {
        newColumns[columnId].tasks.splice(taskIndex, 1);
      }
      setColumns(newColumns);
      saveTasksToLocalStorage(newColumns);
    }
  };

  const clearColumnTasks = (columnId: string) => {
    const newColumns = { ...columns };
    newColumns[columnId].tasks = [];
    setColumns(newColumns);
    saveTasksToLocalStorage(newColumns);
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
      <DragDropContext onDragEnd={onDragEnd}>
        <div className={styles.board}>
          {Object.values(columns).map(column => (
            <div key={column.id} className={`${styles.container} container ${column.id} relative group`}> 
              <div className="relative group">
                <h4 className={`${styles.taskHeading}`}>{column.title.replace('_', ' ')}</h4>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded-full transition-all">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => clearColumnTasks(column.id)}>Clear Tasks</DropdownMenuItem>
                    {column.id === 'To_Do' && (
                      <DropdownMenuItem onClick={clearAllTasks}>Clear All Tasks</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={styles.columnContent}
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={task.isEditing}>
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
                              backgroundColor: snapshot.isDragging ? "#a84832" : "#6b2f21",
                              color: "white",
                              ...provided.draggableProps.style,
                            }}
                          >
                            {task.isEditing ? (
                              <input
                                type="text"
                                value={task.text}
                                onChange={(e) => handleTaskChange(column.id, task.id, e.target.value)}
                                onBlur={() => handleTaskBlur(column.id, task.id)}
                                onKeyDown={(e) => e.key === 'Enter' && handleTaskBlur(column.id, task.id)}
                                autoFocus
                                className="bg-transparent w-full focus:outline-none"
                              />
                            ) : (
                              task.text
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <button onClick={() => handleAddTask(column.id)} className="w-full mt-2 p-2 bg-gray-200 rounded hover:bg-gray-300">+ Add Task</button>
            </div>
          ))}
        </div>
      </DragDropContext>
    </>
  );
}