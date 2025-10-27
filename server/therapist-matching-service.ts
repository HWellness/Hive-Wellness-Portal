// Enhanced Therapist Matching Service
// Combines initial enquiry data with full onboarding data for comprehensive matching

import { DatabaseStorage } from "./storage.js";

interface EnhancedTherapistProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;

  // From initial enquiry
  personalityDescription?: string;
  location?: string;
  religion?: string;
  gender?: string;
  therapySpecialisations?: string[];
  motivation?: string;

  // From full onboarding
  qualifications?: any;
  yearsOfExperience?: number;
  specializations?: string[];
  availability?: any;
  professionalBio?: string;

  // Combined scoring
  matchingScore?: number;
  availabilityMatch?: boolean;
  personalityMatch?: boolean;
  specializationMatch?: boolean;
}

interface ClientQuestionnaireData {
  step2Email: string;
  step2FirstName: string;
  step2LastName: string;
  step3AgeRange?: string;
  step4Gender?: string;
  step5Pronouns?: string;
  step6WellbeingRating?: number;
  step7MentalHealthSymptoms?: string[];
  step8SupportAreas?: string[];
  step9TherapyTypes?: string[];
  step10PreviousTherapy?: string;

  // Enhanced matching preferences
  step11ReligionPreference?: string;
  step12TherapistGenderPreference?: string;
  step13ReligionMatching?: string;

  // Legacy preferences (keeping for compatibility)
  preferredGender?: string;
  preferredAge?: string;
  preferredApproach?: string[];
  personalityPreferences?: string[];
}

export class TherapistMatchingService {
  private storage: DatabaseStorage;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  // Get enhanced therapist profiles combining enquiry and onboarding data
  async getEnhancedTherapistProfiles(): Promise<EnhancedTherapistProfile[]> {
    try {
      console.log("🔍 Gathering enhanced therapist profiles with full data...");

      // Get all approved therapist enquiries
      const enquiries = await this.storage.getTherapistEnquiries();
      const approvedEnquiries = enquiries.filter((e) => e.status === "approved");

      const enhancedProfiles: EnhancedTherapistProfile[] = [];

      for (const enquiry of approvedEnquiries) {
        // Get corresponding user account
        const user = await this.storage.getUserByEmail(enquiry.email);
        if (!user || user.role !== "therapist") {
          continue;
        }

        // Get full onboarding application if exists
        const onboardingApp = await this.storage.getTherapistOnboardingApplicationByEmail(
          enquiry.email
        );

        const enhancedProfile: EnhancedTherapistProfile = {
          id: user.id,
          email: enquiry.email,
          firstName: enquiry.firstName,
          lastName: enquiry.lastName,

          // From initial enquiry (personality data)
          personalityDescription: enquiry.personalityDescription || undefined,
          location: enquiry.location || undefined,
          religion: enquiry.religion || undefined,
          gender: enquiry.gender || undefined,
          therapySpecialisations: enquiry.therapySpecialisations || undefined,
          motivation: enquiry.motivation || undefined,

          // From full onboarding (if available)
          qualifications: onboardingApp?.qualifications,
          yearsOfExperience: onboardingApp?.yearsOfExperience,
          specializations: enquiry.specializations || undefined,
          availability: onboardingApp?.availability,
          professionalBio: enquiry.professionalBio || undefined,

          // Initialize matching scores
          matchingScore: 0,
          availabilityMatch: false,
          personalityMatch: false,
          specializationMatch: false,
        };

        enhancedProfiles.push(enhancedProfile);
      }

      console.log(`✅ Found ${enhancedProfiles.length} enhanced therapist profiles`);
      return enhancedProfiles;
    } catch (error: any) {
      console.error("❌ Error getting enhanced therapist profiles:", error?.message || error);
      return [];
    }
  }

  // Enhanced matching algorithm using both enquiry and onboarding data
  async generateEnhancedMatches(clientEmail: string): Promise<{
    matches: Array<{
      therapist: EnhancedTherapistProfile;
      matchScore: number;
      matchReasons: string[];
      concerns: string[];
    }>;
    totalScore: number;
  }> {
    try {
      console.log(`🎯 Generating enhanced matches for client: ${clientEmail}`);

      // Get client questionnaire data
      const allQuestionnaires = await this.storage.getTherapistMatchingQuestionnaires();
      const clientData = allQuestionnaires.find((q) => q.step2Email === clientEmail);
      if (!clientData) {
        throw new Error(`No questionnaire data found for client: ${clientEmail}`);
      }

      // Get enhanced therapist profiles
      const therapists = await this.getEnhancedTherapistProfiles();

      const matches = [];

      for (const therapist of therapists) {
        const match = await this.calculateEnhancedMatch(clientData, therapist);
        matches.push(match);
      }

      // Sort by match score (highest first)
      matches.sort((a, b) => b.matchScore - a.matchScore);

      // Calculate total matching pool score
      const totalScore = matches.reduce((sum, match) => sum + match.matchScore, 0);

      console.log(`✅ Generated ${matches.length} enhanced matches for ${clientEmail}`);
      console.log(
        `Top match: ${matches[0]?.therapist.firstName} ${matches[0]?.therapist.lastName} (${matches[0]?.matchScore}% match)`
      );

      return {
        matches: matches.slice(0, 5), // Return top 5 matches
        totalScore,
      };
    } catch (error: any) {
      console.error("❌ Error generating enhanced matches:", error?.message || error);
      return { matches: [], totalScore: 0 };
    }
  }

