import { Info, Clock, Shield, Users, CheckCircle } from "lucide-react";

interface UserGuidanceProps {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
  timeEstimate: string;
  tips: string[];
  variant?: "default" | "success" | "info" | "warning";
}

export function UserGuidance({
  step,
  totalSteps,
  title,
  description,
  timeEstimate,
  tips,
  variant = "default",
}: UserGuidanceProps) {
  const variantStyles = {
    default: {
      bg: "bg-purple-50",
      border: "border-hive-purple",
      titleColor: "text-hive-purple",
      textColor: "text-hive-black",
      timeColor: "text-hive-purple",
      icon: Info,
    },
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      titleColor: "text-green-800",
      textColor: "text-green-700",
      timeColor: "text-green-600",
      icon: CheckCircle,
    },
    info: {
      bg: "bg-purple-50",
      border: "border-hive-purple",
      titleColor: "text-hive-purple",
      textColor: "text-hive-black",
      timeColor: "text-hive-purple",
      icon: Info,
    },
    warning: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      titleColor: "text-orange-800",
      textColor: "text-orange-700",
      timeColor: "text-orange-600",
      icon: Shield,
    },
  };

  const style = variantStyles[variant];
  const IconComponent = style.icon;

  return (
    <div className={`p-4 ${style.bg} rounded-lg border ${style.border} text-left`}>
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <IconComponent className={`w-4 h-4 ${style.titleColor}`} />
          <span className={`text-xs font-medium ${style.titleColor}`}>
            Step {step} of {totalSteps}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className={`w-3 h-3 ${style.timeColor}`} />
          <span className={`text-xs ${style.timeColor}`}>{timeEstimate}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white rounded-full h-2 mb-3">
        <div
          className="bg-hive-purple h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        ></div>
      </div>

      {/* Title and Description */}
      <h3 className={`font-semibold ${style.titleColor} mb-2`}>{title}</h3>
      <p className={`text-sm ${style.textColor} mb-3`}>{description}</p>

      {/* Tips */}
      {tips.length > 0 && (
        <ul className={`text-sm ${style.textColor} space-y-1`}>
          {tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-xs mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface ProcessOverviewProps {
  currentStep: number;
}

export function ProcessOverview({ currentStep }: ProcessOverviewProps) {
  const steps = [
    {
      number: 1,
      title: "Personal Info",
      description: "Basic details",
      time: "2 min",
    },
    {
      number: 2,
      title: "Preferences",
      description: "Therapy goals",
      time: "5 min",
    },
    {
      number: 3,
      title: "Assessment",
      description: "Areas to work on",
      time: "8 min",
    },
    {
      number: 4,
      title: "Practical Details",
      description: "Schedule & budget",
      time: "3 min",
    },
  ];

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Users className="w-4 h-4" />
        Your Progress
      </h3>

      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.number}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              step.number === currentStep
                ? "bg-hive-purple/10 border border-hive-purple/20"
                : step.number < currentStep
                  ? "bg-green-50 border border-green-200"
                  : "bg-gray-50 border border-gray-200"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step.number === currentStep
                  ? "bg-hive-purple text-white"
                  : step.number < currentStep
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-600"
              }`}
            >
              {step.number < currentStep ? "✓" : step.number}
            </div>
            <div className="flex-1">
              <div
                className={`font-medium ${
                  step.number === currentStep
                    ? "text-hive-purple"
                    : step.number < currentStep
                      ? "text-green-700"
                      : "text-gray-600"
                }`}
              >
                {step.title}
              </div>
              <div className="text-xs text-gray-500">{step.description}</div>
            </div>
            <div className="text-xs text-gray-400">{step.time}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Total time:</strong> About 15-20 minutes for the complete process
        </p>
      </div>
    </div>
  );
}
