import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { authOptions } from '../../auth/config';

// Use Node.js runtime instead of Edge
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
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

    // First, get the calendar colors for reference
    const colors = await calendar.colors.get();

    // Get today's start and end
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

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
        backgroundColor: eventColor?.background || '#265073', // Use our default blue if no color
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
