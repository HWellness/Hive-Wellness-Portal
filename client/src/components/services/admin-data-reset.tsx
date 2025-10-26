import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AlertTriangle, Trash2, RefreshCw, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DataPreview {
  appointmentsCount: number;
  messagesCount: number;
  introductionCallsCount: number;
  paymentsCount: number;
  usersCount: number;
}

interface ResetOptions {
  resetAppointments: boolean;
  resetMessages: boolean;
  resetPayments: boolean;
  resetIntroductionCalls: boolean;
  preserveUsers: boolean;
}

export default function AdminDataReset() {
  const { toast } = useToast();
  const [confirmationCode, setConfirmationCode] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [resetOptions, setResetOptions] = useState<ResetOptions>({
    resetAppointments: true,
    resetMessages: true,
    resetPayments: false,
    resetIntroductionCalls: true,
    preserveUsers: true,
  });

  const { data: preview, isLoading: previewLoading, refetch } = useQuery<DataPreview>({
    queryKey: ['/api/admin/data-reset/preview'],
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/data-reset", {
        confirmationCode,
        resetOptions
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset data');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/data-reset/preview'] });
      setShowConfirmDialog(false);
      setConfirmationCode("");
      toast({
        title: "Data Reset Complete",
        description: `${data.results.appointmentsDeleted} appointments, ${data.results.messagesDeleted} messages, ${data.results.introductionCallsDeleted} calls deleted.`,
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleResetClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmReset = () => {
    if (confirmationCode !== 'RESET_DEMO_DATA') {
      toast({
        title: "Invalid Code",
        description: "Please enter the exact confirmation code.",
        variant: "destructive",
      });
      return;
    }
    resetMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trash2 className="h-8 w-8 text-red-600" />
        <div>
          <h2 className="text-2xl font-bold font-century text-hive-purple">Data Reset</h2>
          <p className="text-sm text-hive-black/70">Reset demo and test data for clean environment</p>
        </div>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>⚠️ Warning:</strong> This action is irreversible. Only use for demo/test data. Never use in production with real client data.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Current Data Overview</CardTitle>
          <CardDescription>Review data counts before resetting</CardDescription>
        </CardHeader>
        <CardContent>
          {previewLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-hive-purple" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-hive-light-blue rounded-lg">
                <div className="text-sm text-hive-black/70">Appointments</div>
                <div className="text-3xl font-bold text-hive-purple" data-testid="count-appointments">
                  {preview?.appointmentsCount || 0}
                </div>
              </div>
              <div className="p-4 bg-hive-light-purple rounded-lg">
                <div className="text-sm text-hive-black/70">Messages</div>
                <div className="text-3xl font-bold text-hive-purple" data-testid="count-messages">
                  {preview?.messagesCount || 0}
                </div>
              </div>
              <div className="p-4 bg-hive-light-blue rounded-lg">
                <div className="text-sm text-hive-black/70">Introduction Calls</div>
                <div className="text-3xl font-bold text-hive-purple" data-testid="count-intro-calls">
                  {preview?.introductionCallsCount || 0}
                </div>
              </div>
              <div className="p-4 bg-hive-light-purple rounded-lg">
                <div className="text-sm text-hive-black/70">Payments</div>
                <div className="text-3xl font-bold text-hive-purple" data-testid="count-payments">
                  {preview?.paymentsCount || 0}
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg col-span-2">
                <div className="text-sm text-hive-black/70">Users (Protected)</div>
                <div className="text-3xl font-bold text-green-600" data-testid="count-users">
                  {preview?.usersCount || 0}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reset Options</CardTitle>
          <CardDescription>Select which data types to reset</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="appointments"
              checked={resetOptions.resetAppointments}
              onCheckedChange={(checked) => 
                setResetOptions(prev => ({ ...prev, resetAppointments: checked as boolean }))
              }
              data-testid="checkbox-reset-appointments"
            />
            <label htmlFor="appointments" className="text-sm font-medium cursor-pointer">
              Delete all appointments
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="messages"
              checked={resetOptions.resetMessages}
              onCheckedChange={(checked) => 
                setResetOptions(prev => ({ ...prev, resetMessages: checked as boolean }))
              }
              data-testid="checkbox-reset-messages"
            />
            <label htmlFor="messages" className="text-sm font-medium cursor-pointer">
              Delete all messages
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="intro-calls"
              checked={resetOptions.resetIntroductionCalls}
              onCheckedChange={(checked) => 
                setResetOptions(prev => ({ ...prev, resetIntroductionCalls: checked as boolean }))
              }
              data-testid="checkbox-reset-intro-calls"
            />
            <label htmlFor="intro-calls" className="text-sm font-medium cursor-pointer">
              Delete all introduction calls
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="payments"
              checked={resetOptions.resetPayments}
              onCheckedChange={(checked) => 
                setResetOptions(prev => ({ ...prev, resetPayments: checked as boolean }))
              }
              data-testid="checkbox-reset-payments"
            />
            <label htmlFor="payments" className="text-sm font-medium cursor-pointer text-red-600">
              Delete payment intents (use with caution)
            </label>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="preserve-users"
                checked={resetOptions.preserveUsers}
                disabled
                data-testid="checkbox-preserve-users"
              />
              <label htmlFor="preserve-users" className="text-sm font-medium text-green-600">
                Preserve all user accounts (always enabled)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => refetch()}
          data-testid="button-refresh-preview"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Preview
        </Button>
        <Button
          variant="destructive"
          onClick={handleResetClick}
          disabled={resetMutation.isPending}
          data-testid="button-reset-data"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Reset Data
        </Button>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent data-testid="dialog-confirm-reset">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Shield className="h-5 w-5" />
              Confirm Data Reset
            </DialogTitle>
            <DialogDescription>
              This action will permanently delete the selected data. Type the confirmation code to proceed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <AlertDescription>
                <div className="font-mono text-sm">
                  Confirmation Code: <strong>RESET_DEMO_DATA</strong>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">Enter Confirmation Code:</label>
              <Input
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                placeholder="Type RESET_DEMO_DATA"
                className="font-mono"
                data-testid="input-confirmation-code"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setConfirmationCode("");
              }}
              data-testid="button-cancel-reset"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReset}
              disabled={confirmationCode !== 'RESET_DEMO_DATA' || resetMutation.isPending}
              data-testid="button-confirm-reset"
            >
              {resetMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Confirm Reset
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
