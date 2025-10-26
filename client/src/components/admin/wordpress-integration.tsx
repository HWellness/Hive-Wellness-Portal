import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Globe,
  Key,
  RefreshCw,
  ExternalLink,
  FileText,
  Database,
  BarChart3,
  Download,
  Upload,
  Calendar,
  Zap
} from "lucide-react";
import ServiceNavigation from '@/components/ui/service-navigation';
import type { User } from '@shared/schema';

interface WordPressIntegrationStatus {
  siteUrl?: string;
  publicApiKey?: string;
  privateApiKey?: string;
  enabled?: boolean;
  pollingInterval?: number;
  lastPolled?: string | null;
  isRunning?: boolean;
}

interface WordPressIntegrationProps {
  onBackToDashboard?: () => void;
  user?: User;
}

export default function WordPressIntegration({ onBackToDashboard, user }: WordPressIntegrationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [siteUrl, setSiteUrl] = useState('');
  const [publicApiKey, setPublicApiKey] = useState('');
  const [privateApiKey, setPrivateApiKey] = useState('');
  const [pollingInterval, setPollingInterval] = useState(5);
  const [isConfigured, setIsConfigured] = useState(false);

  // Get WordPress integration status
  const { data: status, isLoading, error } = useQuery<WordPressIntegrationStatus>({
    queryKey: ['/api/admin/wordpress-integration'],
    refetchInterval: 180000, // Refetch every 3 minutes
    staleTime: 120000, // Keep data fresh for 2 minutes
    retry: 1,
    onError: (error: any) => {
      console.error('WordPress Integration API error:', error);
    }
  });

  // Configure WordPress integration
  const configureMutation = useMutation({
    mutationFn: async (config: any) => {
      return await apiRequest('POST', '/api/admin/wordpress-integration/configure', config);
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "WordPress integration has been configured successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wordpress-integration'] });
    },
    onError: (error: any) => {
      toast({
        title: "Configuration Error",
        description: error.message || "Failed to configure WordPress integration.",
        variant: "destructive",
      });
    },
  });

  // Toggle WordPress integration
  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await apiRequest('POST', '/api/admin/wordpress-integration/toggle', { enabled });
    },
    onSuccess: (data: any) => {
      toast({
        title: data.message.includes('enabled') ? "Integration Enabled" : "Integration Disabled",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wordpress-integration'] });
    },
    onError: (error: any) => {
      toast({
        title: "Toggle Error",
        description: error.message || "Failed to toggle WordPress integration.",
        variant: "destructive",
      });
    },
  });

  // Test connection
  const testMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/wordpress-integration/test');
    },
    onSuccess: (data: any) => {
      toast({
        title: "Connection Successful!",
        description: data.message || "WordPress connection is working correctly.",
      });
      console.log('✅ Test results:', data);
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to WordPress.",
        variant: "destructive",
      });
      console.error('❌ Test error:', error);
    },
  });

  // Manual sync trigger
  const syncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/wordpress-integration/sync');
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sync Completed",
        description: `${data.message}. Processed ${data.processed} new submissions.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wordpress-integration'] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Error",
        description: error.message || "Failed to sync WordPress forms.",
        variant: "destructive",
      });
    },
  });

  // Update form state when status loads
  useEffect(() => {
    if (status) {
      setSiteUrl(status.siteUrl || '');
      setPublicApiKey(status.publicApiKey || '');
      setPrivateApiKey(status.privateApiKey || '');
      setPollingInterval(status.pollingInterval || 5);
      setIsConfigured(!!(status.siteUrl && status.publicApiKey && status.privateApiKey));
    }
  }, [status]);

  const handleConfigure = () => {
    if (!siteUrl || !publicApiKey || !privateApiKey) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    console.log('🔧 Configuring WordPress integration with:', {
      siteUrl,
      publicApiKey: publicApiKey ? 'present' : 'missing',
      privateApiKey: privateApiKey ? 'present' : 'missing',
      pollingInterval
    });

    configureMutation.mutate({
      siteUrl,
      publicApiKey,
      privateApiKey,
      pollingInterval,
      enabled: true
    });
  };

  const handleToggle = () => {
    toggleMutation.mutate(!status?.enabled);
  };

  const handleTest = () => {
    if (!isConfigured) {
      toast({
        title: "Configuration Required",
        description: "Please configure the WordPress integration first.",
        variant: "destructive",
      });
      return;
    }
    testMutation.mutate();
  };

  const handleSync = () => {
    syncMutation.mutate();
  };

  const getStatusBadge = () => {
    if (isLoading) return <Badge variant="secondary">Loading...</Badge>;
    
    // Check if actually configured (has all required fields)
    const isActuallyConfigured = status?.siteUrl && status?.publicApiKey && status?.privateApiKey;
    
    if (!isActuallyConfigured) return <Badge variant="destructive">Not Configured</Badge>;
    if (status?.enabled && status?.isRunning) return <Badge variant="default">Active</Badge>;
    if (status?.enabled) return <Badge variant="secondary">Configured</Badge>;
    return <Badge variant="outline">Disabled</Badge>;
  };

  const getLastPolledText = () => {
    if (!status?.lastPolled) return "Never";
    const date = new Date(status.lastPolled);
    return date.toLocaleString();
  };

  // Show loading state
  if (isLoading) {
    return (
      <>
        {/* Navigation Bar */}
        {onBackToDashboard && user && (
          <ServiceNavigation 
            serviceName="WordPress Forms Integration"
            onBackToDashboard={onBackToDashboard}
            user={user}
          />
        )}
        
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Loading WordPress Integration...</p>
          </div>
        </div>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        {/* Navigation Bar */}
        {onBackToDashboard && user && (
          <ServiceNavigation 
            serviceName="WordPress Forms Integration"
            onBackToDashboard={onBackToDashboard}
            user={user}
          />
        )}
        
        <div className="p-8">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Error loading WordPress Integration: {(error as any)?.message || 'Unknown error'}
            </AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Navigation Bar */}
      {onBackToDashboard && user && (
        <ServiceNavigation 
          serviceName="WordPress Forms Integration"
          onBackToDashboard={onBackToDashboard}
          user={user}
        />
      )}
      
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">WordPress Integration</h2>
        {getStatusBadge()}
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteUrl">WordPress Site URL</Label>
            <Input
              id="siteUrl"
              placeholder="https://your-site.com"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="publicApiKey">Public API Key</Label>
            <Input
              id="publicApiKey"
              placeholder="edc99e17fb"
              value={publicApiKey}
              onChange={(e) => setPublicApiKey(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="privateApiKey">Private API Key</Label>
            <Input
              id="privateApiKey"
              placeholder="f637566b3dc37efe"
              value={privateApiKey}
              onChange={(e) => setPrivateApiKey(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pollingInterval">Polling Interval (minutes)</Label>
            <Input
              id="pollingInterval"
              type="number"
              min="1"
              max="60"
              value={pollingInterval}
              onChange={(e) => setPollingInterval(Number(e.target.value))}
            />
          </div>

          <Button 
            onClick={handleConfigure}
            disabled={configureMutation.isPending}
            className="w-full"
          >
            {configureMutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <div className="flex items-center gap-2">
              {status?.enabled && status?.isRunning ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              {getStatusBadge()}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Polled</span>
            <span className="text-sm font-medium">{getLastPolledText()}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Polling Interval</span>
            <span className="text-sm font-medium">{status?.pollingInterval || 5} minutes</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Site URL</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{status?.siteUrl || 'Not configured'}</span>
              {status?.siteUrl && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={status.siteUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={status?.enabled || false}
                onCheckedChange={handleToggle}
                disabled={!isConfigured || toggleMutation.isPending}
              />
              <span className="text-sm font-medium">
                {status?.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={!isConfigured || testMutation.isPending}
                size="sm"
              >
                {testMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleSync}
                disabled={!(status?.siteUrl && status?.publicApiKey && status?.privateApiKey) || !status?.enabled || syncMutation.isPending}
                size="sm"
              >
                {syncMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3 mr-2" />
                    Manual Sync
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Enable REST API in WordPress</h4>
            <p className="text-sm text-muted-foreground">
              Go to Gravity Forms → Settings → REST API and check "Enabled"
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">2. Copy API Keys</h4>
            <p className="text-sm text-muted-foreground">
              From the REST API settings page, copy both the Public API Key and Private API Key
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">3. Configure Above</h4>
            <p className="text-sm text-muted-foreground">
              Enter your WordPress site URL and API keys in the configuration form above
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">4. Enable Integration</h4>
            <p className="text-sm text-muted-foreground">
              Toggle the switch to enable automatic polling. The system will check for new form submissions every {pollingInterval} minutes
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}