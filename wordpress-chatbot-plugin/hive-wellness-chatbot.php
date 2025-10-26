<?php
/**
 * Plugin Name: Hive Wellness Chatbot
 * Description: Native WordPress chatbot plugin for Hive Wellness therapy services. Provides AI-powered support without CORS/CSP issues.
 * Version: 1.0.0
 * Author: Hive Wellness
 * Author URI: https://hive-wellness.co.uk
 * Text Domain: hive-wellness-chatbot
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.3
 * Requires PHP: 7.4
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('HIVE_CHATBOT_VERSION', '1.0.0');
define('HIVE_CHATBOT_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('HIVE_CHATBOT_PLUGIN_URL', plugin_dir_url(__FILE__));
define('HIVE_CHATBOT_PLUGIN_BASENAME', plugin_basename(__FILE__));

/**
 * Main Hive Wellness Chatbot Plugin Class
 */
class HiveWellnessChatbot {
    
    /**
     * Plugin instance
     */
    private static $instance = null;
    
    /**
     * Get plugin instance
     */
    public static function getInstance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueueScripts'));
        add_action('wp_footer', array($this, 'renderChatbot'));
        add_action('admin_menu', array($this, 'addAdminMenu'));
        add_action('admin_init', array($this, 'adminInit'));
        
        // Register shortcode
        add_shortcode('hive_chatbot', array($this, 'chatbotShortcode'));
        
        // AJAX hooks for non-logged-in users
        add_action('wp_ajax_nopriv_hive_chatbot_chat', array($this, 'handleChatAjax'));
        add_action('wp_ajax_hive_chatbot_chat', array($this, 'handleChatAjax'));
        add_action('wp_ajax_nopriv_hive_chatbot_feedback', array($this, 'handleFeedbackAjax'));
        add_action('wp_ajax_hive_chatbot_feedback', array($this, 'handleFeedbackAjax'));
        
        // Activation and deactivation hooks
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    /**
     * Initialize plugin
     */
    public function init() {
        // Load plugin textdomain
        load_plugin_textdomain('hive-wellness-chatbot', false, dirname(HIVE_CHATBOT_PLUGIN_BASENAME) . '/languages');
    }
    
