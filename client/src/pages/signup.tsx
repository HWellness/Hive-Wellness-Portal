import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Building,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";

const signupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["client", "therapist", "institution"], {
      required_error: "Please select a role",
    }),
    organisationName: z.string().optional(),
    activationToken: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.role === "institution" && !data.organisationName) {
        return false;
      }
      return true;
    },
    {
      message: "Organisation name is required for institutional accounts",
      path: ["organisationName"],
    }
  );

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tokenValidation, setTokenValidation] = useState<{
    valid: boolean;
    clientEmail?: string;
  } | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: undefined,
      organisationName: "",
      activationToken: "",
    },
  });

  const watchedRole = form.watch("role");

  // Check for activation token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const email = urlParams.get("email");

    if (token) {
      setIsValidatingToken(true);
      // Validate the token
      apiRequest("GET", `/api/client-activation/validate/${token}`)
        .then((res) => res.json())
        .then((data) => {
          setTokenValidation(data);
          if (data.valid) {
            // Pre-fill email and set role to client
            form.setValue("email", data.clientEmail || email || "");
            form.setValue("role", "client");
            form.setValue("activationToken", token);
          }
        })
        .catch((error) => {
          setTokenValidation({ valid: false });
        })
        .finally(() => {
          setIsValidatingToken(false);
        });
    }
  }, [form]);

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/signup", data);
      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Account Created Successfully",
          description: "Welcome to Hive Wellness! You'll be redirected to your dashboard.",
        });

        // Update auth cache immediately to prevent routing issues
        const { queryClient } = await import("@/lib/queryClient");
        queryClient.setQueryData(["/api/auth/user"], result.user);

        // Force reload to ensure auth state is updated properly
        setTimeout(() => {
          switch (result.user.role) {
            case "client":
              window.location.href = "/portal";
              break;

            case "therapist":
              window.location.href = "/therapist-dashboard";
              break;

            case "institution":
              window.location.href = "/institution-dashboard";
              break;
            default:
              window.location.href = "/";
          }
        }, 1000);
      } else {
        toast({
          title: "Signup Failed",
          description: result.message || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Signup Failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-light-blue via-hive-white to-hive-light-purple flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 text-hive-purple hover:text-hive-purple/80"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Portal
            </Button>
          </Link>
          <div className="mb-6">
            <h1 className="text-3xl font-bold font-century text-hive-purple mb-2">
              Create Account
            </h1>
            <p className="text-hive-black/70 font-secondary">Join the Hive Wellness community</p>
          </div>
        </div>

        {/* Signup Form */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold font-century text-hive-purple text-center">
              Sign Up
            </CardTitle>
            <CardDescription className="text-center font-secondary text-hive-black/70">
              Create your Hive Wellness account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Token validation status */}
            {isValidatingToken && (
              <Alert className="mb-4">
                <AlertDescription>Validating activation link...</AlertDescription>
              </Alert>
            )}
            {tokenValidation && !tokenValidation.valid && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Invalid or expired activation link. Please contact support for a new activation
                  link.
                </AlertDescription>
              </Alert>
            )}
            {tokenValidation && tokenValidation.valid && (
              <Alert className="mb-4 border-green-500 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Activation link verified! You can now create your account.
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-hive-black font-medium">First Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-hive-purple/50 w-4 h-4" />
                            <Input
                              {...field}
                              className="pl-10 border-hive-purple/20 focus:border-hive-purple"
                              placeholder="Enter your first name"
                              disabled={isLoading}
                              autoComplete="given-name"
                              value={field.value || ""}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-hive-black font-medium">Last Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-hive-purple/50 w-4 h-4" />
                            <Input
                              {...field}
                              className="pl-10 border-hive-purple/20 focus:border-hive-purple"
                              placeholder="Enter your last name"
                              disabled={isLoading}
                              autoComplete="family-name"
                              value={field.value || ""}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-hive-black font-medium">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-hive-purple/50 w-4 h-4" />
                          <Input
                            {...field}
                            type="email"
                            className="pl-10 border-hive-purple/20 focus:border-hive-purple"
                            placeholder="Enter your email address"
                            disabled={isLoading}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-hive-black font-medium">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-hive-purple/50 w-4 h-4" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            className="pl-10 pr-10 border-hive-purple/20 focus:border-hive-purple"
                            placeholder="••••••••"
                            disabled={isLoading}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4 text-hive-purple/50" />
                            ) : (
                              <Eye className="w-4 h-4 text-hive-purple/50" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-hive-black font-medium">Account Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="border-hive-purple/20 focus:border-hive-purple">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="client">Client - Seeking therapy</SelectItem>
                          <SelectItem value="therapist">
                            Therapist - Mental health professional
                          </SelectItem>
                          <SelectItem value="institution">
                            Institution - Organisation account
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedRole === "institution" && (
                  <FormField
                    control={form.control}
                    name="organisationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-hive-black font-medium">
                          Organisation Name
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-hive-purple/50 w-4 h-4" />
                            <Input
                              {...field}
                              className="pl-10 border-hive-purple/20 focus:border-hive-purple"
                              placeholder="Your organisation name"
                              disabled={isLoading}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Button
                  type="submit"
                  className="w-full bg-hive-purple hover:bg-hive-purple/90 text-white font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-sm text-hive-black/70 font-secondary">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-hive-purple hover:text-hive-purple/80 font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
