'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type AppMode = 'simple' | 'calendar' | 'matrix';

interface AppSettings {
  mode: AppMode;
  lastUsedCalendar?: string;
  autoSync?: boolean;
}

interface AppModeContextType {
  mode: AppMode;
  toggleMode: () => void;
  setMode: (mode: AppMode) => void;
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

  const setMode = (mode: AppMode) => {
    setSettings(prev => ({ ...prev, mode }));
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
      setMode,
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
