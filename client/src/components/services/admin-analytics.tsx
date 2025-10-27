import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  Users,
  MessageSquare,
  Calendar,
  PoundSterling,
  Activity,
  ArrowUp,
  ArrowDown,
  Download,
  Filter,
  RefreshCw,
} from "lucide-react";
import type { User } from "@shared/schema";

interface AdminAnalyticsProps {
  user: User;
}

export default function AdminAnalytics({ user }: AdminAnalyticsProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("30d");
  const [selectedMetric, setSelectedMetric] = useState("all");

  // Demo analytics data
  const userGrowthData = [
    { month: "Jan", clients: 0, therapists: 0, institutions: 0 },
    { month: "Feb", clients: 0, therapists: 0, institutions: 0 },
    { month: "Mar", clients: 0, therapists: 0, institutions: 0 },
    { month: "Apr", clients: 0, therapists: 0, institutions: 0 },
    { month: "May", clients: 0, therapists: 0, institutions: 0 },
    { month: "Jun", clients: 0, therapists: 0, institutions: 0 },
  ];

  const sessionData = [
    { day: "Mon", sessions: 0, revenue: 0 },
    { day: "Tue", sessions: 0, revenue: 0 },
    { day: "Wed", sessions: 0, revenue: 0 },
    { day: "Thu", sessions: 0, revenue: 0 },
    { day: "Fri", sessions: 0, revenue: 0 },
    { day: "Sat", sessions: 0, revenue: 0 },
    { day: "Sun", sessions: 0, revenue: 0 },
  ];

  const userTypeData = [
    { name: "Individual Clients", value: 0, color: "#9306B1" },
    { name: "Institutional Clients", value: 0, color: "#B855E0" },
    { name: "Therapists", value: 0, color: "#7C3AED" },
    { name: "Admins", value: 0, color: "#5B21B6" },
  ];

  const revenueData = [
    { month: "Jan", revenue: 0, costs: 0, profit: 0 },
    { month: "Feb", revenue: 0, costs: 0, profit: 0 },
    { month: "Mar", revenue: 0, costs: 0, profit: 0 },
    { month: "Apr", revenue: 0, costs: 0, profit: 0 },
    { month: "May", revenue: 0, costs: 0, profit: 0 },
    { month: "Jun", revenue: 0, costs: 0, profit: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-hive-black">Platform Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics</p>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button className="bg-hive-purple hover:bg-hive-purple/90 text-white">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-hive-black">0</p>
                <p className="text-sm text-gray-600">Total Users</p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-gray-500">+0%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-hive-black">0</p>
                <p className="text-sm text-gray-600">Sessions This Month</p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-gray-500">+0%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-hive-light-blue rounded-lg">
                <PoundSterling className="h-6 w-6 text-hive-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-hive-black">£0</p>
                <p className="text-sm text-gray-600">Revenue This Month</p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-gray-500">+0%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-hive-black">0%</p>
                <p className="text-sm text-gray-600">System Uptime</p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-gray-500">+0%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger
            value="users"
            className="data-[state=active]:bg-hive-purple data-[state=active]:text-white"
          >
            User Growth
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            className="data-[state=active]:bg-hive-purple data-[state=active]:text-white"
          >
            Session Analytics
          </TabsTrigger>
          <TabsTrigger
            value="revenue"
            className="data-[state=active]:bg-hive-purple data-[state=active]:text-white"
          >
            Revenue & Profit
          </TabsTrigger>
          <TabsTrigger
            value="demographics"
            className="data-[state=active]:bg-hive-purple data-[state=active]:text-white"
          >
            User Demographics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Growth Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="clients"
                      stackId="1"
                      stroke="#9306B1"
                      fill="#9306B1"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="therapists"
                      stackId="1"
                      stroke="#7C3AED"
                      fill="#7C3AED"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="institutions"
                      stackId="1"
                      stroke="#5B21B6"
                      fill="#5B21B6"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Session Volume & Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sessionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="sessions" fill="#9306B1" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#7C3AED"
                      strokeWidth={3}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue, Costs & Profit Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`£${value}`, ""]} />
                    <Line type="monotone" dataKey="revenue" stroke="#9306B1" strokeWidth={3} />
                    <Line type="monotone" dataKey="costs" stroke="#EF4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {userTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Active Users (30 days)</span>
                    <span className="text-sm text-gray-600">0 (0%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-hive-purple h-2 rounded-full" style={{ width: "0%" }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Session Completion Rate</span>
                    <span className="text-sm text-gray-600">0%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: "0%" }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Therapist Utilisation</span>
                    <span className="text-sm text-gray-600">0%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: "0%" }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Client Retention (6 months)</span>
                    <span className="text-sm text-gray-600">0%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: "0%" }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Platform Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center py-8">
              <p className="text-gray-500">No recent activity</p>
              <p className="text-sm text-gray-400">
                Platform activity will appear here once users start engaging
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
