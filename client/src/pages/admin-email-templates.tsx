import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import EmailTemplateManagement from "@/components/admin/email-template-management-simple";

export default function AdminEmailTemplates() {
  const { user } = useAuth();

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-primary text-hive-purple mb-4">Access Denied</h1>
          <p className="text-hive-black/70">You need admin access to view this page.</p>
          <Link to="/portal">
            <Button className="mt-4">Return to Portal</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-purple/10 via-hive-blue/8 to-hive-light-blue/12">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin-dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-primary text-hive-purple">
              Email Template Management
            </h1>
            <p className="text-hive-black/70 font-secondary">
              Full control over all automated email communications
            </p>
          </div>
        </div>

        {/* Email Template Management Component */}
        <EmailTemplateManagement />
      </div>
    </div>
  );
}