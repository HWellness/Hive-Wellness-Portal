import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormGuidance, ValidatedInput } from "@/components/ui/form-guidance";
import {
  phoneValidation,
  postcodeValidation,
  emailValidation,
  formatPhoneNumber,
  formatPostcode,
} from "@/lib/form-validation";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle, AlertTriangle, Info } from "lucide-react";

interface ProfileFormData {
  personalInfo: {
    phone: string;
    emergencyPhone: string;
    postcode: string;
    email: string;
  };
}

export default function EnhancedProfileForm() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ProfileFormData>({
    personalInfo: {
      phone: "",
      emergencyPhone: "",
      postcode: "",
      email: "",
    },
  });

  const [validationResults, setValidationResults] = useState<{
    phone: { isValid: boolean; message?: string; suggestions?: string[] };
    emergencyPhone: { isValid: boolean; message?: string; suggestions?: string[] };
    postcode: { isValid: boolean; message?: string; suggestions?: string[] };
    email: { isValid: boolean; message?: string; suggestions?: string[] };
  }>({
    phone: { isValid: true },
    emergencyPhone: { isValid: true },
    postcode: { isValid: true },
    email: { isValid: true },
  });

  const validateField = (field: keyof ProfileFormData["personalInfo"], value: string) => {
    let result = { isValid: true, message: "", suggestions: [] as string[] };

    switch (field) {
      case "phone":
      case "emergencyPhone":
        try {
          phoneValidation.parse(value);
          result = { isValid: true, message: "Valid UK phone number format ✓", suggestions: [] };
        } catch (error: any) {
          result = {
            isValid: false,
            message: error.errors?.[0]?.message || "Invalid phone number",
            suggestions: [
              "Use format: +44 7123 456789 or 07123 456789",
              "Phone numbers are required for appointment bookings",
            ],
          };
        }
        break;

      case "postcode":
        try {
          postcodeValidation.parse(value);
          result = { isValid: true, message: "Valid UK postcode format ✓", suggestions: [] };
        } catch (error: any) {
          result = {
            isValid: false,
            message: error.errors?.[0]?.message || "Invalid postcode",
            suggestions: [
              "Use format: SW1A 1AA or M1 1AA",
              "Postcode helps us match you with local therapists",
            ],
          };
        }
        break;

      case "email":
        try {
          emailValidation.parse(value);
          result = { isValid: true, message: "Valid email address format ✓", suggestions: [] };
        } catch (error: any) {
          result = {
            isValid: false,
            message: error.errors?.[0]?.message || "Invalid email",
            suggestions: [
              "Use format: name@example.com",
              "Email is required for appointment confirmations",
            ],
          };
        }
        break;
    }

    setValidationResults((prev) => ({
      ...prev,
      [field]: result,
    }));

    return result.isValid;
  };

  const handleFieldChange = (field: keyof ProfileFormData["personalInfo"], value: string) => {
    // Format value if necessary
    let formattedValue = value;
    if (field === "phone" || field === "emergencyPhone") {
      formattedValue = formatPhoneNumber(value);
    } else if (field === "postcode") {
      formattedValue = formatPostcode(value);
    }

    setFormData((prev) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: formattedValue,
      },
    }));

    // Validate after user stops typing (debounced validation would be better in production)
    setTimeout(() => {
      if (formattedValue) {
        validateField(field, formattedValue);
      }
    }, 300);
  };

  const saveProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return await apiRequest("POST", "/api/client/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Saved Successfully",
        description: "Your information has been securely validated and saved.",
      });
    },
    onError: (error: any) => {
      console.error("Profile save error:", error);

      // Check for validation error response from server
      if (error?.response?.data?.code === "VALIDATION_ERROR") {
        toast({
          title: "Form Validation Failed",
          description:
            error.response.data.userGuidance?.message ||
            "Please check your form data and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Save Failed",
          description: "Please check your information and try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleSave = () => {
    // Validate all fields before saving
    const phoneValid = validateField("phone", formData.personalInfo.phone);
    const emergencyPhoneValid = validateField(
      "emergencyPhone",
      formData.personalInfo.emergencyPhone
    );
    const postcodeValid = validateField("postcode", formData.personalInfo.postcode);
    const emailValid = validateField("email", formData.personalInfo.email);

    if (phoneValid && emergencyPhoneValid && postcodeValid && emailValid) {
      saveProfileMutation.mutate(formData);
    } else {
      toast({
        title: "Validation Errors",
        description: "Please correct the highlighted fields before saving.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5 text-hive-purple" />
          Enhanced Form Validation Example
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormGuidance
          type="info"
          title="Enhanced Security & Validation"
          message="This form demonstrates enhanced validation with helpful user guidance and security protection."
          suggestions={[
            "All data is validated before saving to prevent security issues",
            "Phone numbers and postcodes are automatically formatted",
            "Clear error messages guide you to correct format",
            "Security system protects against harmful input while allowing legitimate data",
          ]}
        />

        <div className="space-y-4">
          <ValidatedInput
            id="phone"
            label="Phone Number"
            type="tel"
            placeholder="+44 7123 456789 or 07123 456789"
            value={formData.personalInfo.phone}
            onChange={(value) => handleFieldChange("phone", value)}
            validation={validationResults.phone}
            required
            helpText="UK phone numbers only. Include country code or start with 0."
          />

          <ValidatedInput
            id="emergencyPhone"
            label="Emergency Contact Phone"
            type="tel"
            placeholder="+44 7123 456789 or 07123 456789"
            value={formData.personalInfo.emergencyPhone}
            onChange={(value) => handleFieldChange("emergencyPhone", value)}
            validation={validationResults.emergencyPhone}
            required
            helpText="Emergency contact phone number for safety."
          />

          <ValidatedInput
            id="postcode"
            label="Postcode"
            type="text"
            placeholder="SW1A 1AA"
            value={formData.personalInfo.postcode}
            onChange={(value) => handleFieldChange("postcode", value)}
            validation={validationResults.postcode}
            required
            helpText="UK postcode format. Space will be added automatically."
            formatValue={formatPostcode}
          />

          <ValidatedInput
            id="email"
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            value={formData.personalInfo.email}
            onChange={(value) => handleFieldChange("email", value)}
            validation={validationResults.email}
            required
            helpText="Must be a valid email address without spaces."
          />
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={saveProfileMutation.isPending}
            className="bg-hive-purple hover:bg-hive-purple/90"
          >
            {saveProfileMutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </div>

        {/* Demo section showing validation states */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-3">Validation Status Examples:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Valid phone: +44 7123 456789</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Invalid phone: 123 (too short, wrong format)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Valid postcode: SW1A 1AA</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Invalid postcode: 12345 (not UK format - use SW1A 1AA or M1 1AA)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
