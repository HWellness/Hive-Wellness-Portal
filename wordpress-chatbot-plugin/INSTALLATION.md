# Hive Wellness Chatbot Plugin - Installation Guide

## Quick Installation

### Method 1: WordPress Admin Upload

1. **Download**: Get the `hive-wellness-chatbot.tar.gz` file
2. **Extract**: Unzip/extract the file to get the plugin folder
3. **Upload**: In WordPress admin, go to **Plugins > Add New > Upload Plugin**
4. **Install**: Upload the extracted folder or re-zip it and upload
5. **Activate**: Click "Activate Plugin"
6. **Configure**: Go to **Settings > Hive Chatbot** to configure

### Method 2: FTP/Manual Installation

1. **Extract**: Extract the plugin files
2. **Upload**: Upload the `hive-wellness-chatbot` folder to `/wp-content/plugins/`
3. **Activate**: Go to **Plugins** in WordPress admin and activate
4. **Configure**: Go to **Settings > Hive Chatbot**

## Configuration

After activation, configure these settings in **Settings > Hive Chatbot**:

### Required Settings
- ✅ **Enable Chatbot**: Check to activate the widget
- ✅ **API Endpoint**: Set to `https://api.hive-wellness.co.uk` (default)

### Optional Settings
- **Widget Position**: Choose from bottom-right, bottom-left, top-right, top-left
- **Primary Color**: Default is `#9306B1` (Hive Wellness purple)
- **Show Branding**: Display "Powered by Hive Wellness" text

## Verification

After installation, verify the plugin works:

1. **Check Widget**: Visit your website - you should see the purple chat button
2. **Test Chat**: Click the button and send a test message
3. **Check API**: Messages should receive AI responses from the Hive Wellness API
4. **Test Mobile**: Verify the widget works on mobile devices

## Troubleshooting

### Plugin Not Appearing
- Ensure the plugin is activated in **Plugins** menu
- Check that "Enable Chatbot" is checked in settings
- Clear any caching plugins

### Chat Not Working
- Verify API endpoint is set correctly: `https://api.hive-wellness.co.uk`
- Check browser console for JavaScript errors
- Ensure your server has cURL support for API calls

### Styling Issues
- The plugin uses high CSS specificity to avoid conflicts
- Try disabling other plugins to identify conflicts
- Check for JavaScript errors in browser console

## Features Included

✅ **Native WordPress Integration** - No iframe dependencies  
✅ **CORS/CSP Compliant** - Bypasses browser restrictions  
✅ **AI-Powered Responses** - OpenAI integration via Hive Wellness API  
✅ **Mobile Responsive** - Works on all devices  
✅ **Quick Action Buttons** - "Our Therapists", "Book Session", "Pricing"  
✅ **Professional Disclaimer** - Clinical data privacy warning  
✅ **Hive Wellness Branding** - Purple theme (#9306B1)  
✅ **Position Options** - 4 corner positions available  
✅ **Shortcode Support** - `[hive_chatbot]` for custom placement  
✅ **Admin Settings** - Easy configuration panel  
✅ **Accessibility Ready** - Screen reader and keyboard support  

## Shortcode Usage

Use the shortcode for custom placement:

```
[hive_chatbot]
[hive_chatbot position="bottom-left"]
[hive_chatbot compact="true" show_branding="false"]
```

## Support

For technical support:
- Email: support@hive-wellness.co.uk
- Website: https://hive-wellness.co.uk

## Requirements

- WordPress 5.0+
- PHP 7.4+
- cURL support
- HTTPS enabled (recommended)

## Security Features

- WordPress nonce verification
- Rate limiting (10 requests/minute)
- Content filtering
- HTTPS-only API communication
- No sensitive data storage

The plugin is production-ready and includes all security best practices for WordPress plugins.