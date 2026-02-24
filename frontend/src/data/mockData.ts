import { User, Department, Chat } from '@/types/chat';

export const mockUsers: User[] = [
  // IT Department
  { id: 'IT-001', name: 'Sarah Chen', department: 'IT', role: 'admin', isOnline: true },
  { id: 'IT-002', name: 'Marcus Johnson', department: 'IT', role: 'employee', isOnline: true },
  { id: 'IT-003', name: 'Emily Roberts', department: 'IT', role: 'employee', isOnline: false },
  { id: 'IT-004', name: 'David Kim', department: 'IT', role: 'employee', isOnline: true },
  
  // R&D Department
  { id: 'RD-001', name: 'Dr. James Wilson', department: 'R&D', role: 'admin', isOnline: true },
  { id: 'RD-002', name: 'Anna Martinez', department: 'R&D', role: 'employee', isOnline: false },
  { id: 'RD-003', name: 'Michael Brown', department: 'R&D', role: 'employee', isOnline: true },
  
  // HR Department
  { id: 'HR-001', name: 'Lisa Thompson', department: 'HR', role: 'admin', isOnline: true },
  { id: 'HR-002', name: 'Robert Garcia', department: 'HR', role: 'employee', isOnline: true },
  { id: 'HR-003', name: 'Jennifer Lee', department: 'HR', role: 'employee', isOnline: false },
  
  // Finance Department
  { id: 'FIN-001', name: 'William Davis', department: 'Finance', role: 'admin', isOnline: false },
  { id: 'FIN-002', name: 'Catherine White', department: 'Finance', role: 'employee', isOnline: true },
];

export const mockDepartments: Department[] = [
  { id: 'IT', name: 'Information Technology', employees: mockUsers.filter(u => u.department === 'IT') },
  { id: 'RD', name: 'Research & Development', employees: mockUsers.filter(u => u.department === 'R&D') },
  { id: 'HR', name: 'Human Resources', employees: mockUsers.filter(u => u.department === 'HR') },
  { id: 'FIN', name: 'Finance', employees: mockUsers.filter(u => u.department === 'Finance') },
];

export const mockCredentials: Record<string, { password: string; userId: string }> = {
  'IT-001': { password: 'admin123', userId: 'IT-001' },
  'IT-002': { password: 'pass123', userId: 'IT-002' },
  'IT-003': { password: 'pass123', userId: 'IT-003' },
  'IT-004': { password: 'pass123', userId: 'IT-004' },
  'RD-001': { password: 'admin123', userId: 'RD-001' },
  'RD-002': { password: 'pass123', userId: 'RD-002' },
  'RD-003': { password: 'pass123', userId: 'RD-003' },
  'HR-001': { password: 'admin123', userId: 'HR-001' },
  'HR-002': { password: 'pass123', userId: 'HR-002' },
  'HR-003': { password: 'pass123', userId: 'HR-003' },
  'FIN-001': { password: 'admin123', userId: 'FIN-001' },
  'FIN-002': { password: 'pass123', userId: 'FIN-002' },
};

export const defaultGroupChats: Chat[] = [
  {
    id: 'group-it',
    type: 'group',
    name: 'IT Department',
    participants: ['IT-001', 'IT-002', 'IT-003', 'IT-004'],
    messages: [],
    unreadCount: 0,
  },
  {
    id: 'group-rd',
    type: 'group',
    name: 'R&D Department',
    participants: ['RD-001', 'RD-002', 'RD-003'],
    messages: [],
    unreadCount: 0,
  },
  {
    id: 'group-hr',
    type: 'group',
    name: 'HR Department',
    participants: ['HR-001', 'HR-002', 'HR-003'],
    messages: [],
    unreadCount: 0,
  },
  {
    id: 'group-finance',
    type: 'group',
    name: 'Finance Department',
    participants: ['FIN-001', 'FIN-002'],
    messages: [],
    unreadCount: 0,
  },
];
