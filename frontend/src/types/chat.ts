export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  name: string;
  department: string;
  role: UserRole;
  isOnline: boolean;
  avatar?: string;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'document' | 'pdf';
  fileName?: string;
}

export interface Chat {
  id: string;
  type: 'direct' | 'group' | 'broadcast';
  name: string;
  participants: string[];
  messages: Message[];
  lastMessage?: Message;
  unreadCount: number;
}

export interface Department {
  id: string;
  name: string;
  employees: User[];
}
