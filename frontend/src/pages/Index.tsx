import { useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/components/auth/LoginPage';
import { ChatLayout } from '@/components/chat/ChatLayout'; // Uncommented
import { ChatProvider } from '@/context/ChatContext'; // Uncommented
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // RETURN THE REAL CHAT APP NOW
  return (
    <ChatProvider>
      <ChatLayout />
    </ChatProvider>
  );
};

export default Index;