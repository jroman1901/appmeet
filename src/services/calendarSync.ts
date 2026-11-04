import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase/config';
import { GoogleCalendarService } from './googleCalendarService';
import { Meeting, Task } from '../types';

const gcal = GoogleCalendarService.getInstance();

type SyncableMeetingFields = Pick<
  Meeting,
  'title' | 'description' | 'clientName' | 'startTime' | 'endTime' | 'syncWithGoogleCalendar' | 'reminderMinutesBefore'
>;

type SyncableTaskFields = Pick<
  Task,
  'title' | 'description' | 'dueDate' | 'syncWithGoogleCalendar' | 'reminderMinutesBefore'
>;

function meetingEventBody(meeting: SyncableMeetingFields) {
  return gcal.buildEventBody({
    summary: meeting.title,
    description: [meeting.description, `Cliente: ${meeting.clientName}`].filter(Boolean).join('\n\n'),
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    reminderMinutesBefore: meeting.reminderMinutesBefore
  });
}

function taskEventBody(task: SyncableTaskFields) {
  const start = task.dueDate as Date;
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return gcal.buildEventBody({
    summary: `Tarea: ${task.title}`,
    description: task.description,
    startTime: start,
    endTime: end,
    reminderMinutesBefore: task.reminderMinutesBefore
  });
}

export async function syncMeetingOnCreate(
  getAccessToken: () => string | null,
  meetingId: string,
  meeting: SyncableMeetingFields
): Promise<void> {
  if (!meeting.syncWithGoogleCalendar) return;
  const accessToken = getAccessToken();
  if (!accessToken) return;

  try {
    const googleEventId = await gcal.createEvent(accessToken, meetingEventBody(meeting));
    await updateDoc(doc(db, 'meetings', meetingId), { googleEventId });
  } catch (error) {
    console.error('Error sincronizando reunión con Google Calendar:', error);
  }
}

export async function syncMeetingOnUpdate(
  getAccessToken: () => string | null,
  meetingId: string,
  previousGoogleEventId: string | undefined,
  meeting: SyncableMeetingFields
): Promise<void> {
  const accessToken = getAccessToken();
  if (!accessToken) return;

  try {
    if (meeting.syncWithGoogleCalendar) {
      if (previousGoogleEventId) {
        await gcal.updateEvent(accessToken, previousGoogleEventId, meetingEventBody(meeting));
      } else {
        const googleEventId = await gcal.createEvent(accessToken, meetingEventBody(meeting));
        await updateDoc(doc(db, 'meetings', meetingId), { googleEventId });
      }
    } else if (previousGoogleEventId) {
      await gcal.deleteEvent(accessToken, previousGoogleEventId);
      await updateDoc(doc(db, 'meetings', meetingId), { googleEventId: deleteField() });
    }
  } catch (error) {
    console.error('Error sincronizando reunión con Google Calendar:', error);
  }
}

export async function syncMeetingOnDelete(
  getAccessToken: () => string | null,
  googleEventId: string | undefined
): Promise<void> {
  if (!googleEventId) return;
  const accessToken = getAccessToken();
  if (!accessToken) return;

  try {
    await gcal.deleteEvent(accessToken, googleEventId);
  } catch (error) {
    console.error('Error eliminando evento de Google Calendar:', error);
  }
}

export async function syncTaskOnCreate(
  getAccessToken: () => string | null,
  taskId: string,
  task: SyncableTaskFields
): Promise<void> {
  if (!task.syncWithGoogleCalendar || !task.dueDate) return;
  const accessToken = getAccessToken();
  if (!accessToken) return;

  try {
    const googleEventId = await gcal.createEvent(accessToken, taskEventBody(task));
    await updateDoc(doc(db, 'tasks', taskId), { googleEventId });
  } catch (error) {
    console.error('Error sincronizando tarea con Google Calendar:', error);
  }
}

export async function syncTaskOnUpdate(
  getAccessToken: () => string | null,
  taskId: string,
  previousGoogleEventId: string | undefined,
  task: SyncableTaskFields
): Promise<void> {
  const accessToken = getAccessToken();
  if (!accessToken) return;

  try {
    if (task.syncWithGoogleCalendar && task.dueDate) {
      if (previousGoogleEventId) {
        await gcal.updateEvent(accessToken, previousGoogleEventId, taskEventBody(task));
      } else {
        const googleEventId = await gcal.createEvent(accessToken, taskEventBody(task));
        await updateDoc(doc(db, 'tasks', taskId), { googleEventId });
      }
    } else if (previousGoogleEventId) {
      await gcal.deleteEvent(accessToken, previousGoogleEventId);
      await updateDoc(doc(db, 'tasks', taskId), { googleEventId: deleteField() });
    }
  } catch (error) {
    console.error('Error sincronizando tarea con Google Calendar:', error);
  }
}

export async function syncTaskOnDelete(
  getAccessToken: () => string | null,
  googleEventId: string | undefined
): Promise<void> {
  if (!googleEventId) return;
  const accessToken = getAccessToken();
  if (!accessToken) return;

  try {
    await gcal.deleteEvent(accessToken, googleEventId);
  } catch (error) {
    console.error('Error eliminando evento de Google Calendar:', error);
  }
}
