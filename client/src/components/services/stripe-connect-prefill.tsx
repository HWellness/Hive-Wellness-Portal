import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const stripeConnectAutomationSchema = z.object({
  ruleName: z.string().min(1, "Rule name is required"),
  trigger: z.enum(["therapist_application", "profile_completion", "manual_trigger"]),
  prefillData: z.object({
    businessType: z.enum(["individual", "company"]).default("individual"),
    country: z.string().default("GB"),
    currency: z.string().default("GBP"),
    accountType: z.enum(["express", "standard", "custom"]).default("express"),
    capabilities: z.array(z.string()).default(["card_payments", "transfers"]),
    settings: z.object({
      payouts: z.object({
        schedule: z.object({
          interval: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
          weeklyAnchor: z.string().optional(),
          monthlyAnchor: z.number().optional(),
        }),
        debitNegativeBalances: z.boolean().default(true),
      }),
      cardPayments: z.object({
        requestThreeDSecure: z.enum(["any", "automatic"]).default("automatic"),
        statementDescriptorPrefix: z.string().optional(),
      }),
    }),
  }),
  conditions: z
    .array(
      z.object({
        field: z.string(),
        operator: z.enum(["equals", "not_equals", "contains", "not_contains"]),
        value: z.string(),
      })
    )
    .optional(),
  isActive: z.boolean().default(true),
  notificationSettings: z.object({
    sendEmail: z.boolean().default(true),
    emailTemplate: z.string().optional(),
    webhookUrl: z.string().optional(),
  }),
});

