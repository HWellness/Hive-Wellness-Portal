// Generate HTML previews of all email templates with the new logo
import fs from 'fs';
import { EmailEngine } from './server/email-engine.ts';

const emailEngine = new EmailEngine();

// Test data for templates
const testData = {
  firstName: 'Robert',
  lastName: 'Johnson', 
  clientName: 'Robert Johnson',
  therapistName: 'Dr. Sarah Smith',
  specialisations: 'Anxiety, Depression, CBT',
  experience: '8',
  compatibilityScore: '92',
  connectingReasoning: 'Based on your preference for CBT and anxiety support, Dr. Smith specializes in these areas with excellent client outcomes.',
  matchReasoning: 'Based on your preference for CBT and anxiety support, Dr. Smith specializes in these areas with excellent client outcomes.',
  date: '3rd August 2025',
  time: '2:00 PM',
  duration: '60',
  sessionType: 'Individual Therapy',
  sessionUrl: 'https://api.hive-wellness.co.uk/video-session/demo123',
  bookingUrl: 'https://api.hive-wellness.co.uk/book-session/demo123',
  portalUrl: 'https://api.hive-wellness.co.uk/portal',
  hourlyRate: '120',
  body: 'This is a test of the general email template with the new Hive Wellness logo implementation.',
  content: 'Testing the email system with proper branding and logo placement.'
};

// Get all email template types
const templateTypes = ['welcome', 'appointmentReminder', 'sessionComplete', 'therapistWelcome', 'connectingComplete', 'general'];

// Generate HTML files for each template
templateTypes.forEach(templateType => {
  try {
    const template = emailEngine.EMAIL_TEMPLATES[templateType];
    if (template) {
      const htmlContent = template.template(testData);
      
      // Create a complete HTML document
      const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.subject} - Preview</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            font-family: Arial, sans-serif;
        }
        .preview-header {
            background: white;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .email-content {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
    </style>
</head>
<body>
    <div class="preview-header">
        <h1 style="margin: 0; color: #9306B1;">Email Template Preview: ${templateType}</h1>
        <p style="margin: 10px 0 0 0; color: #666;">Subject: ${template.subject}</p>
        <p style="margin: 5px 0 0 0; color: #666;">To: robert@taxstatscloud.co.uk</p>
    </div>
    
    <div class="email-content">
        ${htmlContent}
    </div>
</body>
</html>`;
      
      fs.writeFileSync(`email-preview-${templateType}.html`, fullHtml);
      console.log(`✓ Generated preview for ${templateType} template`);
    }
  } catch (error) {
    console.error(`✗ Error generating ${templateType} template:`, error);
  }
});

console.log('\n📧 Email template previews generated!');
console.log('Open the HTML files in your browser to see how the emails will look with the new logo.');
console.log('Files created:');
templateTypes.forEach(type => {
  console.log(`  - email-preview-${type}.html`);
});