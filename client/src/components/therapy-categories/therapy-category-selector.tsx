import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Star, Gift } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface TherapyCategory {
  id: string;
  name: string;
  description: string;
  pricePerSession: string;
  availableTherapistTypes: string[];
  isActive: boolean;
}

interface TherapyCategorySelectorProps {
  selectedCategory?: string;
  onCategorySelect: (category: TherapyCategory) => void;
  showPrices?: boolean;
  onContinue?: (categoryId: string) => void;
  showContinueButton?: boolean;
}

export function TherapyCategorySelector({ 
  selectedCategory, 
  onCategorySelect, 
  showPrices = true,
  onContinue,
  showContinueButton = true
}: TherapyCategorySelectorProps) {
  const { user } = useAuth();
  const { data: categories = [], isLoading } = useQuery<TherapyCategory[]>({
    queryKey: ["/api/therapy-categories"],
  });
  
  // Check if user is eligible for free first session
  const { data: freeSessionEligibility } = useQuery<{ isEligible: boolean; message: string }>({
    queryKey: ['/api/free-session/check'],
    enabled: !!user && user.role === 'client',
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-16 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((category: TherapyCategory) => (
          <Card 
            key={category.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedCategory === category.id 
                ? 'ring-2 ring-purple-500 bg-purple-50' 
                : 'hover:shadow-md border-gray-200'
            }`}
            onClick={() => onCategorySelect(category)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                    {category.name}
                  </CardTitle>
                  {showPrices && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {freeSessionEligibility?.isEligible ? (
                        <>
                          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                            <Gift className="h-3 w-3 mr-1" />
                            FREE First Session
                          </Badge>
                          <span className="text-xs text-gray-500 line-through">
                            £{category.pricePerSession}
                          </span>
                        </>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          £{category.pricePerSession}/session
                        </Badge>
                      )}
                      {category.name === "Counselling Approaches" && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          Most Popular
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                {selectedCategory === category.id && (
                  <div className="ml-2 p-1 bg-purple-500 rounded-full">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <CardDescription className="text-sm text-gray-600 mb-4 leading-relaxed">
                {category.description}
              </CardDescription>
              
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Available Therapists:</p>
                <div className="flex flex-wrap gap-1">
                  {category.availableTherapistTypes.map((type, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="text-xs px-2 py-1 bg-white border-gray-200"
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showContinueButton && selectedCategory && (
        <div className="mt-6 text-center">
          <Button 
            onClick={() => onContinue?.(selectedCategory)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg font-medium"
            size="lg"
          >
            Continue with Selected Category
          </Button>
          <p className="text-sm text-gray-600 mt-2">
            Next: Find matching therapists and book appointment
          </p>
        </div>
      )}
    </div>
  );
}