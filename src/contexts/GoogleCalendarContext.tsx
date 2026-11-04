import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const TOKEN_STORAGE_KEY = 'gcal_token_v1';
const DEFAULT_REMINDER_STORAGE_KEY = 'gcal_default_reminder_minutes';

interface StoredToken {
  accessToken: string;
  expiresAt: number;
}

interface GoogleCalendarContextType {
  isConfigured: boolean;
  isConnected: boolean;
  connecting: boolean;
  error: string;
  connect: () => void;
  disconnect: () => void;
  getAccessToken: () => string | null;
  defaultReminderMinutes: number;
  setDefaultReminderMinutes: (minutes: number) => void;
}

const GoogleCalendarContext = createContext<GoogleCalendarContextType | undefined>(undefined);

export function useGoogleCalendar() {
  const context = useContext(GoogleCalendarContext);
  if (context === undefined) {
    throw new Error('useGoogleCalendar must be used within a GoogleCalendarProvider');
  }
  return context;
}

function readStoredToken(): StoredToken | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredToken;
    if (!parsed.accessToken || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredToken(token: StoredToken) {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
}

function clearStoredToken() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

function readDefaultReminder(): number {
  const raw = localStorage.getItem(DEFAULT_REMINDER_STORAGE_KEY);
  const parsed = raw ? parseInt(raw, 10) : 30;
  return Number.isFinite(parsed) ? parsed : 30;
}

interface GoogleCalendarProviderProps {
  children: ReactNode;
}

export function GoogleCalendarProvider({ children }: GoogleCalendarProviderProps) {
  const [token, setToken] = useState<StoredToken | null>(() => readStoredToken());
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [scriptReady, setScriptReady] = useState(false);
  const [defaultReminderMinutes, setDefaultReminderMinutesState] = useState(() => readDefaultReminder());
  const tokenClientRef = useRef<any>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    if (window.google?.accounts?.oauth2) {
      setScriptReady(true);
      return;
    }

    const existingScript = document.getElementById('google-identity-script') as HTMLScriptElement | null;
    const handleLoad = () => setScriptReady(true);

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad);
      return () => existingScript.removeEventListener('load', handleLoad);
    }

    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', handleLoad);
    document.body.appendChild(script);

    return () => script.removeEventListener('load', handleLoad);
  }, []);

  useEffect(() => {
    if (!scriptReady || !GOOGLE_CLIENT_ID) return;

    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: CALENDAR_SCOPE,
      callback: (response: any) => {
        setConnecting(false);
        if (response.error) {
          setError('No se pudo conectar con Google Calendar. Intenta nuevamente.');
          return;
        }
        const expiresAt = Date.now() + Number(response.expires_in || 3600) * 1000;
        const newToken: StoredToken = { accessToken: response.access_token, expiresAt };
        writeStoredToken(newToken);
        setToken(newToken);
        setError('');
      }
    });
  }, [scriptReady]);

  const connect = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError('La integración con Google Calendar no está configurada en esta instalación.');
      return;
    }
    if (!tokenClientRef.current) {
      setError('Google Calendar todavía se está cargando. Intenta de nuevo en unos segundos.');
      return;
    }
    setError('');
    setConnecting(true);
    tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
  }, []);

  const disconnect = useCallback(() => {
    const current = readStoredToken();
    if (current && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(current.accessToken, () => {});
    }
    clearStoredToken();
    setToken(null);
  }, []);

  const getAccessToken = useCallback((): string | null => {
    const current = readStoredToken();
    if (!current) {
      setToken(null);
      return null;
    }
    return current.accessToken;
  }, []);

  const setDefaultReminderMinutes = useCallback((minutes: number) => {
    localStorage.setItem(DEFAULT_REMINDER_STORAGE_KEY, String(minutes));
    setDefaultReminderMinutesState(minutes);
  }, []);

  const value: GoogleCalendarContextType = {
    isConfigured: Boolean(GOOGLE_CLIENT_ID),
    isConnected: Boolean(token),
    connecting,
    error,
    connect,
    disconnect,
    getAccessToken,
    defaultReminderMinutes,
    setDefaultReminderMinutes
  };

  return (
    <GoogleCalendarContext.Provider value={value}>
      {children}
    </GoogleCalendarContext.Provider>
  );
}
