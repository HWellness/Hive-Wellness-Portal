import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Clock,
  PoundSterling,
  Activity,
  FileText,
  AlertTriangle,
  Download,
  Filter,
  BarChart3,
  Shield
} from "lucide-react";
import type { User } from "@shared/schema";

interface ReportingEngineProps {
  user: User;
}

export default function ReportingEngine({ user }: ReportingEngineProps) {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("30");
  const [selectedTherapist, setSelectedTherapist] = useState("all");
  const [reportType, setReportType] = useState("overview");

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - parseInt(dateRange));

  // Fetch system metrics
  const { data: systemMetrics, isLoading: systemLoading } = useQuery({
    queryKey: ['/api/reports/system', startDate.toISOString(), endDate.toISOString()],
    enabled: user.role === 'admin',
  });

  // Fetch therapist metrics (for admin or specific therapist)
  const { data: therapistMetrics, isLoading: therapistLoading } = useQuery({
    queryKey: ['/api/reports/therapist', user.role === 'therapist' ? user.id : selectedTherapist, startDate.toISOString(), endDate.toISOString()],
    enabled: user.role === 'admin' || user.role === 'therapist',
  });

  // Demo data for charts (in real implementation, this would come from API)
  const sessionTrendsData = [
    { date: '2025-01-01', sessions: 12, completed: 11, cancelled: 1 },
    { date: '2025-01-02', sessions: 15, completed: 14, cancelled: 1 },
    { date: '2025-01-03', sessions: 18, completed: 16, cancelled: 2 },
    { date: '2025-01-04', sessions: 14, completed: 13, cancelled: 1 },
    { date: '2025-01-05', sessions: 20, completed: 18, cancelled: 2 },
    { date: '2025-01-06', sessions: 16, completed: 15, cancelled: 1 },
    { date: '2025-01-07', sessions: 22, completed: 20, cancelled: 2 },
  ];

  const clientEngagementData = [
    { name: 'High', value: 65, color: '#10B981' },
    { name: 'Moderate', value: 28, color: '#F59E0B' },
    { name: 'Low', value: 7, color: '#EF4444' },
  ];

  const therapistPerformanceData = [
    { name: 'Dr. Johnson', sessions: 45, rating: 9.2, attendance: 95 },
    { name: 'Dr. Chen', sessions: 38, rating: 8.9, attendance: 92 },
    { name: 'Dr. Rodriguez', sessions: 42, rating: 9.4, attendance: 97 },
    { name: 'Dr. Williams', sessions: 35, rating: 8.7, attendance: 89 },
    { name: 'Dr. Brown', sessions: 40, rating: 9.1, attendance: 94 },
  ];

  const progressRatingData = [
    { week: 'Week 1', rating: 4.2 },
    { week: 'Week 2', rating: 5.1 },
    { week: 'Week 3', rating: 5.8 },
    { week: 'Week 4', rating: 6.4 },
    { week: 'Week 5', rating: 7.1 },
    { week: 'Week 6', rating: 7.6 },
    { week: 'Week 7', rating: 8.2 },
    { week: 'Week 8', rating: 8.7 },
  ];

  const MetricCard = ({ title, value, change, icon: Icon, trend }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {change && (
          <div className={`text-xs flex items-center mt-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3 mr-1" />
            ) : (
              <TrendingDown className="w-3 h-3 mr-1" />
            )}
            {change}% from last period
          </div>
        )}
      </CardContent>
    </Card>
  );

  const generateReport = () => {
    // Generate and download a comprehensive report
    const reportData = {
      reportType,
      dateRange,
      selectedTherapist,
      generatedAt: new Date().toISOString(),
      metrics: {
        totalSessions: sessionTrendsData.reduce((sum, day) => sum + day.sessions, 0),
        completedSessions: sessionTrendsData.reduce((sum, day) => sum + day.completed, 0),
        cancelledSessions: sessionTrendsData.reduce((sum, day) => sum + day.cancelled, 0),
        averageRating: 8.5,
        clientEngagement: clientEngagementData,
        therapistPerformance: therapistPerformanceData,
        progressRatings: progressRatingData,
      }
    };
    
    // Create CSV header with proper escaping
    const csvHeader = "Hive Wellness Therapy Platform Report\n";
    const csvMeta = `Generated,${new Date().toLocaleDateString()}\n` +
                   `Report Type,${reportType.replace(/,/g, ';')}\n` +
                   `Date Range,${dateRange} days\n\n`;
    
    // Create CSV data with proper formatting
    const csvData = `Metric,Value\n` +
                   `Total Sessions,${reportData.metrics.totalSessions}\n` +
                   `Completed Sessions,${reportData.metrics.completedSessions}\n` +
                   `Cancelled Sessions,${reportData.metrics.cancelledSessions}\n` +
                   `Average Rating,${reportData.metrics.averageRating}/10\n\n` +
                   `Therapist Performance\n` +
                   `Name,Sessions,Rating\n` +
                   therapistPerformanceData.map(t => 
                     `"${t.name.replace(/"/g, '""')}",${t.sessions},${t.rating}/10`
                   ).join('\n');
    
    const csvContent = csvHeader + csvMeta + csvData;
    
    // Create blob with explicit CSV MIME type and charset
    const blob = new Blob([csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    // Generate filename with timestamp for uniqueness
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `hive-wellness-report-${timestamp}.csv`;
    
    // Create download link with security attributes
    const url = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    downloadLink.style.display = 'none';
    downloadLink.setAttribute('rel', 'noopener');
    downloadLink.setAttribute('target', '_self');
    
    // Perform download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Clean up immediately
    setTimeout(() => {
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(url);
    }, 100);
    
    toast({
      title: "Report Generated Successfully",
      description: `Report "${filename}" has been downloaded safely.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Reporting & Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights into therapy practice performance and client outcomes
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={generateReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Label htmlFor="dateRange">Date Range:</Label>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {user.role === 'admin' && (
          <div className="flex items-center space-x-2">
            <Label htmlFor="therapist">Therapist:</Label>
            <Select value={selectedTherapist} onValueChange={setSelectedTherapist}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Therapists</SelectItem>
                <SelectItem value="therapist-1">Dr. Sarah Johnson</SelectItem>
                <SelectItem value="therapist-2">Dr. Michael Chen</SelectItem>
                <SelectItem value="therapist-3">Dr. Emma Rodriguez</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <Label htmlFor="reportType">Report Type:</Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="clinical">Clinical Outcomes</SelectItem>
              <SelectItem value="business">Business Metrics</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={reportType} onValueChange={setReportType} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Sessions"
              value={systemMetrics?.totalAppointments || "124"}
              change="12"
              trend="up"
              icon={Calendar}
            />
            <MetricCard
              title="Active Clients"
              value={systemMetrics?.activeClients || "89"}
              change="8"
              trend="up"
              icon={Users}
            />
            <MetricCard
              title="Completion Rate"
              value="94.2%"
              change="2.1"
              trend="up"
              icon={TrendingUp}
            />
            <MetricCard
              title="Avg Session Duration"
              value="48 min"
              change="1.5"
              trend="up"
              icon={Clock}
            />
          </div>

          {/* Session Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Session Trends</CardTitle>
              <CardDescription>Daily session statistics over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={sessionTrendsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stackId="1"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="cancelled"
                    stackId="1"
                    stroke="#EF4444"
                    fill="#EF4444"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Client Engagement Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Engagement Levels</CardTitle>
                <CardDescription>Distribution of client engagement during sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={clientEngagementData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {clientEngagementData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center mt-4 space-x-4">
                  {clientEngagementData.map((entry, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                      <span className="text-sm text-gray-600">{entry.name}: {entry.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Therapist Performance</CardTitle>
                <CardDescription>Session count and ratings by therapist</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={therapistPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sessions" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clinical" className="space-y-6">
          {/* Clinical Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Avg Progress Rating"
              value="7.8/10"
              change="5.2"
              trend="up"
              icon={TrendingUp}
            />
            <MetricCard
              title="Therapy Goals Met"
              value="87%"
              change="3.1"
              trend="up"
              icon={Activity}
            />
            <MetricCard
              title="Risk Assessments"
              value="23"
              change="12"
              trend="up"
              icon={AlertTriangle}
            />
            <MetricCard
              title="Session Notes"
              value="156"
              change="8"
              trend="up"
              icon={FileText}
            />
          </div>

          {/* Progress Rating Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Client Progress Over Time</CardTitle>
              <CardDescription>Average progress ratings across all clients</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressRatingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="rating"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Clinical Outcomes Table */}
          <Card>
            <CardHeader>
              <CardTitle>Therapeutic Interventions Effectiveness</CardTitle>
              <CardDescription>Success rates by intervention type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { intervention: "Cognitive Behavioural Therapy", sessions: 45, success: 89, improvement: 7.2 },
                  { intervention: "Mindfulness-Based Therapy", sessions: 32, success: 85, improvement: 6.8 },
                  { intervention: "Exposure Therapy", sessions: 28, success: 82, improvement: 6.5 },
                  { intervention: "Family Therapy", sessions: 24, success: 79, improvement: 6.1 },
                  { intervention: "EMDR", sessions: 18, success: 91, improvement: 7.8 },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.intervention}</div>
                      <div className="text-sm text-gray-600">{item.sessions} sessions</div>
                    </div>
                    <div className="flex space-x-6 text-right">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.success}%</div>
                        <div className="text-xs text-gray-600">Success Rate</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.improvement}/10</div>
                        <div className="text-xs text-gray-600">Avg Improvement</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          {/* Business Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Monthly Revenue"
              value="£12,450"
              change="15.3"
              trend="up"
              icon={PoundSterling}
            />
            <MetricCard
              title="Utilization Rate"
              value="78%"
              change="4.2"
              trend="up"
              icon={BarChart3}
            />
            <MetricCard
              title="No-Show Rate"
              value="8.2%"
              change="2.1"
              trend="down"
              icon={Calendar}
            />
            <MetricCard
              title="Client Retention"
              value="92%"
              change="1.8"
              trend="up"
              icon={Users}
            />
          </div>

          {/* Revenue and Booking Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Monthly revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={[
                    { month: 'Jan', revenue: 8500 },
                    { month: 'Feb', revenue: 9200 },
                    { month: 'Mar', revenue: 10800 },
                    { month: 'Apr', revenue: 11200 },
                    { month: 'May', revenue: 12450 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`£${value}`, 'Revenue']} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Patterns</CardTitle>
                <CardDescription>Sessions by day of week</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { day: 'Mon', sessions: 18 },
                    { day: 'Tue', sessions: 22 },
                    { day: 'Wed', sessions: 25 },
                    { day: 'Thu', sessions: 24 },
                    { day: 'Fri', sessions: 20 },
                    { day: 'Sat', sessions: 8 },
                    { day: 'Sun', sessions: 3 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sessions" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
              <CardDescription>Detailed breakdown of practice financials</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Revenue Streams</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Individual Therapy</span>
                      <span className="font-medium">£8,500</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Video Consultations</span>
                      <span className="font-medium">£2,200</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Assessments</span>
                      <span className="font-medium">£1,750</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Payment Methods</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Insurance</span>
                      <span className="font-medium">68%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Private Pay</span>
                      <span className="font-medium">28%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Employee Assistance</span>
                      <span className="font-medium">4%</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Outstanding</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pending Payments</span>
                      <span className="font-medium text-yellow-600">£1,240</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Overdue</span>
                      <span className="font-medium text-red-600">£380</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Collection Rate</span>
                      <span className="font-medium text-green-600">96.8%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          {/* Compliance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="HIPAA Compliance"
              value="99.2%"
              change="0.3"
              trend="up"
              icon={Shield}
            />
            <MetricCard
              title="Document Retention"
              value="100%"
              change="0"
              trend="up"
              icon={FileText}
            />
            <MetricCard
              title="Access Audits"
              value="245"
              change="12"
              trend="up"
              icon={Activity}
            />
            <MetricCard
              title="Security Incidents"
              value="0"
              change="0"
              trend="up"
              icon={AlertTriangle}
            />
          </div>

          {/* Compliance Status */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Status Overview</CardTitle>
              <CardDescription>Current status of regulatory compliance requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { requirement: "HIPAA Privacy Rule", status: "Compliant", lastAudit: "2025-01-01", nextAudit: "2025-07-01" },
                  { requirement: "Data Protection Act", status: "Compliant", lastAudit: "2024-12-15", nextAudit: "2025-06-15" },
                  { requirement: "Professional Licensing", status: "Compliant", lastAudit: "2024-11-30", nextAudit: "2025-11-30" },
                  { requirement: "Insurance Coverage", status: "Compliant", lastAudit: "2025-01-15", nextAudit: "2026-01-15" },
                  { requirement: "Document Retention", status: "Compliant", lastAudit: "2025-01-10", nextAudit: "2025-04-10" },
                  { requirement: "Access Controls", status: "Review Required", lastAudit: "2024-10-01", nextAudit: "2025-01-01" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.requirement}</div>
                      <div className="text-sm text-gray-600">
                        Last audit: {new Date(item.lastAudit).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge 
                        variant={item.status === 'Compliant' ? 'default' : 'destructive'}
                        className={item.status === 'Compliant' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {item.status}
                      </Badge>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">Next Audit</div>
                        <div className="text-xs text-gray-600">{new Date(item.nextAudit).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Security Audit Log */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Activities</CardTitle>
              <CardDescription>Log of security-related events and access patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { time: "2025-01-05 14:30", user: "Dr. Johnson", action: "Document accessed", resource: "Client #1234 session notes", ip: "192.168.1.100" },
                  { time: "2025-01-05 14:15", user: "Admin", action: "User permissions modified", resource: "Therapist user group", ip: "192.168.1.10" },
                  { time: "2025-01-05 13:45", user: "Dr. Chen", action: "Session notes created", resource: "Appointment #5678", ip: "192.168.1.101" },
                  { time: "2025-01-05 13:30", user: "System", action: "Automated backup", resource: "Full database backup", ip: "Internal" },
                  { time: "2025-01-05 12:00", user: "Dr. Rodriguez", action: "Client data exported", resource: "Progress report #9012", ip: "192.168.1.102" },
                ].map((log, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border-l-4 border-blue-200 bg-blue-50 rounded-r-lg">
                    <div className="flex-1">
                      <div className="font-medium text-blue-900">{log.action}</div>
                      <div className="text-sm text-blue-700">
                        {log.user} • {log.resource}
                      </div>
                    </div>
                    <div className="text-right text-sm text-blue-600">
                      <div>{log.time}</div>
                      <div>{log.ip}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}