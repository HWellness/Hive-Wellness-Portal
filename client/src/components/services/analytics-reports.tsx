import InstitutionalDashboard from "./institutional-dashboard-production";
import type { User } from "@shared/schema";

interface AnalyticsReportsProps {
  user: User;
}

export default function AnalyticsReports({ user }: AnalyticsReportsProps) {
  return <InstitutionalDashboard user={user} initialTab="analytics" />;
}