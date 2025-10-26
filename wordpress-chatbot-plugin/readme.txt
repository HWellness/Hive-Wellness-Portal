=== Hive Wellness Chatbot ===
Contributors: hivewellness
Tags: chatbot, ai, therapy, mental health, support, chat, assistant
Requires at least: 5.0
Tested up to: 6.3
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Native WordPress chatbot plugin for Hive Wellness therapy services. Provides AI-powered support without CORS/CSP issues.

== Description ==

The Hive Wellness Chatbot plugin provides a seamless, native WordPress integration for our AI-powered therapy support assistant. This plugin completely bypasses CORS and CSP restrictions that can affect iframe-based implementations.

**Key Features:**

* **Native WordPress Integration** - No iframe dependencies or external scripts
* **AI-Powered Responses** - Connected to OpenAI for intelligent conversations
* **Therapy-Focused** - Specialized for mental health and therapy services
* **CORS/CSP Compliant** - Bypasses browser security restrictions
* **Mobile Responsive** - Works perfectly on all device sizes
* **Quick Action Buttons** - Instant access to "Our Therapists", "Book Session", and "Pricing"
* **Professional Disclaimer** - Includes important privacy and clinical data warnings
* **Customizable Appearance** - Hive Wellness purple branding (#9306B1) with position options
* **Shortcode Support** - Place chatbot anywhere with `[hive_chatbot]`
* **Admin Settings Panel** - Easy configuration through WordPress admin
* **Accessibility Ready** - Screen reader compatible and keyboard navigable

**About Hive Wellness:**

Hive Wellness is a UK-based therapy platform connecting clients with qualified therapists for online sessions. Our chatbot provides instant support for booking inquiries, therapist information, and general mental health guidance.

**Technical Details:**

* Uses WordPress AJAX for secure API communication
* Connects to https://api.hive-wellness.co.uk/api/chatbot
* Rate limiting and content filtering built-in
* Feedback collection for continuous improvement
* Conversation tracking for better support

== Installation ==

1. Upload the `hive-wellness-chatbot` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to Settings > Hive Chatbot to configure the plugin
4. The chatbot will automatically appear on your site when enabled

**Manual Installation:**

1. Download the plugin zip file
2. Log in to your WordPress admin panel
3. Go to Plugins > Add New > Upload Plugin
4. Choose the zip file and click Install Now
5. Click Activate Plugin

== Configuration ==

After activation, go to **Settings > Hive Chatbot** to configure:

* **Enable/Disable** - Turn the chatbot on or off
* **API Endpoint** - Set to https://api.hive-wellness.co.uk (default)
* **Widget Position** - Choose from bottom-right, bottom-left, top-right, or top-left
* **Primary Color** - Customize the color scheme (default: #9306B1)
* **Show Branding** - Display "Powered by Hive Wellness" text

== Usage ==

**Automatic Display:**
The chatbot appears automatically on all pages when enabled.

**Shortcode Usage:**
Place the chatbot anywhere using the shortcode:
`[hive_chatbot]`

**Shortcode Parameters:**
* `position` - bottom-right, bottom-left, top-right, top-left
* `compact` - true/false for smaller size
* `show_branding` - true/false to show/hide branding

**Examples:**
`[hive_chatbot position="bottom-left" compact="true"]`
`[hive_chatbot show_branding="false"]`

== Frequently Asked Questions ==

= Does this plugin require any external dependencies? =

No, this is a completely native WordPress plugin. It connects to the Hive Wellness API but doesn't require any iframe embedding or external JavaScript libraries.

= Will this work with my theme? =

Yes, the plugin is designed to work with any WordPress theme. It uses its own CSS with high specificity to prevent conflicts.

= Is the chatbot mobile-friendly? =

Absolutely! The chatbot is fully responsive and optimized for mobile devices, tablets, and desktops.

= How does this differ from iframe implementations? =

This native plugin bypasses CORS and CSP restrictions that can block iframe-based chatbots. It provides better performance, security, and user experience.

= Can I customize the appearance? =

Yes, you can change the primary color and position through the admin settings. Advanced customization is possible through CSS.

= Is the chatbot accessible? =

Yes, the chatbot includes proper ARIA labels, keyboard navigation support, and screen reader compatibility.

= What happens if the API is unavailable? =

The chatbot includes graceful error handling and will display a friendly message if the service is temporarily unavailable.

= Does this collect user data? =

The chatbot logs conversations for service improvement but follows strict privacy guidelines. Users are warned not to share sensitive clinical information.

== Screenshots ==

1. Chatbot widget in bottom-right position
2. Open chat window with conversation
3. Admin settings panel
4. Quick action buttons
5. Mobile responsive design
6. Shortcode implementation example

== Changelog ==

= 1.0.0 =
* Initial release
* Native WordPress integration
* AI-powered responses via OpenAI
* CORS/CSP compliant implementation
* Mobile responsive design
* Quick action buttons for therapy services
* Admin settings panel
* Shortcode support
* Accessibility features
* Professional disclaimer
* Feedback collection system

== Upgrade Notice ==

= 1.0.0 =
Initial release of the native WordPress chatbot plugin.

== Technical Information ==

**System Requirements:**
* WordPress 5.0 or higher
* PHP 7.4 or higher
* cURL support for API calls
* JavaScript enabled in browser

**API Integration:**
* Endpoint: https://api.hive-wellness.co.uk/api/chatbot/chat
* Feedback: https://api.hive-wellness.co.uk/api/chatbot/feedback
* Rate limited: 10 requests per minute per IP
* Secure: HTTPS only, nonce verification

**Browser Support:**
* Chrome 60+
* Firefox 55+
* Safari 12+
* Edge 79+
* Mobile browsers (iOS Safari, Chrome Mobile)

**Privacy & Security:**
* No sensitive data stored locally
* Rate limiting prevents abuse
* Content filtering for inappropriate messages
* Secure nonce verification for all requests
* Professional disclaimer about clinical data

== Support ==

For support, please contact Hive Wellness at support@hive-wellness.co.uk

Visit our website: https://hive-wellness.co.uk

== License ==

This plugin is licensed under the GPL v2 or later.

> This program is free software; you can redistribute it and/or modify
> it under the terms of the GNU General Public License, version 2, as
> published by the Free Software Foundation.
>
> This program is distributed in the hope that it will be useful,
> but WITHOUT ANY WARRANTY; without even the implied warranty of
> MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
> GNU General Public License for more details.