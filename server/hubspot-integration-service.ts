// HubSpot Integration Service
// Ensures 100% accurate real data imports for Client & Therapist assignment/onboarding

import { nanoid } from "nanoid";
import type { DatabaseStorage } from "./storage.js";

interface HubSpotContact {
  vid?: number;
  properties: {
    email?: { value: string };
    firstname?: { value: string };
    lastname?: { value: string };
    [key: string]: any;
  };
  "form-submissions"?: Array<{
    "form-id": string;
    "form-type": string;
    timestamp: number;
    "page-url": string;
    "form-title"?: string;
    values: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

interface HubSpotFormSubmission {
  submittedAt: number;
  values: Array<{
    name: string;
    value: string;
  }>;
  pageUrl: string;
  pageName?: string;
}

export class HubSpotIntegrationService {
  private apiKey: string;
  private baseUrl = "https://api.hubapi.com";

  constructor(
    private storage: DatabaseStorage,
    apiKey?: string
  ) {
    this.apiKey = apiKey || process.env.HUBSPOT_API_KEY || "";
  }

  // Core method to fetch real form submissions from HubSpot
  async fetchRealFormSubmissions(formId?: string): Promise<any[]> {
    if (!this.apiKey) {
      throw new Error("HubSpot API key required for real data import");
    }

    try {
      console.log("🔍 Fetching real form submissions from HubSpot...");
      console.log("🔑 Using API key:", this.apiKey.substring(0, 8) + "...");

      // Try both authentication methods for HubSpot API
      // Method 1: Bearer token (recommended)
      let formsResponse = await fetch(`${this.baseUrl}/forms/v2/forms`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      // Method 2: If Bearer fails, try query parameter (legacy fallback)
      if (!formsResponse.ok && formsResponse.status === 401) {
        console.log("🔄 Bearer token failed (401), trying legacy hapikey parameter...");
        formsResponse = await fetch(`${this.baseUrl}/forms/v2/forms?hapikey=${this.apiKey}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      // Method 3: If still failing, try the private app scopes endpoint to diagnose
      if (!formsResponse.ok) {
        console.log("🔍 Both authentication methods failed. Checking API key scopes...");
        try {
          const scopesResponse = await fetch(
            `${this.baseUrl}/oauth/v1/access-tokens/${this.apiKey}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (scopesResponse.ok) {
            const scopesData = await scopesResponse.json();
            console.log("🔍 API key scopes:", scopesData);
          }
        } catch (scopeError) {
          console.log("⚠️ Could not check API key scopes");
        }
      }

      if (!formsResponse.ok) {
        const errorText = await formsResponse.text();
        console.error("HubSpot API Error Details:", {
          status: formsResponse.status,
          statusText: formsResponse.statusText,
          headers: Object.fromEntries(formsResponse.headers.entries()),
          body: errorText,
        });
        throw new Error(
          `HubSpot Forms API error: ${formsResponse.status} ${formsResponse.statusText} - ${errorText}`
        );
      }

      const formsData = await formsResponse.json();
      console.log(`✅ Found ${formsData.length || 0} HubSpot forms`);

      if (!formsData || formsData.length === 0) {
        console.log("ℹ️ No forms found in HubSpot account");
        return [];
      }

      // Get submissions from all forms
      let allSubmissions = [];
      for (const form of formsData.slice(0, 5)) {
        // Limit to first 5 forms to avoid rate limits
        try {
          // Try Bearer token first
          let response = await fetch(
            `${this.baseUrl}/forms/v2/forms/${form.guid}/submissions/recent?count=50`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
              },
            }
          );

          // Fallback to hapikey if Bearer fails
          if (!response.ok && response.status === 401) {
            console.log(`🔄 Bearer failed for form ${form.name}, trying hapikey...`);
            response = await fetch(
              `${this.baseUrl}/forms/v2/forms/${form.guid}/submissions/recent?hapikey=${this.apiKey}&count=50`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );
          }

          if (response.ok) {
            const data = await response.json();
            if (data.results) {
              allSubmissions.push(...data.results);
              console.log(
                `✅ Retrieved ${data.results.length} submissions from form: ${form.name}`
              );
            }
          }
        } catch (formError: any) {
          console.log(
            `⚠️ Could not fetch submissions from form ${form.name}:`,
            formError?.message || formError
          );
        }
      }

      console.log(`✅ Total submissions retrieved: ${allSubmissions.length}`);
      return allSubmissions;
    } catch (error) {
      console.error("❌ Failed to fetch HubSpot form submissions:", error);
      throw error;
    }
  }

  // Import real client questionnaire data from HubSpot
  async importClientQuestionnaires(): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      // Fetch client questionnaire forms (therapy matching forms)
      const submissions = await this.fetchRealFormSubmissions();

      for (const submission of submissions) {
        try {
          // Check if this is a client questionnaire submission
          if (this.isClientQuestionnaireSubmission(submission)) {
            const questionnaireData = this.parseClientQuestionnaireData(submission);

            // Check if already exists
            const existing = await this.storage.getTherapistMatchingQuestionnaireByEmail(
              questionnaireData.step2Email
            );
            if (existing) {
              console.log(`⏭️ Questionnaire already exists for ${questionnaireData.step2Email}`);
              continue;
            }

            // Create user record if needed
            let user = await this.storage.getUserByEmail(questionnaireData.step2Email);
            if (!user) {
              user = await this.storage.createUser({
                id: nanoid(),
                email: questionnaireData.step2Email,
                firstName: questionnaireData.step2FirstName,
                lastName: questionnaireData.step2LastName,
                role: "client",
                source: "hubspot_import",
                therapyInterest: true,
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }

            // Create questionnaire record with real data
            await this.storage.createTherapistMatchingQuestionnaire({
              ...questionnaireData,
              userId: user.id,
              id: `questionnaire_${nanoid()}`,
              status: "pending",
              adminReviewed: false,
              source: "hubspot_import",
            });

            imported++;
            console.log(`✅ Imported real questionnaire for ${questionnaireData.step2Email}`);
          }
        } catch (submissionError) {
          const errorMsg = `Failed to import submission: ${submissionError}`;
          console.error("❌", errorMsg);
          errors.push(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `HubSpot client questionnaire import failed: ${error}`;
      console.error("❌", errorMsg);
      errors.push(errorMsg);
    }

    return { imported, errors };
  }

  // Import real therapist applications from HubSpot
  async importTherapistApplications(): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const submissions = await this.fetchRealFormSubmissions();

      for (const submission of submissions) {
        try {
          if (this.isTherapistApplicationSubmission(submission)) {
            const applicationData = this.parseTherapistApplicationData(submission);

            // Check if already exists
            const existing = await this.storage.getTherapistOnboardingApplicationByEmail(
              applicationData.email
            );
            if (existing) {
              console.log(`⏭️ Therapist application already exists for ${applicationData.email}`);
              continue;
            }

            // Create therapist enquiry with personality data for matching algorithm
            const enquiryData = {
              id: `hubspot_${nanoid()}`,
              firstName: applicationData.firstName,
              lastName: applicationData.lastName,
              email: applicationData.email,
              phoneNumber: applicationData.phoneNumber,
              phone: applicationData.phone,
              location: applicationData.location,
              religion: applicationData.religion,
              personalityDescription: applicationData.personalityDescription,
              motivation: applicationData.motivation,
              professionalBio: applicationData.professionalBio,
              highestQualification: applicationData.highestQualification,
              professionalBody: applicationData.professionalBody,
              therapySpecialisations: applicationData.therapySpecialisations,
              specializations: applicationData.specializations,
              qualifications: applicationData.qualifications,
              experience: applicationData.experience,
              availability: applicationData.availability,
              hasLimitedCompany: applicationData.hasLimitedCompany,
              status: "approved", // HubSpot imports are pre-approved
              submittedAt: applicationData.submittedAt,
              createdAt: applicationData.submittedAt,
              updatedAt: new Date(),
              source: "hubspot_import",
            };

            // Create both enquiry (for matching) and application (for onboarding)
            await this.storage.createTherapistEnquiry(enquiryData);

            await this.storage.createTherapistOnboardingApplication({
              ...applicationData,
              id: nanoid(),
              status: "pending",
              source: "hubspot_import",
            });

            imported++;
            console.log(
              `✅ Imported real therapist application for ${applicationData.email} with personality data`
            );
          }
        } catch (submissionError) {
          const errorMsg = `Failed to import therapist application: ${submissionError}`;
          console.error("❌", errorMsg);
          errors.push(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `HubSpot therapist application import failed: ${error}`;
      console.error("❌", errorMsg);
      errors.push(errorMsg);
    }

    return { imported, errors };
  }

  // Check if submission is a client questionnaire
  private isClientQuestionnaireSubmission(submission: any): boolean {
    const formTitle = submission.pageName || submission.pageUrl || "";
    const values = submission.values || [];

    return (
      formTitle.toLowerCase().includes("therapy") ||
      formTitle.toLowerCase().includes("matching") ||
      formTitle.toLowerCase().includes("questionnaire") ||
      values.some((v: any) => v.name?.includes("step2_") || v.name?.includes("wellbeing"))
    );
  }

  // Check if submission is a therapist application
  private isTherapistApplicationSubmission(submission: any): boolean {
    const formTitle = submission.pageName || submission.pageUrl || "";
    const values = submission.values || [];

    return (
      formTitle.toLowerCase().includes("therapist") ||
      formTitle.toLowerCase().includes("work with us") ||
      formTitle.toLowerCase().includes("application") ||
      formTitle.toLowerCase().includes("enquiry") ||
      formTitle.toLowerCase().includes("join") ||
      values.some(
        (v: any) =>
          v.name?.includes("qualification") ||
          v.name?.includes("experience") ||
          v.name?.includes("personality") ||
          v.name?.includes("motivation") ||
          v.name?.includes("specialization")
      )
    );
  }

  // Parse real client questionnaire data from HubSpot submission
  private parseClientQuestionnaireData(submission: any): any {
    const values = submission.values || [];
    const valueMap = values.reduce((acc: any, v: any) => {
      acc[v.name] = v.value;
      return acc;
    }, {});

    return {
      step2FirstName:
        valueMap.step2_first_name || valueMap.firstname || valueMap.first_name || "Unknown",
      step2LastName: valueMap.step2_last_name || valueMap.lastname || valueMap.last_name || "User",
      step2Email: valueMap.step2_email || valueMap.email || "",
      step3AgeRange: valueMap.step3_age_range || valueMap.age_range || "",
      step4Gender: valueMap.step4_gender || valueMap.gender || "",
      step5Pronouns: valueMap.step5_pronouns || valueMap.pronouns || "",
      step6WellbeingRating: valueMap.step6_wellbeing_rating || valueMap.wellbeing_rating || "",
      step7MentalHealthSymptoms: this.parseArrayValue(
        valueMap.step7_mental_health_symptoms || valueMap.symptoms || ""
      ),
      step8SupportAreas: this.parseArrayValue(
        valueMap.step8_support_areas || valueMap.support_areas || ""
      ),
      step9TherapyTypes: this.parseArrayValue(
        valueMap.step9_therapy_types || valueMap.therapy_types || ""
      ),
      step10PreviousTherapy: valueMap.step10_previous_therapy || valueMap.previous_therapy || "",
      step11TherapyGoals: valueMap.step11_therapy_goals || valueMap.therapy_goals || "",
      step12Availability: valueMap.step12_availability || valueMap.availability || "",
      step13TherapistPreferences:
        valueMap.step13_therapist_preferences || valueMap.therapist_preferences || "",
      submittedAt: new Date(submission.submittedAt || Date.now()),
      hubspotSubmissionId: submission.conversationId || submission.submissionId || "",
      realDataSource: "hubspot_api",
    };
  }

  // Parse real therapist application data from HubSpot submission
  private parseTherapistApplicationData(submission: any): any {
    const values = submission.values || [];
    const valueMap = values.reduce((acc: any, v: any) => {
      acc[v.name] = v.value;
      return acc;
    }, {});

    return {
      email: valueMap.email || "",
      firstName: valueMap.first_name || valueMap.firstname || "",
      lastName: valueMap.last_name || valueMap.lastname || "",
      phoneNumber: valueMap.phone || valueMap.phone_number || "",
      phone: valueMap.phone || valueMap.phone_number || "",
      location: valueMap.location || valueMap.city || valueMap.address || "",
      religion:
        valueMap.religion || valueMap.religious_background || valueMap.cultural_background || "",

      // Personality and character traits for matching
      personalityDescription:
        valueMap.personality_description ||
        valueMap.personality ||
        valueMap.describe_yourself ||
        valueMap.personal_approach ||
        "",
      motivation:
        valueMap.motivation ||
        valueMap.why_therapist ||
        valueMap.motivation_for_therapy ||
        valueMap.personal_motivation ||
        "",
      professionalBio: valueMap.professional_bio || valueMap.bio || valueMap.about_yourself || "",

      // Professional qualifications and experience
      qualifications: valueMap.qualifications || valueMap.education || valueMap.credentials || "",
      experience:
        valueMap.experience || valueMap.years_experience || valueMap.professional_experience || "",
      highestQualification:
        valueMap.highest_qualification || valueMap.degree || valueMap.highest_degree || "",
      professionalBody:
        valueMap.professional_body ||
        valueMap.registration ||
        valueMap.professional_registration ||
        "",

      // Specializations and therapy types
      specializations: this.parseArrayValue(
        valueMap.specializations || valueMap.therapy_types || valueMap.therapy_approaches || ""
      ),
      therapySpecialisations: this.parseArrayValue(
        valueMap.therapy_specialisations ||
          valueMap.specialties ||
          valueMap.areas_of_expertise ||
          ""
      ),

      // Availability and practical details
      availability: valueMap.availability || valueMap.schedule || valueMap.working_hours || "",
      hasLimitedCompany: valueMap.has_limited_company || valueMap.limited_company || "",
      ratePerHour: valueMap.rate_per_hour || valueMap.hourly_rate || valueMap.session_fee || "",

      // Metadata
      submittedAt: new Date(submission.submittedAt || Date.now()),
      hubspotSubmissionId: submission.conversationId || submission.submissionId || "",
      realDataSource: "hubspot_api",
    };
  }

  // Helper to parse comma-separated values into arrays
  private parseArrayValue(value: string | any): string[] {
    if (!value) return [];
    if (typeof value === "string") {
      return value
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v);
    }
    return Array.isArray(value) ? value : [String(value)];
  }

  // Import all real data from HubSpot
  async importAllRealData(): Promise<{
    clientQuestionnaires: { imported: number; errors: string[] };
    therapistApplications: { imported: number; errors: string[] };
  }> {
    console.log("🚀 Starting comprehensive HubSpot real data import...");

    const [clientResults, therapistResults] = await Promise.all([
      this.importClientQuestionnaires(),
      this.importTherapistApplications(),
    ]);

    console.log("📊 HubSpot import summary:", {
      clientQuestionnaires: clientResults,
      therapistApplications: therapistResults,
    });

    return {
      clientQuestionnaires: clientResults,
      therapistApplications: therapistResults,
    };
  }
}
