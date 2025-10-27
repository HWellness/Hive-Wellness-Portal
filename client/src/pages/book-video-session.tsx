import { VideoSessionBooking } from "@/components/booking/video-session-booking";

export default function BookVideoSessionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-900 mb-2">Book Video Session</h1>
          <p className="text-gray-600">
            Schedule a secure video therapy session with automatic Google Meet integration
          </p>
        </div>

        <VideoSessionBooking />
      </div>
    </div>
  );
}
