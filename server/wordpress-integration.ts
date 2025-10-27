import { storage } from "./storage";

interface WordPressConfig {
  siteUrl: string;
  publicApiKey: string;
  privateApiKey: string;
  enabled: boolean;
  pollingInterval: number; // in minutes
  lastPolled: Date | null;
  lastError?: string | null;
}

interface GravityFormEntry {
  id: string;
  form_id: string;
  date_created: string;
  is_starred: boolean;
  is_read: boolean;
  ip: string;
  source_url: string;
  post_id: string;
  [key: string]: any; // For dynamic form fields
}

interface GravityForm {
  id: string;
  title: string;
  description: string;
  fields: GravityFormField[];
  is_active: boolean;
  date_created: string;
}

interface GravityFormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  description: string;
}

class WordPressIntegration {
  private config: WordPressConfig;
  private pollingTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      siteUrl: "",
      publicApiKey: "",
      privateApiKey: "",
      enabled: false,
      pollingInterval: 5, // 5 minutes
      lastPolled: null,
      lastError: null,
    };

    // Load saved configuration on startup
    this.loadConfiguration().catch(console.error);
  }

  // Configure WordPress integration
  configure(config: Partial<WordPressConfig>): void {
    this.config = { ...this.config, ...config };

    // Ensure lastPolled is set to null if this is the first configuration
    if (!this.config.lastPolled) {
      this.config.lastPolled = null;
    }

    // Clear any previous errors when configuring
    this.config.lastError = null;

    console.log("🔧 WordPress integration configured:", {
      siteUrl: this.config.siteUrl,
      publicApiKey: this.config.publicApiKey ? "set" : "missing",
      privateApiKey: this.config.privateApiKey ? "set" : "missing",
      enabled: this.config.enabled,
      pollingInterval: this.config.pollingInterval,
    });

    // Save configuration to persistent storage
    this.saveConfiguration().catch(console.error);

    if (this.config.enabled) {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  // Save configuration to file system for persistence
  private async saveConfiguration(): Promise<void> {
    try {
      const fs = await import("fs");
      const configPath = "./wordpress-config.json";
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
      console.log("✅ WordPress configuration saved to file");
    } catch (error) {
      console.error("Failed to save WordPress configuration:", error);
    }
  }

  // Load configuration from file system
  private async loadConfiguration(): Promise<void> {
    try {
      const fs = await import("fs");
      const configPath = "./wordpress-config.json";
      if (fs.existsSync(configPath)) {
        const savedConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
        this.config = { ...this.config, ...savedConfig };

        // Convert lastPolled back to Date object if it exists
        if (savedConfig.lastPolled) {
          this.config.lastPolled = new Date(savedConfig.lastPolled);
        }

        console.log("✅ WordPress configuration loaded from file");

        // Auto-start polling if enabled
        if (this.config.enabled) {
          this.startPolling();
        }
      }
    } catch (error) {
      console.error("Failed to load WordPress configuration:", error);
    }
  }

  // Start polling for new form submissions
  startPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }

    const intervalMs = this.config.pollingInterval * 60 * 1000;

    console.log(`Starting WordPress polling every ${this.config.pollingInterval} minutes`);

    // Poll immediately, then at intervals
    this.pollForSubmissions();

    this.pollingTimer = setInterval(() => {
      this.pollForSubmissions();
    }, intervalMs);
  }

  // Stop polling
  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    console.log("WordPress polling stopped");
  }

  // Poll for new form submissions
  async pollForSubmissions(): Promise<void> {
    if (!this.config.enabled || !this.config.siteUrl || !this.config.publicApiKey) {
      console.log("WordPress integration not properly configured");
      return;
    }

    try {
      // Reduced logging: only log WordPress polling when there are actual results

      // Get all forms
      const forms = await this.getForms();

      let totalProcessed = 0;

      for (const form of forms) {
        const newEntries = await this.getNewEntries(form.id);

        for (const entry of newEntries) {
          try {
            await this.processEntry(entry, form);
            totalProcessed++;
          } catch (error) {
            console.error(`Error processing entry ${entry.id}:`, error);
          }
        }
      }

      this.config.lastPolled = new Date();

      if (totalProcessed > 0) {
        console.log(`Processed ${totalProcessed} new WordPress form submissions`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error polling WordPress:", errorMessage);
      this.config.lastError = errorMessage;
    }
  }

  // Get all Gravity Forms using API v1
  async getForms(): Promise<GravityForm[]> {
    try {
      console.log("Fetching forms from Gravity Forms API v1...");
      const response = await this.makeApiRequest("forms", "GET");

      // Handle different response formats
      if (Array.isArray(response)) {
        return response;
      }

      // If response is an object with form IDs as keys (e.g., {"2": {...}, "3": {...}}),
      // convert to array of form objects
      if (typeof response === "object" && response !== null) {
        return Object.values(response);
      }

      return [response];
    } catch (error) {
      console.error("Error getting Gravity Forms:", error);
      throw error;
    }
  }

  // Get new entries for a form using API v1
  async getNewEntries(formId: string): Promise<GravityFormEntry[]> {
    try {
      console.log(`Fetching entries for form ${formId}...`);

      // Build search parameters for entries since last poll
      let endpoint = `forms/${formId}/entries`;

      if (this.config.lastPolled) {
        const searchParams = new URLSearchParams();
        searchParams.append(
          "search",
          JSON.stringify({
            date_created: `>${this.config.lastPolled.toISOString()}`,
          })
        );
        endpoint += `?${searchParams.toString()}`;
      }

      const response = await this.makeApiRequest(endpoint, "GET");
      return Array.isArray(response) ? response : [response];
    } catch (error) {
      console.error(`Error getting entries for form ${formId}:`, error);
      return []; // Return empty array instead of throwing to continue processing other forms
    }
  }

  // Process a single form entry
  async processEntry(entry: GravityFormEntry, form: GravityForm): Promise<void> {
    // Extract email from entry (common field patterns)
    const email = this.extractEmail(entry);

    if (!email) {
      console.log(`No email found in entry ${entry.id}, skipping`);
      return;
    }

    // Build entry data for therapy portal
    const entryData = {
      email,
      first_name: this.extractField(entry, ["first_name", "name.first", "2"]),
      last_name: this.extractField(entry, ["last_name", "name.last", "3"]),
      phone: this.extractField(entry, ["phone", "telephone", "4"]),
      message: this.extractField(entry, ["message", "comments", "description", "5"]),
      therapy_interest: this.extractField(entry, ["therapy_interest", "interest", "6"]),
      preferred_contact: this.extractField(entry, ["preferred_contact", "contact_method", "7"]),
      therapist_application: this.extractField(entry, [
        "therapist_application",
        "application_type",
        "8",
      ]),
      institution_inquiry: this.extractField(entry, ["institution_inquiry", "organisation", "9"]),
    };

    // Send to existing gravity forms endpoint
    const formSubmission = {
      form_id: entry.form_id,
      form_title: form.title,
      entry_id: entry.id,
      entry_data: entryData,
    };

    try {
      await storage.processWordPressFormSubmission({
        formId: entry.form_id,
        formTitle: form.title,
        entryId: entry.id,
        email: email,
        data: entryData,
        submittedAt: new Date(entry.date_created),
      });

      console.log(`Successfully processed WordPress entry ${entry.id} for ${email}`);
    } catch (error) {
      console.error(`Error processing entry ${entry.id} in therapy portal:`, error);
    }
  }

  // Extract email from entry
  private extractEmail(entry: GravityFormEntry): string | null {
    // Common email field patterns
    const emailFields = ["email", "email_address", "1"];

    for (const field of emailFields) {
      if (entry[field] && this.isValidEmail(entry[field])) {
        return entry[field];
      }
    }

    return null;
  }

  // Extract field value with multiple possible field names
  private extractField(entry: GravityFormEntry, fieldNames: string[]): string | null {
    for (const fieldName of fieldNames) {
      if (entry[fieldName] && entry[fieldName].trim()) {
        return entry[fieldName].trim();
      }
    }
    return null;
  }

  // Validate email format
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Generate HMAC-SHA1 signature for Gravity Forms API v1
  private async generateSignature(method: string, route: string, expires: number): Promise<string> {
    const crypto = await import("crypto");
    const stringToSign = `${this.config.publicApiKey}:${method}:${route}:${expires}`;
    const hash = crypto
      .createHmac("sha1", this.config.privateApiKey)
      .update(stringToSign)
      .digest("base64");
    return encodeURIComponent(hash);
  }

  // Make authenticated API request to WordPress using Gravity Forms API v1
  private async makeApiRequest(endpoint: string, method: string = "GET"): Promise<any> {
    // Use Gravity Forms API v1 format: /gravityformsapi/endpoint
    const route =
      endpoint.startsWith("forms") || endpoint.startsWith("entries")
        ? endpoint
        : `forms${endpoint}`;
    const url = `${this.config.siteUrl}/gravityformsapi/${route}`;

    // Generate signature-based authentication for external applications
    const expires = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const signature = await this.generateSignature(method, route, expires);

    // Add query parameters for authentication
    const authParams = new URLSearchParams({
      api_key: this.config.publicApiKey,
      signature: signature,
      expires: expires.toString(),
    });

    const finalUrl = `${url}?${authParams.toString()}`;

    console.log(
      "🔗 Making Gravity Forms API v1 request to:",
      finalUrl.replace(/signature=[^&]+/, "signature=***")
    );
    console.log("📊 Route:", route, "Method:", method, "Expires:", expires);

    const response = await fetch(finalUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Hive-Wellness-Platform/1.0",
        Accept: "application/json",
      },
    });

    console.log("📡 Gravity Forms API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Gravity Forms API error response:", errorText);

      if (response.status === 401) {
        throw new Error(
          `Authentication failed: Invalid API keys or signature. Please verify your Public Key: ${this.config.publicApiKey} and Private Key in WordPress Gravity Forms > Settings > REST API. (${response.status})`
        );
      } else if (response.status === 404) {
        throw new Error(
          `API endpoint not found: The URL ${url} was not found. Please ensure Gravity Forms plugin is installed, REST API v1 is enabled, and pretty permalinks are configured. (${response.status})`
        );
      } else {
        throw new Error(
          `Gravity Forms API request failed: ${response.status} ${response.statusText} - ${errorText}`
        );
      }
    }

    // Check if we got HTML instead of JSON (common WordPress issue)
    const responseText = await response.text();
    // Reduced API response logging for maintenance mode scenarios

    if (responseText.trim().startsWith("<!DOCTYPE") || responseText.trim().startsWith("<html")) {
      // Check if this is a "Coming Soon" or maintenance page
      if (
        responseText.includes("Coming Soon") ||
        responseText.includes("maintenance") ||
        responseText.includes("Under Construction")
      ) {
        // Reduced maintenance mode logging - only warn once per session
        return { response: [] }; // Return empty array instead of throwing error
      }

      throw new Error(`WordPress returned HTML instead of JSON. This usually means:
        1. The Gravity Forms API endpoint is not accessible at /gravityformsapi/
        2. Pretty permalinks might not be working correctly
        3. The REST API might be disabled or blocked
        4. Check that ${this.config.siteUrl}/gravityformsapi/forms is accessible`);
    }

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(
        `Failed to parse API response as JSON. Response was: ${responseText.substring(0, 200)}...`
      );
    }

    console.log("📄 Parsed JSON response:", JSON.stringify(jsonResponse, null, 2));

    // Gravity Forms API v1 always returns status 200 in HTTP header, check response body status
    if (jsonResponse.status && jsonResponse.status >= 400) {
      throw new Error(
        `API Error ${jsonResponse.status}: ${jsonResponse.response || "Unknown error"}`
      );
    }

    return jsonResponse.response || jsonResponse;
  }

  // Get configuration status
  getStatus(): WordPressConfig & { isRunning: boolean } {
    return {
      ...this.config,
      isRunning: this.pollingTimer !== null,
    };
  }

  // Manual sync trigger
  async triggerSync(): Promise<{ success: boolean; message: string; processed: number }> {
    try {
      const beforeCount = await this.getProcessedCount();
      await this.pollForSubmissions();
      const afterCount = await this.getProcessedCount();

      const processed = afterCount - beforeCount;

      return {
        success: true,
        message: `Manual sync completed successfully`,
        processed,
      };
    } catch (error) {
      return {
        success: false,
        message: `Manual sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        processed: 0,
      };
    }
  }

  // Get count of processed entries (placeholder - would need storage implementation)
  private async getProcessedCount(): Promise<number> {
    // This would query the database for processed WordPress entries
    return 0;
  }
}

// Export singleton instance
export const wordpressIntegration = new WordPressIntegration();
