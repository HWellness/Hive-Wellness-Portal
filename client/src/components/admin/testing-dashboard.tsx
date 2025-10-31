import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Calendar,
  CreditCard,
  Video,
  Sheet,
  Play,
  RefreshCw,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/queryClient";

interface TestResult {
  id: string;
  testName: string;
  category: "booking" | "admin" | "video" | "integration";
  status: "pending" | "running" | "passed" | "failed";
  details: string;
  timestamp: string;
  duration?: number;
  errorMessage?: string;
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: "booking" | "admin" | "video" | "integration";
  endpoint?: string;
  expectedResult: string;
  automated: boolean;
}

export function TestingDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());

  // Get test results
  const { data: testResults = [], isLoading: resultsLoading } = useQuery<TestResult[]>({
    queryKey: ["/api/admin/testing/results"],
    refetchInterval: 5000, // Refresh every 5 seconds during testing
  });

  // Predefined test cases
  const testCases: TestCase[] = [
    {
      id: "unpaid-booking",
      name: "Unpaid Introduction Call Booking",
      description: "Test free introduction call booking flow with email and calendar integration",
      category: "booking",
      endpoint: "/book-introduction",
      expectedResult: "Booking created, emails sent, calendar event created, Google Sheets logged",
      automated: true,
    },
    {
      id: "paid-booking",
      name: "Paid Therapy Session Booking",
      description: "Test paid session booking with Stripe payment processing",
      category: "booking",
      expectedResult: "Payment processed, session created, 85% therapist payment calculated",
      automated: true,
    },
    {
      id: "google-sheets-integration",
      name: "Google Sheets Form Logging",
      description: "Verify form responses are logged to Google Sheets with proper status tracking",
      category: "admin",
      expectedResult: "Form data logged, status updatable, spreadsheet accessible",
      automated: true,
    },
    {
      id: "gmail-template-system",
      name: "Gmail Template Management",
      description: "Test custom email template creation and sending with Hive branding",
      category: "admin",
      expectedResult: "Templates created, variables replaced, branding applied, emails sent",
      automated: true,
    },
    {
      id: "client-video-access",
      name: "Client Video Session Access",
      description: "Verify clients can access Google Meet sessions from dashboard",
      category: "video",
      expectedResult: "Google Meet links accessible, no authentication issues",
      automated: false,
    },
    {
      id: "therapist-video-access",
      name: "Therapist Video Session Access",
      description: "Test therapist access to scheduled sessions and Google Meet integration",
      category: "video",
      expectedResult: "Sessions accessible, Google Meet works, session notes available",
      automated: false,
    },
    {
      id: "calendar-sync",
      name: "Google Calendar Synchronization",
      description: "Verify all bookings create proper calendar events with Google Meet links",
      category: "integration",
      expectedResult: "Calendar events created, Google Meet links included, participants added",
      automated: true,
    },
    {
      id: "email-delivery",
      name: "Email Delivery System",
      description: "Test Gmail API email delivery for confirmations and notifications",
      category: "integration",
      expectedResult: "All notification emails delivered successfully within 30 seconds",
      automated: true,
    },
  ];

  // Run automated test mutation
  const runTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      const response = await fetchApi("/api/admin/testing/run-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId }),
      });

      if (!response.ok) throw new Error("Failed to run test");
      return response.json();
    },
    onSuccess: (data, testId) => {
      setRunningTests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testing/results"] });
      toast({
        title: "Test completed",
        description: `Test ${testId} finished with status: ${data.status}`,
      });
    },
    onError: (error, testId) => {
      setRunningTests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
      toast({
        title: "Test failed",
        description: `Failed to run test ${testId}`,
        variant: "destructive",
      });
    },
  });

  // Clear test results mutation
  const clearResultsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchApi("/api/admin/testing/clear-results", {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to clear results");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testing/results"] });
      toast({ title: "Test results cleared" });
    },
  });

  const handleRunTest = (testId: string) => {
    setRunningTests((prev) => new Set(prev).add(testId));
    runTestMutation.mutate(testId);
  };

  const handleRunAllTests = () => {
    const automatedTests = testCases.filter((test) => test.automated);
    automatedTests.forEach((test) => {
      setRunningTests((prev) => new Set(prev).add(test.id));
      runTestMutation.mutate(test.id);
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "passed":
        return "default";
      case "failed":
        return "destructive";
      case "running":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "booking":
        return <Calendar className="h-4 w-4" />;
      case "admin":
        return <Users className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "integration":
        return <Sheet className="h-4 w-4" />;
      default:
        return <TestTube className="h-4 w-4" />;
    }
  };

  const filteredTests =
    selectedCategory === "all"
      ? testCases
      : testCases.filter((test) => test.category === selectedCategory);

  const testResultsByCategory = testResults.reduce(
    (acc, result) => {
      if (!acc[result.category]) acc[result.category] = [];
      acc[result.category].push(result);
      return acc;
    },
    {} as Record<string, TestResult[]>
  );

  const overallStats = {
    total: testResults.length,
    passed: testResults.filter((r) => r.status === "passed").length,
    failed: testResults.filter((r) => r.status === "failed").length,
    running: testResults.filter((r) => r.status === "running").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Platform Testing Dashboard
          </h3>
          <p className="text-sm text-muted-foreground">
            Comprehensive testing for booking workflows, admin tools, and video session access
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRunAllTests} disabled={runningTests.size > 0}>
            <Play className="h-4 w-4 mr-2" />
            Run All Automated Tests
          </Button>
          <Button
            variant="outline"
            onClick={() => clearResultsMutation.mutate()}
            disabled={clearResultsMutation.isPending}
          >
            Clear Results
          </Button>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-600">Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overallStats.passed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overallStats.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-600">Running</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{overallStats.running}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="test-cases" className="w-full">
        <TabsList>
          <TabsTrigger value="test-cases">Test Cases</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="manual-guide">Manual Testing Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="test-cases" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Available Test Cases</CardTitle>
                  <CardDescription>
                    Automated and manual tests for all platform functionality
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("all")}
                  >
                    All
                  </Button>
                  <Button
                    variant={selectedCategory === "booking" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("booking")}
                  >
                    Booking
                  </Button>
                  <Button
                    variant={selectedCategory === "admin" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("admin")}
                  >
                    Admin
                  </Button>
                  <Button
                    variant={selectedCategory === "video" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("video")}
                  >
                    Video
                  </Button>
                  <Button
                    variant={selectedCategory === "integration" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("integration")}
                  >
                    Integration
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTests.map((test) => (
                  <div key={test.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getCategoryIcon(test.category)}
                          <h4 className="font-medium">{test.name}</h4>
                          <Badge variant={test.automated ? "default" : "secondary"}>
                            {test.automated ? "Automated" : "Manual"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{test.description}</p>
                        <p className="text-xs text-muted-foreground">
                          <strong>Expected Result:</strong> {test.expectedResult}
                        </p>
                      </div>
                      <div className="ml-4">
                        {test.automated ? (
                          <Button
                            size="sm"
                            onClick={() => handleRunTest(test.id)}
                            disabled={runningTests.has(test.id)}
                          >
                            {runningTests.has(test.id) ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <Badge variant="outline">Manual Test</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>Results from recent test runs</CardDescription>
            </CardHeader>
            <CardContent>
              {resultsLoading ? (
                <div className="text-center py-8">Loading test results...</div>
              ) : testResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No test results yet. Run some tests to see results here.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testResults.slice(0, 20).map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.testName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getCategoryIcon(result.category)}
                              {result.category}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getStatusColor(result.status)}
                              className="flex items-center gap-1 w-fit"
                            >
                              {getStatusIcon(result.status)}
                              {result.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{result.duration ? `${result.duration}ms` : "-"}</TableCell>
                          <TableCell>{new Date(result.timestamp).toLocaleString()}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {result.errorMessage || result.details}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual-guide" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manual Testing Guide</CardTitle>
              <CardDescription>
                Step-by-step instructions for manual testing workflows
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <TestTube className="h-4 w-4" />
                <AlertDescription>
                  Use the demo accounts for testing: demo@hive (client), therapist@demo.hive
                  (therapist), admin@demo.hive (admin)
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Client Video Session Access Test
                  </h4>
                  <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                    <li>Log in as demo client (demo@hive)</li>
                    <li>Navigate to dashboard and find upcoming sessions</li>
                    <li>Click "Join Video Session" for any scheduled appointment</li>
                    <li>Verify Google Meet link opens correctly</li>
                    <li>Test joining the video session</li>
                    <li>Confirm no authentication issues</li>
                  </ol>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Therapist Video Session Access Test
                  </h4>
                  <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                    <li>Log in as demo therapist (therapist@demo.hive)</li>
                    <li>Navigate to therapist dashboard</li>
                    <li>View scheduled sessions section</li>
                    <li>Join video session via Google Meet link</li>
                    <li>Test session management features</li>
                    <li>Verify client information accessibility</li>
                  </ol>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Paid Booking Workflow Test
                  </h4>
                  <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                    <li>Log in as demo client</li>
                    <li>Navigate to booking section in dashboard</li>
                    <li>Select therapist and available time slot</li>
                    <li>Use test card: 4242 4242 4242 4242</li>
                    <li>Complete payment flow</li>
                    <li>Verify confirmation emails and calendar events</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
