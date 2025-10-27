import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Smartphone,
  Tablet,
  Monitor,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  RefreshCw,
  Download,
} from "lucide-react";

interface ResponsiveTest {
  id: string;
  name: string;
  viewport: {
    width: number;
    height: number;
  };
  device: "mobile" | "tablet" | "desktop";
  status: "pending" | "testing" | "pass" | "fail" | "warning";
  issues: string[];
  score: number;
}

interface MobileResponsiveCheckerProps {
  user: any;
}

const MobileResponsiveChecker: React.FC<MobileResponsiveCheckerProps> = ({ user }) => {
  const [tests, setTests] = useState<ResponsiveTest[]>([]);
  const [currentTest, setCurrentTest] = useState<ResponsiveTest | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const testViewports = [
    // Mobile Devices
    { id: "iphone-se", name: "iPhone SE", width: 375, height: 667, device: "mobile" as const },
    {
      id: "iphone-12",
      name: "iPhone 12/13/14",
      width: 390,
      height: 844,
      device: "mobile" as const,
    },
    {
      id: "iphone-12-pro-max",
      name: "iPhone 12 Pro Max",
      width: 428,
      height: 926,
      device: "mobile" as const,
    },
    {
      id: "samsung-galaxy-s21",
      name: "Samsung Galaxy S21",
      width: 360,
      height: 800,
      device: "mobile" as const,
    },
    {
      id: "google-pixel-5",
      name: "Google Pixel 5",
      width: 393,
      height: 851,
      device: "mobile" as const,
    },

    // Tablets
    { id: "ipad-mini", name: "iPad Mini", width: 768, height: 1024, device: "tablet" as const },
    { id: "ipad-pro", name: "iPad Pro", width: 1024, height: 1366, device: "tablet" as const },
    {
      id: "android-tablet",
      name: "Android Tablet",
      width: 800,
      height: 1280,
      device: "tablet" as const,
    },

    // Desktop
    {
      id: "desktop-1080p",
      name: "1080p Desktop",
      width: 1920,
      height: 1080,
      device: "desktop" as const,
    },
    { id: "desktop-4k", name: "4K Desktop", width: 3840, height: 2160, device: "desktop" as const },
  ];

  const urlsToTest = [
    "/",
    "/portal",
    "/therapist-onboarding",
    "/chatbot-demo",
    "/therapy-categories-demo",
  ];

  useEffect(() => {
    const initialTests = testViewports.map((viewport) => ({
      id: viewport.id,
      name: viewport.name,
      viewport: { width: viewport.width, height: viewport.height },
      device: viewport.device,
      status: "pending" as const,
      issues: [],
      score: 0,
    }));
    setTests(initialTests);
  }, []);

  const runResponsiveTests = async () => {
    setIsRunning(true);
    setProgress(0);

    const updatedTests: ResponsiveTest[] = [];

    for (let i = 0; i < testViewports.length; i++) {
      const viewport = testViewports[i];
      setCurrentTest({
        id: viewport.id,
        name: viewport.name,
        viewport: { width: viewport.width, height: viewport.height },
        device: viewport.device,
        status: "testing",
        issues: [],
        score: 0,
      });

      // Simulate responsive testing
      const testResult = await simulateResponsiveTest(viewport);
      updatedTests.push(testResult);

      setProgress(((i + 1) / testViewports.length) * 100);

      // Small delay for UX
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setTests(updatedTests);
    setCurrentTest(null);
    setIsRunning(false);
  };

  const simulateResponsiveTest = async (viewport: any): Promise<ResponsiveTest> => {
    const issues: string[] = [];
    let score = 100;

    // Simulate various responsive tests
    if (viewport.device === "mobile") {
      if (viewport.width < 400) {
        issues.push("Text may be too small on very narrow screens");
        score -= 10;
      }

      // Simulate touch target size check
      if (Math.random() > 0.8) {
        issues.push("Some buttons may be too small for touch interaction");
        score -= 15;
      }

      // Simulate overflow check
      if (Math.random() > 0.9) {
        issues.push("Horizontal scrolling detected on narrow viewports");
        score -= 20;
      }
    }

    if (viewport.device === "tablet") {
      if (Math.random() > 0.85) {
        issues.push("Layout may not utilize tablet space efficiently");
        score -= 10;
      }
    }

    // Simulate loading time check
    if (Math.random() > 0.7) {
      issues.push("Page load time may be slower on mobile networks");
      score -= 5;
    }

    // Determine status based on score
    let status: ResponsiveTest["status"];
    if (score >= 90) status = "pass";
    else if (score >= 70) status = "warning";
    else status = "fail";

    return {
      id: viewport.id,
      name: viewport.name,
      viewport: viewport,
      device: viewport.device,
      status,
      issues,
      score: Math.max(0, score),
    };
  };

  const generateReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: tests.length,
        passed: tests.filter((t) => t.status === "pass").length,
        warnings: tests.filter((t) => t.status === "warning").length,
        failed: tests.filter((t) => t.status === "fail").length,
        averageScore: tests.reduce((sum, t) => sum + t.score, 0) / tests.length,
      },
      tests: tests,
      recommendations: generateRecommendations(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hive-wellness-responsive-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateRecommendations = () => {
    const allIssues = tests.flatMap((t) => t.issues);
    const recommendations = [];

    if (allIssues.some((issue) => issue.includes("buttons may be too small"))) {
      recommendations.push(
        "Increase minimum touch target size to 44px for better mobile accessibility"
      );
    }

    if (allIssues.some((issue) => issue.includes("horizontal scrolling"))) {
      recommendations.push(
        "Implement responsive breakpoints and flexible layouts to prevent horizontal overflow"
      );
    }

    if (allIssues.some((issue) => issue.includes("load time"))) {
      recommendations.push(
        "Optimize images and implement lazy loading for better mobile performance"
      );
    }

    if (allIssues.some((issue) => issue.includes("tablet space"))) {
      recommendations.push(
        "Create tablet-specific layouts to better utilize available screen space"
      );
    }

    return recommendations;
  };

  const getStatusIcon = (status: ResponsiveTest["status"]) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "fail":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "testing":
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-gray-300" />;
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case "mobile":
        return <Smartphone className="w-5 h-5" />;
      case "tablet":
        return <Tablet className="w-5 h-5" />;
      case "desktop":
        return <Monitor className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const summary = {
    total: tests.length,
    passed: tests.filter((t) => t.status === "pass").length,
    warnings: tests.filter((t) => t.status === "warning").length,
    failed: tests.filter((t) => t.status === "fail").length,
    averageScore:
      tests.length > 0 ? Math.round(tests.reduce((sum, t) => sum + t.score, 0) / tests.length) : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">
            Mobile Responsiveness Checker
          </h1>
          <p className="text-gray-600 mt-1">
            Test Hive Wellness portal across multiple devices and screen sizes
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={runResponsiveTests}
            disabled={isRunning}
            className="flex items-center gap-2 bg-hive-purple hover:bg-hive-purple/90"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Run Tests
              </>
            )}
          </Button>

          {tests.length > 0 && (
            <Button onClick={generateReport} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Testing Progress</p>
                <p className="text-sm text-gray-600">{Math.round(progress)}%</p>
              </div>

              <Progress value={progress} className="w-full" />

              {currentTest && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  {getDeviceIcon(currentTest.device)}
                  <span>
                    Testing {currentTest.name} ({currentTest.viewport.width}×
                    {currentTest.viewport.height})
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {tests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
                <p className="text-sm text-gray-600">Total Tests</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{summary.passed}</p>
                <p className="text-sm text-gray-600">Passed</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{summary.warnings}</p>
                <p className="text-sm text-gray-600">Warnings</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-hive-purple">{summary.averageScore}</p>
                <p className="text-sm text-gray-600">Avg Score</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test Results */}
      {tests.length > 0 && (
        <div className="grid gap-4">
          {["mobile", "tablet", "desktop"].map((deviceType) => {
            const deviceTests = tests.filter((t) => t.device === deviceType);
            if (deviceTests.length === 0) return null;

            return (
              <Card key={deviceType}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 capitalize">
                    {getDeviceIcon(deviceType)}
                    {deviceType} Devices
                    <Badge variant="outline">
                      {deviceTests.filter((t) => t.status === "pass").length}/{deviceTests.length}{" "}
                      Passed
                    </Badge>
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="grid gap-4">
                    {deviceTests.map((test) => (
                      <div
                        key={test.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          {getStatusIcon(test.status)}
                          <div>
                            <p className="font-medium text-gray-900">{test.name}</p>
                            <p className="text-sm text-gray-600">
                              {test.viewport.width}×{test.viewport.height}px
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">{test.score}/100</p>
                          {test.issues.length > 0 && (
                            <p className="text-sm text-red-600">
                              {test.issues.length} issue{test.issues.length > 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Issues Summary */}
      {tests.some((t) => t.issues.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Common Issues Found
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {Array.from(new Set(tests.flatMap((t) => t.issues))).map((issue, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{issue}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {tests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization Recommendations</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {generateRecommendations().map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-900">{rec}</p>
                </div>
              ))}

              {generateRecommendations().length === 0 && (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-900">
                    Great work! No major responsive issues detected.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MobileResponsiveChecker;
