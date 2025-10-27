/**
 * Test script for PII sanitization logger
 * Run with: tsx server/test-pii-sanitization.ts
 */

import { logger, sanitizeValue } from "./lib/logger";

console.log("========================================");
console.log("PII SANITIZATION TEST");
console.log("========================================\n");

// Test 1: Email sanitization
console.log("TEST 1: Email Sanitization");
console.log("----------------------------");
logger.info("User logged in", {
  email: "john.doe@example.com",
  userId: "12345",
  name: "John Doe",
});
console.log("✓ Emails should be hashed as [EMAIL:hash]\n");

// Test 2: Phone number sanitization
console.log("TEST 2: Phone Number Sanitization");
console.log("----------------------------");
logger.info("Contact details updated", {
  phone: "+44 7700 900123",
  mobile: "07700900456",
  email: "patient@clinic.com",
});
console.log("✓ Phone numbers should be hashed as [PHONE:hash]\n");

// Test 3: Medical content redaction
console.log("TEST 3: Medical Content Redaction");
console.log("----------------------------");
logger.info("Chat message received", {
  message: "I have been struggling with anxiety and depression",
  userId: "user_789",
  therapistId: "therapist_123",
});
console.log("✓ Medical keywords should trigger [REDACTED:MEDICAL_CONTENT]\n");

// Test 4: Stripe ID sanitization
console.log("TEST 4: Stripe ID Sanitization");
console.log("----------------------------");
logger.info("Payment processed", {
  paymentIntent: "pi_3ABC123def456GHI",
  transfer: "tr_XYZ789pqr123",
  customer: "cus_ABC123def456",
  amount: 12000,
});
console.log("✓ Stripe IDs should be hashed as [PAYMENT:hash], [TRANSFER:hash], etc.\n");

// Test 5: Sensitive field redaction
console.log("TEST 5: Sensitive Field Redaction");
console.log("----------------------------");
logger.info("User authentication attempt", {
  userId: "user_456",
  password: "SuperSecret123!",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  email: "test@example.com",
  apiKey: "sk_test_123456",
});
console.log("✓ password, token, apiKey should be [REDACTED:SENSITIVE]\n");

// Test 6: Error object sanitization
console.log("TEST 6: Error Object Sanitization");
console.log("----------------------------");
try {
  throw new Error("Database error: User john@example.com not found in appointments table");
} catch (error) {
  logger.error("Database operation failed", error);
}
console.log("✓ Error messages with emails should be sanitized, stack traces redacted\n");

// Test 7: Nested object sanitization
console.log("TEST 7: Nested Object Sanitization");
console.log("----------------------------");
logger.info("Booking created", {
  appointment: {
    clientEmail: "client@test.com",
    therapistId: "therapist_001",
    sessionNotes: "Patient discussed anxiety symptoms",
    duration: 60,
  },
  payment: {
    amount: 8000,
    cardNumber: "4242 4242 4242 4242",
    email: "billing@test.com",
  },
});
console.log("✓ Nested objects should have all PII sanitized recursively\n");

// Test 8: Array sanitization
console.log("TEST 8: Array Sanitization");
console.log("----------------------------");
logger.info("Bulk email send", {
  recipients: [
    { email: "user1@test.com", name: "Alice Smith" },
    { email: "user2@test.com", name: "Bob Johnson" },
  ],
  subject: "Appointment reminder",
});
console.log("✓ Arrays should have all elements sanitized\n");

// Test 9: Direct sanitization function test
console.log("TEST 9: Direct Sanitization Function");
console.log("----------------------------");
const testData = {
  userEmail: "sensitive@example.com",
  userId: "usr_123",
  chatMessage: "I need help with my depression",
  phoneNumber: "+44 7700 900000",
  paymentId: "pi_test123",
  password: "secret123",
};
const sanitized = sanitizeValue(testData);
console.log("Original:", JSON.stringify(testData, null, 2));
console.log("Sanitized:", JSON.stringify(sanitized, null, 2));
console.log("✓ All sensitive data should be sanitized\n");

console.log("========================================");
console.log("TEST COMPLETE");
console.log("Review output above to verify:");
console.log("- Emails → [EMAIL:hash]");
console.log("- Phone numbers → [PHONE:hash]");
console.log("- User IDs → [ID:hash]");
console.log("- Medical content → [REDACTED:MEDICAL_CONTENT]");
console.log("- Passwords/tokens → [REDACTED:SENSITIVE]");
console.log("- Stripe IDs → [PAYMENT:hash], [TRANSFER:hash], etc.");
console.log("- Same values get same hash (consistency)");
console.log("========================================");
