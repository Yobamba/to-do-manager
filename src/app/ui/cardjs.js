import { off } from "process";
import styles from "../page.module.css";

export function initializeDraggable(saveTasksToLocalStorage) {
  let draggedItem = null;

  // First, remove any existing event listeners
  const oldDraggables = document.querySelectorAll(".draggable");
  const oldContainers = document.querySelectorAll(`.${styles.taskContent}`);

  oldDraggables.forEach(draggable => {
    draggable.replaceWith(draggable.cloneNode(true));
  });

  oldContainers.forEach(container => {
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);
  });

  // Now add fresh event listeners
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
    draggable.addEventListener("dragstart", (e) => {
      draggedItem = draggable;
      e.dataTransfer.effectAllowed = "move";
      setTimeout(() => {
        draggable.classList.add("dragging");
      }, 0);
    });

    draggable.addEventListener("dragend", () => {
      draggedItem.classList.remove("dragging");
      updateTaskStyles(); // Update styles after drag
      if (saveTasksToLocalStorage) {
        saveTasksToLocalStorage();
      }
      draggedItem = null;
    });
  });

  containers.forEach(container => {
    container.addEventListener("dragover", e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const afterElement = getDragAfterElement(container, e.clientY);
      const draggable = document.querySelector(".dragging");
      if (draggable) {
        if (afterElement == null) {
          container.appendChild(draggable);
        } else {
          container.insertBefore(draggable, afterElement);
        }
      }
    });

    container.addEventListener("dragenter", e => {
      e.preventDefault();
    });

    container.addEventListener("drop", e => {
      e.preventDefault();
      const draggable = document.querySelector(".dragging");
      if (draggable) {
        if (getDragAfterElement(container, e.clientY) === null) {
          container.appendChild(draggable);
        } else {
          container.insertBefore(draggable, getDragAfterElement(container, e.clientY));
        }
        updateTaskStyles(); // Update styles after drop
        if (saveTasksToLocalStorage) {
          saveTasksToLocalStorage();
        }
      }
    });
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
