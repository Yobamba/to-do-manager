# Google Calendar Integration Guide

This guide explains how to implement Google Calendar integration in a Next.js application, based on the implementation in the To-Do List Manager project. It's designed for junior developers who want to add similar functionality to their own projects.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Google Cloud Console Setup](#google-cloud-console-setup)
4. [Environment Variables](#environment-variables)
5. [Authentication with NextAuth.js](#authentication-with-nextauth)
6. [API Routes](#api-routes)
7. [Calendar Data Models](#calendar-data-models)
8. [Frontend Implementation](#frontend-implementation)
9. [Data Synchronization](#data-synchronization)
10. [Styling and UI](#styling-and-ui)
11. [Testing and Troubleshooting](#testing-and-troubleshooting)

## Overview

The Google Calendar integration allows users to:

1. Connect their Google Calendar account to the application
2. Import calendar events as tasks
3. Organize these tasks in a kanban-style board (To Do, Doing, Done)
4. Sync changes between the application and Google Calendar
5. Preserve task status and position across sessions

The implementation uses:
- NextAuth.js for authentication
- Google Calendar API for fetching events
- Local storage for offline persistence
- React's Context API for state management
- Custom drag-and-drop functionality

## Prerequisites

Before starting, ensure you have:

- A Next.js project (version 13+ recommended)
- Node.js and npm/yarn installed
- Basic understanding of React and Next.js
- A Google account for setting up API access

## Google Cloud Console Setup

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Note your Project ID

2. **Enable Google Calendar API**:
   - In your project, go to "APIs & Services" > "Library"
   - Search for "Google Calendar API" and enable it

3. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type (unless you're developing for a Google Workspace organization)
   - Fill in the required information (app name, user support email, developer contact)
   - Add the following scopes:
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/calendar.events.readonly`
   - Add test users (including your own email)

4. **Create OAuth Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application" as the application type
   - Add authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - Your production domain (if applicable)
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://yourdomain.com/api/auth/callback/google` (for production)
   - Click "Create" and note your Client ID and Client Secret

## Environment Variables

Create or update your `.env.local` file with the following variables:

```
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

For production, update the `NEXTAUTH_URL` to your production domain.

The `NEXTAUTH_SECRET` should be a random string used to encrypt cookies. You can generate one with:
```bash
openssl rand -base64 32
```

## Authentication with NextAuth

### 1. Install Required Packages

```bash
npm install next-auth googleapis
```

### 2. Create Auth Configuration

Create a file at `src/app/api/auth/config.ts`:

```typescript
import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';

// Extend the built-in session type
interface ExtendedSession extends Session {
  accessToken?: string;
  error?: string;
}

// Extend the built-in JWT type
interface ExtendedToken extends JWT {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  error?: string;
}

async function refreshAccessToken(token: ExtendedToken): Promise<ExtendedToken> {
  try {
    const url =
      "https://oauth2.googleapis.com/token?" +
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken!,
      });

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.log(error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly"
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }): Promise<ExtendedToken> {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
        };
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token as ExtendedToken;
      }

      // Access token has expired, try to update it
      return refreshAccessToken(token as ExtendedToken);
    },
    async session({ session, token }: { session: Session; token: JWT }): Promise<ExtendedSession> {
      const extendedToken = token as ExtendedToken;
      return {
        ...session,
        accessToken: extendedToken.accessToken,
        error: extendedToken.error,
      };
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
};
```

### 3. Create NextAuth API Route

Create a file at `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from 'next-auth';
import { authOptions } from '../config';

// Use Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 4. Create Google Auth Status Check Route

Create a file at `src/app/api/auth/google/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET() {
  try {
    const session = await getServerSession();
    return NextResponse.json({
      isAuthenticated: !!session,
      session
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({
      isAuthenticated: false,
      error: 'Failed to check authentication status'
    }, { status: 500 });
  }
}
```

## API Routes

### 1. Create Google Calendar API Utility

Create a file at `src/app/utils/googleCalendarApi.ts`:

```typescript
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';

export async function getGoogleCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  
  auth.setCredentials({ access_token: accessToken });
  
  return google.calendar({ version: 'v3', auth });
}

export async function listCalendarEvents(accessToken: string, days: number = 7) {
  const calendar = await getGoogleCalendarClient(accessToken);
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

export async function getSession() {
  return await getServerSession();
}
```

### 2. Create Calendar Events API Route

Create a file at `src/app/api/calendar/events/route.ts`:

```typescript
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { authOptions } from '../../auth/config';

// Use Node.js runtime instead of Edge
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const calendar = google.calendar({
      version: 'v3',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    // Get URL parameters
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7', 10);

    // First, get the calendar colors for reference
    const colors = await calendar.colors.get();

    // Get today's start and end plus specified number of days
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    // Enhance events with their color information
    const eventsWithColors = response.data.items?.map(event => {
      const colorId = event.colorId;
      const eventColor = colorId ? colors.data.event?.[colorId] : null;
      
      return {
        ...event,
        backgroundColor: eventColor?.background || '#c75d3a', // Use default blue if no color
        foregroundColor: eventColor?.foreground || '#FFFFFF'
      };
    });

    return NextResponse.json({ 
      events: eventsWithColors || [],
      colors: colors.data // Include all available colors for reference
    });
  } catch (error) {
    console.error('Calendar API Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
```

## Calendar Data Models

Create a file at `src/app/utils/googleCalendar.ts` to define data models and utility functions:

```typescript
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

export async function fetchCalendarEvents(days: number = 7): Promise<CalendarEvent[]> {
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
```

## Frontend Implementation

### 1. Create App Mode Context

Create a file at `src/app/context/AppModeContext.tsx`:

```typescript
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type AppMode = 'simple' | 'calendar';

interface AppSettings {
  mode: AppMode;
  lastUsedCalendar?: string;
  autoSync?: boolean;
}

interface AppModeContextType {
  mode: AppMode;
  toggleMode: () => void;
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

const SETTINGS_KEY = 'appSettings';

export function AppModeProvider({ children }: { children: ReactNode }) {
  // Initialize with 'simple' mode and update after mount
  const [settings, setSettings] = useState<AppSettings>({ mode: 'simple' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  }, [settings, mounted]);

  const toggleMode = () => {
    setSettings(prev => ({
      ...prev,
      mode: prev.mode === 'simple' ? 'calendar' : 'simple'
    }));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Only render content after mounting to ensure client/server match
  if (!mounted) {
    return null;
  }

  return (
    <AppModeContext.Provider value={{ 
      mode: settings.mode, 
      toggleMode, 
      settings,
      updateSettings 
    }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const context = useContext(AppModeContext);
  if (context === undefined) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }
  return context;
}
```

### 2. Create Mode Toggle Component

Create a file at `src/app/ui/ModeToggle.tsx`:

```typescript
'use client';

import { useAppMode } from '../context/AppModeContext';
import styles from '../page.module.css';
import { useState, useEffect } from 'react';

export default function ModeToggle() {
  const { mode, toggleMode } = useAppMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Return null on server-side and first render
  }

  return (
    <div className={styles.modeToggleContainer}>
      <label className={styles.switch}>
        <input
          type="checkbox"
          checked={mode === 'calendar'}
          onChange={toggleMode}
        />
        <span className={styles.slider}>
          <span className={styles.modeLabel}>
            {mode === 'simple' ? 'Simple' : 'Calendar'}
          </span>
        </span>
      </label>
    </div>
  );
}
```

### 3. Create Calendar Mode Component

Create a file at `src/app/ui/CalendarMode.tsx`:

```typescript
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
  CalendarTask,
  mergeTasks
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
  const [isSyncing, setIsSyncing] = useState(false);

  // Load tasks from localStorage on mount
  useEffect(() => {
    const storedTasks = getStoredCalendarTasks();
    setTasks(storedTasks);
    setLoading(false);
  }, []);

  // Sync with Google Calendar when session is available
  useEffect(() => {
    if (session && !isSyncing) {
      syncCalendarEvents();
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
    if (isSyncing) return;
    
    try {
      setIsSyncing(true);
      setError(null);
      
      const events = await fetchCalendarEvents();
      const newTasks = await Promise.all(events.map(convertEventToTask));
      const existingTasks = getStoredCalendarTasks();
      
      // Use the mergeTasks function
      const mergedTasks = mergeTasks(existingTasks, newTasks);
      
      setTasks(mergedTasks);
      storeCalendarTasks(mergedTasks);
    } catch (err) {
      console.error('Sync error:', err);
      setError('Failed to sync calendar events');
    } finally {
      setIsSyncing(false);
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    // Get tasks in their respective columns
    const tasksInSourceStatus = tasks.filter(t => t.status === source.droppableId);
    const sourceTask = tasksInSourceStatus[source.index];
    
    if (!sourceTask) return;

    // Create a new array without the dragged task
    const updatedTasks = tasks.filter(t => t.id !== sourceTask.id);
    
    // Find tasks in the destination column
    const tasksInDestStatus = updatedTasks.filter(t => t.status === destination.droppableId);
    
    // Calculate the position to insert the task
    let insertPosition;
    if (destination.index === 0) {
      insertPosition = 0;
    } else if (destination.index >= tasksInDestStatus.length) {
      insertPosition = updatedTasks.length;
    } else {
      const targetTask = tasksInDestStatus[destination.index];
      insertPosition = updatedTasks.findIndex(t => t.id === targetTask.id);
    }

    // Create the updated task with new status and timestamp
    const updatedTask = {
      ...sourceTask,
      status: destination.droppableId,
      lastUpdated: Date.now()
    };

    // Insert the task at the calculated position
    updatedTasks.splice(insertPosition, 0, updatedTask);

    // Update positions for all tasks
    const finalTasks = updatedTasks.map((task, index) => ({
      ...task,
      position: index
    }));

    setTasks(finalTasks);
    storeCalendarTasks(finalTasks);
  };

  const renderTask = (task: CalendarTask, index: number) => (
    <Draggable key={task.id} draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`${styles.task} ${snapshot.isDragging ? styles.dragging : ''}`}
          style={{
            ...provided.draggableProps.style,
            backgroundColor: task.backgroundColor || '#c75d3a',
            color: task.foregroundColor || '#FFFFFF',
          }}
        >
          <div className={styles.taskText}>{task.text}</div>
          {task.dueDate && (
            <div className={styles.dueDate} style={{ color: task.foregroundColor || '#FFFFFF' }}>
              Due: {new Date(task.dueDate).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );

  if (status === 'loading') {
    return <div className={styles.loading}>Loading authentication...</div>;
  }

  if (!session) {
    return (
      <div className={styles.auth}>
        <h2>Connect to Google Calendar</h2>
        <p>To view and manage your calendar events as tasks, please connect your Google Calendar account.</p>
        <button onClick={handleSignIn} className={styles.googleButton}>
          <GoogleIcon />
          <span className={styles.buttonText}>Sign in with Google</span>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.header}>
        <button 
          onClick={syncCalendarEvents} 
          className={`${styles.syncButton} ${isSyncing ? styles.syncing : ''}`}
          disabled={isSyncing}
        >
          {isSyncing ? 'Syncing...' : 'Sync Calendar'}
        </button>
        {error && <div className={styles.error}>{error}</div>}
      </div>

      <div className={styles.boardWrapper}>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className={styles.board}>
            {['To_Do', 'Doing', 'Done'].map((status) => (
              <div key={status} className={styles.column}>
                <div className={styles.columnHeader}>
                  {status.replace('_', ' ')}
                </div>
                <Droppable droppableId={status}>
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={styles.columnContent}
                    >
                      {loading ? (
                        <div className={styles.loading}>Loading tasks...</div>
                      ) : (
                        tasks
                          .filter(task => task.status === status)
                          .map((task, index) => renderTask(task, index))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
```

### 4. Update Main Page Component

Update your main page component to use the calendar mode:

```typescript
'use client';

import styles from "./page.module.css";
import { Suspense } from "react";
import dynamic from 'next/dynamic';
import { CardsSkeleton } from "./ui/skeletons";
import Navbar from "@/app/ui/navbar";
import { useAppMode } from './context/AppModeContext';

// Dynamically import components with no SSR
const Cards = dynamic(() => import("@/app/ui/cards"), { ssr: false });
const CalendarMode = dynamic(() => import("@/app/ui/CalendarMode"), { ssr: false });

export default function Home() {
  const { mode } = useAppMode();

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <Suspense fallback={<CardsSkeleton />}>
          {mode === 'simple' ? (
            <div className={styles.grid}>
              <Cards />
            </div>
          ) : (
            <CalendarMode />
          )}
        </Suspense>
      </main>
    </>
  );
}
```

### 5. Add the Provider to Layout

Update your layout component to include the AppModeProvider:

```typescript
'use client';

import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { AppModeProvider } from './context/AppModeContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <AppModeProvider>
            {children}
          </AppModeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

## Data Synchronization

The calendar integration implements a sophisticated synchronization system that balances Google Calendar data with user modifications. Here's how it works:

### 1. Initial Load

When the CalendarMode component mounts, it:
1. Loads tasks from localStorage
2. Checks if the user is authenticated with Google
3. If authenticated, automatically syncs with Google Calendar

```typescript
// Load tasks from localStorage on mount
useEffect(() => {
  const storedTasks = getStoredCalendarTasks();
  setTasks(storedTasks);
  setLoading(false);
}, []);

// Sync with Google Calendar when session is available
useEffect(() => {
  if (session && !isSyncing) {
    syncCalendarEvents();
  }
}, [session]);
```

### 2. Sync Process

The synchronization process:
1. Fetches events from Google Calendar API
2. Converts events to task format
3. Merges with existing tasks using the `mergeTasks` function
4. Preserves user modifications to tasks (status, position)
5. Stores the merged tasks in localStorage

```typescript
const syncCalendarEvents = async () => {
  if (isSyncing) return;
  
  try {
    setIsSyncing(true);
    setError(null);
    
    const events = await fetchCalendarEvents();
    const newTasks = await Promise.all(events.map(convertEventToTask));
    const existingTasks = getStoredCalendarTasks();
    
    // Use the mergeTasks function
    const mergedTasks = mergeTasks(existingTasks, newTasks);
    
    setTasks(mergedTasks);
    storeCalendarTasks(mergedTasks);
  } catch (err) {
    console.error('Sync error:', err);
    setError('Failed to sync calendar events');
  } finally {
    setIsSyncing(false);
  }
};
```

### 3. Conflict Resolution

The `mergeTasks` function handles conflicts between Google Calendar events and user-modified tasks:

```typescript
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
```

Key aspects of the conflict resolution:
- Uses a time-based approach with a 2-hour window
- If a task was modified by the user within the last 2 hours, local changes are preserved
- Otherwise, updates from Google Calendar take precedence
- Always preserves the task status and position set by the user

### 4. Task Updates

When a user drags a task to a different status column:
1. The task's status is updated
2. The `lastUpdated` timestamp is set to the current time
3. The task's position is recalculated
4. The updated tasks are saved to localStorage

```typescript
const onDragEnd = (result: any) => {
  if (!result.destination) return;

  const { source, destination } = result;
  
  // Get tasks in their respective columns
  const tasksInSourceStatus = tasks.filter(t => t.status === source.droppableId);
  const sourceTask = tasksInSourceStatus[source.index];
  
  if (!sourceTask) return;

  // Create a new array without the dragged task
  const updatedTasks = tasks.filter(t => t.id !== sourceTask.id);
  
  // Find tasks in the destination column
  const tasksInDestStatus = updatedTasks.filter(t => t.status === destination.droppableId);
  
  // Calculate the position to insert the task
  let insertPosition;
  if (destination.index === 0) {
    insertPosition = 0;
  } else if (destination.index >= tasksInDestStatus.length) {
    insertPosition = updatedTasks.length;
  } else {
    const targetTask = tasksInDestStatus[destination.index];
    insertPosition = updatedTasks.findIndex(t => t.id === targetTask.id);
  }

  // Create the updated task with new status and timestamp
  const updatedTask = {
    ...sourceTask,
    status: destination.droppableId,
    lastUpdated: Date.now()
  };

  // Insert the task at the calculated position
  updatedTasks.splice(insertPosition, 0, updatedTask);

  // Update positions for all tasks
  const finalTasks = updatedTasks.map((task, index) => ({
    ...task,
    position: index
  }));

  setTasks(finalTasks);
  storeCalendarTasks(finalTasks);
};
```

## Styling and UI

### 1. Basic Styling

Create a file at `src/app/ui/calendar.module.css`:

```css
.calendarContainer {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 60px);
  background-color: #2e201b;
  padding: 20px;
}

.syncButton {
  font-size: 0.75rem;
  padding: 4px 8px;
  background-color: #c75d3a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
}

.syncButton:hover {
  background-color: #7BA696;
}

.board {
  display: flex;
  gap: 1rem;
  margin-top: 20px;
}
```

### 2. Current Time Indicator

Create a file at `src/app/ui/CurrentTimeIndicator.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import styles from './current-time-indicator.module.css';

export default function CurrentTimeIndicator() {
  const [position, setPosition] = useState<number>(0);

  useEffect(() => {
    const calculatePosition = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // Calculate percentage through the day (assuming 24-hour view)
      // Subtract starting hour (e.g., 6am) and adjust percentage accordingly
      const startHour = 6; // Assuming calendar starts at 6 AM
      const totalHours = 18; // Assuming 18 hours displayed (6 AM to 12 AM)
      const currentHour = hours + minutes / 60;
      const percentage = ((currentHour - startHour) / totalHours) * 100;
      
      // Clamp percentage between 0 and 100
      return Math.max(0, Math.min(100, percentage));
    };

    // Initial position
    setPosition(calculatePosition());

    // Update position every minute
    const interval = setInterval(() => {
      setPosition(calculatePosition());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  if (position < 0 || position > 100) {
    return null; // Don't show line if outside calendar hours
  }

  return (
    <div 
      className={styles.timeIndicator}
      style={{ top: `${position}%` }}
    >
      <div className={styles.timeLabel}>
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}
```

Create a file at `src/app/ui/current-time-indicator.module.css`:

```css
.timeIndicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #ea4335; /* Google Calendar's red color */
  z-index: 1000;
  pointer-events: none; /* Allow clicking through the line */
  display: flex;
  align-items: center;
  width: 100%;
}

.timeIndicator::before {
  content: '';
  position: absolute;
  left: -6px;
  width: 12px;
  height: 12px;
  background-color: #ea4335;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.timeLabel {
  position: absolute;
  left: -70px; /* Position label to the left of the circle */
  background-color: #ea4335;
  color: white;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 12px;
  transform: translateY(-50%);
  font-weight: 500;
  white-space: nowrap;
}
```

## Testing and Troubleshooting

### 1. Common Issues and Solutions

#### Authentication Issues

**Problem**: "Failed to sign in with Google" error message.

**Solutions**:
- Check that your Google Cloud Console project has the Google Calendar API enabled
- Verify that your OAuth consent screen is properly configured with the correct scopes
- Ensure your OAuth credentials have the correct redirect URIs
- Check that your environment variables are correctly set
- Try clearing browser cookies and cache

#### Calendar Sync Issues

**Problem**: "Failed to sync calendar events" error message.

**Solutions**:
- Check browser console for detailed error messages
- Verify that your Google account has calendar events in the specified time range
- Ensure your OAuth token has not expired (check the JWT callback in NextAuth config)
- Check that you have the correct scopes in your OAuth configuration

#### Task Display Issues

**Problem**: Tasks not appearing in the correct columns.

**Solutions**:
- Check localStorage in browser DevTools to see if tasks are being saved correctly
- Verify that the task status values match exactly ('To_Do', 'Doing', 'Done')
- Check the `getStoredCalendarTasks` function for any sorting issues

### 2. Debugging Tips

#### Enable NextAuth Debug Mode

In your `authOptions` configuration, set `debug: true` to get detailed logs:

```typescript
export const authOptions: AuthOptions = {
  // ... other options
  debug: true,
  // ...
};
```

#### Check Browser Console

Monitor the browser console for errors and log messages. The implementation includes several `console.error` calls that can help identify issues.

#### Inspect Network Requests

Use the browser's Network tab to inspect API calls:
- `/api/auth/google` - Check authentication status
- `/api/calendar/events` - Fetch calendar events

#### Examine localStorage

Inspect the browser's localStorage to see if tasks are being saved correctly:
```javascript
// In browser console
console.log(JSON.parse(localStorage.getItem('calendarTasks')));
```

### 3. Testing the Implementation

1. **Authentication Flow**:
   - Test signing in with Google
   - Test token refresh (wait for token expiration)
   - Test signing out

2. **Calendar Sync**:
   - Test initial sync on login
   - Test manual sync with the "Sync Calendar" button
   - Add events to Google Calendar and verify they appear in the app

3. **Task Management**:
   - Test dragging tasks between columns
   - Test persistence across page refreshes
   - Test conflict resolution by modifying a task and then syncing

4. **Edge Cases**:
   - Test with no calendar events
   - Test with a large number of events
   - Test with events that have no end time
   - Test with recurring events
