import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Brain,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Target,
  Lightbulb,
  Star,
} from "lucide-react";

interface AIAnalysisResult {
  compatibilityScore: number;
  reasoning: string;
  strengths: string[];
  considerations: string[];
  confidence: number;
  recommendations: string[];
}

interface AIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResult: AIAnalysisResult | null;
  clientName: string;
  therapistName: string;
}

export default function AIAnalysisModal({
  isOpen,
  onClose,
  analysisResult,
  clientName,
  therapistName,
}: AIAnalysisModalProps) {
  if (!analysisResult) return null;

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600 bg-green-50";
    if (score >= 70) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-blue-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-orange-600";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-hive-purple" />
            AI Compatibility Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Summary */}
          <div className="bg-gradient-to-r from-hive-purple/10 to-hive-light-blue/10 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg">
                  {clientName} ↔ {therapistName}
                </h3>
                <p className="text-sm text-gray-600">
                  AI-powered therapeutic compatibility assessment
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <Badge
                    className={`text-lg px-3 py-1 ${getScoreColor(analysisResult.compatibilityScore)}`}
                  >
                    {analysisResult.compatibilityScore}%
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">Compatibility</p>
                </div>
                <div className="text-center">
                  <div
                    className={`text-lg font-bold ${getConfidenceColor(analysisResult.confidence)}`}
                  >
                    {analysisResult.confidence}%
                  </div>
                  <p className="text-xs text-gray-500">Confidence</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Reasoning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                AI Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{analysisResult.reasoning}</p>
            </CardContent>
          </Card>

          {/* Strengths and Considerations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  Match Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysisResult.strengths.map((strength, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{strength}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Considerations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="w-4 h-4" />
                  Considerations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysisResult.considerations.map((consideration, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{consideration}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Lightbulb className="w-4 h-4" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysisResult.recommendations.map((recommendation, index) => (
                  <div key={index} className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{recommendation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close Analysis
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                // Handle approval action here
                onClose();
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Match
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
