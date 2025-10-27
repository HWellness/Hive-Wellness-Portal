import { google } from "googleapis";
import { GmailService } from "./gmail-service.js";

export interface FormResponse {
  id: string;
  formType: string;
  submissionData: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  status: "pending" | "processed" | "archived";
}

export interface SheetConfig {
  spreadsheetId: string;
  worksheetName: string;
  headers: string[];
  formType: string;
}

export class GoogleSheetsService {
  private static sheets = google.sheets({ version: "v4" });

  // Default sheet configurations for different form types
  private static sheetConfigs: Record<string, SheetConfig> = {
    "introduction-call": {
      spreadsheetId: "", // Will be set from environment
      worksheetName: "Introduction Calls",
      headers: [
        "Timestamp",
        "Full Name",
        "Email",
        "Phone",
        "Preferred Date",
        "Preferred Time",
        "Concerns",
        "Therapy Type",
        "Urgency",
        "Status",
        "Booking ID",
        "Source",
      ],
      formType: "introduction-call",
    },
    "therapist-application": {
      spreadsheetId: "",
      worksheetName: "Therapist Applications",
      headers: [
        "Timestamp",
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "Qualifications",
        "Experience Years",
        "Specializations",
        "Hourly Rate",
        "Availability",
        "Status",
        "Application ID",
      ],
      formType: "therapist-application",
    },
    "client-intake": {
      spreadsheetId: "",
      worksheetName: "Client Intake",
      headers: [
        "Timestamp",
        "Full Name",
        "Email",
        "Phone",
        "Age",
        "Previous Therapy",
        "Current Concerns",
        "Preferred Therapist Gender",
        "Session Preference",
        "Emergency Contact",
        "Status",
        "Client ID",
      ],
      formType: "client-intake",
    },
    "contact-form": {
      spreadsheetId: "",
      worksheetName: "Contact Inquiries",
      headers: [
        "Timestamp",
        "Name",
        "Email",
        "Phone",
        "Subject",
        "Message",
        "Inquiry Type",
        "Status",
        "Response Sent",
      ],
      formType: "contact-form",
    },
  };

  /**
   * Initialize or update Google Sheet for form responses
   */
  static async initializeSheet(formType: string, spreadsheetId?: string): Promise<boolean> {
    try {
      // Try to get authenticated client
      let auth;
      try {
        auth = await GmailService["getAuthClient"]();
        this.sheets.context._options.auth = auth;
      } catch (authError) {
        console.error("Google authentication failed for Sheets API:", authError);
        // Return false but don't throw - this allows the frontend to show appropriate error
        return false;
      }

      const config = this.sheetConfigs[formType];
      if (!config) {
        throw new Error(`Unknown form type: ${formType}`);
      }

      // Use provided spreadsheet ID or environment variable
      const sheetId = spreadsheetId || process.env.GOOGLE_SHEETS_ID || "";
      if (!sheetId) {
        console.error(
          "No Google Sheets ID configured - please set GOOGLE_SHEETS_ID environment variable"
        );
        return false;
      }

      config.spreadsheetId = sheetId;

      // Check if worksheet exists, create if not
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });

      const existingSheet = spreadsheet.data.sheets?.find(
        (sheet) => sheet.properties?.title === config.worksheetName
      );

