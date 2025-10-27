import { z } from "zod";

// UK phone number validation with helpful error messages
const ukPhoneRegex = /^(?:\+44|0)[1-9]\d{8,10}$/;

export const phoneValidation = z
  .string()
  .min(10, "Phone number must be at least 10 digits")
  .max(15, "Phone number cannot exceed 15 characters")
  .refine((phone) => ukPhoneRegex.test(phone.replace(/\s+/g, "")), {
    message: "Please enter a valid UK phone number (e.g., +44 7123 456789 or 07123 456789)",
  });

// UK postcode validation
const ukPostcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

export const postcodeValidation = z
  .string()
  .min(5, "Postcode must be at least 5 characters")
  .max(8, "Postcode cannot exceed 8 characters")
  .refine((postcode) => ukPostcodeRegex.test(postcode.replace(/\s+/g, "")), {
    message: "Please enter a valid UK postcode (e.g., SW1A 1AA or M1 1AA)",
  });

// Name validation that prevents security issues
export const nameValidation = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name cannot exceed 50 characters")
  .refine((name) => !/[<>\"'&]/.test(name), {
    message: "Name cannot contain special characters like <, >, \", ', or &",
  })
  .refine((name) => !/^\s|\s$/.test(name), {
    message: "Name cannot start or end with spaces",
  });

// Address validation
export const addressValidation = z
  .string()
  .min(5, "Address must be at least 5 characters")
  .max(100, "Address cannot exceed 100 characters")
  .refine((address) => !/[<>\"'&]/.test(address), {
    message: "Address cannot contain special characters like <, >, \", ', or &",
  });

// City validation
export const cityValidation = z
  .string()
  .min(2, "City must be at least 2 characters")
  .max(50, "City cannot exceed 50 characters")
  .refine((city) => /^[a-zA-Z\s\-']+$/.test(city), {
    message: "City can only contain letters, spaces, hyphens, and apostrophes",
  });

// Email validation with clear requirements
export const emailValidation = z
  .string()
  .email("Please enter a valid email address")
  .min(5, "Email must be at least 5 characters")
  .max(100, "Email cannot exceed 100 characters")
  .refine((email) => !email.includes(" "), {
    message: "Email address cannot contain spaces",
  });

// Text area validation for descriptions
export const textAreaValidation = z
  .string()
  .max(1000, "Description cannot exceed 1000 characters")
  .refine((text) => !/[<>\"'&]/.test(text), {
    message: "Description cannot contain special characters like <, >, \", ', or &",
  })
  .optional();

// Date validation
export const dateValidation = z.string().refine(
  (date) => {
    const dateObj = new Date(date);
    const now = new Date();
    const hundredYearsAgo = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
    return dateObj >= hundredYearsAgo && dateObj <= now;
  },
  {
    message: "Please enter a valid date between 100 years ago and today",
  }
);

// Helper function to format phone numbers
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("44")) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith("0")) {
    return `+44${cleaned.slice(1)}`;
  }
  return phone;
};

// Helper function to format postcode
export const formatPostcode = (postcode: string): string => {
  const cleaned = postcode.replace(/\s+/g, "").toUpperCase();
  if (cleaned.length >= 5) {
    return `${cleaned.slice(0, -3)} ${cleaned.slice(-3)}`;
  }
  return cleaned;
};

// Helper function to format UK sort code
export const formatSortCode = (sortCode: string): string => {
  const cleaned = sortCode.replace(/[^\d]/g, "");
  if (cleaned.length <= 2) {
    return cleaned;
  } else if (cleaned.length <= 4) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
  } else if (cleaned.length <= 6) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`;
  }
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`;
};

// Helper function to validate form data before submission
export const validateFormData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check for potentially suspicious patterns
  const dataString = JSON.stringify(data).toLowerCase();

  // Check for script injection attempts
  if (dataString.includes("<script") || dataString.includes("javascript:")) {
    errors.push("Form data contains potentially harmful content");
  }

  // Check for SQL injection patterns
  if (dataString.includes("union select") || dataString.includes("drop table")) {
    errors.push("Form data contains invalid content");
  }

  // Check for excessive special characters
  const specialCharCount = (dataString.match(/[<>\"'&;]/g) || []).length;
  if (specialCharCount > 10) {
    errors.push("Form contains too many special characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Form submission helper with security validation
export const secureFormSubmit = async (data: any, endpoint: string) => {
  const validation = validateFormData(data);

  if (!validation.isValid) {
    throw new Error(`Form validation failed: ${validation.errors.join(", ")}`);
  }

  // Additional security: sanitize data
  const sanitizedData = JSON.parse(
    JSON.stringify(data, (key, value) => {
      if (typeof value === "string") {
        // Remove potentially harmful characters but keep legitimate content
        return value
          .replace(/[<>]/g, "") // Remove angle brackets
          .replace(/javascript:/gi, "") // Remove javascript protocol
          .replace(/on\w+=/gi, ""); // Remove event handlers
      }
      return value;
    })
  );

  return sanitizedData;
};

export const VALIDATION_MESSAGES = {
  PHONE: {
    FORMAT: "Use format: +44 7123 456789 or 07123 456789",
    REQUIRED: "Phone number is required for appointment bookings",
  },
  POSTCODE: {
    FORMAT: "Use format: SW1A 1AA or M1 1AA",
    REQUIRED: "Postcode helps us match you with local therapists",
  },
  NAME: {
    FORMAT: "Only letters, spaces, and hyphens allowed",
    REQUIRED: "Full name is required for therapy sessions",
  },
  EMAIL: {
    FORMAT: "Use format: name@example.com",
    REQUIRED: "Email is required for appointment confirmations",
  },
  DATE: {
    FORMAT: "Select a date from the calendar picker",
    REQUIRED: "Date of birth helps us provide age-appropriate care",
  },
} as const;
