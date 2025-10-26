import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import ClientProfileCompletion from "@/components/services/client-profile-completion";

const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-hive-light-blue to-hive-white flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin w-10 h-10 border-4 border-gray-300 border-t-hive-purple rounded-full mx-auto mb-4"></div>
      <div className="text-hive-purple font-century text-2xl font-bold">Hive Wellness</div>
      <div className="text-hive-black text-sm mt-2">Loading...</div>
    </div>
  </div>
);

export default function ProfileCompletionPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        setLocation('/auth');
        return;
      }
      
      // Check if profile is already complete
      if (user && (user as any).profileComplete) {
        setLocation('/');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, setLocation]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated || !user) {
    return <LoadingSpinner />;
  }

  // Only render for client role
  if ((user as any).role !== 'client') {
    setLocation('/');
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-light-blue to-hive-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <ClientProfileCompletion user={user} />
        </div>
      </div>
    </div>
  );
}