      if (!existingSheet) {
        // Create new worksheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: config.worksheetName,
                    gridProperties: {
                      rowCount: 1000,
                      columnCount: config.headers.length,
                    },
                  },
                },
              },
            ],
          },
        });

        console.log(`Created new worksheet: ${config.worksheetName}`);
      }

      // Set headers
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${config.worksheetName}!A1:${String.fromCharCode(64 + config.headers.length)}1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [config.headers],
        },
      });

      // Format headers (make them bold)
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: existingSheet?.properties?.sheetId || 0,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: config.headers.length,
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: {
                      bold: true,
                    },
                    backgroundColor: {
                      red: 0.9,
                      green: 0.9,
                      blue: 0.9,
                    },
                  },
                },
                fields: "userEnteredFormat(textFormat,backgroundColor)",
              },
            },
          ],
        },
      });

      console.log(`Initialized Google Sheet for ${formType}: ${config.worksheetName}`);
      return true;
    } catch (error) {
      console.error(`Failed to initialize sheet for ${formType}:`, error);

      // Check if it's an authentication error
      if (error.message?.includes("invalid_grant") || error.message?.includes("unauthorized")) {
        console.error(
          "Google OAuth token expired or invalid. Please re-authenticate in Google Cloud Console."
        );
      }

      return false;
    }
  }

  /**
   * Add form response to Google Sheet
   */
  static async addFormResponse(
    formType: string,
    responseData: Record<string, any>
  ): Promise<boolean> {
    try {
      const auth = await GmailService["getAuthClient"]();
      this.sheets.context._options.auth = auth;

      const config = this.sheetConfigs[formType];
      if (!config || !config.spreadsheetId) {
        console.error(`Sheet not configured for form type: ${formType}`);
        return false;
      }

      // Prepare row data based on headers
      const rowData: any[] = [];

      config.headers.forEach((header) => {
        switch (header) {
          case "Timestamp":
            rowData.push(new Date().toISOString());
            break;
          case "Full Name":
            rowData.push(
              responseData.fullName ||
                `${responseData.firstName || ""} ${responseData.lastName || ""}`.trim()
            );
            break;
          case "First Name":
            rowData.push(responseData.firstName || "");
            break;
          case "Last Name":
            rowData.push(responseData.lastName || "");
            break;
          case "Email":
            rowData.push(responseData.email || "");
            break;
          case "Phone":
            rowData.push(responseData.phone || "");
            break;
          case "Preferred Date":
            rowData.push(responseData.preferredDate || "");
            break;
          case "Preferred Time":
            rowData.push(responseData.preferredTime || "");
            break;
          case "Concerns":
            rowData.push(responseData.concerns || responseData.message || "");
            break;
          case "Therapy Type":
            rowData.push(responseData.therapyType || "");
            break;
          case "Urgency":
            rowData.push(responseData.urgency || "medium");
            break;
          case "Status":
            rowData.push(responseData.status || "pending");
            break;
          case "Booking ID":
            rowData.push(responseData.bookingId || responseData.id || "");
            break;
          case "Application ID":
            rowData.push(responseData.applicationId || responseData.id || "");
            break;
          case "Client ID":
            rowData.push(responseData.clientId || responseData.id || "");
            break;
          case "Source":
            rowData.push(responseData.source || "web-form");
            break;
          case "Subject":
            rowData.push(responseData.subject || "");
            break;
          case "Message":
            rowData.push(responseData.message || "");
            break;
          case "Inquiry Type":
            rowData.push(responseData.inquiryType || "general");
            break;
          case "Response Sent":
            rowData.push(responseData.responseSent ? "Yes" : "No");
            break;
          default:
            // Try to match by key name (case insensitive)
            const key = Object.keys(responseData).find(
              (k) => k.toLowerCase() === header.toLowerCase().replace(/\s+/g, "")
            );
            rowData.push(key ? responseData[key] : "");
        }
      });

      // Append to sheet
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: config.spreadsheetId,
        range: `${config.worksheetName}!A:${String.fromCharCode(64 + config.headers.length)}`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [rowData],
        },
      });

      console.log(
        `Added form response to ${config.worksheetName}:`,
        responseData.email || responseData.id
      );
      return true;
    } catch (error) {
      console.error(`Failed to add form response to sheet:`, error);
      return false;
    }
  }

  /**
   * Get form responses from Google Sheet
   */
  static async getFormResponses(formType: string, limit?: number): Promise<any[]> {
    try {
      const auth = await GmailService["getAuthClient"]();
      this.sheets.context._options.auth = auth;

      const config = this.sheetConfigs[formType];
      if (!config || !config.spreadsheetId) {
        console.error(`Sheet not configured for form type: ${formType}`);
        return [];
      }

      const range = limit
        ? `${config.worksheetName}!A1:${String.fromCharCode(64 + config.headers.length)}${limit + 1}`
        : `${config.worksheetName}!A:${String.fromCharCode(64 + config.headers.length)}`;

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range,
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) return []; // No data beyond headers

      const headers = rows[0];
      const dataRows = rows.slice(1);

      return dataRows.map((row) => {
        const record: any = {};
        headers.forEach((header, index) => {
          record[header] = row[index] || "";
        });
        return record;
      });
    } catch (error) {
      console.error(`Failed to get form responses from sheet:`, error);
      return [];
    }
  }

  /**
   * Update form response status in Google Sheet
   */
  static async updateResponseStatus(
    formType: string,
    identifier: string,
    status: string
  ): Promise<boolean> {
    try {
      const auth = await GmailService["getAuthClient"]();
      this.sheets.context._options.auth = auth;

      const config = this.sheetConfigs[formType];
      if (!config || !config.spreadsheetId) {
        return false;
      }

      // Get all data to find the row
      const responses = await this.getFormResponses(formType);
      const rowIndex = responses.findIndex(
        (response) =>
          response["Email"] === identifier ||
          response["Booking ID"] === identifier ||
          response["Application ID"] === identifier ||
          response["Client ID"] === identifier
      );

      if (rowIndex === -1) {
        console.error(`Response not found with identifier: ${identifier}`);
        return false;
      }

      const statusColumnIndex = config.headers.indexOf("Status");
      if (statusColumnIndex === -1) {
        console.error("Status column not found in sheet configuration");
        return false;
      }

      // Update the status (row index + 2 because of header row and 0-based index)
      const cellRange = `${config.worksheetName}!${String.fromCharCode(65 + statusColumnIndex)}${rowIndex + 2}`;

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: cellRange,
        valueInputOption: "RAW",
        requestBody: {
          values: [[status]],
        },
      });

      console.log(`Updated status for ${identifier} to ${status}`);
      return true;
    } catch (error) {
      console.error("Failed to update response status:", error);
      return false;
    }
  }

  /**
   * Create a new Google Spreadsheet for form responses
   */
  static async createFormSpreadsheet(
    title: string = "Hive Wellness Form Responses"
  ): Promise<string | null> {
    try {
      const auth = await GmailService["getAuthClient"]();
      this.sheets.context._options.auth = auth;

      const response = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title,
          },
        },
      });

      const spreadsheetId = response.data.spreadsheetId;

      if (spreadsheetId) {
        console.log(`Created new spreadsheet: ${title} (${spreadsheetId})`);

        // Initialize all form types in this spreadsheet
        for (const formType of Object.keys(this.sheetConfigs)) {
          await this.initializeSheet(formType, spreadsheetId);
        }

        return spreadsheetId;
      }

      return null;
    } catch (error) {
      console.error("Failed to create spreadsheet:", error);
      return null;
    }
  }

  /**
   * Get spreadsheet URL for easy admin access
   */
  static getSpreadsheetUrl(spreadsheetId: string): string {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`;
  }

  /**
   * Get available form types
   */
  static getAvailableFormTypes(): string[] {
    return Object.keys(this.sheetConfigs);
  }

  /**
   * Add custom form type configuration
   */
  static addCustomFormType(formType: string, config: Omit<SheetConfig, "formType">): void {
    this.sheetConfigs[formType] = {
      ...config,
      formType,
    };
  }
}
