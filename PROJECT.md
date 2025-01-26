# To-Do List Manager

A modern, interactive task management application built with Next.js and React. The application allows users to create, organize, and track their tasks with an intuitive drag-and-drop interface.

## Tech Stack

- **Next.js 14**: React framework for production-grade applications
- **TypeScript**: For type safety and better developer experience
- **React**: For building the user interface
- **Local Storage**: For client-side data persistence
- **CSS Modules**: For scoped styling

## Features

- Create and manage tasks
- Drag-and-drop interface for task organization
- Persistent storage across sessions
- Responsive design
- Loading states with skeleton UI
- Modern and clean user interface

## Task Management Feature

### High-Level Overview

The task management system is built around a card-based interface where tasks can be organized into different status categories. The core functionality includes:

1. **Task Creation**: Users can add new tasks through an input interface
2. **Task Organization**: Tasks can be dragged and dropped between different status categories
3. **Data Persistence**: Tasks are automatically saved to the browser's local storage
4. **Real-time Updates**: The UI updates immediately when tasks are created or moved

### Low-Level Implementation Details

1. **State Management**
   - Uses React's `useState` hook to manage the new task input state
   - Implements a ref (`draggedItem`) to track the currently dragged task
   - Stores tasks in local storage using a structured format:
     ```typescript
     interface TaskData {
       text: string | null;
       status: string | null | undefined;
     }
     ```

2. **Drag and Drop Implementation**
   - Custom drag and drop functionality implemented in `cardjs.js`
   - Uses HTML5 Drag and Drop API
   - Tracks task position and updates parent container on drop
   - Maintains task status through parent-child DOM relationships

3. **Data Persistence Layer**
   - `saveTasksToLocalStorage` function:
     - Queries all elements with `.draggable` class
     - Extracts task text and status
     - Stores data in browser's localStorage
   - Data is loaded on component mount
   - Automatic saving on task updates

4. **Component Structure**
   - Main `Cards` component manages the overall task interface
   - Uses CSS modules for styling (`page.module.css`)
   - Implements loading states with `Suspense` and `CardsSkeleton`
   - Navbar component for navigation and potential future features

5. **Performance Considerations**
   - Uses React's `useRef` to avoid unnecessary re-renders during drag operations
   - Implements client-side rendering for immediate user feedback
   - Optimizes DOM updates by using React's virtual DOM

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Contributing

Feel free to submit issues and enhancement requests!
