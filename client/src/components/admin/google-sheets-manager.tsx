import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  Plus,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  Clock,
  Archive,
  AlertTriangle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface FormResponse {
  id: string;
  timestamp: string;
  formType: string;
  data: Record<string, any>;
  status: "pending" | "processed" | "archived";
}

interface SheetConfig {
  formType: string;
  worksheetName: string;
  headers: string[];
  responseCount: number;
  lastUpdated: string;
}

export function GoogleSheetsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFormType, setSelectedFormType] = useState("introduction-call");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [newSpreadsheetTitle, setNewSpreadsheetTitle] = useState("Hive Wellness Form Responses");

  // Get sheet configurations
  const { data: sheetConfigs = [], isLoading: configsLoading } = useQuery<SheetConfig[]>({
    queryKey: ["/api/admin/google-sheets/configs"],
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 180000, // Keep data fresh for 3 minutes
  });

  // Get form responses for selected type
  const { data: formResponses = [], isLoading: responsesLoading } = useQuery<FormResponse[]>({
    queryKey: ["/api/admin/google-sheets/responses", selectedFormType],
    refetchInterval: 180000, // Refresh every 3 minutes
    staleTime: 120000, // Keep data fresh for 2 minutes
    enabled: !!selectedFormType,
  });

  // Get current spreadsheet ID
  const { data: currentSpreadsheetId } = useQuery<string>({
    queryKey: ["/api/admin/google-sheets/current-id"],
  });

  useEffect(() => {
    if (currentSpreadsheetId) {
      setSpreadsheetId(currentSpreadsheetId);
    }
  }, [currentSpreadsheetId]);

  // Create new spreadsheet mutation
  const createSpreadsheetMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await fetch("/api/admin/google-sheets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) throw new Error("Failed to create spreadsheet");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/google-sheets"] });
      setSpreadsheetId(data.spreadsheetId);
      toast({
        title: "Spreadsheet created successfully",
        description: `New spreadsheet created: ${newSpreadsheetTitle}`,
      });
    },
    onError: () => {
      toast({ title: "Failed to create spreadsheet", variant: "destructive" });
    },
  });

  // Initialize sheet for form type mutation
  const initializeSheetMutation = useMutation({
    mutationFn: async ({
      formType,
      spreadsheetId,
    }: {
      formType: string;
      spreadsheetId: string;
    }) => {
      const response = await fetch("/api/admin/google-sheets/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formType, spreadsheetId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.message || errorData.error || "Failed to initialize sheet");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/google-sheets"] });
      toast({ title: "Sheet initialized successfully" });
    },
    onError: (error: Error) => {
      const isAuthError =
        error.message.includes("OAuth") || error.message.includes("authentication");
      toast({
        title: "Failed to initialize sheet",
        description: isAuthError
          ? "Google authentication required. Please re-authenticate."
          : error.message,
        variant: "destructive",
      });
    },
  });

  // Update response status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      formType,
      identifier,
      status,
    }: {
      formType: string;
      identifier: string;
      status: string;
    }) => {
      const response = await fetch("/api/admin/google-sheets/update-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formType, identifier, status }),
      });

      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/google-sheets/responses"] });
      toast({ title: "Status updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const handleCreateSpreadsheet = () => {
    if (!newSpreadsheetTitle.trim()) {
      toast({ title: "Please enter a spreadsheet title" });
      return;
    }
    createSpreadsheetMutation.mutate(newSpreadsheetTitle);
  };

  const handleInitializeSheet = (formType: string) => {
    if (!spreadsheetId) {
      toast({ title: "Please set a spreadsheet ID first" });
      return;
    }
    initializeSheetMutation.mutate({ formType, spreadsheetId });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "default";
      case "processed":
        return "secondary";
      case "archived":
        return "outline";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "processed":
        return <CheckCircle className="h-4 w-4" />;
      case "archived":
        return <Archive className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sheet className="h-5 w-5" />
            Google Sheets Integration
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage form responses in Google Sheets for better scalability and admin control
          </p>
        </div>
        {spreadsheetId && (
          <Button
            variant="outline"
            onClick={() =>
              window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, "_blank")
            }
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Spreadsheet
          </Button>
        )}
      </div>

      <Tabs defaultValue="setup" className="w-full">
        <TabsList>
          <TabsTrigger value="setup">Setup & Configuration</TabsTrigger>
          <TabsTrigger value="responses">Form Responses</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          {/* Google Authentication Status */}
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Google OAuth Authentication Status
              </CardTitle>
              <CardDescription>
                Google Sheets integration requires valid OAuth authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500"></div>
                <span className="text-sm">
                  Authentication Required - Google OAuth token expired
                </span>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>To enable Google Sheets integration:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Access Google Cloud Console</li>
                  <li>Refresh the OAuth 2.0 credentials</li>
                  <li>Update the GOOGLE_REFRESH_TOKEN secret</li>
                  <li>Restart the application</li>
                </ol>
                <p className="text-xs text-amber-700 mt-2">
                  📝 Note: Until authentication is restored, Google Sheets features will show
                  fallback responses
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Spreadsheet Setup */}
          <Card>
            <CardHeader>
              <CardTitle>Spreadsheet Configuration</CardTitle>
              <CardDescription>
                Set up your Google Sheets integration for collecting form responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="spreadsheet-id">Current Spreadsheet ID</Label>
                  <Input
                    id="spreadsheet-id"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="Enter Google Sheets ID or create new..."
                  />
                </div>
                <div>
                  <Label htmlFor="new-title">New Spreadsheet Title</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-title"
                      value={newSpreadsheetTitle}
                      onChange={(e) => setNewSpreadsheetTitle(e.target.value)}
                      placeholder="Spreadsheet title"
                    />
                    <Button
                      onClick={handleCreateSpreadsheet}
                      disabled={createSpreadsheetMutation.isPending}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Type Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Worksheet Configuration</CardTitle>
              <CardDescription>Initialize worksheets for different form types</CardDescription>
            </CardHeader>
            <CardContent>
              {configsLoading ? (
                <div className="text-center py-8">Loading configurations...</div>
              ) : (
                <div className="grid gap-4">
                  {sheetConfigs.map((config) => (
                    <div
                      key={config.formType}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{config.worksheetName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {config.headers.length} columns • {config.responseCount} responses
                        </p>
                        <div className="flex gap-1 mt-2">
                          {config.headers.slice(0, 3).map((header) => (
                            <Badge key={header} variant="outline" className="text-xs">
                              {header}
                            </Badge>
                          ))}
                          {config.headers.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{config.headers.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleInitializeSheet(config.formType)}
                          disabled={initializeSheetMutation.isPending}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Initialize
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Form Responses</CardTitle>
                  <CardDescription>
                    View and manage form submissions from Google Sheets
                  </CardDescription>
                </div>
                <Select value={selectedFormType} onValueChange={setSelectedFormType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select form type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="introduction-call">Introduction Calls</SelectItem>
                    <SelectItem value="therapist-application">Therapist Applications</SelectItem>
                    <SelectItem value="client-intake">Client Intake</SelectItem>
                    <SelectItem value="contact-form">Contact Inquiries</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {responsesLoading ? (
                <div className="text-center py-8">Loading responses...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formResponses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No responses found for this form type
                          </TableCell>
                        </TableRow>
                      ) : (
                        formResponses.slice(0, 20).map((response, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {new Date(response.timestamp).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {response.data["Full Name"] ||
                                response.data["First Name"] + " " + response.data["Last Name"] ||
                                "N/A"}
                            </TableCell>
                            <TableCell>{response.data["Email"] || "N/A"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={getStatusColor(response.status)}
                                className="flex items-center gap-1 w-fit"
                              >
                                {getStatusIcon(response.status)}
                                {response.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {response.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      updateStatusMutation.mutate({
                                        formType: selectedFormType,
                                        identifier: response.data["Email"] || response.id,
                                        status: "processed",
                                      })
                                    }
                                  >
                                    Mark Processed
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Total Responses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {sheetConfigs.reduce((total, config) => total + config.responseCount, 0)}
                </div>
                <p className="text-sm text-muted-foreground">Across all forms</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Active Form</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">
                  {sheetConfigs.length > 0
                    ? sheetConfigs.reduce((max, config) =>
                        config.responseCount > max.responseCount ? config : max
                      ).worksheetName
                    : "N/A"}
                </div>
                <p className="text-sm text-muted-foreground">
                  {sheetConfigs.length > 0
                    ? `${
                        sheetConfigs.reduce((max, config) =>
                          config.responseCount > max.responseCount ? config : max
                        ).responseCount
                      } responses`
                    : "No data"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Last Updated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">
                  {sheetConfigs.length > 0
                    ? new Date(
                        Math.max(...sheetConfigs.map((c) => new Date(c.lastUpdated).getTime()))
                      ).toLocaleDateString()
                    : "N/A"}
                </div>
                <p className="text-sm text-muted-foreground">Most recent activity</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
