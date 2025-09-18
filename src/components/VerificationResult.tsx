import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Shield } from "lucide-react";

interface VerificationResults {
  name: boolean;
  dateOfBirth: boolean;
  idNumber: boolean;
  phoneNumber: boolean;
  overall: boolean;
}

interface FormData {
  name: string;
  dateOfBirth: string;
  idNumber: string;
  phoneNumber: string;
}

interface ExtractedData {
  name?: string;
  dateOfBirth?: string;
  idNumber?: string;
  phoneNumber?: string;
}

interface VerificationResultProps {
  results: VerificationResults;
  extractedData: ExtractedData;
  enteredData: FormData;
  onStartOver: () => void;
}

export const VerificationResult = ({ 
  results, 
  extractedData, 
  enteredData, 
  onStartOver 
}: VerificationResultProps) => {
  const getStatusIcon = (isMatch: boolean) => {
    return isMatch ? (
      <CheckCircle className="w-5 h-5 text-success" />
    ) : (
      <XCircle className="w-5 h-5 text-destructive" />
    );
  };

  const getStatusBadge = (isMatch: boolean) => {
    return (
      <Badge variant={isMatch ? "default" : "destructive"} className={`${
        isMatch ? 'bg-success hover:bg-success/80 text-success-foreground' : ''
      }`}>
        {isMatch ? 'Match' : 'No Match'}
      </Badge>
    );
  };

  const matchCount = Object.values(results).filter((match, index) => 
    index < 4 && match
  ).length;

  const getOverallStatusColor = () => {
    if (results.overall) return 'success';
    if (matchCount >= 2) return 'warning';
    return 'destructive';
  };

  const getOverallStatusIcon = () => {
    if (results.overall) return <Shield className="w-8 h-8 text-success" />;
    if (matchCount >= 2) return <AlertTriangle className="w-8 h-8 text-warning" />;
    return <XCircle className="w-8 h-8 text-destructive" />;
  };

  const getOverallMessage = () => {
    if (results.overall) {
      return {
        title: "Identity Verified Successfully",
        description: `${matchCount} out of 4 fields matched. Your identity has been successfully verified.`,
        bgClass: "from-success-light to-success-light/50"
      };
    } else if (matchCount >= 2) {
      return {
        title: "Partial Verification",
        description: `${matchCount} out of 4 fields matched. Please review the mismatched information.`,
        bgClass: "from-warning-light to-warning-light/50"
      };
    } else {
      return {
        title: "Verification Failed",
        description: `Only ${matchCount} out of 4 fields matched. Please check your document and information.`,
        bgClass: "from-destructive-light to-destructive-light/50"
      };
    }
  };

  const overallStatus = getOverallMessage();

  const fields = [
    { key: 'name', label: 'Full Name', extracted: extractedData.name, entered: enteredData.name, match: results.name },
    { key: 'dateOfBirth', label: 'Date of Birth', extracted: extractedData.dateOfBirth, entered: enteredData.dateOfBirth, match: results.dateOfBirth },
    { key: 'idNumber', label: 'ID Number', extracted: extractedData.idNumber, entered: enteredData.idNumber, match: results.idNumber },
    { key: 'phoneNumber', label: 'Phone Number', extracted: extractedData.phoneNumber, entered: enteredData.phoneNumber, match: results.phoneNumber },
  ];

  return (
    <div className="space-y-6">
      {/* Overall Status Card */}
      <Card className={`shadow-strong border-0 bg-gradient-to-br ${overallStatus.bgClass} backdrop-blur-sm`}>
        <CardContent className="p-8">
          <div className="flex items-center space-x-6">
            <div className="bg-card p-4 rounded-full shadow-medium">
              {getOverallStatusIcon()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {overallStatus.title}
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                {overallStatus.description}
              </p>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="text-base py-1 px-3">
                  {matchCount}/4 Fields Matched
                </Badge>
                <div className="flex items-center space-x-1">
                  {results.overall ? (
                    <span className="text-success font-medium">Verified</span>
                  ) : (
                    <span className={`font-medium ${matchCount >= 2 ? 'text-warning' : 'text-destructive'}`}>
                      {matchCount >= 2 ? 'Needs Review' : 'Failed'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Card className="shadow-strong border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl">Verification Details</CardTitle>
          <CardDescription>
            Comparison between extracted and entered information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {fields.map((field) => (
              <div key={field.key} className="border-b border-border/50 pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground flex items-center space-x-2">
                    {getStatusIcon(field.match)}
                    <span>{field.label}</span>
                  </h3>
                  {getStatusBadge(field.match)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">From Document:</p>
                    <p className="text-foreground bg-accent/30 p-2 rounded border">
                      {field.extracted || 'Not detected'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">You Entered:</p>
                    <p className="text-foreground bg-muted/30 p-2 rounded border">
                      {field.entered || 'Not provided'}
                    </p>
                  </div>
                </div>
                
                {!field.match && field.extracted && field.entered && (
                  <div className="mt-2 p-3 bg-destructive-light rounded-lg border border-destructive/20">
                    <p className="text-sm text-destructive font-medium">
                      ⚠ Mismatch detected. Please verify the information is correct.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <Button 
          variant="outline" 
          onClick={onStartOver}
          className="hover:shadow-soft transition-all duration-200 flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Verify Another Document</span>
        </Button>
        
        {results.overall && (
          <Button className="bg-gradient-success hover:bg-gradient-success/90 transition-all duration-200 shadow-medium hover:shadow-strong">
            <CheckCircle className="w-4 h-4 mr-2" />
            Download Certificate
          </Button>
        )}
      </div>

      {/* Security Notice */}
      <Card className="bg-accent/30 border-accent-foreground/20">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Security & Privacy</p>
              <p className="text-xs text-muted-foreground">
                Your document data is processed locally and not stored on our servers. 
                All verification is performed using secure AI technology.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};