import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Video, User, LogIn, Calendar, Phone } from "lucide-react";
import { Link } from "wouter";
import ChatbotWidget from "@/components/chatbot/chatbot-widget";
import IntroductionCallBooking from "@/components/booking/introduction-call-booking";

// Header background image
const backgroundImage = "/header-bg.png";

export default function SimplePortal() {
  const { toast } = useToast();
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [videoLink, setVideoLink] = useState<string | null>(null);
  const [bookingKey, setBookingKey] = useState(0); // Key to force remount only when needed

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: "#9306B1" }}>
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          opacity: 0.75,
        }}
        aria-hidden="true"
      ></div>
      {/* Hive Purple overlay to align with brand guidelines - darker purple tint */}
      <div
        className="absolute inset-0 bg-hive-purple/40 pointer-events-none"
        aria-hidden="true"
      ></div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header with Return Button */}
          <div className="text-center mb-12 relative">
            <div className="absolute top-0 right-0">
              <Button
                size="sm"
                onClick={() => window.open("https://hive-wellness.co.uk", "_blank")}
                className="bg-gradient-to-r from-hive-purple to-purple-600 hover:from-hive-purple/90 hover:to-purple-600/90 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02]"
              >
                ← Return to Website
              </Button>
            </div>
          </div>

          <div className="flex justify-center">
            {/* Centered - Access Your Portal */}
            <div className="w-full max-w-md">
              <Card className="hive-card-shadow hive-card-hover bg-white/70 backdrop-blur-sm border-0">
                <CardContent className="p-8">
                  <h2 className="text-3xl font-primary text-hive-purple mb-6 text-center">
                    Access your Hive Wellness Portal
                  </h2>

                  {/* Book Introduction Call */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-hive-light-purple/30 rounded-xl border border-hive-purple/20">
                    <div className="text-center mb-4">
                      <h4 className="font-primary font-semibold text-gray-800 text-sm mb-1">
                        Free Introduction Call
                      </h4>
                      <p className="text-xs font-secondary text-gray-600">
                        No account needed - book your call now
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowBookingDialog(true)}
                      className="w-full bg-hive-purple hover:bg-hive-purple/90 text-white font-medium transition-all duration-200"
                      data-testid="button-book-free-call"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Free Call
                    </Button>
                  </div>

                  {/* Real User Authentication */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-hive-light-purple/20 to-hive-background/30 rounded-xl border border-hive-purple/20">
                    <div className="text-center mb-4">
                      <h4 className="font-primary font-semibold text-hive-black text-sm mb-1">
                        Login
                      </h4>
                      <p className="text-xs font-secondary text-hive-black/70">
                        For clients and institutions
                      </p>
                    </div>
                    <Link to="/login">
                      <Button className="w-full bg-hive-purple hover:bg-hive-purple/90 text-white font-medium transition-all duration-200">
                        <LogIn className="w-4 h-4 mr-2" />
                        Login
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* AI Chatbot Widget - Floating in bottom right corner */}
      <ChatbotWidget
        primaryColor="#9306B1"
        position="bottom-right"
        initialMessage="Hello! I'm here to help answer any questions about Hive Wellness therapy services. How can I assist you today?"
        showBranding={true}
        apiEndpoint="https://api.hive-wellness.co.uk"
      />

      {/* Introduction Call Booking Dialog */}
      <Dialog
        open={showBookingDialog}
        onOpenChange={(open) => {
          setShowBookingDialog(open);
          // Only reset booking component when dialog is closed and then opened again
          if (!open) {
            // Wait a bit before allowing remount to prevent flashing
            setTimeout(() => setBookingKey((prev) => prev + 1), 500);
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-primary text-hive-purple">
              Book Your Free Introduction Call
            </DialogTitle>
          </DialogHeader>
          <IntroductionCallBooking
            key={`booking-${bookingKey}`}
            onBookingComplete={(link) => {
              setVideoLink(link);
              setShowBookingDialog(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Video Link Success Dialog */}
      {videoLink && (
        <Dialog open={!!videoLink} onOpenChange={() => setVideoLink(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle
                className="text-xl font-primary text-center"
                style={{ color: "#9306B1" }}
              >
                🎉 Call Booked Successfully!
              </DialogTitle>
              <DialogDescription className="sr-only">
                Your introduction call booking confirmation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-center">
              <div
                className="border rounded-lg p-4"
                style={{
                  backgroundColor: "rgba(147, 6, 177, 0.05)",
                  borderColor: "rgba(147, 6, 177, 0.2)",
                }}
              >
                <div className="flex items-center justify-center mb-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(147, 6, 177, 0.1)" }}
                  >
                    <span className="text-2xl">📧</span>
                  </div>
                </div>
                <h3 className="font-semibold mb-2" style={{ color: "#9306B1" }}>
                  Check Your Email
                </h3>
                <p className="text-hive-black/70 text-sm">
                  We've sent you a confirmation email with your meeting details and calendar invite.
                  Please check your inbox for complete joining instructions.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-700 text-sm">
                  <strong>Next Steps:</strong> Click "Add to Calendar" in your email and join the
                  meeting from your calendar at the scheduled time.
                </p>
              </div>

              <Button variant="outline" onClick={() => setVideoLink(null)} className="w-full">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
