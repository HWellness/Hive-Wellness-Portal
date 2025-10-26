import { storage } from "./storage";
import { nanoid } from "nanoid";

// Initialize the 4 therapy categories based on Holly's document
// SIMPLIFIED VERSION TO PREVENT DEPLOYMENT ISSUES
export async function initializeTherapyCategories() {
  try {
    console.log("Initializing therapy categories...");
    
    // Check if categories already exist to prevent duplication
    const existingCategories = await storage.getTherapyCategories();
    if (existingCategories && existingCategories.length > 0) {
      console.log("Therapy categories already exist, skipping initialization");
      return;
    }
    
    const categories = [
    {
      id: nanoid(),
      name: "Counselling Approaches",
      description: "Gentle, supportive therapy to help you navigate life's challenges, improve emotional resilience, and build healthier coping strategies.",
      pricePerSession: "65.00",
      availableTherapistTypes: ["Counsellor", "Psychosexual Therapist"],
      isActive: true
    },
    {
      id: nanoid(),
      name: "CBT & Psychotherapy",
      description: "Evidence-based therapies to help manage your thoughts, feelings, and behaviours. Suitable for adults seeking help with issues such as stress, low mood, anxiety, or relationship difficulties.",
      pricePerSession: "80.00",
      availableTherapistTypes: ["Cognitive Behavioural Therapist", "Psychotherapist"],
      isActive: true
    },
    {
      id: nanoid(),
      name: "Psychological Therapies",
      description: "Targeted support for adult mental health concerns like anxiety disorders, depression, or trauma. These therapies use advanced, evidence-based techniques to help shift thought patterns and behaviours.",
      pricePerSession: "90.00",
      availableTherapistTypes: ["Clinical Psychologist", "Counselling Psychologist"],
      isActive: true
    },
    {
      id: nanoid(),
      name: "Specialist Therapies",
      description: "Specialist support for complex, longstanding, or severe psychological difficulties, drawing on advanced therapeutic approaches and expert clinical insight.",
      pricePerSession: "120.00",
      availableTherapistTypes: ["Clinical Psychologist", "Clinical Psychologist & Director"],
      isActive: true
    }
  ];

    // Create all categories
    for (const category of categories) {
      await storage.createTherapyCategory(category);
      console.log(`Created therapy category: ${category.name} (£${category.pricePerSession})`);
    }
    console.log("All therapy categories initialized successfully");
    
  } catch (error) {
    console.error("Error initializing therapy categories:", error);
    // Don't throw the error to prevent deployment failures - just continue
  }
}

// Export for manual execution only - do not auto-execute to prevent deployment issues