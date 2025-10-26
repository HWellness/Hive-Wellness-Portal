import { useAuth } from "@/hooks/useAuth";
import ClientDashboard from "@/components/services/client-dashboard";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function ClientDashboardWrapper() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-gray-300 border-t-hive-purple rounded-full mx-auto mb-4"></div>
          <div className="text-hive-purple font-century text-2xl font-bold">Loading Dashboard...</div>
        </div>
      </div>
    );
  }

  if (!user || user?.role !== 'client') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-primary text-hive-purple mb-4">Access Denied</h1>
          <p className="text-hive-black/70">You need client access to view this page.</p>
          <Link to="/portal">
            <Button className="mt-4">Return to Portal</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <ClientDashboard user={user} />;
}