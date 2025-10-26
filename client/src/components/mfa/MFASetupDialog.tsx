import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Download, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface MFASetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface MFASetupData {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
}

export function MFASetupDialog({ open, onOpenChange, onSuccess }: MFASetupDialogProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'backup' | 'complete'>('setup');
  const [setupData, setSetupData] = useState<MFASetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const setupMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/mfa/setup'),
    onSuccess: (data) => {
      setSetupData(data);
      setStep('verify');
      setError('');
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to set up MFA');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (token: string) => apiRequest('POST', '/api/mfa/verify-setup', { token }),
    onSuccess: () => {
      setStep('backup');
      setError('');
      toast({
        title: "MFA Enabled",
        description: "Two-factor authentication has been successfully enabled.",
      });
    },
    onError: (error: any) => {
      setError(error.message || 'Invalid verification code');
    },
  });

  const handleSetupStart = () => {
    setError('');
    setupMutation.mutate();
  };

  const handleVerification = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }
    setError('');
    verifyMutation.mutate(verificationCode);
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      toast({
        title: "Secret copied",
        description: "The secret key has been copied to your clipboard.",
      });
    }
  };

  const copyBackupCodes = () => {
    if (setupData?.backupCodes) {
      const codes = setupData.backupCodes.join('\\n');
      navigator.clipboard.writeText(codes);
      setBackupCodesCopied(true);
      toast({
        title: "Backup codes copied",
        description: "The backup codes have been copied to your clipboard.",
      });
    }
  };

  const downloadBackupCodes = () => {
    if (setupData?.backupCodes) {
      const codes = setupData.backupCodes.join('\\n');
      const blob = new Blob([`Hive Wellness MFA Backup Codes\\n\\nGenerated: ${new Date().toLocaleString()}\\n\\n${codes}\\n\\nKeep these codes safe and secure.`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hive-wellness-backup-codes.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Backup codes downloaded",
        description: "The backup codes have been saved to your device.",
      });
    }
  };

  const handleComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/mfa/status'] });
    setStep('complete');
    onSuccess?.();
    setTimeout(() => {
      onOpenChange(false);
      // Reset state for next time
      setStep('setup');
      setSetupData(null);
      setVerificationCode('');
      setError('');
      setBackupCodesCopied(false);
    }, 2000);
  };

  const renderStep = () => {
    switch (step) {
      case 'setup':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Set Up Two-Factor Authentication</h3>
              <p className="text-muted-foreground">
                Add an extra layer of security to your account by enabling two-factor authentication.
              </p>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You'll need an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy to scan the QR code.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleSetupStart} 
              disabled={setupMutation.isPending}
              className="w-full"
              data-testid="button-start-mfa-setup"
            >
              {setupMutation.isPending ? 'Setting up...' : 'Start Setup'}
            </Button>
          </div>
        );

      case 'verify':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Scan QR Code</h3>
            
            {setupData && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-6 text-center">
                    <img 
                      src={setupData.qrCodeUrl} 
                      alt="MFA QR Code" 
                      className="mx-auto mb-4 border rounded"
                      data-testid="img-mfa-qr-code"
                    />
                    <p className="text-sm text-muted-foreground mb-2">
                      Can't scan? Enter this code manually:
                    </p>
                    <div className="flex items-center gap-2 bg-muted p-2 rounded">
                      <code className="text-sm flex-1" data-testid="text-mfa-secret">
                        {setupData.secret}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copySecret}
                        data-testid="button-copy-secret"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label htmlFor="verification-code">Enter verification code from your app</Label>
                  <Input
                    id="verification-code"
                    type="text"
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\\D/g, '').slice(0, 6);
                      setVerificationCode(value);
                    }}
                    maxLength={6}
                    data-testid="input-verification-code"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleVerification}
                  disabled={verifyMutation.isPending || verificationCode.length !== 6}
                  className="w-full"
                  data-testid="button-verify-code"
                >
                  {verifyMutation.isPending ? 'Verifying...' : 'Verify and Enable'}
                </Button>
              </div>
            )}
          </div>
        );

      case 'backup':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Save Your Backup Codes</h3>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Store these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
              </AlertDescription>
            </Alert>

            {setupData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Backup Recovery Codes</CardTitle>
                  <CardDescription>
                    Each code can only be used once. Generate new codes if you run out.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {setupData.backupCodes.map((code, index) => (
                      <div key={index} className="bg-muted p-2 rounded text-center" data-testid={`text-backup-code-${index}`}>
                        {code}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={copyBackupCodes}
                      className="flex-1"
                      data-testid="button-copy-backup-codes"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Codes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={downloadBackupCodes}
                      className="flex-1"
                      data-testid="button-download-backup-codes"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={handleComplete}
              disabled={!backupCodesCopied}
              className="w-full"
              data-testid="button-complete-setup"
            >
              I've Saved My Backup Codes
            </Button>

            {!backupCodesCopied && (
              <p className="text-sm text-muted-foreground text-center">
                Please copy or download your backup codes before continuing
              </p>
            )}
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h3 className="text-lg font-semibold">MFA Successfully Enabled!</h3>
            <p className="text-muted-foreground">
              Your account is now protected with two-factor authentication.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-mfa-setup">
        <DialogHeader>
          <DialogTitle>Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            {step === 'setup' && 'Secure your account with an additional layer of protection'}
            {step === 'verify' && 'Step 1 of 2: Set up your authenticator app'}
            {step === 'backup' && 'Step 2 of 2: Save your backup codes'}
            {step === 'complete' && 'Setup complete!'}
          </DialogDescription>
        </DialogHeader>

        {renderStep()}

        {step !== 'complete' && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-setup"
            >
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}