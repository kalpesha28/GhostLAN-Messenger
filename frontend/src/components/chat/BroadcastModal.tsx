import { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Radio, AlertTriangle, Send } from 'lucide-react';

interface BroadcastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BroadcastModal({ open, onOpenChange }: BroadcastModalProps) {
  const { user } = useAuth();
  const { sendBroadcast } = useChat();
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      sendBroadcast(message);
      setMessage('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Radio className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Send Broadcast Message</DialogTitle>
              <DialogDescription>
                This message will be sent to all {user?.department} department members
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-2 p-3 bg-accent/50 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground">
              Broadcast messages are <strong>one-way</strong> communications. 
              Recipients cannot reply directly to this message.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-message">Message</Label>
            <Textarea
              id="broadcast-message"
              placeholder="Type your announcement here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!message.trim()} className="gap-2">
            <Send className="h-4 w-4" />
            Send Broadcast
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
