import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Calendar, Users } from "lucide-react";
import { Link } from "wouter";

export function VideoBookingWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-purple-600" />
          Video Session Booking
        </CardTitle>
        <CardDescription>Book video therapy sessions with Google Meet integration</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600 mx-auto mb-1" />
              <p className="text-sm font-medium">Auto Calendar</p>
              <p className="text-xs text-gray-600">Google Calendar sync</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Video className="h-6 w-6 text-purple-600 mx-auto mb-1" />
              <p className="text-sm font-medium">Google Meet</p>
              <p className="text-xs text-gray-600">Instant video links</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Users className="h-6 w-6 text-purple-600 mx-auto mb-1" />
              <p className="text-sm font-medium">Therapists</p>
              <p className="text-xs text-gray-600">Available staff</p>
            </div>
          </div>

          <Link href="/book-video">
            <Button className="w-full bg-purple-600 hover:bg-purple-700">Book Video Session</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
