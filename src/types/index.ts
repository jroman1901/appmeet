export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'user';
  createdAt: Date;
  createdBy?: string;
  isActive: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  clientEmail?: string;
  clientName: string;
  clientPhone?: string;
  startTime: Date;
  endTime: Date;
  status: 'pending' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  createdBy: string;
  sharedWith?: string[];
  isPublic?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  category?: string;
  relatedMeetingId?: string;
  createdBy: string;
  sharedWith?: string[];
  isPublic?: boolean;
  createdAt: Date;
  updatedAt: Date;
}