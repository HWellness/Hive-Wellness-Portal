import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Home, Calendar, Video, Settings, BarChart, Users, Building, CreditCard, TrendingUp, Shield, Mail, UserPlus, PoundSterling, PieChart } from "lucide-react";
import type { User } from "@shared/schema";

interface SidebarProps {
  user: User;
  services: Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
  }>;
  currentService: string | null;
  onServiceSelect: (serviceId: string) => void;
}

const iconMap = {
  Home,
  Calendar,
  Video,
  CreditCard,
  TrendingUp,
  Settings,
  BarChart,
  Shield,
  Mail,
  UserPlus,
  Users,
  PoundSterling,
  PieChart,
  Building,
};

export default function Sidebar({ user, services, currentService, onServiceSelect }: SidebarProps) {
  return (
    <aside className="w-64 bg-hive-white shadow-lg">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Avatar className="w-12 h-12">
            <AvatarImage 
              src={user.profileImageUrl ? (user.profileImageUrl.startsWith('/objects/') ? user.profileImageUrl : `/objects/${user.profileImageUrl.replace(/^\/+/, '')}`) : undefined} 
              alt={`${user.firstName} ${user.lastName}`}
            />
            <AvatarFallback className="bg-hive-light-blue text-hive-purple">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-hive-black text-sm">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-xs text-gray-600">{user.email}</div>
          </div>
        </div>
        
        {/* Service Navigation */}
        <nav className="space-y-2">
          {services.map((service) => {
            const IconComponent = iconMap[service.icon as keyof typeof iconMap] || Home;
            const isActive = currentService === service.id;
            
            return (
              <Button
                key={service.id}
                onClick={() => onServiceSelect(service.id)}
                variant="ghost"
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <IconComponent className="w-5 h-5" />
                  <span className="font-medium">{service.name}</span>
                </div>
              </Button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
