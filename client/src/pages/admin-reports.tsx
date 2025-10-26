import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Users, Calendar, Download, FileText, Filter } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ReportData {
  totalClients: number;
  totalTherapists: number;
  totalSessions: number;
  totalRevenue: number;
  monthlyGrowth: number;
  sessionCompletionRate: number;
  averageSessionRating: number;
  popularTherapyTypes: { type: string; count: number }[];
  monthlyStats: { month: string; sessions: number; revenue: number }[];
}

export default function AdminReports() {
  const [timeframe, setTimeframe] = useState<string>('last-30-days');
  const [reportType, setReportType] = useState<string>('overview');

  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['/api/admin/reports', timeframe, reportType],
    queryFn: async () => {
      const response = await fetch(`/api/admin/reports?timeframe=${timeframe}&type=${reportType}`);
      if (!response.ok) {
        throw new Error('Failed to fetch report data');
      }
      return response.json();
    }
  });

  const handleExportReport = (format: 'csv' | 'pdf') => {
    const params = new URLSearchParams({
      timeframe,
      type: reportType,
      format
    });
    
    window.open(`/api/admin/reports/export?${params.toString()}`, '_blank');
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load reports</h3>
          <p className="text-gray-600 mb-4">There was an error loading the report data.</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Default data structure if no data is returned
  const defaultData: ReportData = {
    totalClients: 0,
    totalTherapists: 0,
    totalSessions: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    sessionCompletionRate: 0,
    averageSessionRating: 0,
    popularTherapyTypes: [],
    monthlyStats: []
  };

  const data = reportData || defaultData;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">Comprehensive insights into platform performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-8 w-8 text-purple-600" />
          <Badge variant="secondary" className="text-sm">
            {timeframe.replace('-', ' ')}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Report Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Timeframe</label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                  <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                  <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                  <SelectItem value="all-time">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="sessions">Sessions</SelectItem>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="therapists">Therapists</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end space-x-2">
              <Button
                variant="outline"
                onClick={() => handleExportReport('csv')}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExportReport('pdf')}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Therapists</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalTherapists}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">£{data.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Growth</CardTitle>
            <CardDescription>Percentage change from previous period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className={`text-3xl font-bold ${data.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.monthlyGrowth >= 0 ? '+' : ''}{data.monthlyGrowth.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {data.monthlyGrowth >= 0 ? 'Positive growth' : 'Decline from last period'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session Completion Rate</CardTitle>
            <CardDescription>Percentage of completed sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {data.sessionCompletionRate.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Sessions completed successfully
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Session Rating</CardTitle>
            <CardDescription>Client satisfaction score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {data.averageSessionRating.toFixed(1)}/5
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Average client rating
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Therapy Types */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Therapy Types</CardTitle>
          <CardDescription>Most requested therapy specialisations</CardDescription>
        </CardHeader>
        <CardContent>
          {data.popularTherapyTypes.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No therapy type data available for this period</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.popularTherapyTypes.map((therapy: { type: string; count: number }, index: number) => (
                <div key={therapy.type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="font-medium">{therapy.type}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, (therapy.count / Math.max(...data.popularTherapyTypes.map((t: { count: number }) => t.count))) * 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8">{therapy.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trends</CardTitle>
          <CardDescription>Sessions and revenue over time</CardDescription>
        </CardHeader>
        <CardContent>
          {data.monthlyStats.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No monthly trend data available for this period</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.monthlyStats.map((stat: { month: string; sessions: number; revenue: number }) => (
                <div key={stat.month} className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{stat.month}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Sessions</p>
                    <p className="text-lg font-semibold">{stat.sessions}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Revenue</p>
                    <p className="text-lg font-semibold">£{stat.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}