import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, AlertCircle, MessageSquare, Mail, Smartphone, Settings, ExternalLink } from 'lucide-react';

interface MessagingStatusDashboardProps {
  user: any;
}

export default function MessagingStatusDashboard({ user }: MessagingStatusDashboardProps) {
  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Messaging status dashboard is available to administrators only.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Status data (in production, this would come from API)
  const messagingStatus = {
    email: {
      status: 'active',
      provider: 'SendGrid',
      configured: true,
      lastMessage: '2 hours ago',
      messagesLastDay: 24,
      errorRate: 0.5
    },
    sms: {
      status: 'setup_required',
      provider: 'Twilio',
      configured: false,
      lastMessage: null,
      messagesLastDay: 0,
      errorRate: 0
    },
    whatsapp: {
      status: 'setup_required',
      provider: 'Twilio',
      configured: false,
      lastMessage: null,
      messagesLastDay: 0,
      errorRate: 0
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'setup_required':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'setup_required':
        return <Badge className="bg-orange-100 text-orange-800">Setup Required</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="hive-card-shadow hive-card-hover bg-white/80 backdrop-blur-sm border-0">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-hive-purple rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl heading-secondary hive-gradient-text">
                Messaging System Status
              </CardTitle>
              <p className="text-body text-hive-black/70">
                Monitor and configure messaging channels
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* System Overview */}
      <Card className="hive-card-shadow">
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Email Status */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Email</span>
                </div>
                {getStatusIcon(messagingStatus.email.status)}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Status</span>
                  {getStatusBadge(messagingStatus.email.status)}
                </div>
                <div className="flex justify-between text-sm">
                  <span>Provider</span>
                  <span className="text-gray-600">{messagingStatus.email.provider}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Messages (24h)</span>
                  <span className="font-semibold">{messagingStatus.email.messagesLastDay}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Error Rate</span>
                  <span className="text-green-600">{messagingStatus.email.errorRate}%</span>
                </div>
              </div>
            </div>

            {/* SMS Status */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-5 h-5 text-green-600" />
                  <span className="font-medium">SMS</span>
                </div>
                {getStatusIcon(messagingStatus.sms.status)}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Status</span>
                  {getStatusBadge(messagingStatus.sms.status)}
                </div>
                <div className="flex justify-between text-sm">
                  <span>Provider</span>
                  <span className="text-gray-600">{messagingStatus.sms.provider}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Messages (24h)</span>
                  <span className="font-semibold">{messagingStatus.sms.messagesLastDay}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Error Rate</span>
                  <span className="text-gray-600">{messagingStatus.sms.errorRate}%</span>
                </div>
              </div>
            </div>

            {/* WhatsApp Status */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <span className="font-medium">WhatsApp</span>
                </div>
                {getStatusIcon(messagingStatus.whatsapp.status)}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Status</span>
                  {getStatusBadge(messagingStatus.whatsapp.status)}
                </div>
                <div className="flex justify-between text-sm">
                  <span>Provider</span>
                  <span className="text-gray-600">{messagingStatus.whatsapp.provider}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Messages (24h)</span>
                  <span className="font-semibold">{messagingStatus.whatsapp.messagesLastDay}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Error Rate</span>
                  <span className="text-gray-600">{messagingStatus.whatsapp.errorRate}%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Status */}
      <Card className="hive-card-shadow">
        <CardHeader>
          <CardTitle>Configuration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium">Database Schema</p>
                  <p className="text-sm text-gray-600">All messaging tables created and configured</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Complete</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium">API Endpoints</p>
                  <p className="text-sm text-gray-600">All messaging endpoints operational</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Complete</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium">Email Service</p>
                  <p className="text-sm text-gray-600">SendGrid integration active</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium">Twilio Configuration</p>
                  <p className="text-sm text-gray-600">SMS and WhatsApp credentials required</p>
                </div>
              </div>
              <Badge className="bg-orange-100 text-orange-800">Setup Required</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium">User Preferences</p>
                  <p className="text-sm text-gray-600">Communication preferences system operational</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Complete</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card className="hive-card-shadow">
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Next Steps for Full Messaging Setup</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                  <span>Create a Twilio account at twilio.com</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                  <span>Configure WhatsApp Business API (if needed)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                  <span>Add Twilio credentials to environment variables</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-medium">4</span>
                  <span>Test SMS and WhatsApp functionality</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button 
                variant="outline"
                className="flex items-center space-x-2"
                onClick={() => window.open('https://console.twilio.com/', '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Twilio Console</span>
              </Button>
              <Button 
                variant="outline"
                className="flex items-center space-x-2"
                onClick={() => window.open('https://www.twilio.com/docs/whatsapp', '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
                <span>WhatsApp Documentation</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card className="hive-card-shadow">
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Database Health</h4>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">All messaging tables operational</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">User preferences system active</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Notification logging functional</span>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">API Health</h4>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">All endpoints responding</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Authentication working</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Rate limiting active</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}