    /**
     * Enqueue scripts and styles
     */
    public function enqueueScripts() {
        // Only load if chatbot is enabled
        if (!$this->isChatbotEnabled()) {
            return;
        }
        
        // Enqueue CSS
        wp_enqueue_style(
            'hive-chatbot-style',
            HIVE_CHATBOT_PLUGIN_URL . 'assets/css/chatbot.css',
            array(),
            HIVE_CHATBOT_VERSION
        );
        
        // Enqueue JavaScript
        wp_enqueue_script(
            'hive-chatbot-script',
            HIVE_CHATBOT_PLUGIN_URL . 'assets/js/chatbot.js',
            array('jquery'),
            HIVE_CHATBOT_VERSION,
            true
        );
        
        // Localize script with settings
        wp_localize_script('hive-chatbot-script', 'hiveChatbotAjax', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('hive_chatbot_nonce'),
            'settings' => $this->getChatbotSettings(),
            'strings' => array(
                'initialMessage' => __('Hi! I\'m here to help with questions about Hive Wellness therapy services. How can I assist you today?', 'hive-wellness-chatbot'),
                'placeholder' => __('Type your message here...', 'hive-wellness-chatbot'),
                'send' => __('Send', 'hive-wellness-chatbot'),
                'thinking' => __('Thinking...', 'hive-wellness-chatbot'),
                'error' => __('I\'m sorry, I\'m having trouble connecting right now. Please try again in a moment.', 'hive-wellness-chatbot'),
                'feedback' => __('Was this helpful?', 'hive-wellness-chatbot'),
                'close' => __('Close chat', 'hive-wellness-chatbot'),
                'minimize' => __('Minimize chat', 'hive-wellness-chatbot'),
                'maximize' => __('Maximize chat', 'hive-wellness-chatbot'),
                'poweredBy' => __('Powered by Hive Wellness', 'hive-wellness-chatbot'),
                'disclaimer' => __('Please note: This chat is for general information only. Do not share sensitive clinical data. For medical emergencies, call 999.', 'hive-wellness-chatbot')
            ),
            'quickActions' => array(
                array(
                    'label' => __('Our Therapists', 'hive-wellness-chatbot'),
                    'message' => __('Tell me about your therapists and their specialties', 'hive-wellness-chatbot')
                ),
                array(
                    'label' => __('Book Session', 'hive-wellness-chatbot'),
                    'message' => __('How can I book a therapy session?', 'hive-wellness-chatbot')
                ),
                array(
                    'label' => __('Pricing', 'hive-wellness-chatbot'),
                    'message' => __('What are your therapy session prices?', 'hive-wellness-chatbot')
                )
            )
        ));
    }
    
    /**
     * Render chatbot widget
     */
    public function renderChatbot() {
        if (!$this->isChatbotEnabled() || is_admin()) {
            return;
        }
        
        echo '<div id="hive-chatbot-widget"></div>';
    }
    
    /**
     * Chatbot shortcode
     */
    public function chatbotShortcode($atts) {
        $atts = shortcode_atts(array(
            'position' => 'bottom-right',
            'compact' => 'false',
            'show_branding' => 'true'
        ), $atts);
        
        if (!$this->isChatbotEnabled()) {
            return '';
        }
        
        $compact = filter_var($atts['compact'], FILTER_VALIDATE_BOOLEAN);
        $showBranding = filter_var($atts['show_branding'], FILTER_VALIDATE_BOOLEAN);
        
        return sprintf(
            '<div class="hive-chatbot-shortcode" data-position="%s" data-compact="%s" data-branding="%s"></div>',
            esc_attr($atts['position']),
            $compact ? 'true' : 'false',
            $showBranding ? 'true' : 'false'
        );
    }
    
    /**
     * Handle chat AJAX request
     */
    public function handleChatAjax() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'hive_chatbot_nonce')) {
            wp_die('Security check failed', 'Error', array('response' => 403));
        }
        
        $message = sanitize_text_field($_POST['message']);
        $conversationId = sanitize_text_field($_POST['conversationId'] ?? '');
        
        if (empty($message)) {
            wp_send_json_error('Message is required');
            return;
        }
        
        // Get API endpoint from settings
        $apiEndpoint = $this->getApiEndpoint();
        
        // Prepare request data
        $requestData = array(
            'message' => $message,
            'source' => 'wordpress'
        );
        
        if (!empty($conversationId)) {
            $requestData['conversationId'] = $conversationId;
        }
        
        // Make request to Hive Wellness API
        $response = wp_remote_post($apiEndpoint . '/api/chatbot/chat', array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'User-Agent' => 'HiveWellnessChatbot/' . HIVE_CHATBOT_VERSION . ' WordPress/' . get_bloginfo('version')
            ),
            'body' => wp_json_encode($requestData),
            'timeout' => 30,
            'sslverify' => true
        ));
        
        if (is_wp_error($response)) {
            wp_send_json_error('Failed to connect to chat service');
            return;
        }
        
        $responseCode = wp_remote_retrieve_response_code($response);
        $responseBody = wp_remote_retrieve_body($response);
        
        if ($responseCode !== 200) {
            wp_send_json_error('Chat service unavailable');
            return;
        }
        
        $data = json_decode($responseBody, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            wp_send_json_error('Invalid response from chat service');
            return;
        }
        
        wp_send_json_success($data);
    }
    
    /**
     * Handle feedback AJAX request
     */
    public function handleFeedbackAjax() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'hive_chatbot_nonce')) {
            wp_die('Security check failed', 'Error', array('response' => 403));
        }
        
        $messageId = sanitize_text_field($_POST['messageId']);
        $feedback = sanitize_text_field($_POST['feedback']);
        $conversationId = sanitize_text_field($_POST['conversationId'] ?? '');
        
        if (empty($messageId) || !in_array($feedback, array('positive', 'negative'))) {
            wp_send_json_error('Invalid feedback data');
            return;
        }
        
        // Get API endpoint from settings
        $apiEndpoint = $this->getApiEndpoint();
        
        // Prepare request data
        $requestData = array(
            'messageId' => $messageId,
            'feedback' => $feedback,
            'source' => 'wordpress'
        );
        
        if (!empty($conversationId)) {
            $requestData['conversationId'] = $conversationId;
        }
        
        // Make request to Hive Wellness API
        $response = wp_remote_post($apiEndpoint . '/api/chatbot/feedback', array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'User-Agent' => 'HiveWellnessChatbot/' . HIVE_CHATBOT_VERSION . ' WordPress/' . get_bloginfo('version')
            ),
            'body' => wp_json_encode($requestData),
            'timeout' => 15,
            'sslverify' => true
        ));
        
        if (is_wp_error($response)) {
            wp_send_json_error('Failed to submit feedback');
            return;
        }
        
        wp_send_json_success(array('message' => 'Feedback submitted successfully'));
    }
    
    /**
     * Add admin menu
     */
    public function addAdminMenu() {
        add_options_page(
            __('Hive Wellness Chatbot', 'hive-wellness-chatbot'),
            __('Hive Chatbot', 'hive-wellness-chatbot'),
            'manage_options',
            'hive-wellness-chatbot',
            array($this, 'adminPage')
        );
    }
    
    /**
     * Admin page initialization
     */
    public function adminInit() {
        register_setting('hive_chatbot_settings', 'hive_chatbot_settings', array($this, 'validateSettings'));
        
        // General Settings Section
        add_settings_section(
            'hive_chatbot_general',
            __('General Settings', 'hive-wellness-chatbot'),
            array($this, 'generalSectionCallback'),
            'hive_chatbot_settings'
        );
        
        // Enable/Disable Field
        add_settings_field(
            'enabled',
            __('Enable Chatbot', 'hive-wellness-chatbot'),
            array($this, 'enabledFieldCallback'),
            'hive_chatbot_settings',
            'hive_chatbot_general'
        );
        
        // API Endpoint Field
        add_settings_field(
            'api_endpoint',
            __('API Endpoint', 'hive-wellness-chatbot'),
            array($this, 'apiEndpointFieldCallback'),
            'hive_chatbot_settings',
            'hive_chatbot_general'
        );
        
        // Position Field
        add_settings_field(
            'position',
            __('Widget Position', 'hive-wellness-chatbot'),
            array($this, 'positionFieldCallback'),
            'hive_chatbot_settings',
            'hive_chatbot_general'
        );
        
        // Primary Color Field
        add_settings_field(
            'primary_color',
            __('Primary Color', 'hive-wellness-chatbot'),
            array($this, 'primaryColorFieldCallback'),
            'hive_chatbot_settings',
            'hive_chatbot_general'
        );
        
        // Show Branding Field
        add_settings_field(
            'show_branding',
            __('Show Branding', 'hive-wellness-chatbot'),
            array($this, 'showBrandingFieldCallback'),
            'hive_chatbot_settings',
            'hive_chatbot_general'
        );
    }
    
    /**
     * Admin page content
     */
    public function adminPage() {
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <form action="options.php" method="post">
                <?php
                settings_fields('hive_chatbot_settings');
                do_settings_sections('hive_chatbot_settings');
                submit_button();
                ?>
            </form>
            
            <div class="hive-chatbot-admin-info">
                <h2><?php _e('Usage', 'hive-wellness-chatbot'); ?></h2>
                <p><?php _e('The chatbot will automatically appear on all pages when enabled. You can also use the shortcode for custom placement:', 'hive-wellness-chatbot'); ?></p>
                <code>[hive_chatbot position="bottom-right" compact="false" show_branding="true"]</code>
                
                <h3><?php _e('Shortcode Parameters', 'hive-wellness-chatbot'); ?></h3>
                <ul>
                    <li><strong>position:</strong> bottom-right, bottom-left, top-right, top-left</li>
                    <li><strong>compact:</strong> true or false</li>
                    <li><strong>show_branding:</strong> true or false</li>
                </ul>
            </div>
        </div>
        <?php
    }
    
    /**
     * Settings validation
     */
    public function validateSettings($input) {
        $validatedInput = array();
        
        $validatedInput['enabled'] = isset($input['enabled']) ? (bool) $input['enabled'] : false;
        $validatedInput['api_endpoint'] = esc_url_raw($input['api_endpoint']);
        $validatedInput['position'] = in_array($input['position'], array('bottom-right', 'bottom-left', 'top-right', 'top-left')) 
            ? $input['position'] : 'bottom-right';
        $validatedInput['primary_color'] = sanitize_hex_color($input['primary_color']) ?: '#9306B1';
        $validatedInput['show_branding'] = isset($input['show_branding']) ? (bool) $input['show_branding'] : true;
        
        return $validatedInput;
    }
    
    /**
     * General section callback
     */
    public function generalSectionCallback() {
        echo '<p>' . __('Configure your Hive Wellness chatbot settings below.', 'hive-wellness-chatbot') . '</p>';
    }
    
    /**
     * Enabled field callback
     */
    public function enabledFieldCallback() {
        $settings = $this->getChatbotSettings();
        $checked = checked($settings['enabled'], true, false);
        echo "<input type='checkbox' name='hive_chatbot_settings[enabled]' value='1' $checked />";
        echo '<p class="description">' . __('Enable or disable the chatbot widget.', 'hive-wellness-chatbot') . '</p>';
    }
    
    /**
     * API endpoint field callback
     */
    public function apiEndpointFieldCallback() {
        $settings = $this->getChatbotSettings();
        echo "<input type='url' name='hive_chatbot_settings[api_endpoint]' value='" . esc_attr($settings['api_endpoint']) . "' class='regular-text' />";
        echo '<p class="description">' . __('The API endpoint for the Hive Wellness chatbot service.', 'hive-wellness-chatbot') . '</p>';
    }
    
    /**
     * Position field callback
     */
    public function positionFieldCallback() {
        $settings = $this->getChatbotSettings();
        $positions = array(
            'bottom-right' => __('Bottom Right', 'hive-wellness-chatbot'),
            'bottom-left' => __('Bottom Left', 'hive-wellness-chatbot'),
            'top-right' => __('Top Right', 'hive-wellness-chatbot'),
            'top-left' => __('Top Left', 'hive-wellness-chatbot')
        );
        
        echo '<select name="hive_chatbot_settings[position]">';
        foreach ($positions as $value => $label) {
            $selected = selected($settings['position'], $value, false);
            echo "<option value='$value' $selected>$label</option>";
        }
        echo '</select>';
        echo '<p class="description">' . __('Choose where the chatbot widget appears on your site.', 'hive-wellness-chatbot') . '</p>';
    }
    
    /**
     * Primary color field callback
     */
    public function primaryColorFieldCallback() {
        $settings = $this->getChatbotSettings();
        echo "<input type='color' name='hive_chatbot_settings[primary_color]' value='" . esc_attr($settings['primary_color']) . "' />";
        echo '<p class="description">' . __('The primary color for the chatbot widget. Default is Hive Wellness purple (#9306B1).', 'hive-wellness-chatbot') . '</p>';
    }
    
    /**
     * Show branding field callback
     */
    public function showBrandingFieldCallback() {
        $settings = $this->getChatbotSettings();
        $checked = checked($settings['show_branding'], true, false);
        echo "<input type='checkbox' name='hive_chatbot_settings[show_branding]' value='1' $checked />";
        echo '<p class="description">' . __('Show "Powered by Hive Wellness" branding.', 'hive-wellness-chatbot') . '</p>';
    }
    
    /**
     * Get chatbot settings
     */
    private function getChatbotSettings() {
        $defaults = array(
            'enabled' => true,
            'api_endpoint' => 'https://api.hive-wellness.co.uk',
            'position' => 'bottom-right',
            'primary_color' => '#9306B1',
            'show_branding' => true
        );
        
        $settings = get_option('hive_chatbot_settings', array());
        return wp_parse_args($settings, $defaults);
    }
    
    /**
     * Check if chatbot is enabled
     */
    private function isChatbotEnabled() {
        $settings = $this->getChatbotSettings();
        return $settings['enabled'];
    }
    
    /**
     * Get API endpoint
     */
    private function getApiEndpoint() {
        $settings = $this->getChatbotSettings();
        return rtrim($settings['api_endpoint'], '/');
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        // Set default options
        if (!get_option('hive_chatbot_settings')) {
            update_option('hive_chatbot_settings', $this->getChatbotSettings());
        }
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Cleanup if needed
    }
}

// Initialize the plugin
HiveWellnessChatbot::getInstance();