  private async calculateEnhancedMatch(
    client: any,
    therapist: EnhancedTherapistProfile
  ): Promise<{
    therapist: EnhancedTherapistProfile;
    matchScore: number;
    matchReasons: string[];
    concerns: string[];
  }> {
    let score = 0;
    const matchReasons: string[] = [];
    const concerns: string[] = [];
    const maxScore = 100;

    // 1. Therapy specializations match (25 points)
    if (client.step8SupportAreas && therapist.therapySpecialisations) {
      const clientNeeds = client.step8SupportAreas;
      const therapistSpecs = therapist.therapySpecialisations;

      const commonAreas = clientNeeds.filter((need: string) =>
        therapistSpecs.some(
          (spec) =>
            spec.toLowerCase().includes(need.toLowerCase()) ||
            need.toLowerCase().includes(spec.toLowerCase())
        )
      );

      if (commonAreas.length > 0) {
        const specScore = Math.min(25, (commonAreas.length / clientNeeds.length) * 25);
        score += specScore;
        matchReasons.push(
          `Specializes in ${commonAreas.join(", ")} (${Math.round(specScore)} points)`
        );
        therapist.specializationMatch = true;
      } else {
        concerns.push("No direct specialization overlap found");
      }
    }

    // 2. Therapy approach match (20 points)
    if (client.step9TherapyTypes && therapist.specializations) {
      const clientApproaches = client.step9TherapyTypes;
      const therapistApproaches = therapist.specializations;

      const commonApproaches = clientApproaches.filter((approach: string) =>
        therapistApproaches.some((spec) => spec.toLowerCase().includes(approach.toLowerCase()))
      );

      if (commonApproaches.length > 0) {
        const approachScore = Math.min(
          20,
          (commonApproaches.length / clientApproaches.length) * 20
        );
        score += approachScore;
        matchReasons.push(
          `Practices ${commonApproaches.join(", ")} therapy (${Math.round(approachScore)} points)`
        );
      }
    }

    // 3. Personality compatibility (20 points) - NEW: Uses enquiry personality data
    if (client.step7MentalHealthSymptoms && therapist.personalityDescription) {
      const personalityMatch = this.assessPersonalityCompatibility(
        client.step7MentalHealthSymptoms,
        therapist.personalityDescription
      );

      if (personalityMatch.score > 0) {
        score += personalityMatch.score;
        matchReasons.push(
          `Personality compatibility: ${personalityMatch.reason} (${personalityMatch.score} points)`
        );
        therapist.personalityMatch = true;
      }
    }

    // 4. Experience level match (15 points)
    if (therapist.yearsOfExperience) {
      let experienceScore = 0;
      const years = therapist.yearsOfExperience;

      if (years >= 10) {
        experienceScore = 15;
        matchReasons.push(`Highly experienced (${years} years) (15 points)`);
      } else if (years >= 5) {
        experienceScore = 12;
        matchReasons.push(`Well experienced (${years} years) (12 points)`);
      } else if (years >= 2) {
        experienceScore = 8;
        matchReasons.push(`Good experience (${years} years) (8 points)`);
      } else {
        experienceScore = 5;
        concerns.push(`Limited experience (${years} years)`);
      }

      score += experienceScore;
    }

    // 5. Gender preference matching (15 points)
    if (client.step12TherapistGenderPreference && therapist.gender) {
      const clientGenderPref = client.step12TherapistGenderPreference;
      const therapistGender = therapist.gender;

      if (clientGenderPref === "no_preference") {
        score += 10;
        matchReasons.push(`Open to any gender therapist (10 points)`);
      } else if (clientGenderPref === therapistGender) {
        score += 15;
        matchReasons.push(`Gender preference match: ${therapistGender} therapist (15 points)`);
      } else {
        concerns.push(
          `Gender preference mismatch: client prefers ${clientGenderPref}, therapist is ${therapistGender}`
        );
      }
    }

    // 6. Religion/cultural compatibility (10 points)
    if (client.step13ReligionMatching && therapist.religion) {
      const clientReligionPref = client.step13ReligionMatching;
      const therapistReligion = therapist.religion;
      const clientReligion = client.step11ReligionPreference;

      if (clientReligionPref === "no_preference") {
        score += 8;
        matchReasons.push(`Open to any religious background (8 points)`);
      } else if (
        clientReligionPref === "non_religious" &&
        (!therapistReligion ||
          therapistReligion.toLowerCase().includes("none") ||
          therapistReligion.toLowerCase().includes("secular"))
      ) {
        score += 10;
        matchReasons.push(`Non-religious preference match (10 points)`);
      } else if (clientReligionPref === "same_religion" && clientReligion && therapistReligion) {
        if (clientReligion.toLowerCase() === therapistReligion.toLowerCase()) {
          score += 10;
          matchReasons.push(`Same religion match: ${therapistReligion} (10 points)`);
        } else {
          concerns.push(
            `Religion mismatch: client is ${clientReligion}, therapist is ${therapistReligion}`
          );
        }
      }
    }

    // 7. Availability match (10 points) - Check if therapist is available
    if (therapist.availability) {
      score += 10;
      matchReasons.push(`Available for sessions (10 points)`);
      therapist.availabilityMatch = true;
    } else {
      concerns.push("Availability not confirmed");
    }

    // Normalize score to percentage
    const finalScore = Math.min(100, Math.round((score / maxScore) * 100));
    therapist.matchingScore = finalScore;

    return {
      therapist,
      matchScore: finalScore,
      matchReasons,
      concerns,
    };
  }

