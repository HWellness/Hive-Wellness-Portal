import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/ui/loading";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      // Redirect authenticated users to portal
      navigate("/portal");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-accent-light flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-4 border-gray-300 border-t-hive-purple rounded-full mx-auto mb-4"></div>
        <div className="text-hive-purple font-century text-2xl font-bold">Hive Wellness</div>
        <div className="text-hive-black text-sm mt-2">Redirecting to portal...</div>
      </div>
    </div>
  );
}
