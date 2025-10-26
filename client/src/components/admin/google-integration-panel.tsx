import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar } from 'lucide-react';

export function GoogleIntegrationPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Google Calendar Integration</h2>
          <p className="text-gray-600 mt-1">Calendar sync status for support@hive-wellness.co.uk</p>
        </div>
      </div>

      {/* Simple Status Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Calendar Sync Status
          </CardTitle>
          <CardDescription>
            All bookings are automatically added to your Google Calendar at support@hive-wellness.co.uk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600">Active - Auto-creating calendar events</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            New bookings automatically create calendar events with Google Meet links in your support@hive-wellness.co.uk calendar.
          </p>
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>How it works:</strong> When someone books through your website, the system automatically:
            </p>
            <ul className="text-xs text-blue-700 mt-1 ml-4 list-disc">
              <li>Creates a calendar event in your Google Calendar</li>
              <li>Generates a Google Meet link for the session</li>
              <li>Sends email confirmations to both you and the client</li>
              <li>Prevents double-bookings by blocking that time slot</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}