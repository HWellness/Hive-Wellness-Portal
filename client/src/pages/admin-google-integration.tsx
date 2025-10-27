import React from "react";
import { GoogleIntegrationPanel } from "@/components/admin/google-integration-panel";

export default function AdminGoogleIntegrationPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <GoogleIntegrationPanel />
      </div>
    </div>
  );
}