const therapistOnboardingSchema = z.object({
  therapistId: z.string().min(1, "Therapist ID is required"),
  prefillData: z.object({
    email: z.string().email("Valid email is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phone: z.string().optional(),
    businessType: z.enum(["individual", "company"]).default("individual"),
    businessProfile: z.object({
      name: z.string().min(1, "Business name is required"),
      productDescription: z.string().min(1, "Product description is required"),
      supportPhone: z.string().optional(),
      supportEmail: z.string().email("Valid support email is required"),
      url: z.string().url("Valid URL is required").optional(),
    }),
    address: z.object({
      line1: z.string().min(1, "Address line 1 is required"),
      line2: z.string().optional(),
      city: z.string().min(1, "City is required"),
      state: z.string().min(1, "State is required"),
      postalCode: z.string().min(1, "Postal code is required"),
      country: z.string().default("GB"),
    }),
    dateOfBirth: z.object({
      day: z.number().min(1).max(31),
      month: z.number().min(1).max(12),
      year: z.number().min(1900).max(2010),
    }),
  }),
  autoSubmit: z.boolean().default(false),
  followUpDays: z.number().min(1).max(30).default(7),
});

interface StripeConnectAutomation {
  id: string;
  ruleName: string;
  trigger: "therapist_application" | "profile_completion" | "manual_trigger";
  prefillData: {
    businessType: "individual" | "company";
    country: string;
    currency: string;
    accountType: "express" | "standard" | "custom";
    capabilities: string[];
    settings: {
      payouts: {
        schedule: {
          interval: "daily" | "weekly" | "monthly";
          weeklyAnchor?: string;
          monthlyAnchor?: number;
        };
        debitNegativeBalances: boolean;
      };
      cardPayments: {
        requestThreeDSecure: "any" | "automatic";
        statementDescriptorPrefix?: string;
      };
    };
  };
  conditions: Array<{
    field: string;
    operator: "equals" | "not_equals" | "contains" | "not_contains";
    value: string;
  }>;
  isActive: boolean;
  notificationSettings: {
    sendEmail: boolean;
    emailTemplate?: string;
    webhookUrl?: string;
  };
  executionStats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    lastExecuted?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TherapistOnboarding {
  id: string;
  therapistId: string;
  therapistName: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  stripeAccountId?: string;
  prefillData: {
    email: string;
    firstName: string;
    lastName: string;
    businessProfile: {
      name: string;
      productDescription: string;
      supportEmail: string;
      url?: string;
    };
    address: {
      line1: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  onboardingUrl?: string;
  autoSubmit: boolean;
  followUpDays: number;
  followUpSent: boolean;
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export default function StripeConnectPrefill() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("automations");
  const [showNewAutomation, setShowNewAutomation] = useState(false);
  const [showNewOnboarding, setShowNewOnboarding] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<StripeConnectAutomation | null>(
    null
  );
  const [selectedOnboarding, setSelectedOnboarding] = useState<TherapistOnboarding | null>(null);

  // Admin-only access control
  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-amber-600">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Stripe Connect automation and prefill system is restricted to admin users only.
            </p>
            <p className="text-sm text-gray-500">
              This system manages automated therapist onboarding and payment account setup.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forms
  const automationForm = useForm<z.infer<typeof stripeConnectAutomationSchema>>({
    resolver: zodResolver(stripeConnectAutomationSchema),
    defaultValues: {
      ruleName: "",
      trigger: "therapist_application",
      prefillData: {
        businessType: "individual",
        country: "GB",
        currency: "GBP",
        accountType: "express",
        capabilities: ["card_payments", "transfers"],
        settings: {
          payouts: {
            schedule: {
              interval: "weekly",
            },
            debitNegativeBalances: true,
          },
          cardPayments: {
            requestThreeDSecure: "automatic",
          },
        },
      },
      conditions: [],
      isActive: true,
      notificationSettings: {
        sendEmail: true,
      },
    },
  });

  const onboardingForm = useForm<z.infer<typeof therapistOnboardingSchema>>({
    resolver: zodResolver(therapistOnboardingSchema),
    defaultValues: {
      therapistId: "",
      prefillData: {
        email: "",
        firstName: "",
        lastName: "",
        businessType: "individual",
        businessProfile: {
          name: "",
          productDescription: "Professional therapy services",
          supportEmail: "",
        },
        address: {
          line1: "",
          city: "",
          state: "",
          postalCode: "",
          country: "GB",
        },
        dateOfBirth: {
          day: 1,
          month: 1,
          year: 1990,
        },
      },
      autoSubmit: false,
      followUpDays: 7,
    },
  });

  // Queries
  const { data: automations = [], isLoading: automationsLoading } = useQuery({
    queryKey: ["/api/stripe-connect/automations"],
    retry: false,
  });

  const { data: onboardings = [], isLoading: onboardingsLoading } = useQuery({
    queryKey: ["/api/stripe-connect/onboardings"],
    retry: false,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/stripe-connect/analytics"],
    retry: false,
  });

  // Mutations
  const createAutomationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof stripeConnectAutomationSchema>) => {
      return apiRequest("POST", "/api/stripe-connect/automations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe-connect/automations"] });
      setShowNewAutomation(false);
      automationForm.reset();
      toast({
        title: "Automation Created",
        description: "Stripe Connect automation rule has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create automation rule.",
        variant: "destructive",
      });
    },
  });

  const createOnboardingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof therapistOnboardingSchema>) => {
      return apiRequest("POST", "/api/stripe-connect/onboardings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe-connect/onboardings"] });
      setShowNewOnboarding(false);
      onboardingForm.reset();
      toast({
        title: "Onboarding Created",
        description: "Therapist onboarding has been initiated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create onboarding.",
        variant: "destructive",
      });
    },
  });

  const toggleAutomationMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/stripe-connect/automations/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe-connect/automations"] });
      toast({
        title: "Automation Updated",
        description: "Automation rule status has been updated.",
      });
    },
  });

  // Demo data
  const demoAutomations: StripeConnectAutomation[] = [
    {
      id: "1",
      ruleName: "Auto-Setup New Therapists",
      trigger: "therapist_application",
      prefillData: {
        businessType: "individual",
        country: "GB",
        currency: "GBP",
        accountType: "express",
        capabilities: ["card_payments", "transfers"],
        settings: {
          payouts: {
            schedule: {
              interval: "weekly",
            },
            debitNegativeBalances: true,
          },
          cardPayments: {
            requestThreeDSecure: "automatic",
          },
        },
      },
      conditions: [
        { field: "qualification", operator: "contains", value: "licensed" },
        { field: "experience", operator: "not_equals", value: "0" },
      ],
      isActive: true,
      notificationSettings: {
        sendEmail: true,
        emailTemplate: "welcome-stripe-setup",
      },
      executionStats: {
        totalExecutions: 23,
        successfulExecutions: 21,
        failedExecutions: 2,
        lastExecuted: "2025-07-09T10:30:00Z",
      },
      createdAt: "2025-06-01T10:00:00Z",
      updatedAt: "2025-07-09T10:30:00Z",
    },
    {
      id: "2",
      ruleName: "Profile Completion Follow-up",
      trigger: "profile_completion",
      prefillData: {
        businessType: "individual",
        country: "GB",
        currency: "GBP",
        accountType: "express",
        capabilities: ["card_payments", "transfers"],
        settings: {
          payouts: {
            schedule: {
              interval: "monthly",
              monthlyAnchor: 1,
            },
            debitNegativeBalances: true,
          },
          cardPayments: {
            requestThreeDSecure: "automatic",
            statementDescriptorPrefix: "HIVE",
          },
        },
      },
      conditions: [
        { field: "stripe_account_id", operator: "equals", value: "" },
        { field: "profile_completion", operator: "equals", value: "100" },
      ],
      isActive: true,
      notificationSettings: {
        sendEmail: true,
        emailTemplate: "stripe-setup-reminder",
      },
      executionStats: {
        totalExecutions: 15,
        successfulExecutions: 14,
        failedExecutions: 1,
        lastExecuted: "2025-07-08T14:15:00Z",
      },
      createdAt: "2025-05-15T14:00:00Z",
      updatedAt: "2025-07-08T14:15:00Z",
    },
  ];

  const demoOnboardings: TherapistOnboarding[] = [
    {
      id: "1",
      therapistId: "therapist-001",
      therapistName: "Dr. Sarah Johnson",
      status: "completed",
      stripeAccountId: "acct_1234567890",
      prefillData: {
        email: "sarah.johnson@example.com",
        firstName: "Sarah",
        lastName: "Johnson",
        businessProfile: {
          name: "Dr. Sarah Johnson Therapy",
          productDescription:
            "Professional therapy services specialising in anxiety and depression",
          supportEmail: "sarah.johnson@example.com",
          url: "https://sarahjohnsontherapy.com",
        },
        address: {
          line1: "123 Harley Street",
          city: "London",
          state: "England",
          postalCode: "W1G 6AB",
          country: "GB",
        },
      },
      onboardingUrl:
        "https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_123&state=st_123",
      autoSubmit: false,
      followUpDays: 7,
      followUpSent: true,
      completionPercentage: 100,
      createdAt: "2025-07-01T09:00:00Z",
      updatedAt: "2025-07-05T14:30:00Z",
    },
    {
      id: "2",
      therapistId: "therapist-002",
      therapistName: "Dr. Michael Chen",
      status: "in_progress",
      prefillData: {
        email: "michael.chen@example.com",
        firstName: "Michael",
        lastName: "Chen",
        businessProfile: {
          name: "Dr. Michael Chen Counselling",
          productDescription: "Professional counselling services for individuals and couples",
          supportEmail: "michael.chen@example.com",
        },
        address: {
          line1: "456 Baker Street",
          city: "London",
          state: "England",
          postalCode: "NW1 6XE",
          country: "GB",
        },
      },
      onboardingUrl:
        "https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_456&state=st_456",
      autoSubmit: false,
      followUpDays: 7,
      followUpSent: false,
      completionPercentage: 65,
      createdAt: "2025-07-07T11:00:00Z",
      updatedAt: "2025-07-09T09:15:00Z",
    },
  ];

  const displayAutomations = automations.length > 0 ? automations : demoAutomations;
  const displayOnboardings = onboardings.length > 0 ? onboardings : demoOnboardings;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stripe Connect Automation</h1>
          <p className="text-gray-600">Automated therapist onboarding and payment account setup</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowNewAutomation(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Automation
          </Button>
          <Button onClick={() => setShowNewOnboarding(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Manual Onboarding
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Automations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {displayAutomations.filter((a) => a.isActive).length}
            </div>
            <p className="text-xs text-green-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              100% operational
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Onboardings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{displayOnboardings.length}</div>
            <p className="text-xs text-green-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />2 this week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">92%</div>
            <p className="text-xs text-green-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              Above target
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg. Setup Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">2.3 days</div>
            <p className="text-xs text-green-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              20% faster
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="onboardings">Onboardings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="automations" className="space-y-4">
          <div className="grid gap-4">
            {displayAutomations.map((automation) => (
              <Card key={automation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Bot className="w-5 h-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-900">{automation.ruleName}</h3>
                        <Badge variant="outline">{automation.trigger}</Badge>
                        <Badge variant={automation.isActive ? "default" : "secondary"}>
                          {automation.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                        <span>Executions: {automation.executionStats.totalExecutions}</span>
                        <span>Success: {automation.executionStats.successfulExecutions}</span>
                        <span>Failed: {automation.executionStats.failedExecutions}</span>
                        <span>
                          Last:{" "}
                          {automation.executionStats.lastExecuted
                            ? new Date(automation.executionStats.lastExecuted).toLocaleDateString()
                            : "Never"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={
                            (automation.executionStats.successfulExecutions /
                              automation.executionStats.totalExecutions) *
                            100
                          }
                          className="w-24 h-2"
                        />
                        <span className="text-sm text-gray-500">
                          {Math.round(
                            (automation.executionStats.successfulExecutions /
                              automation.executionStats.totalExecutions) *
                              100
                          )}
                          % success rate
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={automation.isActive}
                        onCheckedChange={(checked) =>
                          toggleAutomationMutation.mutate({ id: automation.id, isActive: checked })
                        }
                      />
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="onboardings" className="space-y-4">
          <div className="grid gap-4">
            {displayOnboardings.map((onboarding) => (
              <Card key={onboarding.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Users className="w-5 h-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-900">{onboarding.therapistName}</h3>
                        <Badge
                          variant={
                            onboarding.status === "completed"
                              ? "default"
                              : onboarding.status === "in_progress"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {onboarding.status}
                        </Badge>
                        {onboarding.stripeAccountId && (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Stripe Connected
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                        <span>Progress: {onboarding.completionPercentage}%</span>
                        <span>Follow-up: {onboarding.followUpDays} days</span>
                        <span>Created: {new Date(onboarding.createdAt).toLocaleDateString()}</span>
                        {onboarding.followUpSent && (
                          <span className="text-green-600">Follow-up sent</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={onboarding.completionPercentage} className="w-32 h-2" />
                        <span className="text-sm text-gray-500">
                          {onboarding.completionPercentage}% complete
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {onboarding.status === "in_progress" && (
                        <Button size="sm" variant="outline" className="text-blue-600">
                          <Play className="w-4 h-4 mr-1" />
                          Resume
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Automation Performance</CardTitle>
                <CardDescription>Success rates and execution statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Success Rate</span>
                    <span className="text-2xl font-bold text-green-600">92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Total Executions</div>
                      <div className="text-xl font-semibold">38</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Avg. Setup Time</div>
                      <div className="text-xl font-semibold">2.3 days</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Onboarding Status</CardTitle>
                <CardDescription>Current status of all onboarding processes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Completed</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-2 bg-green-500 rounded" />
                      <span className="text-sm font-medium">1</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">In Progress</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-2 bg-yellow-500 rounded" />
                      <span className="text-sm font-medium">1</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pending</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-2 bg-gray-300 rounded" />
                      <span className="text-sm font-medium">0</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Automation Dialog */}
      <Dialog open={showNewAutomation} onOpenChange={setShowNewAutomation}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create New Automation</DialogTitle>
            <DialogDescription>
              Set up automated Stripe Connect account creation for therapists.
            </DialogDescription>
          </DialogHeader>
          <Form {...automationForm}>
            <form
              onSubmit={automationForm.handleSubmit((data) =>
                createAutomationMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={automationForm.control}
                  name="ruleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rule Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Auto-setup new therapists" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={automationForm.control}
                  name="trigger"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trigger</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trigger" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="therapist_application">
                              Therapist Application
                            </SelectItem>
                            <SelectItem value="profile_completion">Profile Completion</SelectItem>
                            <SelectItem value="manual_trigger">Manual Trigger</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={automationForm.control}
                  name="prefillData.businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Type</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="individual">Individual</SelectItem>
                            <SelectItem value="company">Company</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={automationForm.control}
                  name="prefillData.country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GB">United Kingdom</SelectItem>
                            <SelectItem value="US">United States</SelectItem>
                            <SelectItem value="CA">Canada</SelectItem>
                            <SelectItem value="AU">Australia</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={automationForm.control}
                  name="prefillData.currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                            <SelectItem value="USD">US Dollar (USD)</SelectItem>
                            <SelectItem value="EUR">Euro (EUR)</SelectItem>
                            <SelectItem value="CAD">Canadian Dollar (CAD)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Notification Settings</Label>
                <div className="flex items-center space-x-2">
                  <FormField
                    control={automationForm.control}
                    name="notificationSettings.sendEmail"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel>Send email notifications</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNewAutomation(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAutomationMutation.isPending}>
                  {createAutomationMutation.isPending ? "Creating..." : "Create Automation"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* New Onboarding Dialog */}
      <Dialog open={showNewOnboarding} onOpenChange={setShowNewOnboarding}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manual Therapist Onboarding</DialogTitle>
            <DialogDescription>
              Manually create a Stripe Connect onboarding for a specific therapist.
            </DialogDescription>
          </DialogHeader>
          <Form {...onboardingForm}>
            <form
              onSubmit={onboardingForm.handleSubmit((data) =>
                createOnboardingMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={onboardingForm.control}
                  name="therapistId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Therapist ID</FormLabel>
                      <FormControl>
                        <Input placeholder="therapist-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={onboardingForm.control}
                  name="followUpDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow-up Days</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="7"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={onboardingForm.control}
                  name="prefillData.firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Sarah" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={onboardingForm.control}
                  name="prefillData.lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Johnson" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={onboardingForm.control}
                  name="prefillData.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="sarah@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex items-center space-x-2">
                  <FormField
                    control={onboardingForm.control}
                    name="autoSubmit"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel>Auto-submit application</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNewOnboarding(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createOnboardingMutation.isPending}>
                  {createOnboardingMutation.isPending ? "Creating..." : "Create Onboarding"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
