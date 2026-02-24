import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// ✅ Import Eye and EyeOff icons here
import { Shield, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // ✅ New State: Controls if password is visible
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(employeeId, password);
      
      if (result.success) {
        console.log("Login successful, refreshing...");
        window.location.reload(); 
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Something went wrong. Check console.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background with blur effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/30" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />

      {/* Login Card */}
      <Card className="w-full max-w-md mx-4 relative z-10 shadow-2xl border-border/50 backdrop-blur-sm bg-card/95">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">GhostLAN-Messenger</CardTitle>
            <CardDescription className="mt-2">
              Secure LAN-Based Communication Portal
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="employeeId" className="text-sm font-medium">
                Employee ID
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="employeeId"
                  type="text"
                  placeholder="e.g., IT-001"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* ✅ UPDATED PASSWORD SECTION */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  // Logic: If showPassword is true, show text. Otherwise show dots (password).
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10" // Padding on right for the eye icon
                  required
                />
                
                {/* Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1} // Keeps focus on input when clicked
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm text-center animate-fade-in">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Secure Login'
              )}
            </Button>
          </form>

          <div className="mt-6 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Status:</strong> Connected to Local Server (Port 3001)
            </p>
          </div>
        </CardContent>

        <div className="px-6 pb-4">
          <div className="security-badge rounded-lg py-2 px-3 text-center text-xs font-medium flex items-center justify-center gap-2">
            <Lock className="w-3 h-3" />
            Encrypted LAN Connection - No Internet Access
          </div>
        </div>
      </Card>
    </div>
  );
}