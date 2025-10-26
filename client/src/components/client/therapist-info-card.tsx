/**
 * Therapist Information Card - Step 45
 * Displays therapist photo, role, and bio in client portal
 * Only visible when client is matched with a therapist
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Briefcase, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface TherapistInfo {
  id: string;
  name: string;
  role: string;
  title: string;
  photo?: string;
  bio: string;
  specializations: string[];
  credentials: string[];
}

export default function TherapistInfoCard() {
  const { user } = useAuth();
  const userId = user?.id;
  
  const { data: therapistInfo, isLoading } = useQuery<TherapistInfo>({
    queryKey: [`/api/client-therapist/${userId}`],
    enabled: !!userId,
  });

  // If not matched or loading, don't show anything
  if (isLoading || !userId) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!therapistInfo) {
    return null; // Not matched yet
  }

  // Get initials for avatar fallback
  const initials = therapistInfo.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="border-hive-purple/20 bg-gradient-to-br from-white to-purple-50/30" data-testid="therapist-info-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-hive-purple">
          <User className="h-5 w-5" />
          Your Therapist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Therapist Photo and Name */}
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-hive-purple/20" data-testid="therapist-avatar">
            <AvatarImage src={therapistInfo.photo} alt={therapistInfo.name} />
            <AvatarFallback className="bg-hive-purple/10 text-hive-purple font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 font-century" data-testid="therapist-name">
              {therapistInfo.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Briefcase className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600" data-testid="therapist-title">{therapistInfo.title || therapistInfo.role}</span>
            </div>
          </div>
        </div>

        {/* Credentials */}
        {therapistInfo.credentials && therapistInfo.credentials.length > 0 && (
          <div className="flex flex-wrap gap-2" data-testid="therapist-credentials">
            {therapistInfo.credentials.map((credential, idx) => (
              <Badge key={idx} variant="outline" className="text-xs" data-testid={`credential-badge-${idx}`}>
                {credential}
              </Badge>
            ))}
          </div>
        )}

        {/* Bio */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <FileText className="h-4 w-4" />
            About
          </div>
          <p className="text-sm text-gray-600 leading-relaxed" data-testid="therapist-bio">
            {therapistInfo.bio || "Your therapist is committed to providing you with professional, compassionate care tailored to your needs."}
          </p>
        </div>

        {/* Specialisations */}
        {therapistInfo.specializations && therapistInfo.specializations.length > 0 && (
          <div className="space-y-2" data-testid="therapist-specializations">
            <div className="text-sm font-medium text-gray-700">Specialisations</div>
            <div className="flex flex-wrap gap-2">
              {therapistInfo.specializations.map((spec, idx) => (
                <Badge 
                  key={idx} 
                  className="bg-hive-purple/10 text-hive-purple border-hive-purple/20 hover:bg-hive-purple/20"
                  data-testid={`specialization-badge-${idx}`}
                >
                  {spec}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
