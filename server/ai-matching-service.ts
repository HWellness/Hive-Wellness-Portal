import OpenAI from "openai";
import { openaiTracking } from "./openai-tracking-service";
import { piiDetectionService } from "./pii-detection-service";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ClientProfile {
  id: string;
  demographics: {
    age: number;
    gender: string;
    location: string;
    culturalBackground?: string;
    languages: string[];
  };
  therapeuticNeeds: {
    primaryConcerns: string[];
    secondaryConcerns: string[];
    traumaHistory: boolean;
    previousTherapyExperience: boolean;
    mentalHealthDiagnoses: string[];
    medicationStatus: string;
  };
  preferences: {
    therapistGender: string;
    therapistAge: string;
    sessionFormat: string; // 'online' (video sessions only)
    sessionFrequency: string;
    communicationStyle: string; // 'direct' | 'gentle' | 'collaborative'
    religiousConsiderations: string;
    lgbtqAffirming: boolean;
  };
  personalityFactors: {
    introversion: number; // 1-10 scale
    openness: number;
    conscientiousness: number;
    emotionalStability: number;
    agreeableness: number;
  };
  goals: {
    shortTerm: string[];
    longTerm: string[];
    specificOutcomes: string[];
  };
}

export interface TherapistProfile {
  id: string;
  credentials: {
    licenses: string[];
    certifications: string[];
    yearsExperience: number;
    education: string[];
    specialTraining: string[];
  };
  specialisations: {
    primarySpecialties: string[];
    secondarySpecialties: string[];
    populationsServed: string[];
    issuesAddressed: string[];
  };
  therapeuticApproaches: {
    primaryApproaches: string[];
    secondaryApproaches: string[];
    evidenceBasedPractices: string[];
    interventionTypes: string[];
  };
  demographics: {
    age: number;
    gender: string;
    culturalBackground: string;
    languages: string[];
  };
  practiceDetails: {
    sessionFormats: string[];
    availability: string[];
    location: string;
    insuranceAccepted: string[];
    sessionLength: string[];
    cancellationPolicy: string;
  };
  personalityProfile: {
    communicationStyle: string;
    therapeuticStyle: string;
    directness: number; // 1-10 scale
    empathy: number;
    structure: number;
    flexibility: number;
  };
  clientPreferences: {
    ageRanges: string[];
    genderPreferences: string[];
    culturalCompetencies: string[];
    specialPopulations: string[];
  };
}

export interface ConnectingResult {
  compatibilityScore: number;
  reasoning: string;
  strengths: string[];
  considerations: string[];
  confidence: number;
  recommendations: string[];
}

