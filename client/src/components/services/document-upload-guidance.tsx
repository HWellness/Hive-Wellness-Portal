/**
 * Document Upload Filename Guidance - Step 47 (partial)
 * Banner with helper text for secure document uploads
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Info } from "lucide-react";

export default function DocumentUploadGuidance() {
  return (
    <Alert className="bg-blue-50 border-blue-200 mb-4" data-testid="document-upload-guidance">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-sm text-gray-700">
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <div>
              <strong className="font-semibold text-base" data-testid="guidance-title">
                File Naming Guidance
              </strong>
              <p className="text-xs text-gray-600 mt-0.5">
                Use this format to keep track of your progress with each client
              </p>
            </div>
            <div className="bg-white p-3 rounded-md border border-blue-100">
              <p className="font-medium text-sm mb-2" data-testid="filename-format">
                Recommended format:
              </p>
              <code className="block px-2 py-1.5 bg-gray-50 rounded text-xs font-mono border border-gray-200">
                YYYY-MM-DD_ClientInitials_Session##
              </code>
              <div className="mt-3 space-y-1 text-xs">
                <p className="flex items-center gap-2">
                  <span className="font-medium min-w-[100px]">Date:</span>
                  <span className="text-gray-600">Session date (e.g., 2025-10-06)</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-medium min-w-[100px]">Client Initials:</span>
                  <span className="text-gray-600">Use first and last name initials (e.g., JD)</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-medium min-w-[100px]">Session Number:</span>
                  <span className="text-gray-600">
                    Current session count (e.g., Session01, Session12)
                  </span>
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600 italic" data-testid="filename-example">
              Example:{" "}
              <code className="px-1.5 py-0.5 bg-white rounded font-mono border border-gray-200">
                2025-10-06_JD_Session03.pdf
              </code>
            </p>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
