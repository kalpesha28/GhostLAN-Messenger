import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_URL } from '@/config'; // Import at the top

// ⚠️ Ensure this matches your backend URL
const SOCKET_URL = API_URL;
export const socket: Socket = io(SOCKET_URL);

interface ChatContextType {
  chats: any[];
  activeChat: any | null;
  setActiveChat: (id: string) => void;
  createChat: (participantId: string) => void;
  createGroup: (name: string, participants: string[]) => void;
  getUserById: (id: string) => any;
  deleteChatConversation: (chatId: string, type: 'hard' | 'soft') => void;
  // ✅ FIX: The missing function definition is right here!
  markMessagesAsRead: (chatId: string) => void; 
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    // If no user is logged in, do nothing
    if (!user?.id) return;

    // SECURE REGISTRATION FUNCTION
    const registerWithServer = () => {
      console.log('Sending register event for user:', user.id);
      socket.emit('register', user.id);
    };

    if (socket.connected) {
      registerWithServer();
    }
    socket.on('connect', registerWithServer);

    // --- DATA LISTENERS ---
    socket.on('initialData', (data: { users: any[], chats: any[] }) => {
      setUsers(data.users);
      setChats(data.chats);
    });

    socket.on('openChat', (chat: any) => {
      setActiveChatId(chat.id);
    });

    socket.on('receiveMessage', (newMessage: any) => {
      setChats(prevChats => prevChats.map(c => {
        if (c.id === newMessage.chatId) {
          const updatedChat = { ...c, hiddenBy: c.hiddenBy?.filter((id: string) => id !== user.id) || [] };
          return { ...updatedChat, messages: [...updatedChat.messages, newMessage] };
        }
        return c;
      }));
    });

    socket.on('reactionUpdated', ({ chatId, messageId, reactions }) => {
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: c.messages.map((m: any) => m.id === messageId ? { ...m, reactions } : m)
          };
        }
        return c;
      }));
    });

    socket.on('messages_read_update', ({ chatId, userId }) => {
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: c.messages.map((m: any) => {
              if (m.senderId !== userId && (!m.readBy || !m.readBy.includes(userId))) {
                return { ...m, readBy: [...(m.readBy || []), userId], status: 'read' };
              }
              return m;
            })
          };
        }
        return c;
      }));
    });

    // Cleanup listeners so they don't duplicate
    return () => {
      socket.off('connect', registerWithServer);
      socket.off('initialData');
      socket.off('openChat');
      socket.off('receiveMessage');
      socket.off('reactionUpdated');
      socket.off('messages_read_update');
    };
  }, [user]); 

  const activeChat = chats.find(c => c.id === activeChatId) || null;
  const setActiveChat = (id: string) => setActiveChatId(id);

  const createChat = (participantId: string) => {
    if (user) {
      socket.emit('createDirectChat', { senderId: user.id, participantId });
    }
  };

  const createGroup = (name: string, participants: string[]) => {
    if (user) {
      const finalParticipants = Array.from(new Set([...participants, user.id]));
      socket.emit('createGroup', { name, participants: finalParticipants });
    }
  };

  const getUserById = (id: string) => {
    return users.find(u => u.id === id) || null;
  };

  const deleteChatConversation = (chatId: string, type: 'hard' | 'soft') => {
    if (user) {
      socket.emit('delete_chat', { chatId, userId: user.id, type });
      if (activeChatId === chatId) setActiveChatId(null);
    }
  };

  // ✅ FIX: The missing function logic is right here!
  const markMessagesAsRead = (chatId: string) => {
    if (user) {
      socket.emit('mark_messages_read', { chatId, userId: user.id });
    }
  };

  return (
    <ChatContext.Provider value={{
      chats, 
      activeChat, 
      setActiveChat, 
      createChat, 
      createGroup, 
      getUserById, 
      deleteChatConversation,
      markMessagesAsRead // ✅ FIX: Exported here so ChatWindow can finally use it!
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) throw new Error('useChat must be used within a ChatProvider');
  return context;
};