import express from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { z } from "zod";

const router = express.Router();

// Availability schemas
const TimeSlotSchema = z.object({
  id: z.string(),
  start: z.string(), // HH:MM format
  end: z.string(), // HH:MM format
  available: z.boolean(),
});

const DayAvailabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6), // 0=Sunday, 1=Monday, etc.
  dayName: z.string(),
  enabled: z.boolean(),
  timeSlots: z.array(TimeSlotSchema),
});

const WeeklyScheduleSchema = z.object({
  therapistId: z.string(),
  schedule: z.array(DayAvailabilitySchema),
  effectiveFrom: z.string(),
  notes: z.string().optional(),
});

// Get therapist availability
router.get("/availability/:therapistId", isAuthenticated, async (req, res) => {
  try {
    const { therapistId } = req.params;

    // Verify user can access this therapist's availability
    const user = req.user as any;
    if (user?.role !== "admin" && user?.id !== therapistId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const availability = await storage.getTherapistAvailability(therapistId);

    if (!availability) {
      return res.status(404).json({ error: "No availability schedule found" });
    }

    res.json(availability);
  } catch (error) {
    console.error("Error fetching availability:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Save/update therapist availability
router.post("/availability", isAuthenticated, async (req, res) => {
  try {
    const scheduleData = WeeklyScheduleSchema.parse(req.body);

    // Verify user can update this therapist's availability
    const user = req.user as any;
    if (user?.role !== "admin" && user?.id !== scheduleData.therapistId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const savedSchedule = await storage.saveTherapistAvailability(scheduleData);

    res.json(savedSchedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid schedule data",
        details: error.errors,
      });
    }

    console.error("Error saving availability:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get available time slots for booking (public endpoint for clients)
router.get("/available-slots/:therapistId", async (req, res) => {
  try {
    const { therapistId } = req.params;
    const { date, days = 7 } = req.query;

    const startDate = date ? new Date(date as string) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + parseInt(days as string));

    const availableSlots = await storage.getAvailableTimeSlots(
      therapistId,
      startDate.toISOString().split("T")[0]
    );

    res.json({
      therapistId,
      dateRange: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      },
      availableSlots,
    });
  } catch (error) {
    console.error("Error fetching available slots:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as availabilityRouter };