  private assessPersonalityCompatibility(
    clientSymptoms: string[],
    therapistPersonality: string
  ): { score: number; reason: string } {
    const personality = therapistPersonality.toLowerCase();

    // Check for empathy indicators
    const empathyKeywords = [
      "empathetic",
      "compassionate",
      "understanding",
      "patient",
      "caring",
      "supportive",
    ];
    const hasEmpathy = empathyKeywords.some((keyword) => personality.includes(keyword));

    // Check for anxiety/depression specialization
    const hasAnxietyExpertise = personality.includes("anxiety") || personality.includes("stress");
    const hasDepressionExpertise =
      personality.includes("depression") || personality.includes("mood");

    // Check client symptoms
    const hasAnxietySymptoms = clientSymptoms.some((s) => s.toLowerCase().includes("anxiety"));
    const hasDepressionSymptoms = clientSymptoms.some((s) =>
      s.toLowerCase().includes("depression")
    );

    let score = 0;
    let reason = "";

    if (hasEmpathy) {
      score += 10;
      reason += "Empathetic personality. ";
    }

    if (hasAnxietySymptoms && hasAnxietyExpertise) {
      score += 5;
      reason += "Anxiety expertise matches client needs. ";
    }

    if (hasDepressionSymptoms && hasDepressionExpertise) {
      score += 5;
      reason += "Depression expertise matches client needs. ";
    }

    return { score, reason: reason.trim() || "General compatibility" };
  }

  // Get matching statistics for admin dashboard
  async getMatchingStatistics(): Promise<{
    totalTherapists: number;
    therapistsWithPersonalityData: number;
    therapistsWithOnboardingData: number;
    averageExperience: number;
    topSpecializations: Array<{ name: string; count: number }>;
  }> {
    try {
      const therapists = await this.getEnhancedTherapistProfiles();

      const withPersonality = therapists.filter((t) => t.personalityDescription).length;
      const withOnboarding = therapists.filter((t) => t.qualifications).length;

      const totalExperience = therapists
        .filter((t) => t.yearsOfExperience)
        .reduce((sum, t) => sum + (t.yearsOfExperience || 0), 0);
      const avgExperience =
        totalExperience / therapists.filter((t) => t.yearsOfExperience).length || 0;

      // Count specializations
      const specializationCount: Record<string, number> = {};
      therapists.forEach((t) => {
        if (t.therapySpecialisations) {
          t.therapySpecialisations.forEach((spec) => {
            specializationCount[spec] = (specializationCount[spec] || 0) + 1;
          });
        }
      });

      const topSpecializations = Object.entries(specializationCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalTherapists: therapists.length,
        therapistsWithPersonalityData: withPersonality,
        therapistsWithOnboardingData: withOnboarding,
        averageExperience: Math.round(avgExperience * 10) / 10,
        topSpecializations,
      };
    } catch (error: any) {
      console.error("❌ Error getting matching statistics:", error?.message || error);
      return {
        totalTherapists: 0,
        therapistsWithPersonalityData: 0,
        therapistsWithOnboardingData: 0,
        averageExperience: 0,
        topSpecializations: [],
      };
    }
  }
}

// Export for use in routes
export default TherapistMatchingService;
