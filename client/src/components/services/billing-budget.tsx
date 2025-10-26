import InstitutionalDashboard from "./institutional-dashboard-production";
import type { User } from "@shared/schema";

interface BillingBudgetProps {
  user: User;
}

export default function BillingBudget({ user }: BillingBudgetProps) {
  return <InstitutionalDashboard user={user} initialTab="billing" />;
}