export class AIConnectingService {
  async analyseCompatibility(
    clientProfile: ClientProfile,
    therapistProfile: TherapistProfile,
    userId?: string
  ): Promise<ConnectingResult> {
    try {
      const prompt = this.buildConnectingPrompt(clientProfile, therapistProfile);

      // Protect PII before sending to OpenAI (use AI detection for contextual PII like names/locations)
      const { maskedText: maskedPrompt } = await piiDetectionService.detectAndMask(prompt, {
        useAIDetection: true,
      });

      // Use tracking wrapper instead of direct OpenAI call
      const response = await openaiTracking.createChatCompletion(
        {
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert clinical psychologist and therapist connecting specialist with 20+ years of experience. Your task is to analyse the compatibility between a client seeking therapy and a potential therapist.

              IMPORTANT: For privacy protection, some sensitive information in the client and therapist profiles may be replaced with tokens like [PII_EMAIL_1], [PII_PHONE_2], [PII_NHS_3], etc. These tokens represent real personal information that has been masked for security. Treat them as placeholders for actual data and continue your analysis normally.

              Consider these key factors:
              1. Clinical fit - alignment between client needs and therapist specialisations
              2. Therapeutic approach compatibility - connection between client preferences and therapist methods
              3. Cultural and demographic considerations - cultural competency and comfort
              4. Communication style alignment - personality and interaction preferences
              5. Practical logistics - availability, format, location compatibility
              6. Evidence-based effectiveness - likelihood of positive therapeutic outcomes

              Provide a comprehensive analysis with a compatibility score (1-100), detailed reasoning, specific strengths, potential considerations, confidence level, and actionable recommendations.

              Respond in JSON format with this structure:
              {
                "compatibilityScore": number,
                "reasoning": "detailed explanation",
                "strengths": ["strength1", "strength2", ...],
                "considerations": ["consideration1", "consideration2", ...],
                "confidence": number,
                "recommendations": ["rec1", "rec2", ...]
              }`,
            },
            {
              role: "user",
              content: maskedPrompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3, // Lower temperature for more consistent analysis
          max_tokens: 2000,
        },
        {
          userId,
          featureType: "therapist_matching",
          metadata: {
            clientId: clientProfile.id,
            therapistId: therapistProfile.id,
          },
        }
      );

      const result = JSON.parse(response.choices[0].message.content || "{}");

      return {
        compatibilityScore: Math.max(1, Math.min(100, result.compatibilityScore || 50)),
        reasoning: result.reasoning || "Analysis completed",
        strengths: result.strengths || [],
        considerations: result.considerations || [],
        confidence: Math.max(0, Math.min(100, result.confidence || 70)),
        recommendations: result.recommendations || [],
      };
    } catch (error) {
      console.error("AI connecting analysis error:", error);
      throw new Error(
        "Failed to analyse compatibility: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }

  private buildConnectingPrompt(client: ClientProfile, therapist: TherapistProfile): string {
    return `
CLIENT PROFILE:
Demographics: ${client.demographics.age}yo ${client.demographics.gender}, ${client.demographics.location}
Cultural Background: ${client.demographics.culturalBackground || "Not specified"}
Languages: ${client.demographics.languages.join(", ")}

Primary Concerns: ${client.therapeuticNeeds.primaryConcerns.join(", ")}
Secondary Concerns: ${client.therapeuticNeeds.secondaryConcerns.join(", ")}
Trauma History: ${client.therapeuticNeeds.traumaHistory ? "Yes" : "No"}
Previous Therapy: ${client.therapeuticNeeds.previousTherapyExperience ? "Yes" : "No"}
Mental Health Diagnoses: ${client.therapeuticNeeds.mentalHealthDiagnoses.join(", ") || "None specified"}
Medication Status: ${client.therapeuticNeeds.medicationStatus}

Client Preferences:
- Therapist Gender: ${client.preferences.therapistGender}
- Therapist Age: ${client.preferences.therapistAge}
- Session Format: ${client.preferences.sessionFormat}
- Communication Style: ${client.preferences.communicationStyle}
- Religious Considerations: ${client.preferences.religiousConsiderations}
- LGBTQ+ Affirming: ${client.preferences.lgbtqAffirming ? "Yes" : "No"}

Personality (1-10 scale):
- Introversion: ${client.personalityFactors.introversion}
- Openness: ${client.personalityFactors.openness}
- Conscientiousness: ${client.personalityFactors.conscientiousness}
- Emotional Stability: ${client.personalityFactors.emotionalStability}
- Agreeableness: ${client.personalityFactors.agreeableness}

Goals:
- Short-term: ${client.goals.shortTerm.join(", ")}
- Long-term: ${client.goals.longTerm.join(", ")}
- Specific Outcomes: ${client.goals.specificOutcomes.join(", ")}

THERAPIST PROFILE:
Demographics: ${therapist.demographics.age}yo ${therapist.demographics.gender}
Cultural Background: ${therapist.demographics.culturalBackground}
Languages: ${therapist.demographics.languages.join(", ")}
Experience: ${therapist.credentials.yearsExperience} years

Licenses: ${therapist.credentials.licenses.join(", ")}
Education: ${therapist.credentials.education.join(", ")}
Specialisations: ${therapist.specialisations.primarySpecialties.join(", ")}
Secondary Specialisations: ${therapist.specialisations.secondarySpecialties.join(", ")}
Populations Served: ${therapist.specialisations.populationsServed.join(", ")}
Issues Addressed: ${therapist.specialisations.issuesAddressed.join(", ")}

Therapeutic Approaches:
- Primary: ${therapist.therapeuticApproaches.primaryApproaches.join(", ")}
- Secondary: ${therapist.therapeuticApproaches.secondaryApproaches.join(", ")}
- Evidence-Based: ${therapist.therapeuticApproaches.evidenceBasedPractices.join(", ")}

Communication Style: ${therapist.personalityProfile.communicationStyle}
Therapeutic Style: ${therapist.personalityProfile.therapeuticStyle}
Directness: ${therapist.personalityProfile.directness}/10
Empathy: ${therapist.personalityProfile.empathy}/10
Structure: ${therapist.personalityProfile.structure}/10
Flexibility: ${therapist.personalityProfile.flexibility}/10

Practice Details:
- Session Formats: ${therapist.practiceDetails.sessionFormats.join(", ")}
- Location: ${therapist.practiceDetails.location}
- Session Length: ${therapist.practiceDetails.sessionLength.join(", ")}

Please analyse this client-therapist pairing and provide a comprehensive compatibility assessment.
    `;
  }

  async generateClientAnalysis(clientProfile: ClientProfile): Promise<{
    riskFactors: string[];
    therapeuticPriorities: string[];
    recommendedApproaches: string[];
    culturalConsiderations: string[];
    progressIndicators: string[];
  }> {
    try {
      const prompt = `
Analyse this client profile and provide therapeutic insights:

CLIENT PROFILE:
Demographics: ${clientProfile.demographics.age}yo ${clientProfile.demographics.gender}, ${clientProfile.demographics.location}
Cultural Background: ${clientProfile.demographics.culturalBackground || "Not specified"}
Languages: ${clientProfile.demographics.languages.join(", ")}

Primary Concerns: ${clientProfile.therapeuticNeeds.primaryConcerns.join(", ")}
Secondary Concerns: ${clientProfile.therapeuticNeeds.secondaryConcerns.join(", ")}
Trauma History: ${clientProfile.therapeuticNeeds.traumaHistory ? "Yes" : "No"}
Previous Therapy: ${clientProfile.therapeuticNeeds.previousTherapyExperience ? "Yes" : "No"}
Mental Health Diagnoses: ${clientProfile.therapeuticNeeds.mentalHealthDiagnoses.join(", ") || "None specified"}

Goals:
- Short-term: ${clientProfile.goals.shortTerm.join(", ")}
- Long-term: ${clientProfile.goals.longTerm.join(", ")}
      `;

      // Protect PII before sending to OpenAI (use AI detection for contextual PII like names/locations)
      const { maskedText: maskedPrompt } = await piiDetectionService.detectAndMask(prompt, {
        useAIDetection: true,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior clinical psychologist analysing a client's therapeutic needs. 
            
            IMPORTANT: For privacy protection, some sensitive information may be replaced with tokens like [PII_EMAIL_1], [PII_PHONE_2], [PII_NHS_3], etc. These represent real personal data that has been masked for security. Treat them as placeholders and continue your analysis normally.
            
            Provide insights in JSON format:
            {
              "riskFactors": ["factor1", "factor2", ...],
              "therapeuticPriorities": ["priority1", "priority2", ...],
              "recommendedApproaches": ["approach1", "approach2", ...],
              "culturalConsiderations": ["consideration1", "consideration2", ...],
              "progressIndicators": ["indicator1", "indicator2", ...]
            }`,
          },
          {
            role: "user",
            content: maskedPrompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      console.error("Client analysis error:", error);
      throw new Error("Failed to analyse client profile");
    }
  }

  async generateTherapistAnalysis(therapistProfile: TherapistProfile): Promise<{
    strengths: string[];
    idealClientTypes: string[];
    approaches: string[];
    culturalCompetencies: string[];
    practiceStyle: string;
  }> {
    try {
      const prompt = `
Analyse this therapist profile and provide professional insights:

THERAPIST PROFILE:
Demographics: ${therapistProfile.demographics.age}yo ${therapistProfile.demographics.gender}
Experience: ${therapistProfile.credentials.yearsExperience} years
Specialisations: ${therapistProfile.specialisations.primarySpecialties.join(", ")}
Approaches: ${therapistProfile.therapeuticApproaches.primaryApproaches.join(", ")}
Communication Style: ${therapistProfile.personalityProfile.communicationStyle}
Therapeutic Style: ${therapistProfile.personalityProfile.therapeuticStyle}
      `;

      // Protect PII before sending to OpenAI (use AI detection for contextual PII like names/locations)
      const { maskedText: maskedPrompt } = await piiDetectionService.detectAndMask(prompt, {
        useAIDetection: true,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are analysing a therapist's professional profile.
            
            IMPORTANT: For privacy protection, some sensitive information may be replaced with tokens like [PII_EMAIL_1], [PII_PHONE_2], etc. These represent real personal data that has been masked for security. Treat them as placeholders and continue your analysis normally.
            
            Provide insights in JSON format:
            {
              "strengths": ["strength1", "strength2", ...],
              "idealClientTypes": ["type1", "type2", ...],
              "approaches": ["approach1", "approach2", ...],
              "culturalCompetencies": ["competency1", "competency2", ...],
              "practiceStyle": "description of therapeutic style"
            }`,
          },
          {
            role: "user",
            content: maskedPrompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      console.error("Therapist analysis error:", error);
      throw new Error("Failed to analyse therapist profile");
    }
  }
}

export const aiConnectingService = new AIConnectingService();
