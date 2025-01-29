import { off } from "process";
import styles from "../page.module.css";

export function initializeDraggable(saveTasksToLocalStorage) {
  let draggedItem = null;
  let isDragging = false;

  // Store event listeners for cleanup
  const eventListeners = new WeakMap();

  function removeOldEventListeners(element) {
    const listeners = eventListeners.get(element);
    if (listeners) {
      listeners.forEach(({ event, handler }) => {
        element.removeEventListener(event, handler);
      });
      eventListeners.delete(element);
    }
  }

  function addEventListenerWithCleanup(element, event, handler) {
    if (!eventListeners.has(element)) {
      eventListeners.set(element, []);
    }
    eventListeners.get(element).push({ event, handler });
    element.addEventListener(event, handler);
  }

  // Clean up old event listeners
  document.querySelectorAll(".draggable").forEach(removeOldEventListeners);
  document.querySelectorAll(`.${styles.taskContent}`).forEach(removeOldEventListeners);

  // Add new event listeners
  const draggables = document.querySelectorAll(".draggable");
  const containers = document.querySelectorAll(`.${styles.taskContent}`);

  // Function to update task styles based on container
  function updateTaskStyles() {
    const containerDone = document.querySelector(`.container.Done .${styles.taskContent}`);
    const containerDoing = document.querySelector(`.container.Doing .${styles.taskContent}`);
    const containerToDo = document.querySelector(`.container.container1.To_Do .${styles.taskContent}`);

    if (containerDone) {
      const doneParagraphs = containerDone.querySelectorAll("p");
      doneParagraphs.forEach(paragraph => {
        paragraph.style.textDecoration = "line-through";
        paragraph.style.backgroundColor = "#f0f0f0";
        paragraph.style.opacity = "0.7";
      });
    }

    if (containerDoing) {
      const doingParagraphs = containerDoing.querySelectorAll("p");
      doingParagraphs.forEach(paragraph => {
        paragraph.style.textDecoration = "unset";
        paragraph.style.opacity = "1";
        paragraph.style.backgroundColor = "lightsteelblue";
      });
    }

    if (containerToDo) {
      const todoParagraphs = containerToDo.querySelectorAll("p");
      todoParagraphs.forEach(paragraph => {
        paragraph.style.textDecoration = "unset";
        paragraph.style.opacity = "1";
        paragraph.style.backgroundColor = "white";
        paragraph.style.border = "1px solid black";
        paragraph.style.borderRadius = "5px";
        paragraph.style.cursor = "move";
        paragraph.style.width = "100%";
      });
    }
  }

  draggables.forEach(draggable => {
    const dragStartHandler = (e) => {
      if (isDragging) return;
      isDragging = true;
      draggedItem = draggable;
      e.dataTransfer.effectAllowed = "move";
      requestAnimationFrame(() => {
        draggable.classList.add("dragging");
      });
    };

    const dragEndHandler = () => {
      if (!isDragging) return;
      isDragging = false;
      draggedItem.classList.remove("dragging");
      
      // Ensure we're in the correct container
      const container = draggedItem.closest(`.${styles.taskContent}`);
      if (container) {
        // Wait for DOM to settle before saving
        requestAnimationFrame(() => {
          if (saveTasksToLocalStorage) {
            saveTasksToLocalStorage();
          }
        });
      }
      draggedItem = null;
      updateTaskStyles(); // Update styles after drag
    };

    addEventListenerWithCleanup(draggable, "dragstart", dragStartHandler);
    addEventListenerWithCleanup(draggable, "dragend", dragEndHandler);
  });

  containers.forEach(container => {
    const dragOverHandler = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!isDragging || !draggedItem) return;

      const afterElement = getDragAfterElement(container, e.clientY);
      const draggable = document.querySelector(".dragging");
      
      if (draggable && container !== draggable.parentElement) {
        if (afterElement == null) {
          container.appendChild(draggable);
        } else {
          container.insertBefore(draggable, afterElement);
        }
      }
    };

    const dropHandler = (e) => {
      e.preventDefault();
      const draggable = document.querySelector(".dragging");
      if (draggable && container !== draggable.parentElement) {
        requestAnimationFrame(() => {
          if (saveTasksToLocalStorage) {
            saveTasksToLocalStorage();
          }
        });
      }
      updateTaskStyles(); // Update styles after drop
    };

    addEventListenerWithCleanup(container, "dragover", dragOverHandler);
    addEventListenerWithCleanup(container, "dragenter", (e) => e.preventDefault());
    addEventListenerWithCleanup(container, "drop", dropHandler);
  });

  // Update styles initially
  updateTaskStyles();
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".draggable:not(.dragging)")];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}
