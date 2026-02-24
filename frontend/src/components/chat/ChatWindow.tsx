import { useState, useRef, useEffect } from 'react';
import { useChat, socket } from '@/context/ChatContext'; 
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Paperclip, Image as ImageIcon, FileText, Video, Radio, Users, MessageCircle, Shield, Lock, Bomb, File, Eye, Flame, Reply, X, Smile, Search, LayoutGrid, Download, Check, CheckCheck, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { API_URL } from '@/config';

const REACTION_EMOJIS = ["😊", "👍🏻", "👎🏻", "❤️", "🙏🏻"];

export interface ReplyData {
  id: string;
  senderName: string;
  content: string;
}

export function ChatWindow() {
  const { user } = useAuth();
  const { activeChat, getUserById, markMessagesAsRead } = useChat(); 
  
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSecretMode, setIsSecretMode] = useState(false);
  
  // ✅ FIXED: Replaced 'viewingImage' with a generic 'viewingMedia' to handle both images and videos
  const [viewingMedia, setViewingMedia] = useState<{ url: string; msgId: string; type: 'image' | 'video' } | null>(null);
  const [viewingSecretText, setViewingSecretText] = useState<{ text: string; msgId: string } | null>(null);
  
  const [burnedMessages, setBurnedMessages] = useState<Set<string>>(new Set());

  const [replyingTo, setReplyingTo] = useState<ReplyData | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMediaPanel, setShowMediaPanel] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeChat?.id) { markMessagesAsRead(activeChat.id); }
  }, [activeChat?.id, activeChat?.messages.length]);

  useEffect(() => {
    if (scrollContainerRef.current && !searchQuery) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [activeChat?.id, activeChat?.messages?.length, searchQuery, burnedMessages]);

  const triggerSendMessage = (content: string, type: 'text' | 'image' | 'video' | 'document', secret: boolean, reply: ReplyData | null) => {
    if (!activeChat || !user) return;
    socket.emit('send_message', {
        chatId: activeChat.id,
        content: content,
        senderId: user.id,
        type: type,
        isSecret: secret,
        replyTo: reply
    });
  };

  const handleAttachmentClick = () => fileInputRef.current?.click();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success) {
        let type: 'image' | 'video' | 'document' = 'document';
        if (data.fileType.startsWith('image/')) type = 'image';
        else if (data.fileType.startsWith('video/')) type = 'video';
        
        triggerSendMessage(data.fileUrl, type, isSecretMode, replyingTo);
        setIsSecretMode(false); 
        setReplyingTo(null);
      }
    } catch (error) { alert("Upload failed."); } finally { setIsUploading(false); if(e.target) e.target.value = ''; }
  };

  const handleSend = () => {
    if (message.trim()) {
      triggerSendMessage(message, 'text', isSecretMode, replyingTo);
      setMessage('');
      setIsSecretMode(false);
      setReplyingTo(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ✅ FIXED: Execute Burn for Media (Images & Videos)
  const executeBurnMedia = () => {
    if (viewingMedia && activeChat) { 
        socket.emit('delete_message', { chatId: activeChat.id, messageId: viewingMedia.msgId });
        setBurnedMessages(prev => new Set(prev).add(viewingMedia.msgId));
        setViewingMedia(null); 
    }
  };

  const executeBurnText = () => {
    if (viewingSecretText && activeChat) {
        socket.emit('delete_message', { chatId: activeChat.id, messageId: viewingSecretText.msgId });
        setBurnedMessages(prev => new Set(prev).add(viewingSecretText.msgId));
        setViewingSecretText(null);
    }
  };

  // ✅ NEW: Download and instantly burn secret documents
  const handleDownloadSecretDoc = (url: string, msgId: string) => {
    window.open(url, '_blank'); // Opens the download
    if (activeChat) {
        socket.emit('delete_message', { chatId: activeChat.id, messageId: msgId });
        setBurnedMessages(prev => new Set(prev).add(msgId));
    }
  };

  const handleReply = (msg: any) => {
    const sender = getUserById(msg.senderId);
    setReplyingTo({
      id: msg.id,
      senderName: sender?.name || "Unknown",
      content: msg.type === 'text' ? msg.content : `[${msg.type.toUpperCase()}]`
    });
  };

  const handleReaction = (msgId: string, emoji: string) => {
     if(!activeChat || !user) return;
     socket.emit('add_reaction', { chatId: activeChat.id, messageId: msgId, emoji, userId: user.id });
  };

  const handleDelete = (msgId: string) => {
     if(!activeChat) return;
     socket.emit('delete_message', { chatId: activeChat.id, messageId: msgId });
     setBurnedMessages(prev => new Set(prev).add(msgId)); 
  };

  const allMessages = (activeChat?.messages || []).filter((m: any) => !burnedMessages.has(m.id));
  
  const displayedMessages = searchQuery 
    ? allMessages.filter((m: any) => (m.content || '').toLowerCase().includes(searchQuery.toLowerCase()) || m.type.includes(searchQuery.toLowerCase()))
    : allMessages;

  const mediaMessages = allMessages.filter((m: any) => (m.type === 'image' || m.type === 'video') && !m.isSecret);
  const docMessages = allMessages.filter((m: any) => m.type === 'document' && !m.isSecret);

  if (!user) return <div className="flex-1 bg-white" />;
  
  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-muted-foreground">
        <Shield className="w-20 h-20 opacity-10 mb-6" />
        <h2 className="text-2xl font-bold text-slate-300">GhostLAN-Messenger</h2>
        <p className="mt-2 text-sm opacity-60">Select a chat to begin secure messaging</p>
      </div>
    );
  }

  const isBroadcast = activeChat.type === 'broadcast';
  const isAdmin = user.role === 'admin' || user.role === 'head'; 
  const canType = !isBroadcast || isAdmin;

  let headerName = activeChat.name;
  let HeaderIcon = activeChat.type === 'broadcast' ? Radio : Users;
  let isOnline = false;

  if (activeChat.type === 'direct') {
    const otherId = activeChat.participants.find((p: string) => p !== user.id);
    const otherUser = otherId ? getUserById(otherId) : null;
    headerName = otherUser?.name || 'Unknown';
    HeaderIcon = MessageCircle;
    isOnline = otherUser?.isOnline || false;
  }

  return (
    <div className="flex-1 flex h-full bg-white overflow-hidden">
      <div className="flex-1 flex flex-col relative border-r">
        {isUploading && <div className="absolute top-0 w-full bg-blue-600 text-white text-xs py-1 text-center font-bold z-50 animate-pulse">UPLOADING FILE...</div>}

        <div className="h-16 px-4 flex items-center justify-between border-b bg-white shrink-0">
          {showSearch ? (
            <div className="flex items-center w-full gap-2 animate-in fade-in slide-in-from-top-2">
               <Search className="h-4 w-4 text-muted-foreground" />
               <Input autoFocus placeholder="Search messages..." className="flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
               <Button variant="ghost" size="icon" onClick={() => { setShowSearch(false); setSearchQuery(''); }}><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary/10 text-primary"><HeaderIcon className="h-5 w-5" /></AvatarFallback></Avatar>
                <div>
                  <h3 className="font-semibold text-sm">{headerName}</h3>
                  {activeChat.type === 'direct' && <p className={`text-xs flex items-center gap-1 ${isOnline ? 'text-green-600' : 'text-gray-400'}`}><span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-600' : 'bg-gray-300'}`} />{isOnline ? 'Online' : 'Offline'}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                 <Button variant="ghost" size="icon" onClick={() => setShowSearch(true)} title="Search"><Search className="h-5 w-5 text-muted-foreground" /></Button>
                 <Button variant="ghost" size="icon" onClick={() => setShowMediaPanel(!showMediaPanel)} title="Gallery" className={showMediaPanel ? 'bg-slate-100' : ''}><LayoutGrid className="h-5 w-5 text-muted-foreground" /></Button>
              </div>
            </>
          )}
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 bg-slate-50/50 scroll-smooth">
          <div className="space-y-4 pb-4 flex flex-col justify-end min-h-full">
            {displayedMessages.length === 0 ? <div className="text-center py-12 opacity-50 text-sm">No messages found</div> : 
              displayedMessages.map((msg: any, index: number) => {
                const isOwn = msg.senderId === user.id;
                const sender = getUserById(msg.senderId);
                const showSenderInfo = !isOwn && (index === 0 || displayedMessages[index - 1]?.senderId !== msg.senderId);

                const bubbleClass = msg.isSecret 
                  ? "bg-red-600 text-white shadow-md shadow-red-200 border-red-700" 
                  : (isOwn ? "bg-primary text-primary-foreground" : "bg-white border text-foreground shadow-sm");
                
                const fileName = msg.type === 'document' ? decodeURIComponent(msg.content.split('/').pop()?.split('-').slice(1).join('-') || 'Document') : '';
                const replyBoxClass = msg.isSecret ? "bg-black/40 border-white text-white" : (isOwn ? "bg-white text-black border-l-4 border-black/20 shadow-sm" : "bg-gray-100 text-gray-800 border-l-4 border-gray-400");

                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in group items-end gap-2`}>
                    
                    {isOwn && (
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1 mb-2">
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-slate-200 rounded-full"><Smile className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="flex p-2 gap-1">
                                  {REACTION_EMOJIS.map(emoji => (<button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="hover:bg-accent p-1.5 rounded-md text-lg transition-transform hover:scale-125">{emoji}</button>))}
                              </DropdownMenuContent>
                          </DropdownMenu>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-slate-200 rounded-full" onClick={() => handleReply(msg)}><Reply className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full" onClick={() => handleDelete(msg.id)} title="Delete for everyone"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    )}

                    <div className={`max-w-[70%] ${isOwn ? 'order-1' : ''}`}>
                      {showSenderInfo && sender && <p className="text-xs text-muted-foreground mb-1 px-1">{sender.name}</p>}
                      
                      <div className={`rounded-2xl px-4 py-2 ${bubbleClass} ${isOwn ? 'rounded-br-none' : 'rounded-bl-none'} relative`}>
                        {msg.isSecret && <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 opacity-90 border-b border-white/20 pb-1"><Flame size={10} className="animate-pulse"/> View Once</div>}
                        
                        {msg.replyTo && (
                          <div className={`mb-2 p-2 rounded text-xs ${replyBoxClass}`}>
                             <p className="font-bold mb-0.5 text-[10px] uppercase opacity-80">{msg.replyTo.senderName}</p>
                             <p className="truncate font-medium">{msg.replyTo.content}</p>
                          </div>
                        )}

                        <div className="text-sm break-words">
                          {/* ✅ FIXED: Handled Images, Videos AND Documents inside the isSecret check */}
                          {msg.type === 'image' || msg.type === 'video' ? (
                            msg.isSecret ? (
                              <button onClick={() => setViewingMedia({ url: msg.content, msgId: msg.id, type: msg.type })} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors p-3 rounded-lg w-full text-left mt-1">
                                <div className="bg-white/20 p-2 rounded-full"><Eye className="h-4 w-4 text-white" /></div>
                                <div className="flex flex-col"><span className="font-bold text-xs">{msg.type === 'image' ? 'Photo' : 'Video'}</span><span className="text-[10px] opacity-80">Tap to view</span></div>
                              </button>
                            ) : (
                                msg.type === 'image' ? 
                                <img src={msg.content} alt="sent" className="rounded-lg max-w-full h-auto max-h-[300px] mt-1" /> :
                                <div className="rounded-lg overflow-hidden bg-black/10 mt-1"><video src={msg.content} controls className="max-w-full max-h-[300px]" /></div>
                            )
                          ) : msg.type === 'document' ? (
                            msg.isSecret ? (
                                <button onClick={() => handleDownloadSecretDoc(msg.content, msg.id)} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors p-3 rounded-lg w-full text-left mt-1">
                                    <div className="bg-white/20 p-2 rounded-full"><Download className="h-4 w-4 text-white" /></div>
                                    <div className="flex flex-col"><span className="font-bold text-xs">Secure Document</span><span className="text-[10px] opacity-80">Tap to download & burn</span></div>
                                </button>
                            ) : (
                                <a href={msg.content} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline text-inherit hover:opacity-80 mt-1 bg-black/5 p-2 rounded"><FileText className="h-4 w-4 shrink-0" /> <span className="truncate">{fileName}</span></a>
                            )
                          ) : (
                            msg.isSecret ? (
                                <button onClick={() => setViewingSecretText({ text: msg.content, msgId: msg.id })} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors p-3 rounded-lg w-full text-left mt-1">
                                  <div className="bg-white/20 p-2 rounded-full"><Eye className="h-4 w-4 text-white" /></div>
                                  <div className="flex flex-col"><span className="font-bold text-xs">Secret Message</span><span className="text-[10px] opacity-80">Tap to read</span></div>
                                </button>
                            ) : (
                                msg.content
                            )
                          )}
                        </div>

                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-black/5">
                              {Object.entries(msg.reactions).map(([emoji, users]: [string, any]) => (
                                  <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm transition-all ${users.includes(user.id) ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white text-gray-600 border border-gray-200'}`}>
                                      <span>{emoji}</span><span className="font-bold">{users.length}</span>
                                  </button>
                              ))}
                            </div>
                        )}
                        
                        <div className="flex justify-end items-center gap-1 mt-1 opacity-70">
                            <span className="text-[10px]">{format(new Date(msg.timestamp), 'HH:mm')}</span>
                            {isOwn && !msg.isSecret && (
                                msg.status === 'read' ? <CheckCheck className="h-3 w-3 text-blue-200" /> : <Check className="h-3 w-3" />
                            )}
                        </div>
                      </div>
                    </div>

                    {!isOwn && (
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1 mb-2">
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-slate-200 rounded-full"><Smile className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="flex p-2 gap-1">
                                  {REACTION_EMOJIS.map(emoji => (<button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="hover:bg-accent p-1.5 rounded-md text-lg transition-transform hover:scale-125">{emoji}</button>))}
                              </DropdownMenuContent>
                          </DropdownMenu>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-slate-200 rounded-full" onClick={() => handleReply(msg)}><Reply className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </div>
                );
              })
            }
          </div>
        </div>
        
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain" onChange={handleFileChange} />

        {replyingTo && (
          <div className="px-4 py-2 bg-slate-50 border-t border-b flex items-center justify-between animate-in slide-in-from-bottom-2 z-10">
              <div className="flex flex-col border-l-4 border-primary pl-3">
                  <span className="text-xs font-bold text-primary">Replying to {replyingTo.senderName}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[300px]">{replyingTo.content}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(null)}><X className="h-4 w-4" /></Button>
          </div>
        )}

        <div className={`p-4 border-t transition-colors ${isSecretMode ? 'bg-red-50' : 'bg-white'}`}>
          {canType ? (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="flex-shrink-0"><Paperclip className="h-5 w-5 text-muted-foreground" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={handleAttachmentClick}><ImageIcon className="h-4 w-4 mr-2" /> Image</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAttachmentClick}><Video className="h-4 w-4 mr-2" /> Video</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAttachmentClick}><File className="h-4 w-4 mr-2" /> Document</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" onClick={() => setIsSecretMode(!isSecretMode)} className={`flex-shrink-0 transition-all ${isSecretMode ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse' : 'text-muted-foreground hover:text-red-600'}`} title="Toggle Self-Destruct Mode"><Bomb className="h-5 w-5" /></Button>
              <Input placeholder={isSecretMode ? "Typing SECRET message..." : "Type a message..."} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={handleKeyDown} className={`flex-1 ${isSecretMode ? 'border-red-500 focus-visible:ring-red-500 placeholder:text-red-400' : ''}`} />
              <Button onClick={handleSend} disabled={!message.trim()} size="icon" className={`flex-shrink-0 ${isSecretMode ? 'bg-red-600 hover:bg-red-700' : ''}`}><Send className="h-4 w-4" /></Button>
            </div>
          ) : <div className="flex items-center justify-center gap-2 p-2 bg-muted/50 rounded-md text-muted-foreground text-sm"><Lock className="h-4 w-4" /><span>Read Only Channel</span></div>}
        </div>
      </div>

      {showMediaPanel && (
        <div className="w-[300px] border-l bg-white flex flex-col animate-in slide-in-from-right-10 duration-200">
           <div className="h-16 border-b flex items-center justify-between px-4">
              <span className="font-semibold">Chat Media</span>
              <Button variant="ghost" size="icon" onClick={() => setShowMediaPanel(false)}><X className="h-4 w-4" /></Button>
           </div>
           <div className="flex-1 p-2">
              <Tabs defaultValue="media" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="media" className="flex-1">Media</TabsTrigger>
                  <TabsTrigger value="docs" className="flex-1">Docs</TabsTrigger>
                </TabsList>
                <TabsContent value="media" className="mt-4">
                  <div className="grid grid-cols-2 gap-2">
                     {mediaMessages.length === 0 && <p className="text-center text-xs text-muted-foreground col-span-2 py-8">No images or videos</p>}
                     {mediaMessages.map((m: any) => (
                        <div key={m.id} className="aspect-square bg-slate-100 rounded-md overflow-hidden relative group cursor-pointer border">
                            {m.type === 'image' ? (
                                <img src={m.content} className="w-full h-full object-cover" onClick={() => window.open(m.content, '_blank')} />
                            ) : (
                                <video src={m.content} className="w-full h-full object-cover" />
                            )}
                        </div>
                     ))}
                  </div>
                </TabsContent>
                <TabsContent value="docs" className="mt-4 space-y-2">
                    {docMessages.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">No documents shared</p>}
                    {docMessages.map((m: any) => (
                       <a key={m.id} href={m.content} target="_blank" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                          <div className="bg-blue-100 p-2 rounded text-blue-600"><FileText className="h-5 w-5" /></div>
                          <div className="flex-1 overflow-hidden">
                              <p className="text-sm font-medium truncate">{decodeURIComponent(m.content.split('/').pop()?.split('-').slice(1).join('-') || 'Document')}</p>
                              <p className="text-[10px] text-muted-foreground">{new Date(m.timestamp).toLocaleDateString()}</p>
                          </div>
                          <Download className="h-4 w-4 text-muted-foreground" />
                       </a>
                    ))}
                </TabsContent>
              </Tabs>
           </div>
        </div>
      )}

      {/* ✅ FIXED: Generic MEDIA Viewer for both Images and Videos */}
      <Dialog open={!!viewingMedia} onOpenChange={(isOpen) => { if (!isOpen) executeBurnMedia(); }}>
        <DialogContent className="max-w-4xl w-full p-0 bg-transparent border-none shadow-none flex flex-col items-center justify-center">
            {viewingMedia && (
                <>
                    {viewingMedia.type === 'image' ? (
                         <img src={viewingMedia.url} alt="Secret" className="max-h-[80vh] rounded-md shadow-2xl mb-4" />
                    ) : (
                         <video src={viewingMedia.url} controls autoPlay className="max-h-[80vh] rounded-md shadow-2xl mb-4 bg-black" />
                    )}
                    <Button onClick={executeBurnMedia} variant="destructive" className="w-full max-w-sm font-bold tracking-widest uppercase">
                        🔥 Burn & Close {viewingMedia.type === 'image' ? 'Image' : 'Video'}
                    </Button>
                </>
            )}
        </DialogContent>
      </Dialog>

      {/* VIEW SECRET TEXT DIALOG */}
      <Dialog open={!!viewingSecretText} onOpenChange={(isOpen) => { if (!isOpen) executeBurnText(); }}>
        <DialogContent className="max-w-md w-full p-8 bg-red-600 border-red-800 text-white shadow-2xl flex flex-col items-center text-center">
            {viewingSecretText && (
                <>
                    <Flame className="h-12 w-12 mb-4 animate-pulse opacity-80" />
                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-4">Classified Message</h3>
                    <p className="text-xl font-medium break-words w-full bg-red-700/50 p-6 rounded-lg shadow-inner">{viewingSecretText.text}</p>
                    
                    <Button onClick={executeBurnText} className="mt-8 bg-black hover:bg-gray-900 text-white w-full font-bold tracking-widest uppercase py-6">
                        🔥 Burn & Close Message
                    </Button>
                </>
            )}
        </DialogContent>
      </Dialog>

    </div>
  );
}