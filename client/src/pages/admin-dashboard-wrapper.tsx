import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { serviceRegistry } from "@/lib/serviceRegistry";
import ServiceRouter from "@/components/services/service-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Settings, Mail, Zap, Bot, MessageCircle, Users, Shield, BarChart3, 
  Globe, UserCheck, Bell, Calendar, Video, MessageSquare, CreditCard, 
  TrendingUp, Activity, FileText, Cloud
} from "lucide-react";


export default function AdminDashboardWrapper() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  
  // Fetch admin stats
  const { data: statsData = {} } = useQuery({
    queryKey: ['/api/admin/stats'],
    staleTime: 0,
  });
  
  // Check URL parameters for service routing
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const serviceParam = urlParams.get('service');
    if (serviceParam) {
      setSelectedService(serviceParam);
    }
  }, []);

  const handleLogout = async () => {
    try {
      const response = await apiRequest("POST", "/api/auth/logout");
      const data = await response.json();
      
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      
      // Use the redirect path from backend based on user role
      if (data.success && data.redirect) {
        window.location.href = data.redirect;
      } else {
        window.location.href = "/login"; // Default fallback for admins
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API fails - admins go to main login
      window.location.href = "/login";
    }
  };

  const handleServiceNavigation = (serviceId: string) => {
    setSelectedService(serviceId);
  };

  // If a service is selected, render it instead of the dashboard
  if (selectedService) {
    return (
      <ServiceRouter
        user={user as any}
        selectedService={selectedService}
        onBack={() => setSelectedService(null)}
        onNavigateToService={handleServiceNavigation}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-gray-300 border-t-hive-purple rounded-full mx-auto mb-4"></div>
          <div className="text-hive-purple font-century text-2xl font-bold">Loading Admin Dashboard...</div>
        </div>
      </div>
    );
  }

  if (!user || (user as any)?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-primary text-hive-purple mb-4">Access Denied</h1>
          <p className="text-hive-black/70">You need admin access to view this page.</p>
          <Link to="/portal">
            <Button className="mt-4">Return to Portal</Button>
          </Link>
        </div>
      </div>
    );
  }

  const adminServices = serviceRegistry.admin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-purple/10 via-hive-blue/8 to-hive-light-blue/12">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-primary text-hive-purple mb-2">
              Administration Dashboard
            </h1>
            <p className="text-hive-black/70 font-secondary">
              Platform management and oversight - {new Date().toLocaleDateString('en-GB', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-hive-black">Admin: {(user as any).firstName || 'Admin'}</p>
              <p className="text-xs text-hive-black/60">{(user as any).email || 'admin@hive-wellness.co.uk'}</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <Settings className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary text-hive-black">Total Users</p>
                  <p className="text-2xl font-primary font-bold text-hive-purple">{(statsData as any)?.totalUsers || 0}</p>
                </div>
                <Users className="w-8 h-8 text-hive-purple" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary text-hive-black">Active Sessions</p>
                  <p className="text-2xl font-primary font-bold text-hive-purple">{(statsData as any)?.totalAppointments || 0}</p>
                </div>
                <Video className="w-8 h-8 text-hive-purple" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary text-hive-black">System Health</p>
                  <p className="text-2xl font-primary font-bold text-hive-purple">98%</p>
                </div>
                <Activity className="w-8 h-8 text-hive-purple" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary text-hive-black">Revenue</p>
                  <p className="text-2xl font-primary font-bold text-hive-purple">£{(((statsData as any)?.totalAppointments || 0) * 80).toLocaleString()}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-hive-purple" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comprehensive Admin Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2 text-hive-purple" />
              Administration Tools
            </CardTitle>
            <CardDescription>
              Complete platform management and oversight services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
              {adminServices.map((service) => {
                const IconComponent = service.icon === 'Settings' ? Settings :
                  service.icon === 'Mail' ? Mail :
                  service.icon === 'Zap' ? Zap :
                  service.icon === 'Bot' ? Bot :
                  service.icon === 'MessageCircle' ? MessageCircle :
                  service.icon === 'Users' ? Users :
                  service.icon === 'Shield' ? Shield :
                  service.icon === 'BarChart3' ? BarChart3 :
                  service.icon === 'Globe' ? Globe :
                  service.icon === 'UserCheck' ? UserCheck :
                  service.icon === 'Bell' ? Bell :
                  service.icon === 'Calendar' ? Calendar :
                  service.icon === 'Video' ? Video :
                  service.icon === 'MessageSquare' ? MessageSquare :
                  service.icon === 'CreditCard' ? CreditCard :
                  service.icon === 'TrendingUp' ? TrendingUp :
                  service.icon === 'Activity' ? Activity :
                  service.icon === 'FileText' ? FileText :
                  service.icon === 'Cloud' ? Cloud : Settings;

                return (
                  <Button
                    key={service.id}
                    variant="outline"
                    className="admin-service-card h-auto min-h-[120px] flex-col p-4 border-hive-purple/20 hover:bg-hive-purple/5 hover:border-hive-purple text-left justify-start items-center"
                    onClick={() => handleServiceNavigation(service.id)}
                  >
                    <IconComponent className="w-6 h-6 text-hive-purple mb-2 flex-shrink-0" />
                    <span className="admin-service-title font-medium text-sm text-hive-black text-center leading-tight mb-1 break-words">{service.name}</span>
                    <span className="admin-service-description text-xs text-hive-black/60 text-center leading-tight break-words hyphens-auto overflow-hidden line-clamp-3 max-w-full">{service.description}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-hive-purple" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm text-hive-black">New therapist application received</span>
                </div>
                <span className="text-xs text-hive-black/60">2 minutes ago</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-sm text-hive-black">Client-therapist assignment completed</span>
                </div>
                <span className="text-xs text-hive-black/60">15 minutes ago</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  <span className="text-sm text-hive-black">System health check completed</span>
                </div>
                <span className="text-xs text-hive-black/60">1 hour ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}