import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GravityForm from "@/components/forms/gravity-forms";
import type { User } from "@shared/schema";
import { FileText, Mail, Users, Settings, Plus, Eye } from "lucide-react";

interface FormsProps {
  user: User;
}

export default function Forms({ user }: FormsProps) {
  const [selectedForm, setSelectedForm] = useState<string | null>(null);

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
  ];

  const formStats = {
    totalForms: gravityForms.length,
    totalSubmissions: gravityForms.reduce((sum, form) => sum + form.submissions, 0),
    avgConversionRate: "10.5%",
    lastSubmission: "2 hours ago",
  };

  if (selectedForm) {
    const form = gravityForms.find((f) => f.id === selectedForm);
    if (form) {
      return (
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedForm(null)}>
                ← Back to Forms
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
              console.log("Form submitted successfully:", data);
            }}
          />
        </div>
      );
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
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
            <p className="text-2xl font-bold text-gray-900">{formStats.totalForms}</p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">Total Submissions</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formStats.totalSubmissions}</p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Avg. Conversion</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formStats.avgConversionRate}</p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-gray-600">Last Submission</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formStats.lastSubmission}</p>
          </CardContent>
        </Card>
      </div>

      {/* Forms List */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Forms</TabsTrigger>
          <TabsTrigger value="draft">Draft Forms</TabsTrigger>
          <TabsTrigger value="archived">Archived Forms</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
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
                      onClick={() => setSelectedForm(form.id)}
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
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Draft Forms</h3>
            <p className="text-gray-600 mb-6">
              You don't have any draft forms. Create a new form to get started.
            </p>
            <Button className="bg-hive-purple hover:bg-hive-purple/90">
              <Plus className="w-4 h-4 mr-2" />
              Create New Form
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Archived Forms</h3>
            <p className="text-gray-600">You don't have any archived forms.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
