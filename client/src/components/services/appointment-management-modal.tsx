import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock } from "lucide-react";

const appointmentSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  therapistId: z.string().min(1, "Please select a therapist"),
  date: z.string().min(1, "Please select a date"),
  time: z.string().min(1, "Please select a time"),
  duration: z.number().min(30).max(120),
  type: z.enum(["therapy", "consultation", "assessment"]),
  notes: z.string().optional(),
  fee: z.number().min(0),
});

type AppointmentForm = z.infer<typeof appointmentSchema>;

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AppointmentModal({ open, onOpenChange }: AppointmentModalProps) {
  const { toast } = useToast();

  // Fetch clients and therapists for selection
  const { data: clientsData } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: open,
  });

  const clients = (clientsData as any)?.users?.filter((user: any) => user.role === "client") || [];
  const therapists =
    (clientsData as any)?.users?.filter((user: any) => user.role === "therapist") || [];

  const form = useForm<AppointmentForm>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clientId: "",
      therapistId: "",
      date: "",
      time: "",
      duration: 50,
      type: "therapy",
      notes: "",
      fee: 80,
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentForm) => {
      const response = await apiRequest("POST", "/api/admin/appointments", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Appointment Scheduled",
        description: "The appointment has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create appointment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AppointmentForm) => {
    createAppointmentMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-hive-purple">
            <Calendar className="w-5 h-5" />
            Schedule New Appointment
          </DialogTitle>
          <DialogDescription>Create a new therapy appointment for a client.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.firstName} {client.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="therapistId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Therapist</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select therapist" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {therapists.map((therapist: any) => (
                          <SelectItem key={therapist.id} value={therapist.id}>
                            {therapist.firstName} {therapist.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="therapy">Therapy</SelectItem>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="assessment">Assessment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee (£)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes about this appointment..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createAppointmentMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-hive-purple hover:bg-hive-purple/90"
                disabled={createAppointmentMutation.isPending}
              >
                {createAppointmentMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Appointment
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
