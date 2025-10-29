import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/login", data);
      const result = await response.json();

      if (response.ok) {
        // Check if password change is required
        if (result.requiresPasswordChange) {
          toast({
            title: "Password Change Required",
            description: "You must change your password before continuing.",
            variant: "default",
          });

          // Redirect to change password page
          setTimeout(() => {
            setLocation("/change-password");
          }, 1000);
          return;
        }

        toast({
          title: "Welcome Back",
          description: "You've been successfully logged in.",
        });

        // Invalidate auth queries and force immediate redirect
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.setQueryData(["/api/auth/user"], result.user);

        // Force immediate hard refresh to role-specific dashboard
        const targetUrl = (() => {
          switch (result.user.role) {
            case "client":
              return "/client-dashboard";
            case "therapist":
              return "/portal";
            case "admin":
              return "/admin-dashboard";
            case "institution":
              return "/institution-dashboard";
            default:
              return "/";
          }
        })();

        window.location.replace(targetUrl);
      } else {
        toast({
          title: "Login Failed",
          description: result.message || "Please check your credentials and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-light-purple via-hive-white to-hive-light-blue flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 text-hive-purple hover:text-hive-purple/80"
            onClick={async () => {
              try {
                // First, verify that user is actually logged out by checking session
                const authResponse = await fetch("/api/auth/user", {
                  credentials: "include",
                  cache: "no-cache",
                });

                // If still authenticated, wait a moment for session destruction to complete
                if (authResponse.ok) {
                  await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms

                  // Check again
                  const retryResponse = await fetch("/api/auth/user", {
                    credentials: "include",
                    cache: "no-cache",
                  });

                  if (retryResponse.ok) {
                    // Force a logout if session is still active
                    await fetch("/api/auth/logout", {
                      method: "POST",
                      credentials: "include",
                    });
                    await new Promise((resolve) => setTimeout(resolve, 200)); // Wait for logout
                  }
                }

                // Clear all frontend authentication state
                await queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
                queryClient.clear();

                // Force navigation to portal
                window.location.href = "/";
              } catch (error) {
                // Fallback: clear cache and navigate anyway
                await queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
                queryClient.clear();
                window.location.href = "/";
              }
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Portal
          </Button>
          <div className="mb-6">
            <h1 className="text-3xl font-bold font-century text-hive-purple mb-2">Welcome Back</h1>
            <p className="text-hive-black/70 font-secondary">
              Sign in to your Hive Wellness account
            </p>
          </div>
        </div>

        {/* Login Form */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold font-century text-hive-purple text-center">
              Sign In
            </CardTitle>
            <CardDescription className="text-center font-secondary text-hive-black/70">
              For clients and institutions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                <Button
                  type="submit"
                  className="w-full bg-hive-purple hover:bg-hive-purple/90 text-white font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </Form>

            <div className="mt-4 text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-hive-purple hover:text-hive-purple/80 font-medium"
              >
                Forgot your password?
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
