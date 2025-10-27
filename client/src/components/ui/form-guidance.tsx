import { ChangeEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, CheckCircle, AlertTriangle } from "lucide-react";

interface FormGuidanceProps {
  type: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  suggestions?: string[];
  className?: string;
}

export function FormGuidance({
  type,
  title,
  message,
  suggestions,
  className = "",
}: FormGuidanceProps) {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      case "warning":
      case "error":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    switch (type) {
      case "error":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <Alert variant={getVariant()} className={`mt-2 ${className}`}>
      {getIcon()}
      <AlertDescription>
        {title && <div className="font-medium mb-1">{title}</div>}
        <div>{message}</div>
        {suggestions && suggestions.length > 0 && (
          <ul className="mt-2 text-sm space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface ValidatedInputProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  validation?: {
    isValid: boolean;
    message?: string;
    suggestions?: string[];
  };
  required?: boolean;
  helpText?: string;
  formatValue?: (value: string) => string;
}

export function ValidatedInput({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  validation,
  required = false,
  helpText,
  formatValue,
}: ValidatedInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const formattedValue = formatValue ? formatValue(newValue) : newValue;
    onChange(formattedValue);
  };

  const showValidation = validation && (!validation.isValid || validation.message);

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          validation && !validation.isValid ? "border-red-500 focus-visible:ring-red-500" : ""
        }`}
      />

      {helpText && !showValidation && <FormGuidance type="info" message={helpText} />}

      {showValidation && (
        <FormGuidance
          type={validation.isValid ? "success" : "error"}
          message={validation.message || ""}
          suggestions={validation.suggestions}
        />
      )}
    </div>
  );
}

// Pre-configured validation inputs for common fields
export const PhoneInput = ({
  value,
  onChange,
  ...props
}: Omit<ValidatedInputProps, "id" | "label" | "type">) => (
  <ValidatedInput
    id="phone"
    label="Phone Number"
    type="tel"
    placeholder="+44 7123 456789 or 07123 456789"
    value={value}
    onChange={onChange}
    helpText="UK phone numbers only. Include country code or start with 0."
    {...props}
  />
);

export const PostcodeInput = ({
  value,
  onChange,
  ...props
}: Omit<ValidatedInputProps, "id" | "label" | "type">) => (
  <ValidatedInput
    id="postcode"
    label="Postcode"
    type="text"
    placeholder="SW1A 1AA"
    value={value}
    onChange={onChange}
    helpText="UK postcode format. Space will be added automatically."
    formatValue={(value) => {
      const cleaned = value.replace(/\s+/g, "").toUpperCase();
      if (cleaned.length >= 5) {
        return `${cleaned.slice(0, -3)} ${cleaned.slice(-3)}`;
      }
      return cleaned;
    }}
    {...props}
  />
);

export const EmailInput = ({
  value,
  onChange,
  ...props
}: Omit<ValidatedInputProps, "id" | "label" | "type">) => (
  <ValidatedInput
    id="email"
    label="Email Address"
    type="email"
    placeholder="name@example.com"
    value={value}
    onChange={onChange}
    helpText="Must be a valid email address without spaces."
    {...props}
  />
);
