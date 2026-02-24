import { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { mockDepartments, mockUsers } from '@/data/mockData';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, User as UserIcon } from 'lucide-react';
import { User } from '@/types/chat';

interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewChatModal({ open, onOpenChange }: NewChatModalProps) {
  const { user } = useAuth();
  const { startDirectChat } = useChat();
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [searchId, setSearchId] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleDepartmentChange = (dept: string) => {
    setSelectedDepartment(dept);
    setSearchId('');
    setSelectedUser(null);
    
    if (dept === 'all') {
      setFilteredUsers(mockUsers.filter(u => u.id !== user?.id));
    } else {
      setFilteredUsers(mockUsers.filter(u => u.department === dept && u.id !== user?.id));
    }
  };

  const handleSearch = () => {
    if (!searchId.trim()) {
      if (selectedDepartment) {
        handleDepartmentChange(selectedDepartment);
      }
      return;
    }

    const found = mockUsers.filter(
      u => u.id.toLowerCase().includes(searchId.toLowerCase()) && u.id !== user?.id
    );
    setFilteredUsers(found);
  };

  const handleStartChat = () => {
    if (selectedUser) {
      startDirectChat(selectedUser.id);
      onOpenChange(false);
      resetState();
    }
  };

  const resetState = () => {
    setSelectedDepartment('');
    setSearchId('');
    setFilteredUsers([]);
    setSelectedUser(null);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetState();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
          <DialogDescription>
            Find a colleague by department or employee ID
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Department Filter */}
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={selectedDepartment} onValueChange={handleDepartmentChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {mockDepartments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee ID Search */}
          <div className="space-y-2">
            <Label>Search by Employee ID</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., IT-002"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="outline" size="icon" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Results */}
          {filteredUsers.length > 0 && (
            <div className="space-y-2">
              <Label>Select a colleague</Label>
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full p-3 flex items-center gap-3 hover:bg-accent transition-colors ${
                      selectedUser?.id === u.id ? 'bg-accent' : ''
                    }`}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.id} • {u.department}
                      </p>
                    </div>
                    <span className={`ml-auto w-2 h-2 rounded-full ${
                      u.isOnline ? 'status-online' : 'status-offline'
                    }`} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchId && filteredUsers.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <UserIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No employee found with ID "{searchId}"</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleStartChat} disabled={!selectedUser}>
            Start Chat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
