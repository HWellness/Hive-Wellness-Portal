import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

interface FormField {
  id: string;
  title: string;
  subtitle?: string;
  type: 'single-select' | 'multi-select' | 'radio-group' | 'textarea' | 'scale' | 'rating-matrix';
  options?: string[];
  scale?: string[];
  validation?: {
    required?: boolean;
    minLength?: number;
    allOptionsRequired?: boolean;
  };
}

interface FormRendererProps {
  fields: FormField[];
  onComplete: (responses: Record<string, any>) => void;
  title?: string;
  description?: string;
}

export default function FormRenderer({ fields, onComplete, title, description }: FormRendererProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentField = fields[currentStep];
  const progress = ((currentStep + 1) / fields.length) * 100;

  const validateField = (field: FormField, value: any): string | null => {
    if (field.validation?.required && (!value || (Array.isArray(value) && value.length === 0))) {
      return 'This field is required';
    }

    if (field.type === 'rating-matrix' && field.validation?.allOptionsRequired) {
      if (!value || typeof value !== 'object') {
        return 'Please rate all feelings';
      }
      const requiredOptions = field.options || [];
      for (const option of requiredOptions) {
        if (!value[option]) {
          return 'Please rate all feelings';
        }
      }
    }

    if (field.validation?.minLength && typeof value === 'string' && value.length < field.validation.minLength) {
      return `Minimum ${field.validation.minLength} characters required`;
    }

    return null;
  };

  const handleNext = () => {
    const error = validateField(currentField, responses[currentField.id]);
    
    if (error) {
      setErrors({ ...errors, [currentField.id]: error });
      return;
    }

    setErrors({ ...errors, [currentField.id]: '' });

    if (currentStep < fields.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(responses);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateResponse = (fieldId: string, value: any) => {
    setResponses({ ...responses, [fieldId]: value });
    if (errors[fieldId]) {
      setErrors({ ...errors, [fieldId]: '' });
    }
  };

  const renderField = (field: FormField) => {
    const value = responses[field.id];
    const error = errors[field.id];

    switch (field.type) {
      case 'single-select':
      case 'radio-group':
        return (
          <div className="space-y-4">
            <RadioGroup
              value={value || ''}
              onValueChange={(val) => updateResponse(field.id, val)}
              className="space-y-3"
            >
              {field.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                  <Label 
                    htmlFor={`${field.id}-${option}`}
                    className="font-secondary text-hive-black cursor-pointer"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );

      case 'multi-select':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {field.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.id}-${option}`}
                    checked={value?.includes(option) || false}
                    onCheckedChange={(checked) => {
                      const current = value || [];
                      if (checked) {
                        updateResponse(field.id, [...current, option]);
                      } else {
                        updateResponse(field.id, current.filter((item: string) => item !== option));
                      }
                    }}
                  />
                  <Label 
                    htmlFor={`${field.id}-${option}`}
                    className="font-secondary text-hive-black cursor-pointer"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-4">
            <Textarea
              value={value || ''}
              onChange={(e) => updateResponse(field.id, e.target.value)}
              placeholder="Please provide your response..."
              className="min-h-32 font-secondary"
            />
            {value && (
              <p className="text-sm text-gray-500">
                {value.length} characters
                {field.validation?.minLength && ` (minimum ${field.validation.minLength})`}
              </p>
            )}
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );

      case 'scale':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-600">1 (Poor)</span>
              <span className="text-sm text-gray-600">10 (Excellent)</span>
            </div>
            <RadioGroup
              value={value?.toString() || ''}
              onValueChange={(val) => updateResponse(field.id, parseInt(val))}
              className="grid grid-cols-5 gap-2"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <div key={num} className="flex flex-col items-center space-y-2">
                  <RadioGroupItem value={num.toString()} id={`${field.id}-${num}`} />
                  <Label 
                    htmlFor={`${field.id}-${num}`}
                    className="text-sm font-secondary cursor-pointer"
                  >
                    {num}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );

      case 'rating-matrix':
        const matrixValue = value || {};
        return (
          <div className="space-y-6">
            {field.subtitle && (
              <p className="text-sm text-gray-600 font-secondary">{field.subtitle}</p>
            )}
            
            {/* Scale Header */}
            <div className="grid grid-cols-6 gap-2 mb-4">
              <div></div>
              {field.scale?.map((scaleItem) => (
                <div key={scaleItem} className="text-center">
                  <Label className="text-xs font-secondary text-gray-600">
                    {scaleItem}
                  </Label>
                </div>
              ))}
            </div>

            {/* Rating Matrix */}
            {field.options?.map((option) => (
              <div key={option} className="grid grid-cols-6 gap-2 items-center">
                <div className="pr-4">
                  <Label className="font-secondary text-sm text-hive-black">
                    {option}
                  </Label>
                </div>
                {field.scale?.map((scaleItem) => (
                  <div key={`${option}-${scaleItem}`} className="flex justify-center">
                    <input
                      type="radio"
                      name={`${field.id}-${option}`}
                      value={scaleItem}
                      checked={matrixValue[option] === scaleItem}
                      onChange={() => {
                        updateResponse(field.id, {
                          ...matrixValue,
                          [option]: scaleItem
                        });
                      }}
                      className="w-4 h-4 text-hive-purple focus:ring-hive-purple"
                    />
                  </div>
                ))}
              </div>
            ))}
            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <Input
              value={value || ''}
              onChange={(e) => updateResponse(field.id, e.target.value)}
              className="font-secondary"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-purple/10 via-hive-blue/8 to-hive-light-blue/12">
      <div className="container mx-auto p-6">
        <Card className="max-w-4xl mx-auto bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="text-center space-y-4">
            {title && (
              <CardTitle className="text-3xl font-primary text-hive-purple">
                {title}
              </CardTitle>
            )}
            {description && (
              <p className="text-hive-black/70 font-secondary max-w-2xl mx-auto">
                {description}
              </p>
            )}
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Step {currentStep + 1} of {fields.length}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-primary text-hive-purple">
                  {currentField.title}
                </h3>
                {currentField.subtitle && currentField.type !== 'rating-matrix' && (
                  <p className="text-hive-black/70 font-secondary">
                    {currentField.subtitle}
                  </p>
                )}
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-100">
                {renderField(currentField)}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-100">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Button>

              <Badge variant="secondary" className="px-4 py-2">
                {currentStep + 1} / {fields.length}
              </Badge>

              <Button
                onClick={handleNext}
                className="bg-hive-purple hover:bg-hive-purple/90 text-white flex items-center gap-2"
              >
                {currentStep === fields.length - 1 ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Complete
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}