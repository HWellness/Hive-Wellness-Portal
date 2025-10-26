import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Calendar, Clock } from 'lucide-react';
import { Link } from 'wouter';

export function VideoBookingCard() {
  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Video className="w-5 h-5" />
          Video Session Booking
        </CardTitle>
        <CardDescription>
          Book video therapy sessions with automatic Google Calendar and Meet integration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span>Automatic Google Calendar events</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Video className="w-4 h-4 text-purple-600" />
            <span>Google Meet links generated automatically</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-purple-600" />
            <span>Email confirmations sent to all participants</span>
          </div>
        </div>
        
        <Link href="/book-video">
          <Button className="w-full mt-4 bg-purple-600 hover:bg-purple-700">
            <Video className="w-4 h-4 mr-2" />
            Book Video Session
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}