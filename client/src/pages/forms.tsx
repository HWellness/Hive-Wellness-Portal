import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Mail, Users, Settings, Plus, Eye, User } from "lucide-react";
import GravityForm from "@/components/forms/gravity-forms";

export default function FormsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const gravityForms = [
    {
      id: "lead-capture",
      title: "Lead Capture (Welcome Pack)",
      description:
        "The lead capture form displayed on bottom of homepage for 'Joining the Hive Network'.",
      icon: <Mail className="w-5 h-5" />,
      type: "lead-capture" as const,
      status: "active",
      submissions: 147,
      conversionRate: "12.3%",
    },
    {
      id: "pdf-test",
      title: "PDF Test",
      description: "Testing PDF Contract form with compliance fields",
      icon: <FileText className="w-5 h-5" />,
      type: "pdf-test" as const,
      status: "active",
      submissions: 23,
      conversionRate: "8.7%",
    },
    {
      id: "therapist-matching",
      title: "Therapist Matching Questionnaire",
      description: "16-step comprehensive assessment for AI-powered therapist matching",
      icon: <User className="w-5 h-5" />,
      type: "therapist-matching" as const,
      status: "active",
      submissions: 89,
      conversionRate: "15.2%",
    },
    {
      id: "therapist-onboarding",
      title: "Therapist Onboarding Application",
      description:
        "Comprehensive 6-step onboarding form for new therapists with Stripe Connect integration",
      icon: <Users className="w-5 h-5" />,
      type: "therapist-onboarding" as const,
      status: "active",
      submissions: 34,
      conversionRate: "92.1%",
    },
    {
      id: "university-dsa",
      title: "Universities And DSA",
      description: "Contact form for universities and DSA-related inquiries",
      icon: <Settings className="w-5 h-5" />,
      type: "university-dsa" as const,
      status: "active",
      submissions: 28,
      conversionRate: "22.3%",
    },
    {
      id: "work-with-us",
      title: "Work With Us",
      description: "9-step application form for professionals wanting to join our network",
      icon: <Users className="w-5 h-5" />,
      type: "work-with-us" as const,
      status: "active",
      submissions: 67,
      conversionRate: "28.9%",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-hive-purple border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (selectedForm) {
    const form = gravityForms.find((f) => f.id === selectedForm);
    if (form) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="container mx-auto px-6 py-8 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setSelectedForm(null)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Forms
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{form.title}</h1>
                  <p className="text-gray-600">{form.description}</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">{form.status}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">Total Submissions</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{form.submissions}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">Conversion Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{form.conversionRate}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-gray-600">Status</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-1 capitalize">{form.status}</p>
                </CardContent>
              </Card>
            </div>

            <GravityForm
              formType={form.type}
              title={form.title}
              description={form.description}
              onSuccess={(data) => {
                // Could redirect back to forms list or show success message
              }}
            />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gravity Forms</h1>
            <p className="text-gray-600 mt-1">
              Manage and monitor your form submissions and performance
            </p>
          </div>
          <Button className="bg-hive-purple hover:bg-hive-purple/90">
            <Plus className="w-4 h-4 mr-2" />
            Create New Form
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="card-modern">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-hive-purple" />
                <span className="text-sm text-gray-600">Total Forms</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{gravityForms.length}</p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600">Total Submissions</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {gravityForms.reduce((sum, form) => sum + form.submissions, 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600">Avg. Conversion</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">10.5%</p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-orange-600" />
                <span className="text-sm text-gray-600">Last Submission</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">2 hours ago</p>
            </CardContent>
          </Card>
        </div>

        {/* Forms List */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gravityForms.map((form) => (
              <Card key={form.id} className="card-modern hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-hive-light-blue rounded-lg flex items-center justify-center text-hive-purple">
                        {form.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{form.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{form.description}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">{form.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Submissions</p>
                      <p className="text-xl font-semibold text-gray-900">{form.submissions}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Conversion Rate</p>
                      <p className="text-xl font-semibold text-gray-900">{form.conversionRate}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        if (form.id === "therapist-onboarding") {
                          setLocation("/therapist-onboarding");
                        } else {
                          setSelectedForm(form.id);
                        }
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Note for non-authenticated users */}
        {!isAuthenticated && (
          <Card className="mt-8 border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Mail className="w-6 h-6 text-orange-600" />
                <div>
                  <h3 className="font-semibold text-orange-900">Public Access</h3>
                  <p className="text-orange-700 mt-1">
                    You can preview and submit forms without logging in. Form submissions are saved
                    and can be managed by administrators.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
