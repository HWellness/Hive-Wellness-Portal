import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Shield, History, Info, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface ConsentPreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  medical_data_processing: boolean;
}

interface ConsentHistoryEntry {
  id: string;
  consentType: string;
  action: 'granted' | 'withdrawn' | 'updated';
  previousValue: boolean | null;
  newValue: boolean;
  timestamp: string;
}

const CONSENT_INFO = {
  essential: {
    title: 'Essential Services',
    description: 'Required for platform functionality, authentication, and security.',
    icon: Shield,
    required: true,
  },
  functional: {
    title: 'Functional Features',
    description: 'Enhanced features, preferences, and personalised content.',
    icon: Check,
    required: false,
  },
  analytics: {
    title: 'Analytics & Performance',
    description: 'Anonymised data to improve services and fix issues.',
    icon: Info,
    required: false,
  },
  marketing: {
    title: 'Marketing Communications',
    description: 'Updates, resources, wellness tips, and promotional offers via email.',
    icon: Info,
    required: false,
  },
  medical_data_processing: {
    title: 'AI-Powered Therapy Tools',
    description: 'Chatbot, therapist matching, and AI session analysis (HIPAA-compliant).',
    icon: Shield,
    required: false,
  },
};

export function ConsentManagement() {
  const { toast } = useToast();
  const [consents, setConsents] = useState<ConsentPreferences>({
    essential: true,
    functional: false,
    analytics: false,
    marketing: false,
    medical_data_processing: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch current consents
  const { data: currentConsents, isLoading } = useQuery<{ success: boolean; consents: ConsentPreferences }>({
    queryKey: ['/api/user/consent'],
    onSuccess: (data) => {
      if (data.consents) {
        setConsents(data.consents);
      }
    },
  });

  // Fetch consent history
  const { data: historyData, isLoading: isLoadingHistory } = useQuery<{
    success: boolean;
    history: ConsentHistoryEntry[];
  }>({
    queryKey: ['/api/user/consent/history'],
    enabled: showHistory,
  });

  const handleToggle = (key: keyof ConsentPreferences) => {
    if (key === 'essential') return; // Cannot toggle essential
    setConsents((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await apiRequest('/api/user/consent', {
        method: 'POST',
        body: JSON.stringify({ consents }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Invalidate consent query to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/user/consent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/consent/history'] });

      toast({
        title: 'Preferences updated',
        description: 'Your consent preferences have been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving consents:', error);
      toast({
        title: 'Error',
        description: 'Failed to save consent preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanges = () => {
    if (!currentConsents?.consents) return false;
    return JSON.stringify(consents) !== JSON.stringify(currentConsents.consents);
  };

  return (
    <div className="space-y-6" data-testid="consent-management">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Privacy & Consent Preferences
          </CardTitle>
          <CardDescription>
            Manage your data processing consents and privacy preferences. Changes take effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading preferences...</div>
          ) : (
            (Object.keys(CONSENT_INFO) as Array<keyof ConsentPreferences>).map((key) => {
              const info = CONSENT_INFO[key];
              const Icon = info.icon;
              return (
                <div key={key} className="space-y-3" data-testid={`consent-item-${key}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`consent-${key}`} className="text-base font-medium cursor-pointer">
                            {info.title}
                          </Label>
                          {info.required && (
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{info.description}</p>
                      </div>
                    </div>
                    <Switch
                      id={`consent-${key}`}
                      checked={consents[key]}
                      onCheckedChange={() => handleToggle(key)}
                      disabled={info.required}
                      data-testid={`consent-toggle-${key}`}
                    />
                  </div>
                  {key !== 'medical_data_processing' && <Separator />}
                </div>
              );
            })
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setShowHistory(!showHistory)}
            data-testid="button-view-history"
          >
            <History className="h-4 w-4 mr-2" />
            {showHistory ? 'Hide' : 'View'} History
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || !hasChanges()} data-testid="button-save-consents">
            {isSubmitting ? 'Saving...' : 'Save Preferences'}
          </Button>
        </CardFooter>
      </Card>

      {showHistory && (
        <Card data-testid="consent-history-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Consent History
            </CardTitle>
            <CardDescription>
              A complete audit trail of all changes to your consent preferences for transparency and compliance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="text-center py-8 text-muted-foreground">Loading history...</div>
            ) : historyData?.history && historyData.history.length > 0 ? (
              <div className="space-y-4">
                {historyData.history.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-4 p-4 border rounded-lg" data-testid={`history-entry-${entry.id}`}>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{entry.consentType.replace(/_/g, ' ')}</span>
                        <Badge variant={entry.newValue ? 'default' : 'secondary'}>
                          {entry.action === 'granted' && 'Granted'}
                          {entry.action === 'withdrawn' && 'Withdrawn'}
                          {entry.action === 'updated' && (entry.newValue ? 'Enabled' : 'Disabled')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(entry.timestamp), 'PPpp')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No consent history available.</div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Your Rights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Under GDPR and UK Data Protection Act, you have the right to:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Access your personal data (request a data export)</li>
            <li>Rectify inaccurate data (update your profile)</li>
            <li>Erase your data (request account deletion)</li>
            <li>Restrict or object to processing</li>
            <li>Data portability (download your data)</li>
            <li>Withdraw consent at any time</li>
          </ul>
          <p className="mt-3">
            For any privacy concerns, contact us at{' '}
            <a href="mailto:support@hive-wellness.co.uk" className="text-primary hover:underline">
              support@hive-wellness.co.uk
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
