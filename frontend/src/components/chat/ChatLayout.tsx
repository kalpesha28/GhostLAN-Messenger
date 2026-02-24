import { ChatSidebar } from './ChatSidebar';
import { ChatWindow } from './ChatWindow';
import { useAuth } from '@/context/AuthContext';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ChatLayout() {
  const { logout, user } = useAuth(); // Hooks must be INSIDE the component

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      {/* Sidebar Column - 30% width */}
      <div className="w-[30%] min-w-[300px] max-w-[400px] h-full border-r flex flex-col">
        
        {/* Custom Header for Sidebar with Logout */}
        <div className="h-16 border-b flex items-center justify-between px-4 bg-gray-50/50">
          <div className="font-semibold text-sm">
            {user?.name || "Employee"} <span className="text-xs text-muted-foreground">({user?.role})</span>
          </div>
          {/* <Button 
            variant="ghost" 
            size="icon" 
            onClick={logout} 
            title="Logout"
            className="hover:bg-red-100 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" />
          </Button> */}
        </div>

        {/* The List of Chats */}
        <div className="flex-1 overflow-hidden">
          <ChatSidebar />
        </div>
      </div>

      {/* Chat Window Column - 70% width */}
      <div className="flex-1 h-full">
        <ChatWindow />
      </div>
    </div>
  );
}