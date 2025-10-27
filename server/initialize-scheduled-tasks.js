// Manual initialization of scheduled tasks
import { storage } from "./storage.js";
import { ScheduledTasksService } from "./scheduled-tasks.js";

console.log("🚀 Manually initializing scheduled tasks...");

try {
  const scheduledTasks = new ScheduledTasksService(storage);
  scheduledTasks.initialize();
  console.log("✅ Scheduled tasks initialized successfully");

  // Test HubSpot import manually
  console.log("🔄 Testing HubSpot import...");
  const results = await scheduledTasks.triggerHubSpotImport();
  console.log("✅ HubSpot import test completed:", results);
} catch (error) {
  console.error("❌ Failed to initialize scheduled tasks:", error);
}
