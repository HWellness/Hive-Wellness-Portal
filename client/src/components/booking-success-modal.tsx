import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface BookingSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: {
    bookingId: string;
    googleMeetUrl?: string;
    calendarUrl?: string;
    meetingId?: string;
    name?: string;
    date?: string;
    time?: string;
  };
}

export function BookingSuccessModal({ isOpen, onClose, bookingData }: BookingSuccessModalProps) {
  const handleJoinVideoCall = () => {
    if (bookingData.googleMeetUrl) {
      window.open(bookingData.googleMeetUrl, "_blank");
    }
  };

  const handleAddToCalendar = () => {
    if (bookingData.calendarUrl) {
      window.open(bookingData.calendarUrl, "_blank");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(147, 6, 177, 0.1)" }}
            >
              <span className="text-3xl" style={{ color: "#9306B1" }}>
                🎉
              </span>
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-primary" style={{ color: "#9306B1" }}>
            Call Booked Successfully!
          </DialogTitle>
          <DialogDescription className="text-center text-hive-black/70">
            Your introduction call has been scheduled. You'll receive an email confirmation shortly.
          </DialogDescription>
        </DialogHeader>

        <div className="text-center space-y-4">
          {bookingData.bookingId && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-hive-black/60">
                <strong>Booking Reference:</strong> {bookingData.bookingId}
              </p>
            </div>
          )}

          {bookingData.googleMeetUrl && (
            <div className="space-y-3">
              <Button
                onClick={handleJoinVideoCall}
                className="w-full bg-hive-purple hover:bg-hive-purple/90 text-white"
                size="lg"
              >
                🎥 Join Video Call
              </Button>

              {bookingData.calendarUrl && (
                <Button onClick={handleAddToCalendar} variant="outline" className="w-full">
                  📅 Add to Google Calendar
                </Button>
              )}
            </div>
          )}

          <div className="text-xs text-hive-black/60 bg-blue-50 p-3 rounded-lg">
            <p>
              💡 <strong>Tip:</strong> Click the video call button at your appointment time. The
              meeting will open in Google Meet - no account required!
            </p>
          </div>

          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
