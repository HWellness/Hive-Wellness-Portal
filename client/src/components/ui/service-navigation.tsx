import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Home, 
  Menu, 
  User, 
  LogOut,
  Bell,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import hiveWellnessLogo from "@assets/Hive Logo_1752073128164.png";

// Simple user type for navigation
interface NavigationUser {
  id: string;
  name?: string;
  email: string;
  role: string;
}

interface ServiceNavigationProps {
  serviceName: string;
  onBackToDashboard: () => void;
  showMenu?: boolean;
  onMenuToggle?: () => void;
  user?: NavigationUser;
}

export default function ServiceNavigation({ 
  serviceName, 
  onBackToDashboard, 
  showMenu = false, 
  onMenuToggle,
  user 
}: ServiceNavigationProps) {
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout");
      return response.json();
    },
    onSuccess: (data) => {
      // Clear query cache
      queryClient.clear();
      
      // Show success toast
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
      
      // Use proper navigation instead of window.location
      setTimeout(() => {
        window.location.href = data.redirect || '/';
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'therapist':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'client':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'institution':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left side - Back button and service info */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <img 
              src={hiveWellnessLogo} 
              alt="Hive Wellness" 
              className="h-8 w-auto"
            />
            {serviceName !== "Video Sessions" && (
              <div>
                <h1 className="font-primary text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {serviceName}
                </h1>
              </div>
            )}
          </div>
        </div>

        {/* Right side - User info and actions */}
        <div className="flex items-center space-x-4">
          {/* User info */}
          {user && (
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {user.name || user.email}
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getRoleBadgeColor(user.role)}`}
                  >
                    {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                  </Badge>
                </div>
              </div>
              
              <div className="w-8 h-8 bg-hive-purple rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {showMenu && onMenuToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMenuToggle}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <Menu className="w-4 h-4" />
              </Button>
            )}
            
            {/* Settings Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/settings'}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              data-testid="button-settings"
            >
              <Settings className="w-4 h-4" />
              <span className="sr-only">Settings</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <LogOut className="w-4 h-4" />
              <span className="sr-only">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}