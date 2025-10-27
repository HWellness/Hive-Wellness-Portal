import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink, Shield, Info, BookOpen, Banknote } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface TherapistDocumentsProps {
  user: User;
}

export default function TherapistDocuments({ user }: TherapistDocumentsProps) {
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const { toast } = useToast();

  const documents = [
    {
      id: "therapist-walkthrough",
      title: "Therapist Walkthrough Document",
      description: "Your step-by-step setup guide for getting started with Hive Wellness",
      icon: BookOpen,
      filename: "Therapist-Walkthrough-Document-Hive-Wellness.pdf",
      highlights: [
        "Welcome and onboarding process overview",
        "Complete your onboarding form step by step",
        "Access and setup your therapist portal",
        "Profile settings, payment setup, and availability",
        "Portal features including dashboard and messaging",
        "Support contact information and getting help",
      ],
    },
    {
      id: "therapist-information",
      title: "Therapist Information Pack & Pricing",
      description: "Complete guide to working with Hive Wellness",
      icon: Info,
      filename: "Hive-Wellness-Therapist-Information-Pack.pdf",
      highlights: [
        "Welcome from our founder and company values",
        "How Hive Wellness works and therapist expectations",
        "Session structure and clinical practice guidelines",
        "Tiered pricing system and earnings breakdown",
        "Fee structure: therapists receive 85% of session fees",
        "Payment processing and payout information",
      ],
    },
    {
      id: "therapist-safeguarding",
      title: "Safeguarding Procedures",
      description: "Essential safeguarding policies and procedures",
      icon: Shield,
      filename: "Hive-Wellness-Safeguarding-Procedures.pdf",
      highlights: [
        "Legal and policy framework compliance",
        "Key safeguarding principles and responsibilities",
        "Recognising and responding to safeguarding concerns",
        "Emergency procedures and reporting protocols",
        "Confidentiality and information sharing guidelines",
        "Professional conduct and ongoing support",
      ],
    },
    {
      id: "taxstats-financial-guide",
      title: "TaxStats Financial Guide for Therapists",
      description: "Professional financial and tax guidance for your therapy practice",
      icon: Banknote,
      filename: "Hive-Wellness-TaxStats-Financial-Guide.pdf",
      highlights: [
        "How Stripe payments work and getting paid via the platform",
        "Choosing your business structure: Sole Trader vs Limited Company",
        "Tax registration and Self Assessment requirements",
        "Allowable business expenses for therapists",
        "Corporation Tax and company compliance obligations",
        "Important HMRC deadlines and proactive tax planning",
      ],
    },
  ];

  const handleDownloadDocument = async (documentType: string, filename: string) => {
    try {
      setDownloadingDoc(documentType);

      // Map document types to public URLs
      const documentUrls: Record<string, string> = {
        "therapist-walkthrough": "/documents/Therapist-Walkthrough-Document-Hive-Wellness.pdf",
        "therapist-information":
          "/documents/HW-Therapist-Information-Pack-and-Pricing_1753986034497.pdf",
        "therapist-safeguarding": "/documents/HW-Safeguarding-Procedures_1753986034497.pdf",
        "taxstats-financial-guide": "/documents/Hive-Wellness-TaxStats-Financial-Guide.pdf",
      };

      const documentUrl = documentUrls[documentType];
      if (!documentUrl) {
        throw new Error("Document not found");
      }

      // Create download link
      const link = document.createElement("a");
      link.href = documentUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);

      toast({
        title: "Download Complete",
        description: "Document has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download document",
        variant: "destructive",
      });
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleViewDocument = async (documentType: string) => {
    try {
      // Map document types to public URLs
      const documentUrls: Record<string, string> = {
        "therapist-walkthrough": "/documents/Therapist-Walkthrough-Document-Hive-Wellness.pdf",
        "therapist-information":
          "/documents/HW-Therapist-Information-Pack-and-Pricing_1753986034497.pdf",
        "therapist-safeguarding": "/documents/HW-Safeguarding-Procedures_1753986034497.pdf",
        "taxstats-financial-guide": "/documents/Hive-Wellness-TaxStats-Financial-Guide.pdf",
      };

      const documentUrl = documentUrls[documentType];
      if (!documentUrl) {
        throw new Error("Document not found");
      }

      window.open(documentUrl, "_blank");
    } catch (error) {
      console.error("View error:", error);
      toast({
        title: "View Failed",
        description: "Failed to open document",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-hive-black mb-2">Therapist Information Packs</h1>
        <p className="text-lg text-hive-black/70">
          Access essential documentation for working with Hive Wellness, including our comprehensive
          information pack and safeguarding procedures.
        </p>
      </div>

      <div className="grid gap-6">
        {documents.map((document) => {
          const IconComponent = document.icon;
          const isDownloading = downloadingDoc === document.id;

          return (
            <Card key={document.id} className="border-hive-purple/20 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-hive-purple/5 to-hive-purple/10">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-hive-purple/10 rounded-lg">
                    <IconComponent className="w-8 h-8 text-hive-purple" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-hive-black">
                      {document.title}
                    </CardTitle>
                    <CardDescription className="text-base text-hive-black/70">
                      {document.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="bg-hive-purple/5 p-4 rounded-lg">
                    <h3 className="font-semibold text-hive-black mb-2">Key contents:</h3>
                    <ul className="space-y-2 text-hive-black/70">
                      {document.highlights.map((highlight, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-hive-purple rounded-full mt-2 flex-shrink-0"></div>
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex space-x-4">
                    <Button
                      onClick={() => handleViewDocument(document.id)}
                      className="flex-1 bg-hive-purple hover:bg-hive-purple/90 text-white"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Document
                    </Button>
                    <Button
                      onClick={() => handleDownloadDocument(document.id, document.filename)}
                      disabled={isDownloading}
                      variant="outline"
                      className="flex-1 border-hive-purple text-hive-purple hover:bg-hive-purple/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isDownloading ? "Downloading..." : "Download PDF"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-800 mb-1">Important Note</h3>
              <p className="text-sm text-amber-700">
                Please ensure you've read and understood both documents before beginning work with
                clients. If you have any questions, contact Admin at admin@hive-wellness.co.uk
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
