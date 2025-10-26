import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Settings, Check, X } from "lucide-react";

interface TherapyCategory {
  id: string;
  name: string;
  description: string;
  pricePerSession: string;
  availableTherapistTypes: string[];
  isActive: boolean;
}

interface Therapist {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  therapyCategories?: string[];
  profileData?: any;
}

interface TherapistCategoryAssignmentProps {
  therapistId: string;
  therapist: Therapist;
  onClose?: () => void;
}

export function TherapistCategoryAssignment({ 
  therapistId, 
  therapist, 
  onClose 
}: TherapistCategoryAssignmentProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    therapist.therapyCategories || []
  );

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/therapy-categories"],
  });

  const assignCategoriesMutation = useMutation({
    mutationFn: async (categoryIds: string[]) => {
      return await apiRequest("POST", `/api/therapists/${therapistId}/assign-categories`, {
        categoryIds
      });
    },
    onSuccess: () => {
      toast({
        title: "Categories Updated",
        description: "Therapist category assignments have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/therapists"] });
      if (onClose) onClose();
    },
    onError: (error) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to update category assignments.",
        variant: "destructive",
      });
    },
  });

  const handleCategoryToggle = (categoryId: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, categoryId]);
    } else {
      setSelectedCategories(prev => prev.filter(id => id !== categoryId));
    }
  };

  const handleSave = () => {
    assignCategoriesMutation.mutate(selectedCategories);
  };

  if (categoriesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Category Assignment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5" />
          Therapy Category Assignment
        </CardTitle>
        <p className="text-sm text-gray-600">
          Assign {therapist.firstName} {therapist.lastName} to therapy categories they can provide
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current assignments summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-sm text-gray-700 mb-2">Current Assignments:</h4>
          {selectedCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map(categoryId => {
                const category = categories.find((c: TherapyCategory) => c.id === categoryId);
                return category ? (
                  <Badge key={categoryId} variant="secondary" className="text-xs">
                    {category.name} - £{category.pricePerSession}
                  </Badge>
                ) : null;
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No categories assigned</p>
          )}
        </div>

        {/* Category selection */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Available Categories:</h4>
          
          {categories.map((category: TherapyCategory) => (
            <div 
              key={category.id} 
              className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50"
            >
              <Checkbox
                id={category.id}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={(checked) => 
                  handleCategoryToggle(category.id, checked as boolean)
                }
                className="mt-1"
              />
              
              <div className="flex-1 min-w-0">
                <label 
                  htmlFor={category.id}
                  className="block text-sm font-medium text-gray-900 cursor-pointer"
                >
                  {category.name}
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  {category.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                    £{category.pricePerSession}/session
                  </Badge>
                  <div className="flex flex-wrap gap-1">
                    {category.availableTherapistTypes.slice(0, 2).map((type, index) => (
                      <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                        {type}
                      </Badge>
                    ))}
                    {category.availableTherapistTypes.length > 2 && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        +{category.availableTherapistTypes.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleSave}
            disabled={assignCategoriesMutation.isPending}
          >
            {assignCategoriesMutation.isPending ? (
              "Saving..."
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Assignments
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}