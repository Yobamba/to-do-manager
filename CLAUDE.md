# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev        # Start development server on http://localhost:3000
npm run build      # Create production build
npm run start      # Start production server
npm run lint       # Run ESLint to check code quality
```

## Architecture Overview

This is a **dual-mode task management application** built with Next.js 14 and TypeScript:

### Core Modes
1. **Simple Mode**: Local drag-and-drop task management with browser storage
2. **Calendar Mode**: Google Calendar integration for importing events as tasks

### Key Architecture Decisions

#### Authentication Flow
- Uses NextAuth.js with Google OAuth provider
- Token refresh handled automatically in `src/app/api/auth/config.ts`
- Session management through JWT with encrypted tokens
- Auth state checked via `/api/auth/google` endpoint

#### State Management
- **AppModeContext**: Global state for switching between Simple/Calendar modes
- Local storage for Simple Mode tasks persistence
- Server-side session for Calendar Mode authentication

#### API Structure
```
/api/auth/[...nextauth]  - OAuth handlers
/api/auth/google         - Check auth status
/api/calendar/events     - Fetch Google Calendar events
```

#### Component Architecture
- **CalendarMode**: Fetches and displays Google Calendar events
- **Cards**: Drag-and-drop task cards for Simple Mode
- **ModeToggle**: Switch between application modes
- Custom drag-and-drop implementation in `cardjs.js` using HTML5 APIs

### Important Implementation Details

#### Google Calendar Integration
- Requires environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`
- Uses Google Calendar API v3 with read-only access
- Implements smart conflict resolution (2-hour window for event sync)
- Token refresh handled through NextAuth callbacks

#### Task Persistence
- Simple Mode: Tasks stored in localStorage with format `{text: string, status: string}`
- Calendar Mode: Read-only from Google Calendar, no local persistence
- Drag operations update DOM and trigger localStorage save

#### Styling Approach
- CSS Modules for component-scoped styles
- Global styles in `globals.css`
- Loading states with skeleton components
- Responsive design with mobile-first approach