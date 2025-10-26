import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ClientDocuments() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownloadDocument = async () => {
    try {
      setIsDownloading(true);
      
      const documentUrl = '/documents/HW-Client-Information-Pack_1753986034497.pdf';
      
      const link = document.createElement('a');
      link.href = documentUrl;
      link.download = 'Hive-Wellness-Client-Information-Pack.pdf';
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      
      toast({
        title: "Download Complete",
        description: "Your client information pack has been downloaded successfully.",
      });
      
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download document",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleViewDocument = async () => {
    try {
      const documentUrl = '/documents/HW-Client-Information-Pack_1753986034497.pdf';
      window.open(documentUrl, '_blank');
      
    } catch (error) {
      console.error('View error:', error);
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
        <h1 className="text-3xl font-bold text-hive-black mb-2">My Documents</h1>
        <p className="text-lg text-hive-black/70">
          Access your client information pack and resources.
        </p>
      </div>

      <Card className="border-hive-purple/20 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-hive-purple/5 to-hive-purple/10">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-hive-purple/10 rounded-lg">
              <FileText className="w-8 h-8 text-hive-purple" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-hive-black">
                Hive Wellness Client Information Pack
              </CardTitle>
              <CardDescription className="text-base text-hive-black/70">
                Your complete guide to therapy with Hive Wellness
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="bg-hive-purple/5 p-4 rounded-lg">
              <h3 className="font-semibold text-hive-black mb-2">What's included:</h3>
              <ul className="space-y-2 text-hive-black/70">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-hive-purple rounded-full"></div>
                  <span>Welcome message and overview of Hive Wellness</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-hive-purple rounded-full"></div>
                  <span>What we offer and how to get started</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-hive-purple rounded-full"></div>
                  <span>Session format and confidentiality information</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-hive-purple rounded-full"></div>
                  <span>Payment, pricing and cancellation policies</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-hive-purple rounded-full"></div>
                  <span>Finding the right therapist and additional support resources</span>
                </li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <Button 
                onClick={handleViewDocument}
                className="flex-1 bg-hive-purple hover:bg-hive-purple/90 text-white"
                data-testid="button-view-info-pack"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Document
              </Button>
              <Button 
                onClick={handleDownloadDocument}
                disabled={isDownloading}
                variant="outline"
                className="flex-1 border-hive-purple text-hive-purple hover:bg-hive-purple/10"
                data-testid="button-download-info-pack"
              >
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? 'Downloading...' : 'Download PDF'}
              </Button>
            </div>

            <div className="mt-6 pt-4 border-t border-hive-purple/20">
              <p className="text-sm text-hive-black/60">
                <strong>Need help?</strong> If you have any questions about the information in this pack, 
                please contact our support team at admin@hive-wellness.co.uk
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
