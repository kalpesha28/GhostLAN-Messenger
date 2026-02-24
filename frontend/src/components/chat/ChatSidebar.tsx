import { useState, useEffect } from 'react';
import { useChat, socket } from '@/context/ChatContext'; // ✅ IMPORTED SOCKET
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Search, Plus, MessageCircle, Users, Radio, CheckSquare, Square, Key, LogOut, Trash2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '@/config';

interface Contact {
  id: string;
  name: string;
  role: string;
  department: string;
}

export function ChatSidebar() {
  const { chats, activeChat, setActiveChat, createChat, createGroup, getUserById, deleteChatConversation } = useChat();
  const { user, logout } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMessage, setPassMessage] = useState('');
  
  // ✅ NEW: Auto-Reconnect State
  const [isConnected, setIsConnected] = useState(true);

  // ✅ NEW: Global Notification & Sound Listener
  useEffect(() => {
    // Ask the browser for permission to show native desktop notifications
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // Handle connection status UI
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    // Play sound and show notification on new message
    const handleNewMessage = (msg: any) => {
        if (msg.senderId !== user?.id) {
            // 1. Play the ding sound
            const audio = new Audio('/ding.mp3');
            audio.play().catch(e => console.log("Audio play blocked by browser:", e));

            // 2. Show native OS notification (Only if the app is minimized/hidden)
            if (Notification.permission === 'granted' && document.hidden) {
                new Notification("GhostLAN", {
                    body: msg.isSecret ? "🔒 New Classified Message" : (msg.content || "Sent an attachment"),
                    icon: '/pwa-192x192.png'
                });
            }
        }
    };

    // Attach the listeners to your socket
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('receiveMessage', handleNewMessage);

    return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('receiveMessage', handleNewMessage);
    };
  }, [user?.id]);

  useEffect(() => {
    if (isDialogOpen) {
      axios.get(`${API_URL}/contacts`)
        .then(res => setContacts(res.data))
        .catch(err => console.error("Failed to load contacts", err));
      setIsGroupMode(false);
      setGroupName('');
      setSelectedUsers([]);
      setContactSearch('');
    }
  }, [isDialogOpen]);

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleCreate = () => {
    if (isGroupMode) {
      if (!groupName.trim() || selectedUsers.length === 0) return;
      createGroup(groupName, selectedUsers);
    }
    setIsDialogOpen(false);
  };

  const handleChangePassword = async () => {
    try {
      const response = await fetch(`${API_URL}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: user?.id, oldPassword: oldPass, newPassword: newPass })
      });
      const data = await response.json();
      setPassMessage(data.message);
      if (data.success) {
        setTimeout(() => { setIsPasswordOpen(false); setPassMessage(''); setOldPass(''); setNewPass(''); }, 1500);
      }
    } catch (error) { setPassMessage("Connection failed"); }
  };

  const visibleChats = chats.filter(c => 
    !c.hiddenBy?.includes(user?.id || '') && 
    (c.type === 'broadcast' || c.participants?.includes(user?.id || ''))
  );

  const sortedChats = [...visibleChats].sort((a, b) => {
    const timeA = a.messages?.length > 0 ? new Date(a.messages[a.messages.length - 1].timestamp).getTime() : 0;
    const timeB = b.messages?.length > 0 ? new Date(b.messages[b.messages.length - 1].timestamp).getTime() : 0;
    return timeB - timeA; 
  });

  const filteredContacts = contacts.filter(contact => 
    contact.id !== user?.id &&
    (contact.name.toLowerCase().includes(contactSearch.toLowerCase()) || contact.department.toLowerCase().includes(contactSearch.toLowerCase()) || contact.id.includes(contactSearch))
  );

  const filterChats = (type: string) => {
    return sortedChats.filter(c => {
      if (c.type !== type) return false;
      let displayName = c.name;
      if (c.type === 'direct') {
        const otherId = c.participants.find((p: string) => p !== user?.id);
        const otherUser = otherId ? getUserById(otherId) : null;
        displayName = otherUser?.name || 'Unknown';
      }
      return displayName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  const broadcasts = filterChats('broadcast');
  const groups = filterChats('group');
  const directs = filterChats('direct');

  return (
    <div className="flex flex-col h-full bg-muted/10 w-80 border-r bg-white">
      
      {/* HEADER */}
      <div className="p-4 border-b space-y-3">
        
        {/* ✅ NEW: Offline/Reconnecting Banner */}
        {!isConnected && (
            <div className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest text-center py-1 rounded animate-pulse">
                Network Disconnected - Reconnecting...
            </div>
        )}

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search chats..." className="pl-9 bg-background" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild><Button className="w-full justify-start gap-2" variant="default"><Plus className="h-4 w-4" /> New Chat / Group</Button></DialogTrigger>
          <DialogContent className="max-h-[80vh] flex flex-col">
            <DialogHeader><DialogTitle>New Conversation</DialogTitle></DialogHeader>
            <div className="flex gap-2 p-1 bg-muted rounded-lg mb-2">
              <button className={`flex-1 py-1 text-sm font-medium rounded-md ${!isGroupMode ? 'bg-white shadow' : 'text-muted-foreground'}`} onClick={() => setIsGroupMode(false)}>Direct Message</button>
              <button className={`flex-1 py-1 text-sm font-medium rounded-md ${isGroupMode ? 'bg-white shadow' : 'text-muted-foreground'}`} onClick={() => setIsGroupMode(true)}>Create Group</button>
            </div>
            {isGroupMode && <Input placeholder="Enter Group Name" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="mb-2" />}
            <div className="relative my-2"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search user..." className="pl-9" value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} /></div>
            <ScrollArea className="flex-1 h-[300px] border rounded-md p-2">
              <div className="space-y-1">
                {filteredContacts.map(contact => {
                   const isSelected = selectedUsers.includes(contact.id);
                   return (
                    <div key={contact.id} onClick={() => { if (isGroupMode) toggleUser(contact.id); else { createChat(contact.id); setIsDialogOpen(false); }}} className={`w-full flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer ${isSelected ? 'bg-primary/10' : ''}`}>
                      {isGroupMode && (isSelected ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />)}
                      <Avatar className="h-10 w-10"><AvatarFallback>{contact.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <div><p className="font-medium text-sm">{contact.name}</p><p className="text-xs text-muted-foreground">{contact.role}</p></div>
                    </div>
                   );
                })}
              </div>
            </ScrollArea>
            {isGroupMode && <Button className="mt-4" onClick={handleCreate} disabled={!groupName || selectedUsers.length === 0}>Create Group</Button>}
          </DialogContent>
        </Dialog>
      </div>

      {/* CHAT LIST */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-6">
          {broadcasts.length > 0 && <div className="space-y-1"><h4 className="px-2 text-xs font-semibold text-muted-foreground mb-2">BROADCASTS</h4>{broadcasts.map(chat => <ChatListItem key={chat.id} chat={chat} activeId={activeChat?.id} onClick={() => setActiveChat(chat.id)} user={user} getUserById={getUserById} onDelete={() => setChatToDelete(chat.id)} />)}</div>}
          {groups.length > 0 && <div className="space-y-1"><h4 className="px-2 text-xs font-semibold text-muted-foreground mb-2">GROUPS</h4>{groups.map(chat => <ChatListItem key={chat.id} chat={chat} activeId={activeChat?.id} onClick={() => setActiveChat(chat.id)} user={user} getUserById={getUserById} onDelete={() => setChatToDelete(chat.id)} />)}</div>}
          <div className="space-y-1"><h4 className="px-2 text-xs font-semibold text-muted-foreground mb-2">MESSAGES</h4>{directs.map(chat => <ChatListItem key={chat.id} chat={chat} activeId={activeChat?.id} onClick={() => setActiveChat(chat.id)} user={user} getUserById={getUserById} onDelete={() => setChatToDelete(chat.id)} />)}</div>
        </div>
      </ScrollArea>

      {/* FOOTER */}
      <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{user?.name?.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
            <div className="overflow-hidden"><p className="text-sm font-medium truncate w-24">{user?.name}</p><p className="text-[10px] text-muted-foreground truncate">{user?.id}</p></div>
        </div>
        <div className="flex gap-1">
            <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
                <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><Key className="h-4 w-4" /></Button></DialogTrigger>
                <DialogContent>
                <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2"><p className="text-sm font-medium">Old Password</p><Input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} /></div>
                    <div className="space-y-2"><p className="text-sm font-medium">New Password</p><Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} /></div>
                    {passMessage && <p className={`text-sm ${passMessage.includes('success') ? 'text-green-600' : 'text-red-500'}`}>{passMessage}</p>}
                </div>
                <DialogFooter><Button onClick={handleChangePassword}>Update</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"><LogOut className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* DELETE CHAT DIALOG */}
      <Dialog open={!!chatToDelete} onOpenChange={(open) => { if(!open) setChatToDelete(null) }}>
         <DialogContent>
            <DialogHeader>
                <DialogTitle>Delete Conversation</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">What would you like to do with this chat?</p>
            <div className="flex flex-col gap-2 mt-4">
                <Button variant="outline" className="justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => { if(chatToDelete) deleteChatConversation(chatToDelete, 'hard'); setChatToDelete(null); }}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Entire Conversation (For Everyone)
                </Button>
                <Button variant="secondary" className="justify-start" onClick={() => { if(chatToDelete) deleteChatConversation(chatToDelete, 'soft'); setChatToDelete(null); }}>
                    <LogOut className="mr-2 h-4 w-4" /> Remove from Sidebar (Hide for Me)
                </Button>
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}

function ChatListItem({ chat, activeId, onClick, user, getUserById, onDelete }: { chat: any, activeId: string | undefined, onClick: () => void, user: any, getUserById: (id: string) => any, onDelete: () => void }) {
  let displayName = chat.name;
  let Icon = chat.type === 'broadcast' ? Radio : (chat.type === 'group' ? Users : MessageCircle);
  let fallback = "??";

  if (chat.type === 'direct') {
    const otherId = chat.participants.find((p: string) => p !== user?.id);
    const otherUser = otherId ? getUserById(otherId) : null;
    displayName = otherUser?.name || "Unknown User";
    fallback = displayName.substring(0, 2).toUpperCase();
  } else {
    fallback = chat.name.substring(0, 1).toUpperCase();
  }

  const lastMsg = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;

  const unreadCount = chat.messages.filter((m: any) => 
    m.senderId !== user?.id && (!m.readBy || !m.readBy.includes(user?.id))
  ).length;

  return (
    <div className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left group relative ${activeId === chat.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`} onClick={onClick}>
      <Avatar className="h-9 w-9 relative">
        <AvatarFallback className={activeId === chat.id ? 'bg-primary text-primary-foreground' : ''}>
            {chat.type === 'direct' ? fallback : <Icon className="h-4 w-4" />}
        </AvatarFallback>
        {unreadCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>}
      </Avatar>
      
      <div className="flex-1 overflow-hidden cursor-pointer">
        <div className="flex items-center justify-between">
            <span className={`text-sm truncate ${unreadCount > 0 ? 'font-bold text-foreground' : 'font-medium'}`}>
                {displayName}
            </span>
            {lastMsg && (
                <span className={`text-[10px] ${unreadCount > 0 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                    {new Date(lastMsg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
            )}
        </div>
        
        <div className="flex items-center justify-between mt-0.5">
            <p className={`text-xs truncate ${unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {lastMsg ? (lastMsg.isSecret ? "🔒 Secret Message" : (lastMsg.content || lastMsg.text)) : "No messages yet"}
            </p>
            
            {unreadCount > 0 && (
                <div className="ml-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 animate-in zoom-in">
                    {unreadCount}
                </div>
            )}
        </div>
      </div>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className={`h-6 w-6 absolute right-2 top-8 hover:bg-red-100 hover:text-red-600 transition-all ${unreadCount > 0 ? 'hidden' : 'opacity-0 group-hover:opacity-100'}`}
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}