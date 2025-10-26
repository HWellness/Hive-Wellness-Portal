import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Form Types
export interface FormStep {
  id: string;
  title: string;
  subtitle?: string;
  type: 'single-select' | 'multi-select' | 'text' | 'textarea' | 'scale' | 'radio-group' | 'mental-health-symptoms';
  options?: string[];
  scale?: string[];
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
  };
}

export interface FormConfig {
  id: string;
  title: string;
  steps: FormStep[];
  automatedTriggers?: {
    onCompletion?: 'therapist-matching' | 'therapist-onboarding' | 'admin-review';
    conditions?: Record<string, any>;
  };
}

interface HiveFormSystemProps {
  config: FormConfig;
  onComplete?: (data: Record<string, any>) => void;
  className?: string;
}

export function HiveFormSystem({ config, onComplete, className = '' }: HiveFormSystemProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentStepConfig = config.steps[currentStep];
  const progress = ((currentStep + 1) / config.steps.length) * 100;

  // Form submission mutation
  const submitMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await apiRequest('POST', '/api/unified-forms/submit', {
        formId: config.id,
        data,
        automatedTriggers: config.automatedTriggers
      });
      return response;
    },
    onSuccess: (result) => {
      toast({
        title: "Form Submitted Successfully",
        description: "Your information has been received and processed.",
      });
      
      // Execute automated triggers
      if (config.automatedTriggers?.onCompletion) {
        executeAutomatedTrigger(config.automatedTriggers.onCompletion, result);
      }
      
      onComplete?.(result);
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  });

  const generatePlaceholder = (title: string): string => {
    // Handle questions by converting them to statements
    if (title.includes('?')) {
      const cleanTitle = title.replace('?', '').toLowerCase();
      if (cleanTitle.startsWith('what is your ')) {
        return `Enter your ${cleanTitle.replace('what is your ', '')}`;
      }
      if (cleanTitle.startsWith('how ')) {
        return `Enter ${cleanTitle}`;
      }
      if (cleanTitle.startsWith('where ')) {
        return `Enter ${cleanTitle.replace('where ', '')}`;
      }
      if (cleanTitle.startsWith('when ')) {
        return `Enter ${cleanTitle.replace('when ', '')}`;
      }
      // Default for questions
      return `Enter ${cleanTitle}`;
    }
    // For non-questions, use the original logic
    return `Enter your ${title.toLowerCase()}`;
  };

  const executeAutomatedTrigger = async (triggerType: string, formResult: any) => {
    try {
      switch (triggerType) {
        case 'therapist-matching':
          // Trigger AI-powered therapist matching
          await apiRequest('POST', '/api/ai-matching/trigger', {
            clientData: formResult,
            priority: 'high'
          });
          toast({
            title: "Therapist Matching Started",
            description: "Our AI system is finding the best therapist matches for you.",
          });
          break;
          
        case 'therapist-onboarding':
          // Trigger therapist onboarding workflow
          await apiRequest('POST', '/api/therapist-onboarding/trigger', {
            applicationData: formResult
          });
          toast({
            title: "Application Under Review",
            description: "Your therapist application is being processed by our team.",
          });
          break;
          
        case 'admin-review':
          // Trigger admin review process
          await apiRequest('POST', '/api/admin/review-queue', {
            formData: formResult,
            priority: 'standard'
          });
          break;
      }
    } catch (error) {
      console.error('Automated trigger failed:', error);
    }
  };

  // Render mental health symptoms for step 7
  const renderMentalHealthSymptoms = () => {
    const step = currentStepConfig;
    const mentalHealthSymptoms = step.options || [
      'Overwhelmed and stressed',
      'Anxious or worried', 
      'Sad or low in mood',
      'Disconnected from others',
      'Struggling with motivation'
    ];

    return (
      <div className="space-y-6">
        {mentalHealthSymptoms.map((symptom, index) => (
          <div key={index} className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-hive-purple mb-3 font-primary">{symptom}</h4>
            <div className="flex flex-wrap gap-3">
              {['Never', 'Rarely', 'Sometimes', 'Often', 'Always'].map((frequency) => (
                <label key={frequency} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`mental_health_${index}`}
                    value={frequency}
                    checked={formData[`mental_health_${index}`] === frequency}
                    onChange={(e) => updateFormData(`mental_health_${index}`, e.target.value)}
                    className="text-hive-purple focus:ring-hive-purple"
                  />
                  <span className="text-sm text-hive-black font-secondary">{frequency}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const validateCurrentStep = (): boolean => {
    const stepId = currentStepConfig.id;
    const value = formData[stepId];
    const validation = currentStepConfig.validation;
    
    setErrors({});

    // Special validation for mental health symptoms step
    if (currentStepConfig.type === 'mental-health-symptoms') {
      const mentalHealthSymptoms = currentStepConfig.options || [];
      
      // Check that ALL mental health questions are answered
      let hasAllResponses = true;
      for (let i = 0; i < mentalHealthSymptoms.length; i++) {
        const responseKey = `mental_health_${i}`;
        if (!formData[responseKey]) {
          hasAllResponses = false;
          break;
        }
      }

      if (!hasAllResponses) {
        setErrors({ [stepId]: 'Please rate all mental health categories to continue.' });
        return false;
      }
      return true;
    }

    if (validation?.required && (!value || (Array.isArray(value) && value.length === 0))) {
      setErrors({ [stepId]: 'This field is required.' });
      return false;
    }

    if (validation?.minLength && value && value.length < validation.minLength) {
      setErrors({ [stepId]: `Minimum length is ${validation.minLength} characters.` });
      return false;
    }

    if (validation?.maxLength && value && value.length > validation.maxLength) {
      setErrors({ [stepId]: `Maximum length is ${validation.maxLength} characters.` });
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < config.steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (validateCurrentStep()) {
      submitMutation.mutate(formData);
    }
  };

  const updateFormData = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
    // Clear errors when user updates field
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const renderStepContent = () => {
    const step = currentStepConfig;
    const value = formData[step.id];
    const error = errors[step.id];

    switch (step.type) {
      case 'single-select':
        return (
          <div className="space-y-3">
            {step.options?.map((option, index) => (
              <button
                key={index}
                type="button"
                className={`hive-button font-secondary ${value === option ? 'hive-button-primary' : ''}`}
                onClick={() => updateFormData(step.id, option)}
              >
                {option}
              </button>
            ))}
            {error && <div className="text-hive-error bg-hive-error/10 border border-hive-error/20 p-3 rounded-lg text-sm">{error}</div>}
          </div>
        );

      case 'multi-select':
        return (
          <div className="space-y-3">
            {step.options?.map((option, index) => (
              <button
                key={index}
                type="button"
                className={`hive-button font-secondary ${
                  Array.isArray(value) && value.includes(option) ? 'hive-button-primary' : ''
                }`}
                onClick={() => {
                  const currentValues = Array.isArray(value) ? value : [];
                  const newValues = currentValues.includes(option)
                    ? currentValues.filter(v => v !== option)
                    : [...currentValues, option];
                  updateFormData(step.id, newValues);
                }}
              >
                {option}
              </button>
            ))}
            {error && <div className="text-hive-error bg-hive-error/10 border border-hive-error/20 p-3 rounded-lg text-sm">{error}</div>}
          </div>
        );

      case 'text':
        return (
          <div>
            <input
              type="text"
              className="hive-input font-secondary"
              value={value || ''}
              onChange={(e) => updateFormData(step.id, e.target.value)}
              placeholder={generatePlaceholder(step.title)}
            />
            {error && <div className="text-hive-error bg-hive-error/10 border border-hive-error/20 p-3 rounded-lg text-sm">{error}</div>}
          </div>
        );

      case 'textarea':
        return (
          <div>
            <textarea
              className="hive-input font-secondary"
              rows={4}
              value={value || ''}
              onChange={(e) => updateFormData(step.id, e.target.value)}
              placeholder={generatePlaceholder(step.title)}
            />
            {error && <div className="text-hive-error bg-hive-error/10 border border-hive-error/20 p-3 rounded-lg text-sm">{error}</div>}
          </div>
        );

      case 'scale':
        return (
          <div className="space-y-4">
            <div className="flex justify-center items-center space-x-2 bg-purple-50 p-4 rounded-lg">
              <span className="text-sm text-hive-purple font-secondary">(1 = very low, 10 = excellent)</span>
            </div>
            <div className="flex justify-center items-center space-x-1 bg-hive-neutral/50 p-4 rounded-lg">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <div key={num} className="flex flex-col items-center">
                  <button
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      value === num
                        ? 'bg-hive-purple border-hive-purple'
                        : 'border-hive-purple hover:border-hive-purple'
                    }`}
                    onClick={() => updateFormData(step.id, num)}
                  >
                    {value === num && <div className="w-3 h-3 bg-white rounded-full mx-auto mt-0.5" />}
                  </button>
                  <span className="text-xs text-hive-purple mt-1 font-secondary">{num}</span>
                </div>
              ))}
            </div>
            {error && <div className="text-hive-error bg-hive-error/10 border border-hive-error/20 p-3 rounded-lg text-sm">{error}</div>}
          </div>
        );

      case 'radio-group':
        return (
          <div className="space-y-4">
            {step.options?.map((option, index) => (
              <div key={index} className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-hive-purple mb-2 font-primary">{option}</h4>
                <div className="flex space-x-4">
                  {['Never', 'Rarely', 'Sometimes', 'Often', 'Always'].map((frequency) => (
                    <label key={frequency} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name={`${step.id}_${index}`}
                        value={frequency}
                        checked={formData[`${step.id}_${index}`] === frequency}
                        onChange={(e) => updateFormData(`${step.id}_${index}`, e.target.value)}
                        className="text-hive-purple"
                      />
                      <span className="text-sm text-hive-black font-secondary">{frequency}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {error && <div className="text-hive-error bg-hive-error/10 border border-hive-error/20 p-3 rounded-lg text-sm">{error}</div>}
          </div>
        );

      case 'mental-health-symptoms':
        return renderMentalHealthSymptoms();
        
      default:
        // Fallback for any unhandled step types
        return (
          <div className="space-y-4">
            <p className="text-hive-black font-secondary">
              Please select an option to continue.
            </p>
            {error && <div className="text-hive-error bg-hive-error/10 border border-hive-error/20 p-3 rounded-lg text-sm">{error}</div>}
          </div>
        );
    }
  };

  return (
    <div className={`hive-form-container ${className} relative`}>
      <div className="hexagon-pattern"></div>
      <div className="hive-form-card relative">
        {/* Form Header */}
        <div className="hive-form-header">
          <div className="text-sm text-gray-600 mb-2 font-secondary flex items-center">
            <span>Step {currentStep + 1} of {config.steps.length}</span>
            <div className="w-3 h-3 hexagon-accent opacity-30 ml-2"></div>
          </div>
          <div className="hive-progress-bar">
            <div 
              className="hive-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Form Step Content */}
        <div className="hive-form-step">
          <h2 className="hive-question-title font-primary">{currentStepConfig.title}</h2>
          {currentStepConfig.subtitle && (
            <p className="hive-question-subtitle font-secondary">{currentStepConfig.subtitle}</p>
          )}
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="hive-navigation">
          <button
            type="button"
            className="hive-nav-button"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </button>
          
          <button
            type="button"
            className={`hive-nav-button ${currentStep === config.steps.length - 1 ? 'hive-button-primary' : ''}`}
            onClick={handleNext}
            disabled={submitMutation.isPending}
          >
            {currentStep === config.steps.length - 1 ? (
              submitMutation.isPending ? 'Submitting...' : 'Submit'
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}