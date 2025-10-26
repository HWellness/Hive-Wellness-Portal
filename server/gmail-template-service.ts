import { google } from 'googleapis';
import { GmailService } from './gmail-service.js';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomEmailOptions {
  to: string | string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateId?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export class GmailTemplateService {
  private static gmail = google.gmail({ version: 'v1' });

  /**
   * Send customised email using Gmail API with admin branding
   */
  static async sendCustomEmail(options: CustomEmailOptions): Promise<boolean> {
    try {
      console.log('📧 Sending custom Gmail email:', {
        to: options.to,
        subject: options.subject,
        templateId: options.templateId
      });

      // Get OAuth client
      const auth = await GmailService['getAuthClient']();
      this.gmail.context._options.auth = auth;

      // Prepare recipients
      const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

      // Build email message with Hive Wellness branding
      const brandedHtmlContent = this.addHiveWellnessBranding(options.htmlContent);
      
      // Create email message
      const emailMessage = [
        `To: ${recipients}`,
        `From: Hive Wellness <support@hive-wellness.co.uk>`,
        `Reply-To: support@hive-wellness.co.uk`,
        `Subject: ${options.subject}`,
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="boundary123"',
        '',
        '--boundary123',
        'Content-Type: text/plain; charset=UTF-8',
        '',
        options.textContent || this.htmlToText(brandedHtmlContent),
        '',
        '--boundary123',
        'Content-Type: text/html; charset=UTF-8',
        '',
        brandedHtmlContent,
        '',
        '--boundary123--'
      ].join('\n');

      // Encode message in base64
      const encodedMessage = Buffer.from(emailMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send email
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      console.log('✅ Custom Gmail email sent successfully:', response.data.id);
      return true;

    } catch (error) {
      console.error('❌ Failed to send custom Gmail email:', error);
      return false;
    }
  }

  /**
   * Create and save email template in Gmail drafts
   */
  static async saveEmailTemplate(template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    try {
      const auth = await GmailService['getAuthClient']();
      this.gmail.context._options.auth = auth;

      const brandedContent = this.addHiveWellnessBranding(template.htmlContent);
      
      // Create draft with template content
      const draftMessage = [
        `Subject: [TEMPLATE] ${template.name} - ${template.subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        '',
        `<!-- Template: ${template.name} -->`,
        `<!-- Tags: ${template.tags.join(', ')} -->`,
        brandedContent
      ].join('\n');

      const encodedMessage = Buffer.from(draftMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: encodedMessage
          }
        }
      });

      console.log('✅ Email template saved as Gmail draft:', response.data.id);
      return response.data.id || null;

    } catch (error) {
      console.error('❌ Failed to save email template:', error);
      return null;
    }
  }

  /**
   * Get saved email templates from Gmail drafts
   */
  static async getEmailTemplates(): Promise<EmailTemplate[]> {
    try {
      const auth = await GmailService['getAuthClient']();
      this.gmail.context._options.auth = auth;

      // Get drafts that are templates
      const response = await this.gmail.users.drafts.list({
        userId: 'me',
        q: 'subject:[TEMPLATE]'
      });

      if (!response.data.drafts) {
        return [];
      }

      const templates: EmailTemplate[] = [];

      for (const draft of response.data.drafts) {
        if (!draft.id) continue;

        try {
          const draftData = await this.gmail.users.drafts.get({
            userId: 'me',
            id: draft.id,
            format: 'full'
          });

          const message = draftData.data.message;
          if (!message?.payload) continue;

          const subject = this.getHeaderValue(message.payload.headers, 'subject');
          const templateMatch = subject?.match(/\[TEMPLATE\] (.+?) - (.+)/);
          
          if (templateMatch) {
            const [, templateName, templateSubject] = templateMatch;
            const htmlContent = this.extractHtmlContent(message.payload);
            
            // Extract tags from HTML comments
            const tagsMatch = htmlContent?.match(/<!-- Tags: (.+?) -->/);
            const tags = tagsMatch ? tagsMatch[1].split(', ').filter(Boolean) : [];

            templates.push({
              id: draft.id,
              name: templateName,
              subject: templateSubject,
              htmlContent: htmlContent || '',
              tags,
              isActive: true,
              createdAt: new Date(parseInt(message.internalDate || '0')),
              updatedAt: new Date(parseInt(message.internalDate || '0'))
            });
          }
        } catch (error) {
          console.error('Error processing draft template:', error);
        }
      }

      return templates;

    } catch (error) {
      console.error('❌ Failed to get email templates:', error);
      return [];
    }
  }

  /**
   * Update email template in Gmail
   */
  static async updateEmailTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<boolean> {
    try {
      // Delete old draft and create new one
      await this.deleteEmailTemplate(templateId);
      
      if (updates.name && updates.subject && updates.htmlContent) {
        const newTemplateId = await this.saveEmailTemplate({
          name: updates.name,
          subject: updates.subject,
          htmlContent: updates.htmlContent,
          textContent: updates.textContent,
          tags: updates.tags || [],
          isActive: updates.isActive !== false
        });
        
        return !!newTemplateId;
      }
      
      return false;

    } catch (error) {
      console.error('❌ Failed to update email template:', error);
      return false;
    }
  }

  /**
   * Delete email template from Gmail
   */
  static async deleteEmailTemplate(templateId: string): Promise<boolean> {
    try {
      const auth = await GmailService['getAuthClient']();
      this.gmail.context._options.auth = auth;

      await this.gmail.users.drafts.delete({
        userId: 'me',
        id: templateId
      });

      console.log('✅ Email template deleted:', templateId);
      return true;

    } catch (error) {
      console.error('❌ Failed to delete email template:', error);
      return false;
    }
  }

  /**
   * Send email using saved template
   */
  static async sendFromTemplate(templateId: string, options: {
    to: string | string[];
    variables?: Record<string, string>;
  }): Promise<boolean> {
    try {
      const templates = await this.getEmailTemplates();
      const template = templates.find(t => t.id === templateId);
      
      if (!template) {
        console.error('Template not found:', templateId);
        return false;
      }

      // Replace variables in template
      let subject = template.subject;
      let htmlContent = template.htmlContent;
      
      if (options.variables) {
        for (const [key, value] of Object.entries(options.variables)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          subject = subject.replace(regex, value);
          htmlContent = htmlContent.replace(regex, value);
        }
      }

      return await this.sendCustomEmail({
        to: options.to,
        subject,
        htmlContent,
        templateId
      });

    } catch (error) {
      console.error('❌ Failed to send from template:', error);
      return false;
    }
  }

  /**
   * Add Hive Wellness branding to email content
   */
  private static addHiveWellnessBranding(htmlContent: string): string {
    const brandedTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hive Wellness</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        
        body { 
            font-family: 'Inter', 'Open Sans', Arial, sans-serif; 
            line-height: 1.7; 
            color: #1e293b; 
            margin: 0; 
            padding: 30px 20px; 
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
        }
        
        .email-container { 
            max-width: 650px; 
            margin: 0 auto; 
            background: white;
            box-shadow: 0 15px 50px rgba(0,0,0,0.12), 0 5px 20px rgba(147, 6, 177, 0.08);
            border-radius: 24px;
            overflow: hidden;
            border: 1px solid rgba(147, 6, 177, 0.1);
        }
        
        .email-header { 
            background: linear-gradient(135deg, #9306B1 0%, #9306B1 50%, #9306B1 100%); 
            padding: 45px 30px; 
            text-align: center; 
        }
        
        .email-header .logo-container {
            display: inline-block; 
            background: rgba(255,255,255,0.15); 
            padding: 20px 30px; 
            border-radius: 20px; 
            backdrop-filter: blur(10px); 
            border: 1px solid rgba(255,255,255,0.2);
        }
        
        .email-header h1 { 
            color: #ffffff; 
            margin: 15px 0 0 0; 
            font-size: 32px; 
            font-family: 'Century Old Style Std', serif; 
            font-weight: bold;
        }
        
        .email-header p { 
            color: rgba(255,255,255,0.95); 
            font-family: 'Open Sans', sans-serif; 
            font-size: 18px; 
            font-weight: 500; 
            margin: 0; 
            letter-spacing: 0.5px;
        }
        
        .email-content { 
            padding: 45px 50px; 
        }
        
        .email-footer { 
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%); 
            padding: 40px 30px; 
            text-align: center; 
            border-top: 3px solid #9306B1;
            color: #e2e8f0;
        }
        
        .email-footer a { 
            color: #9306B1; 
            text-decoration: none; 
        }
        
        .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #9306B1 0%, #9306B1 50%, #9306B1 100%);
            color: #ffffff; 
            padding: 18px 36px; 
            text-decoration: none; 
            border-radius: 16px; 
            font-weight: 600; 
            font-size: 17px;
            margin: 25px 0;
            box-shadow: 0 8px 25px rgba(147, 6, 177, 0.4), 0 4px 12px rgba(184, 60, 222, 0.3);
            letter-spacing: 0.3px;
        }
        
        .highlight {
            background: linear-gradient(135deg, #fef7ff 0%, #f3e8ff 80%, #ede9fe 100%);
            padding: 28px;
            border-radius: 20px;
            border-left: 6px solid #9306B1;
            margin: 30px 0;
            box-shadow: 0 4px 15px rgba(147, 6, 177, 0.08);
        }
        
        @media (max-width: 600px) {
            .email-content { padding: 30px 25px; }
            .highlight { padding: 20px; margin: 20px 0; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="logo-container">
                <!-- Inline SVG Hive Wellness Logo -->
                <svg width="200" height="60" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto 15px;">
                    <!-- Hexagon pattern -->
                    <polygon points="20,30 35,22 50,30 50,46 35,54 20,46" fill="white" opacity="0.95"/>
                    <polygon points="50,30 65,22 80,30 80,46 65,54 50,46" fill="white" opacity="0.90"/>
                    <polygon points="20,60 35,52 50,60 50,76 35,84 20,76" fill="white" opacity="0.85"/>
                    <polygon points="50,60 65,52 80,60 80,76 65,84 50,76" fill="white" opacity="0.90"/>
                    <!-- Hive Wellness text -->
                    <text x="110" y="50" font-family="Century Old Style Std, serif" font-size="32" font-weight="bold" fill="white">Hive Wellness</text>
                </svg>
                <p>Your wellbeing, our priority</p>
            </div>
        </div>
        <div class="email-content">
            ${htmlContent}
        </div>
        <div class="email-footer">
            <!-- Mini logo -->
            <svg width="80" height="24" viewBox="0 0 160 48" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 20px;">
                <polygon points="8,12 14,9 20,12 20,18 14,21 8,18" fill="#9306B1"/>
                <polygon points="20,12 26,9 32,12 32,18 26,21 20,18" fill="#9306B1"/>
                <text x="40" y="18" font-family="Century Old Style Std, serif" font-size="12" font-weight="bold" fill="white">Hive Wellness</text>
            </svg>
            <p style="font-size: 14px; margin: 0 0 15px 0; font-weight: 500;">
                <strong>Hive Wellness</strong><br>
                Professional Mental Health Services
            </p>
            <p style="font-size: 12px; margin: 0; line-height: 1.6; color: #94a3b8;">
                Therapy tailored to you.<br>
                <a href="mailto:support@hive-wellness.co.uk" style="color: #97A5D0;">support@hive-wellness.co.uk</a> | 
                <a href="https://hive-wellness.co.uk" style="color: #97A5D0;">hive-wellness.co.uk</a>
            </p>
        </div>
    </div>
</body>
</html>`;

    return brandedTemplate;
  }

  /**
   * Convert HTML to plain text
   */
  private static htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get header value from Gmail message
   */
  private static getHeaderValue(headers: any[] | undefined, name: string): string | undefined {
    if (!headers) return undefined;
    const header = headers?.find(h => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value;
  }

  /**
   * Extract HTML content from Gmail message payload
   */
  private static extractHtmlContent(payload: any): string | null {
    if (payload.mimeType === 'text/html' && payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString();
    }
    
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString();
        }
      }
    }
    
    return null;
  }
}