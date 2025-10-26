<?php
/**
 * Uninstall script for Hive Wellness Chatbot
 */

// If uninstall not called from WordPress, then exit
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

// Delete plugin options
delete_option('hive_chatbot_settings');

// Clear any cached data
wp_cache_flush();