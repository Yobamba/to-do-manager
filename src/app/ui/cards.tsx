/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import Link from "next/link";
import styles from "../page.module.css";
import { initializeDraggable } from "./cardjs.js";
import Image from "next/image"; 
import React from "react";

export default function Cards() {
  const [newTask, setNewTask] = React.useState("");
  const draggedItem = React.useRef<HTMLParagraphElement | null>(null);

  const saveTasksToLocalStorage = () => {
    const allTasks = document.querySelectorAll(".draggable");
    const tasksData: { text: string | null; status: string; }[] = [];

    console.log("Starting saveTasksToLocalStorage");
    console.log("Number of tasks found:", allTasks.length);

    allTasks.forEach((task, index) => {
      // Find which container this task is in
      const containerDiv = task.closest('.container');
      let status = 'To_Do'; // default status
      
      if (containerDiv) {
        console.log(`Task ${index} container classes:`, containerDiv.className);
        if (containerDiv.classList.contains('Doing')) {
          status = 'Doing';
        } else if (containerDiv.classList.contains('Done')) {
          status = 'Done';
        } else if (containerDiv.classList.contains('To_Do')) {
          status = 'To_Do';
        }
        console.log(`Task ${index} assigned status:`, status);
      } else {
        console.warn(`Task ${index} has no container!`);
      }
      
      tasksData.push({
        text: task.textContent,
        status: status
      });
    });

    console.log("Final tasksData:", tasksData);
    localStorage.setItem("tasks", JSON.stringify(tasksData));

    // Apply styles based on container
    const containerDoing = document.querySelector(`.container.Doing .${styles.taskContent}`);
    const containerToDo = document.querySelector(`.container.container1.To_Do .${styles.taskContent}`);
    const containerDone = document.querySelector(`.container.Done .${styles.taskContent}`);

    if (containerDoing) {
      const doingParagraphs = containerDoing.querySelectorAll("p");
      doingParagraphs.forEach(paragraph => {
        paragraph.style.padding = "1rem";
        paragraph.style.textDecoration = 'unset';
        paragraph.style.opacity = '1';
        paragraph.style.color = 'black';
        paragraph.style.backgroundColor = "lightsteelblue";
        paragraph.style.border = "1px solid black";
        paragraph.style.borderRadius = "5px";
        paragraph.style.cursor = "move";
        paragraph.style.width = "100%";
      });
    }

    if (containerToDo) {
      const todoParagraphs = containerToDo.querySelectorAll("p");
      todoParagraphs.forEach(paragraph => {
        paragraph.style.padding = "1rem";
        paragraph.style.textDecoration = 'unset';
        paragraph.style.opacity = '1';
        paragraph.style.color = 'black';
        paragraph.style.backgroundColor = "white";
        paragraph.style.border = "1px solid black";
        paragraph.style.borderRadius = "5px";
        paragraph.style.cursor = "move";
        paragraph.style.width = "100%";
      });
    }

    if (containerDone) {
      const doneParagraphs = containerDone.querySelectorAll("p");
      doneParagraphs.forEach(paragraph => {
        paragraph.style.textDecoration = 'line-through';
        paragraph.style.backgroundColor = '#f0f0f0';
        paragraph.style.opacity = '0.7';
        paragraph.classList.add('done-style');
      });
    }
  };

  const loadTasksFromLocalStorage = () => {
    const savedTasks = localStorage.getItem("tasks");
    console.log("Loading tasks from localStorage");
    
    if (savedTasks) {
      console.log("Raw saved tasks:", savedTasks);
      
      // Clear existing tasks first
      document.querySelectorAll(`.${styles.taskContent}`).forEach(container => {
        container.innerHTML = '';
      });

      const tasksData = JSON.parse(savedTasks);
      console.log("Parsed tasks data:", tasksData);

      tasksData.forEach((data: { status: string; text: string | null }, index: number) => {
        console.log(`Processing task ${index}:`, data);
        
        // Determine the correct container based on status
        let containerSelector;
        switch (data.status) {
          case 'Doing':
            containerSelector = `.container.Doing .${styles.taskContent}`;
            break;
          case 'Done':
            containerSelector = `.container.Done .${styles.taskContent}`;
            break;
          case 'To_Do':
            containerSelector = `.container.container1.To_Do .${styles.taskContent}`;
            break;
          default:
            containerSelector = `.container.container1.To_Do .${styles.taskContent}`;
            break;
        }
        
        console.log(`Looking for container with selector: ${containerSelector}`);
        const container = document.querySelector(containerSelector);
        console.log(`Container found:`, !!container);

        if (container && data.text) {
          const taskElement = document.createElement("p");
          taskElement.className = `${styles.draggable} draggable`;
          taskElement.draggable = true;
          taskElement.textContent = data.text;

          // Add base styles
          taskElement.style.padding = "1rem";
          taskElement.style.border = "1px solid black";
          taskElement.style.borderRadius = "5px";
          taskElement.style.cursor = "move";
          taskElement.style.width = "100%";

          // Add specific styles based on status
          if (data.status === 'Done') {
            taskElement.style.textDecoration = 'line-through';
            taskElement.style.backgroundColor = '#f0f0f0';
            taskElement.style.opacity = '0.7';
          } else if (data.status === 'Doing') {
            taskElement.style.backgroundColor = "lightsteelblue";
            taskElement.style.opacity = '1';
            taskElement.style.textDecoration = 'unset';
          } else {
            taskElement.style.backgroundColor = "white";
            taskElement.style.opacity = '1';
            taskElement.style.textDecoration = 'unset';
          }

          container.appendChild(taskElement);
          console.log(`Task ${index} added to container`);
        }
      });

      // Initialize draggable after adding all tasks
      console.log("Initializing draggable functionality");
      initializeDraggable(saveTasksToLocalStorage);
    } else {
      console.log("No saved tasks found in localStorage");
    }
  };

  const handleAddTask = () => {
    if (newTask.trim() === "") {
      return; // Don't proceed if input is empty
    }

    // Updated selector to use CSS module class
    const containerToDo = document.querySelector(`.container.container1.To_Do .${styles.taskContent}`);
    if (!containerToDo) {
      console.error("Could not find To_Do container");
      return;
    }

    // Create new task element
    const newTaskElement = document.createElement("p");
    newTaskElement.className = `${styles.draggable} draggable`;
    newTaskElement.draggable = true;
    newTaskElement.textContent = newTask;

    // Add styles
    newTaskElement.style.padding = "1rem";
    newTaskElement.style.textDecoration = 'unset';
    newTaskElement.style.opacity = '1';
    newTaskElement.style.color = 'black';
    newTaskElement.style.backgroundColor = "white";
    newTaskElement.style.border = "1px solid black";
    newTaskElement.style.borderRadius = "5px";
    newTaskElement.style.cursor = "move";
    newTaskElement.style.width = "100%";

    // Add drag event listeners
    newTaskElement.addEventListener("dragstart", (e) => {
      draggedItem.current = e.target as HTMLParagraphElement;
      setTimeout(() => {
        draggedItem.current!.classList.add("dragging");
      }, 0);
    });

    newTaskElement.addEventListener("dragend", () => {
      if (draggedItem.current) {
        draggedItem.current.classList.remove("dragging");
        draggedItem.current = null;
        saveTasksToLocalStorage();
      }
    });

    // Add task to DOM
    containerToDo.appendChild(newTaskElement);
    
    // Clear input and save state
    setNewTask("");
    saveTasksToLocalStorage();
    
    // Initialize draggable functionality
    initializeDraggable(saveTasksToLocalStorage);
  };

  const clearAllTasks = () => {
    document.querySelectorAll(`.${styles.taskContent}`).forEach(container => {
      container.innerHTML = '';
    });
    localStorage.removeItem("tasks");
  };

  const clearDoneTasks = () => {
    const containerDone = document.querySelector(`.container.Done .${styles.taskContent}`);
    if (containerDone) {
      containerDone.innerHTML = '';
    }
    
    const tasks = localStorage.getItem("tasks");
    if (tasks) {
      const tasksData = JSON.parse(tasks);
      const filteredTasks = tasksData.filter((task: { status: string; }) => task.status !== "Done");
      localStorage.setItem('tasks', JSON.stringify(filteredTasks));
    }
  };

  const resetAllTasks = () => {
    // Get all tasks from all containers
    const allTasks = document.querySelectorAll(".draggable");
    const containerToDo = document.querySelector(`.container.container1.To_Do .${styles.taskContent}`);
    
    if (containerToDo) {
      // First, collect all task texts
      const taskTexts = Array.from(allTasks).map(task => task.textContent);
      
      // Remove all existing event listeners by removing all tasks
      document.querySelectorAll(`.${styles.taskContent}`).forEach(container => {
        container.innerHTML = '';
      });
      
      // Create fresh tasks in the To_Do container
      taskTexts.forEach(text => {
        if (text) {
          const newTaskElement = document.createElement("p");
          newTaskElement.className = `${styles.draggable} draggable`;
          newTaskElement.draggable = true;
          newTaskElement.textContent = text;
          newTaskElement.style.padding = "1rem";
          newTaskElement.style.textDecoration = 'unset';
          containerToDo.appendChild(newTaskElement);
        }
      });

      // Initialize drag and drop for new elements
      initializeDraggable(saveTasksToLocalStorage);
      
      // Explicitly save the new state to localStorage
      saveTasksToLocalStorage();
    }
  };

  const handleFormSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    handleAddTask();
  };

  React.useEffect(() => {
    initializeDraggable(saveTasksToLocalStorage);
    loadTasksFromLocalStorage();
  }, []);

  return (
    <>
      {
        <>
    
        <div>

       
        {/* Input and button for adding new tasks */}
        <div className={`${styles.newTaskContainer}`}>
        <form className={`${styles.formCSS}`} onSubmit={handleFormSubmit}>
        <label htmlFor="newTaskInput" className={`${styles.taskHeading1}`}>
          New Task:
        </label>
        <input className={`${styles.inputArea}`}
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

   
        
        <div className={`${styles.container} container container1 To_Do`}>
          <h4 className={`${styles.taskHeading}`}>To_Do</h4>
          <div className={styles.taskContent}>
            {/* Tasks will be dynamically added here */}
          </div>
        </div>
        
        <div className={`${styles.container} container Doing`}>
          <h4 className={`${styles.taskHeading}`}>Doing</h4>
          <div className={styles.taskContent}>
            {/* Tasks will be dynamically added here */}
          </div>
        </div>

        <div className={`${styles.container} container Done`}>
          <h4 className={`${styles.taskHeading}`}>Done</h4>
          <button onClick={clearDoneTasks} className={`${styles.inputArea}`}>Clear</button>
          <div className={styles.taskContent}>
            {/* Tasks will be dynamically added here */}
          </div>
        </div>
      
          
          </>
      }
    </>
  );
}
