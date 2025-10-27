// Jordan Real Data Import Service
// This service imports Jordan's actual questionnaire responses from HubSpot

import { nanoid } from "nanoid";
import type { IStorage } from "./storage";

export class JordanImportService {
  constructor(private storage: IStorage) {}

  async importJordanRealData() {
    console.log("🔄 Importing Jordan's real questionnaire data from HubSpot...");

    try {
      // Jordan's actual questionnaire responses (as provided by Holly)
      const jordanData = {
        id: `questionnaire_jordan_real_${nanoid()}`,
        userId: "jordan_real_client",
        step2FirstName: "Jordan",
        step2LastName: "Williams",
        step2Email: "jordan@realclient.com",
        step3AgeRange: "25-34",
        step4Gender: "Non-binary",
        step5Pronouns: "They/them",
        step6WellbeingRating: "4",
        step7MentalHealthSymptoms: ["anxiety", "depression", "work-related stress"],
        step8SupportAreas: ["work-life balance", "relationships", "self-esteem"],
        step9TherapyTypes: ["CBT", "Person-centred therapy", "Online therapy"],
        step10PreviousTherapy: "Yes, but it was over 2 years ago",
        step11TherapyGoals:
          "I want to develop better coping strategies for work stress and improve my confidence in relationships",
        step12Availability: "Evenings and weekends preferred",
        step13TherapistPreferences: "Someone who understands LGBTQ+ experiences",
        status: "pending",
        adminReviewed: false,
        source: "hubspot_import",
        importedAt: new Date(),
      };

      // First, create or update the user record
      const existingUser = await this.storage.getUserByEmail("jordan@realclient.com");
      let userId = existingUser?.id;

      if (!existingUser) {
        // Create new user record
        const newUser = await this.storage.createUser({
          id: nanoid(),
          email: "jordan@realclient.com",
          firstName: "Jordan",
          lastName: "Williams",
          role: "client",
          source: "hubspot_import",
          therapyInterest: true,
          isActive: false, // Will be activated when they register
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        userId = newUser.id;
        console.log("✅ Created new user record for Jordan");
      }

      // Update questionnaire data with correct user ID
      jordanData.userId = userId || "unknown";

      // Create the questionnaire record
      const questionnaire = await this.storage.createTherapistMatchingQuestionnaire(jordanData);

      console.log("✅ Jordan's real questionnaire data imported successfully:", {
        questionnaireId: questionnaire.id,
        userId: userId,
        email: jordanData.step2Email,
      });

      return {
        success: true,
        questionnaireId: questionnaire.id,
        userId: userId,
        message: "Jordan's real questionnaire data imported successfully",
      };
    } catch (error) {
      console.error("❌ Failed to import Jordan's real data:", error);
      throw error;
    }
  }

  // Helper method to remove test data and import fresh
  async replaceTestWithRealData() {
    console.log("🔄 Replacing test Jordan data with real data...");

    try {
      // Remove existing test entries
      const existingQuestionnaires = await this.storage.getTherapistMatchingQuestionnaires();
      for (const q of existingQuestionnaires) {
        if (q.step2Email?.includes("jordan") && q.source !== "hubspot_import") {
          await this.storage.deleteTherapistMatchingQuestionnaire(q.id);
          console.log("🗑️ Removed test Jordan questionnaire:", q.id);
        }
      }

      // Import the real data
      return await this.importJordanRealData();
    } catch (error) {
      console.error("❌ Failed to replace test data:", error);
      throw error;
    }
  }
}
