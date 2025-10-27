interface HubSpotContact {
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  lifecyclestage?: string;
  lead_source?: string;
  therapy_interest?: string;
  role?: string;
}

interface HubSpotDeal {
  dealname: string;
  amount?: number;
  dealstage: string;
  pipeline?: string;
  closedate?: string;
  associatedCompanyIds?: number[];
  associatedVids?: number[];
}

class HubSpotService {
  private apiKey: string = "";
  private portalId: string = "";
  private isConfigured = false;
  private baseUrl = "https://api.hubapi.com";

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const apiKey = process.env.HUBSPOT_API_KEY;
      const portalId = process.env.HUBSPOT_PORTAL_ID;

      if (apiKey && portalId) {
        this.apiKey = apiKey;
        this.portalId = portalId;
        this.isConfigured = true;
        console.log("HubSpot service initialized successfully");
      } else {
        console.log("HubSpot credentials not configured - CRM integration disabled");
        this.isConfigured = false;
      }
    } catch (error) {
      console.error("Error initializing HubSpot service:", error);
      this.isConfigured = false;
    }
  }

  private async makeRequest(endpoint: string, method: string = "GET", data?: any): Promise<any> {
    if (!this.isConfigured) {
      throw new Error("HubSpot not configured");
    }

    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    };

    if (data && (method === "POST" || method === "PATCH")) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async createContact(
    contact: HubSpotContact
  ): Promise<{ success: boolean; contactId?: string; error?: string }> {
    try {
      const properties = {
        email: contact.email,
        firstname: contact.firstname || "",
        lastname: contact.lastname || "",
        phone: contact.phone || "",
        lifecyclestage: contact.lifecyclestage || "lead",
        lead_source: contact.lead_source || "Hive Wellness Portal",
        therapy_interest: contact.therapy_interest || "",
        role: contact.role || "client",
      };

      const data = { properties };
      const result = await this.makeRequest("/crm/v3/objects/contacts", "POST", data);

      console.log(`Contact created in HubSpot: ${result.id}`);
      return { success: true, contactId: result.id };
    } catch (error) {
      console.error("Error creating HubSpot contact:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async updateContact(
    contactId: string,
    properties: Partial<HubSpotContact>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const data = { properties };
      await this.makeRequest(`/crm/v3/objects/contacts/${contactId}`, "PATCH", data);

      console.log(`Contact updated in HubSpot: ${contactId}`);
      return { success: true };
    } catch (error) {
      console.error("Error updating HubSpot contact:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async findContactByEmail(
    email: string
  ): Promise<{ success: boolean; contact?: any; error?: string }> {
    try {
      const result = await this.makeRequest(`/crm/v3/objects/contacts/${email}?idProperty=email`);
      return { success: true, contact: result };
    } catch (error) {
      console.error("Error finding HubSpot contact:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Contact not found",
      };
    }
  }

  async createDeal(
    deal: HubSpotDeal
  ): Promise<{ success: boolean; dealId?: string; error?: string }> {
    try {
      const properties = {
        dealname: deal.dealname,
        amount: deal.amount?.toString() || "0",
        dealstage: deal.dealstage,
        pipeline: deal.pipeline || "default",
        closedate:
          deal.closedate ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days from now
      };

      const data = { properties };
      const result = await this.makeRequest("/crm/v3/objects/deals", "POST", data);

      // Associate with contacts if provided
      if (deal.associatedVids && deal.associatedVids.length > 0) {
        for (const contactId of deal.associatedVids) {
          await this.makeRequest(
            `/crm/v3/objects/deals/${result.id}/associations/contacts/${contactId}/deal_to_contact`,
            "PUT"
          );
        }
      }

      console.log(`Deal created in HubSpot: ${result.id}`);
      return { success: true, dealId: result.id };
    } catch (error) {
      console.error("Error creating HubSpot deal:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async syncTherapistEnquiry(enquiry: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    specialisations: string[];
    experience: string;
  }): Promise<{ success: boolean; contactId?: string; dealId?: string; error?: string }> {
    try {
      // Create contact
      const contactResult = await this.createContact({
        email: enquiry.email,
        firstname: enquiry.firstName,
        lastname: enquiry.lastName,
        phone: enquiry.phone,
        lifecyclestage: "opportunity",
        lead_source: "Therapist Application",
        therapy_interest: enquiry.specialisations.join(", "),
        role: "therapist",
      });

      if (!contactResult.success) {
        return { success: false, error: contactResult.error };
      }

      // Create deal for therapist onboarding
      const dealResult = await this.createDeal({
        dealname: `Therapist Onboarding - ${enquiry.firstName} ${enquiry.lastName}`,
        amount: 0,
        dealstage: "qualification",
        pipeline: "therapist-onboarding",
        associatedVids: contactResult.contactId ? [parseInt(contactResult.contactId)] : undefined,
      });

      return {
        success: true,
        contactId: contactResult.contactId,
        dealId: dealResult.dealId,
      };
    } catch (error) {
      console.error("Error syncing therapist enquiry to HubSpot:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async syncClientEnquiry(enquiry: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    therapyType?: string;
    budget?: number;
  }): Promise<{ success: boolean; contactId?: string; dealId?: string; error?: string }> {
    try {
      // Create contact
      const contactResult = await this.createContact({
        email: enquiry.email,
        firstname: enquiry.firstName,
        lastname: enquiry.lastName,
        phone: enquiry.phone,
        lifecyclestage: "lead",
        lead_source: "Client Enquiry",
        therapy_interest: enquiry.therapyType,
      });

      if (!contactResult.success) {
        return { success: false, error: contactResult.error };
      }

      // Create deal for client engagement
      const dealResult = await this.createDeal({
        dealname: `Client Therapy - ${enquiry.firstName || "Unknown"} ${enquiry.lastName || "Client"}`,
        amount: enquiry.budget,
        dealstage: "appointment",
        pipeline: "client-therapy",
        associatedVids: contactResult.contactId ? [parseInt(contactResult.contactId)] : undefined,
      });

      return {
        success: true,
        contactId: contactResult.contactId,
        dealId: dealResult.dealId,
      };
    } catch (error) {
      console.error("Error syncing client enquiry to HubSpot:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  getStatus(): { configured: boolean; apiKey?: string; portalId?: string } {
    return {
      configured: this.isConfigured,
      apiKey: this.isConfigured ? `${this.apiKey.substring(0, 10)}...` : undefined,
      portalId: this.isConfigured ? this.portalId : undefined,
    };
  }
}

export const hubspotService = new HubSpotService();
