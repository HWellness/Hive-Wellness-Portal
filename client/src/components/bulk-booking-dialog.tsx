import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Repeat } from "lucide-react";

interface BulkBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTherapist?: any;
  onBulkBooking?: (bulkData: {
    bulkBookingType: 'weekly' | 'monthly' | 'custom';
    numberOfSessions: number;
    recurringTime: string;
    startDate: Date;
    selectedTherapist: any;
  }) => void;
  isLoading?: boolean;
}

export function BulkBookingDialog({ open, onOpenChange, selectedTherapist, onBulkBooking, isLoading }: BulkBookingDialogProps) {
  const { toast } = useToast();
  
  // Bulk booking state
  const [bulkBookingType, setBulkBookingType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [numberOfSessions, setNumberOfSessions] = useState(4);
  const [recurringTime, setRecurringTime] = useState<string>('');
  const [recurringDay, setRecurringDay] = useState<number>(1);
  const [startDate, setStartDate] = useState<Date>(new Date());

  const handleBulkBooking = () => {
    if (!recurringTime || !startDate || !selectedTherapist) {
      toast({
        title: "Missing Information",
        description: "Please select a therapist, time and start date for bulk booking.",
        variant: "destructive",
      });
      return;
    }

    // Call the parent's bulk booking handler if provided
    if (onBulkBooking) {
      onBulkBooking({
        bulkBookingType,
        numberOfSessions,
        recurringTime,
        startDate,
        selectedTherapist
      });
    } else {
      // Fallback to local handling if no parent handler
      toast({
        title: "Bulk Booking Created",
        description: `${numberOfSessions} ${bulkBookingType} sessions have been scheduled successfully.`,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Repeat className="mr-2 h-5 w-5" />
            Bulk Booking - Multiple Sessions
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Booking Type Selection */}
          <div>
            <Label className="text-sm font-medium">Booking Pattern</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button
                variant={bulkBookingType === 'weekly' ? 'default' : 'outline'}
                onClick={() => setBulkBookingType('weekly')}
                className="text-xs"
              >
                Weekly
              </Button>
              <Button
                variant={bulkBookingType === 'monthly' ? 'default' : 'outline'}
                onClick={() => setBulkBookingType('monthly')}
                className="text-xs"
              >
                Monthly
              </Button>
              <Button
                variant={bulkBookingType === 'custom' ? 'default' : 'outline'}
                onClick={() => setBulkBookingType('custom')}
                className="text-xs"
              >
                Custom
              </Button>
            </div>
          </div>

          {/* Number of Sessions */}
          <div>
            <Label className="text-sm font-medium">Number of Sessions</Label>
            <Select value={numberOfSessions.toString()} onValueChange={(value) => setNumberOfSessions(Number(value))}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 Sessions</SelectItem>
                <SelectItem value="6">6 Sessions</SelectItem>
                <SelectItem value="8">8 Sessions</SelectItem>
                <SelectItem value="10">10 Sessions</SelectItem>
                <SelectItem value="12">12 Sessions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div>
            <Label className="text-sm font-medium">Start Date</Label>
            <input
              type="date"
              value={startDate.toISOString().split('T')[0]}
              onChange={(e) => setStartDate(new Date(e.target.value))}
              className="w-full mt-2 p-3 border border-input rounded-md bg-background"
            />
          </div>

          {/* Time Selection */}
          <div>
            <Label className="text-sm font-medium">Preferred Time</Label>
            <Select value={recurringTime} onValueChange={setRecurringTime}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="09:00">9:00 AM</SelectItem>
                <SelectItem value="10:00">10:00 AM</SelectItem>
                <SelectItem value="11:00">11:00 AM</SelectItem>
                <SelectItem value="13:00">1:00 PM</SelectItem>
                <SelectItem value="14:00">2:00 PM</SelectItem>
                <SelectItem value="15:00">3:00 PM</SelectItem>
                <SelectItem value="16:00">4:00 PM</SelectItem>
                <SelectItem value="17:00">5:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Day of Week (for weekly) */}
          {bulkBookingType === 'weekly' && (
            <div>
              <Label className="text-sm font-medium">Day of Week</Label>
              <Select value={recurringDay.toString()} onValueChange={(value) => setRecurringDay(Number(value))}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Therapist Selection */}
          {selectedTherapist && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900">Selected Therapist</h4>
              <p className="text-sm text-blue-700">{selectedTherapist.name}</p>
              <p className="text-xs text-blue-600">£{selectedTherapist.hourlyRate}/session</p>
            </div>
          )}

          {/* Total Cost Preview */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium">Booking Summary</h4>
            <div className="text-sm space-y-1 mt-2">
              <div className="flex justify-between">
                <span>{numberOfSessions} Sessions</span>
                <span>£{(85 * numberOfSessions).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Booking Pattern</span>
                <span className="capitalize">{bulkBookingType}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Total Cost</span>
                <span>£{(85 * numberOfSessions).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBulkBooking}
              disabled={!recurringTime || !startDate || !selectedTherapist || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Creating Sessions...
                </>
              ) : (
                `Book ${numberOfSessions} Sessions`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}