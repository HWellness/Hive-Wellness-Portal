import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink } from "lucide-react";
// import { useAuth } from '@/hooks/use-auth';

interface PDFDocument {
  id: string;
  title: string;
  description: string;
  filename: string;
  url: string;
  category: "client" | "therapist" | "admin";
  lastUpdated: string;
}

// Document configuration based on Hive Wellness information packs
const DOCUMENT_LIBRARY: PDFDocument[] = [
  {
    id: "client-info-pack",
    title: "Client Information Pack",
    description:
      "Complete guide for clients including our services, processes, and what to expect from therapy sessions.",
    filename: "HW-Client-Information-Pack.pdf",
    url: "/public-objects/documents/HW-Client-Information-Pack.pdf",
    category: "client",
    lastUpdated: "2025-08-02",
  },
  {
    id: "therapist-info-pack",
    title: "Therapist Information Pack",
    description:
      "Comprehensive guide for therapists including pricing, platform features, and professional guidelines.",
    filename: "HW-Therapist-Information-Pack-and-Pricing.pdf",
    url: "/public-objects/documents/HW-Therapist-Information-Pack-and-Pricing.pdf",
    category: "therapist",
    lastUpdated: "2025-08-02",
  },
  {
    id: "safeguarding-procedures",
    title: "Safeguarding Procedures",
    description: "Essential safeguarding policies and procedures for all therapy professionals.",
    filename: "HW-Safeguarding-Procedures.pdf",
    url: "/public-objects/documents/HW-Safeguarding-Procedures.pdf",
    category: "therapist",
    lastUpdated: "2025-08-02",
  },
];

interface PDFDocumentViewerProps {
  userRole?: "client" | "therapist" | "admin";
}

export function PDFDocumentViewer({ userRole = "client" }: PDFDocumentViewerProps) {
  // const { user } = useAuth();
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Filter documents based on user role
    const availableDocuments = DOCUMENT_LIBRARY.filter((doc) => {
      if (userRole === "admin") return true; // Admin can see all
      if (userRole === "therapist") return doc.category === "therapist";
      return doc.category === "client";
    });

    setDocuments(availableDocuments);
    setLoading(false);
  }, [userRole]);

  const handleDownload = async (document: PDFDocument) => {
    try {
      const response = await fetch(document.url);
      if (!response.ok) {
        throw new Error("Document not available");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.filename;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: open in new tab
      window.open(document.url, "_blank");
    }
  };

  const handleView = (document: PDFDocument) => {
    window.open(document.url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Available</h3>
            <p className="text-gray-500">No documents are currently available for your role.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Resource Documents</h2>
        <p className="text-gray-600">
          Access important information packs and guidelines for your role.
        </p>
      </div>

      {documents.map((document) => (
        <Card key={document.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg text-gray-900">{document.title}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Last updated: {new Date(document.lastUpdated).toLocaleDateString("en-GB")}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleView(document)}
                  className="flex items-center space-x-1"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleDownload(document)}
                  className="flex items-center space-x-1 bg-purple-600 hover:bg-purple-700"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 text-sm leading-relaxed">{document.description}</p>
            <div className="mt-3 text-xs text-gray-500">File: {document.filename}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
