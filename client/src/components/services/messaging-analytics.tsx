import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { 
  MessageSquare, 
  Mail, 
  Smartphone, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MessagingStats {
  sms: {
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
    totalCost: number;
  };
  whatsapp: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
  email: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    spam: number;
  };
  total: {
    messages: number;
    users: number;
    campaigns: number;
    automationRules: number;
  };
}

interface MessageActivity {
  id: string;
  type: 'sms' | 'whatsapp' | 'email';
  recipient: string;
  subject?: string;
  content: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending' | 'opened';
  timestamp: string;
  campaign?: string;
  cost?: number;
}

interface MessagingAnalyticsProps {
  user?: User;
}

export default function MessagingAnalytics({ user }: MessagingAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [selectedType, setSelectedType] = useState("all");

  // Admin-only access control
  const isAdmin = user?.role === 'admin';
  
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Messaging analytics dashboard is restricted to admin users only.
            </p>
            <p className="text-sm text-gray-500">
              This dashboard contains sensitive communication metrics and user data.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Production reset - all analytics start at zero
  const mockStats: MessagingStats = {
    sms: {
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      totalCost: 0.00
    },
    whatsapp: {
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0
    },
    email: {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      spam: 0
    },
    total: {
      messages: 0,
      users: 0,
      campaigns: 0,
      automationRules: 0
    }
  };

  const mockActivity: MessageActivity[] = [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'sent':
        return 'bg-green-500';
      case 'read':
      case 'opened':
        return 'bg-blue-500';
      case 'failed':
      case 'bounced':
      case 'spam':
        return 'bg-red-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sms':
        return <Smartphone className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messaging Analytics</h1>
          <p className="text-gray-600">Monitor SMS, WhatsApp, and email communications</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.total.messages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +0% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.total.users.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +0% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SMS Cost</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{mockStats.sms.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {mockStats.sms.sent} messages sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground">
              Across all channels
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SMS Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Smartphone className="h-5 w-5 mr-2 text-blue-600" />
                  SMS Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sent</span>
                  <span className="font-semibold">{mockStats.sms.sent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Delivered</span>
                  <span className="font-semibold text-green-600">{mockStats.sms.delivered}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Failed</span>
                  <span className="font-semibold text-red-600">{mockStats.sms.failed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="font-semibold text-yellow-600">{mockStats.sms.pending}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total Cost</span>
                    <span className="font-bold">£{mockStats.sms.totalCost.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
                  WhatsApp Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sent</span>
                  <span className="font-semibold">{mockStats.whatsapp.sent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Delivered</span>
                  <span className="font-semibold text-green-600">{mockStats.whatsapp.delivered}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Read</span>
                  <span className="font-semibold text-blue-600">{mockStats.whatsapp.read}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Failed</span>
                  <span className="font-semibold text-red-600">{mockStats.whatsapp.failed}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Read Rate</span>
                    <span className="font-bold">{((mockStats.whatsapp.read / mockStats.whatsapp.delivered) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-purple-600" />
                  Email Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sent</span>
                  <span className="font-semibold">{mockStats.email.sent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Delivered</span>
                  <span className="font-semibold text-green-600">{mockStats.email.delivered}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Opened</span>
                  <span className="font-semibold text-blue-600">{mockStats.email.opened}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Clicked</span>
                  <span className="font-semibold text-purple-600">{mockStats.email.clicked}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Open Rate</span>
                    <span className="font-bold">{((mockStats.email.opened / mockStats.email.delivered) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Message Activity</CardTitle>
              <CardDescription>Latest messaging activity across all channels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockActivity.length > 0 ? (
                  mockActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        {getTypeIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.recipient}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Badge variant={activity.status === 'failed' ? 'destructive' : 'secondary'}>
                              {activity.status}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(activity.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {activity.subject && (
                          <p className="text-sm text-gray-600 font-medium mt-1">
                            {activity.subject}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 mt-1 truncate">
                          {activity.content}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="capitalize">{activity.type}</span>
                            {activity.campaign && <span>Campaign: {activity.campaign}</span>}
                            {activity.cost && <span>Cost: £{activity.cost.toFixed(2)}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No messaging activity yet</p>
                    <p className="text-sm text-gray-400">Messages sent through the platform will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Additional tabs for SMS, WhatsApp, Email would have detailed charts and metrics */}
        <TabsContent value="sms">
          <Card>
            <CardHeader>
              <CardTitle>SMS Analytics Dashboard</CardTitle>
              <CardDescription>Detailed SMS messaging statistics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Detailed SMS analytics charts would be displayed here</p>
                <p className="text-sm text-gray-400 mt-2">Including delivery rates, cost analysis, and usage trends</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Analytics Dashboard</CardTitle>
              <CardDescription>Detailed WhatsApp messaging statistics and engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Detailed WhatsApp analytics charts would be displayed here</p>
                <p className="text-sm text-gray-400 mt-2">Including read rates, response times, and user engagement</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Email Analytics Dashboard</CardTitle>
              <CardDescription>Detailed email campaign and automation statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Detailed email analytics charts would be displayed here</p>
                <p className="text-sm text-gray-400 mt-2">Including open rates, click-through rates, and campaign performance</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}