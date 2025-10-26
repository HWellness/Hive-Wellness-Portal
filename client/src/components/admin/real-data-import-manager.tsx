// Real Data Import Manager - Critical for accurate client-therapist matching
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, CheckCircle, AlertTriangle, Database, RefreshCw } from 'lucide-react';

interface ImportResults {
  clientQuestionnaires: { imported: number; errors: string[] };
  therapistApplications: { imported: number; errors: string[] };
}

export function RealDataImportManager() {
  const [isImporting, setIsImporting] = useState(false);
  const [lastImportResults, setLastImportResults] = useState<ImportResults | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<'active' | 'inactive' | 'checking'>('checking');
  const { toast } = useToast();

  const handleHubSpotImport = async () => {
    setIsImporting(true);
    
    try {
      const response = await fetch('/api/admin/import-hubspot-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setLastImportResults(result.results);
        toast({
          title: "HubSpot Data Import Complete",
          description: `Imported ${result.results.clientQuestionnaires.imported} questionnaires and ${result.results.therapistApplications.imported} applications`,
        });
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error) {
      console.error('HubSpot import failed:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : 'Failed to import HubSpot data',
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const testWebhookEndpoint = async () => {
    setWebhookStatus('checking');
    
    try {
      const testData = {
        form_id: 'webhook_test',
        form_title: 'Real Data Webhook Test',
        entry_id: 'test_' + Date.now(),
        entry_data: {
          email: 'webhook.test@example.com',
          step2_first_name: 'Test',
          step2_last_name: 'User'
        }
      };

      const response = await fetch('/api/external/gravity-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        setWebhookStatus('active');
        toast({
          title: "Webhook Active",
          description: "Real data webhook endpoint is working correctly",
        });
      } else {
        setWebhookStatus('inactive');
        throw new Error('Webhook test failed');
      }
    } catch (error) {
      setWebhookStatus('inactive');
      toast({
        title: "Webhook Issue",
        description: "Real data webhook endpoint may have issues",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Real Data Import Manager
          </CardTitle>
          <CardDescription>
            Manage imports of 100% accurate form responses from HubSpot for precise client-therapist matching
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Critical for Accuracy:</strong> This system ensures all client questionnaires and therapist applications are imported with real data for accurate matching and onboarding workflows.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="hubspot" className="space-y-4">
            <TabsList>
              <TabsTrigger value="hubspot">HubSpot Import</TabsTrigger>
              <TabsTrigger value="webhook">Webhook Status</TabsTrigger>
              <TabsTrigger value="results">Import Results</TabsTrigger>
            </TabsList>

            <TabsContent value="hubspot" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Import Real Data from HubSpot</CardTitle>
                  <CardDescription>
                    Fetch all real form submissions from HubSpot API for client questionnaires and therapist applications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">Comprehensive Real Data Import</h3>
                        <p className="text-sm text-muted-foreground">
                          Imports all client questionnaires and therapist applications from HubSpot
                        </p>
                      </div>
                      <Button 
                        onClick={handleHubSpotImport}
                        disabled={isImporting}
                        className="min-w-[120px]"
                      >
                        {isImporting ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Import Now
                          </>
                        )}
                      </Button>
                    </div>

                    {process.env.HUBSPOT_API_KEY ? (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          HubSpot API key configured - ready for real data import
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          HubSpot API key required for real data import. Please configure in environment variables.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="webhook" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Real Data Webhook Status</CardTitle>
                  <CardDescription>
                    Monitor the webhook endpoint that receives real form submissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">Webhook Endpoint</h3>
                        <code className="text-sm text-muted-foreground">/api/external/gravity-forms</code>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={webhookStatus === 'active' ? 'default' : 'destructive'}>
                            {webhookStatus === 'checking' ? 'Checking...' : 
                             webhookStatus === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        onClick={testWebhookEndpoint}
                        disabled={webhookStatus === 'checking'}
                        variant="outline"
                      >
                        {webhookStatus === 'checking' ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Test Webhook
                      </Button>
                    </div>

                    <Alert>
                      <AlertDescription>
                        The webhook automatically processes all form submissions from HubSpot and WordPress Gravity Forms in real-time.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              {lastImportResults ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg text-green-600">Client Questionnaires</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold">
                          {lastImportResults.clientQuestionnaires.imported}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Successfully imported
                        </div>
                        {lastImportResults.clientQuestionnaires.errors.length > 0 && (
                          <div className="mt-2">
                            <Badge variant="destructive">
                              {lastImportResults.clientQuestionnaires.errors.length} errors
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg text-blue-600">Therapist Applications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold">
                          {lastImportResults.therapistApplications.imported}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Successfully imported
                        </div>
                        {lastImportResults.therapistApplications.errors.length > 0 && (
                          <div className="mt-2">
                            <Badge variant="destructive">
                              {lastImportResults.therapistApplications.errors.length} errors
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-muted-foreground">
                      No import results available. Run an import to see results.
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}