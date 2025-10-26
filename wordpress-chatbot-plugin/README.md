# Hive Wellness Chatbot WordPress Plugin

A native WordPress chatbot plugin that provides AI-powered therapy support without CORS/CSP restrictions.

## Overview

This plugin completely replaces iframe-based chatbot implementations with a native WordPress solution that integrates seamlessly with the Hive Wellness therapy platform.

## Features

- ✅ **Native WordPress Integration** - No external iframes or dependencies
- ✅ **CORS/CSP Compliant** - Bypasses browser security restrictions  
- ✅ **AI-Powered** - Connected to OpenAI via Hive Wellness API
- ✅ **Mobile Responsive** - Optimized for all device sizes
- ✅ **Quick Actions** - "Our Therapists", "Book Session", "Pricing" buttons
- ✅ **Professional Disclaimer** - Privacy and clinical data warnings
- ✅ **Customizable** - Position, color, and branding options
- ✅ **Shortcode Support** - `[hive_chatbot]` for flexible placement
- ✅ **Admin Settings** - Easy configuration panel
- ✅ **Accessibility Ready** - Screen reader and keyboard support

## Installation

### Via WordPress Admin

1. Download the plugin zip file
2. Go to **Plugins > Add New > Upload Plugin**
3. Choose the zip file and click **Install Now**
4. Click **Activate Plugin**
5. Go to **Settings > Hive Chatbot** to configure

### Manual Installation

1. Extract the plugin files
2. Upload the `hive-wellness-chatbot` folder to `/wp-content/plugins/`
3. Activate through the WordPress admin
4. Configure via **Settings > Hive Chatbot**

## Configuration

Navigate to **Settings > Hive Chatbot** in your WordPress admin:

| Setting | Description | Default |
|---------|-------------|---------|
| Enable Chatbot | Turn the widget on/off | Enabled |
| API Endpoint | Hive Wellness API URL | `https://api.hive-wellness.co.uk` |
| Widget Position | Placement on page | Bottom Right |
| Primary Color | Theme color | `#9306B1` (Hive Purple) |
| Show Branding | Display "Powered by" text | Enabled |

## Usage

### Automatic Display

When enabled, the chatbot automatically appears on all pages in the configured position.

### Shortcode Usage

Use the `[hive_chatbot]` shortcode for custom placement:

```php
// Basic usage
[hive_chatbot]

// With custom position
[hive_chatbot position="bottom-left"]

// Compact version without branding
[hive_chatbot compact="true" show_branding="false"]

// All options
[hive_chatbot position="top-right" compact="false" show_branding="true"]
```

### Parameters

- `position`: `bottom-right`, `bottom-left`, `top-right`, `top-left`
- `compact`: `true` for smaller widget, `false` for full size
- `show_branding`: `true` to show branding, `false` to hide

## API Integration

The plugin connects to the Hive Wellness API:

- **Chat Endpoint**: `https://api.hive-wellness.co.uk/api/chatbot/chat`
- **Feedback Endpoint**: `https://api.hive-wellness.co.uk/api/chatbot/feedback`
- **Rate Limiting**: 10 requests per minute per IP
- **Security**: WordPress nonce verification + HTTPS only

## Customization

### CSS Customization

The plugin includes comprehensive CSS that can be customized:

```css
/* Override primary color */
.hive-chatbot-widget .hive-chatbot-button {
    background-color: #your-color !important;
}

/* Customize position */
.hive-chatbot-widget.position-bottom-right {
    bottom: 30px;
    right: 30px;
}
```

### JavaScript Hooks

The plugin provides JavaScript events for advanced customization:

```javascript
// Chat opened
document.addEventListener('hive-chatbot-opened', function(e) {
    console.log('Chatbot opened');
});

// Message sent
document.addEventListener('hive-chatbot-message-sent', function(e) {
    console.log('Message sent:', e.detail.message);
});
```

## Technical Requirements

- **WordPress**: 5.0+
- **PHP**: 7.4+
- **Browser Support**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Dependencies**: jQuery (included with WordPress)

## Security Features

- WordPress nonce verification for all AJAX requests
- Rate limiting to prevent abuse
- Content filtering for inappropriate messages
- HTTPS-only API communication
- No sensitive data stored locally

## Accessibility

The plugin includes comprehensive accessibility features:

- ARIA labels for screen readers
- Keyboard navigation support
- High contrast mode compatibility
- Focus management
- Semantic HTML structure

## File Structure

```
hive-wellness-chatbot/
├── hive-wellness-chatbot.php    # Main plugin file
├── assets/
│   ├── css/
│   │   └── chatbot.css          # Widget styles
│   ├── js/
│   │   └── chatbot.js           # Widget functionality
│   └── images/                  # Plugin images
├── languages/                   # Translation files
├── readme.txt                   # WordPress.org readme
└── README.md                    # This file
```

## Development

### Local Development

1. Clone this repository to your WordPress plugins directory
2. Activate the plugin
3. Set up your development API endpoint in settings
4. Test with the local Hive Wellness API

### API Testing

Test the API integration:

```bash
# Test chat endpoint
curl -X POST https://api.hive-wellness.co.uk/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "source": "wordpress"}'

# Test feedback endpoint  
curl -X POST https://api.hive-wellness.co.uk/api/chatbot/feedback \
  -H "Content-Type: application/json" \
  -d '{"messageId": "test", "feedback": "positive"}'
```

## Troubleshooting

### Common Issues

**Chatbot not appearing:**
- Check if plugin is activated
- Verify "Enable Chatbot" is checked in settings
- Clear any caching plugins

**API connection errors:**
- Verify API endpoint in settings
- Check server has cURL support
- Ensure HTTPS is working

**Styling conflicts:**
- The plugin uses high CSS specificity to prevent conflicts
- Check browser console for JavaScript errors
- Try disabling other plugins temporarily

### Debug Mode

Enable WordPress debug mode to see detailed error messages:

```php
// wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

## Support

For technical support:
- Email: support@hive-wellness.co.uk
- Website: https://hive-wellness.co.uk

## License

GPL v2 or later - https://www.gnu.org/licenses/gpl-2.0.html

## Changelog

### 1.0.0
- Initial release
- Native WordPress integration
- CORS/CSP compliant implementation
- Mobile responsive design
- AI-powered conversations
- Quick action buttons
- Admin settings panel
- Shortcode support
- Accessibility features