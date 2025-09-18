import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { DocumentUpload } from "./DocumentUpload";
import { VerificationResult } from "./VerificationResult";
import { Shield, FileCheck, UserCheck } from "lucide-react";

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

interface VerificationResults {
  name: boolean;
  dateOfBirth: boolean;
  idNumber: boolean;
  phoneNumber: boolean;
  overall: boolean;
}

export const IdVerificationForm = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<'upload' | 'form' | 'results'>('upload');
  const [extractedData, setExtractedData] = useState<ExtractedData>({});
  const [formData, setFormData] = useState<FormData>({
    name: '',
    dateOfBirth: '',
    idNumber: '',
    phoneNumber: ''
  });
  const [verificationResults, setVerificationResults] = useState<VerificationResults | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDocumentProcessed = (data: ExtractedData) => {
    setExtractedData(data);
    setStep('form');
    toast({
      title: "Document Processed",
      description: "Information extracted successfully. Please verify the details below.",
    });
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const normalizeText = (text: string): string => {
    return text.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const normalizeDate = (date: string): string => {
    // Handle various date formats
    const cleaned = date.replace(/[^\d]/g, '');
    if (cleaned.length === 8) {
      // Assume DDMMYYYY or MMDDYYYY format
      return cleaned;
    }
    return cleaned;
  };

  const normalizePhone = (phone: string): string => {
    return phone.replace(/[^\d]/g, '');
  };

  const compareFields = (extracted: string | undefined, entered: string): boolean => {
    if (!extracted || !entered) return false;
    
    // For names, normalize and check similarity
    if (extracted.includes(' ') || entered.includes(' ')) {
      const extractedNorm = normalizeText(extracted);
      const enteredNorm = normalizeText(entered);
      
      // Check if one contains the other (partial match for names)
      return extractedNorm.includes(enteredNorm) || enteredNorm.includes(extractedNorm) || 
             extractedNorm === enteredNorm;
    }
    
    return normalizeText(extracted) === normalizeText(entered);
  };

  const compareDates = (extracted: string | undefined, entered: string): boolean => {
    if (!extracted || !entered) return false;
    
    const extractedNorm = normalizeDate(extracted);
    const enteredNorm = normalizeDate(entered);
    
    return extractedNorm === enteredNorm;
  };

  const comparePhones = (extracted: string | undefined, entered: string): boolean => {
    if (!extracted || !entered) return false;
    
    const extractedNorm = normalizePhone(extracted);
    const enteredNorm = normalizePhone(entered);
    
    // Check if the numbers match (allowing for country codes)
    return extractedNorm.includes(enteredNorm) || enteredNorm.includes(extractedNorm) ||
           extractedNorm === enteredNorm;
  };

  const handleVerify = async () => {
    setIsProcessing(true);
    
    // Simulate processing time for better UX
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const results: VerificationResults = {
      name: compareFields(extractedData.name, formData.name),
      dateOfBirth: compareDates(extractedData.dateOfBirth, formData.dateOfBirth),
      idNumber: compareFields(extractedData.idNumber, formData.idNumber),
      phoneNumber: comparePhones(extractedData.phoneNumber, formData.phoneNumber),
      overall: false
    };
    
    // Overall verification requires at least 3 out of 4 fields to match
    const matchCount = Object.values(results).filter((match, index) => 
      index < 4 && match
    ).length;
    
    results.overall = matchCount >= 3;
    
    setVerificationResults(results);
    setStep('results');
    setIsProcessing(false);
    
    toast({
      title: results.overall ? "Verification Successful" : "Verification Failed",
      description: results.overall 
        ? `${matchCount}/4 fields matched. Identity verified.`
        : `Only ${matchCount}/4 fields matched. Please check your information.`,
      variant: results.overall ? "default" : "destructive",
    });
  };

  const resetForm = () => {
    setStep('upload');
    setExtractedData({});
    setFormData({
      name: '',
      dateOfBirth: '',
      idNumber: '',
      phoneNumber: ''
    });
    setVerificationResults(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-primary p-3 rounded-full shadow-medium">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            ID Verification System
          </h1>
          <p className="text-lg text-muted-foreground">
            Secure identity verification with AI-powered document analysis
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
              step === 'upload' ? 'bg-gradient-primary text-primary-foreground shadow-medium' : 
              step === 'form' || step === 'results' ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              <FileCheck className="w-4 h-4" />
              <span className="font-medium">Upload Document</span>
            </div>
            <div className={`w-8 h-0.5 ${step === 'form' || step === 'results' ? 'bg-success' : 'bg-border'} transition-colors duration-300`} />
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
              step === 'form' ? 'bg-gradient-primary text-primary-foreground shadow-medium' : 
              step === 'results' ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              <UserCheck className="w-4 h-4" />
              <span className="font-medium">Verify Details</span>
            </div>
            <div className={`w-8 h-0.5 ${step === 'results' ? 'bg-success' : 'bg-border'} transition-colors duration-300`} />
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
              step === 'results' ? 'bg-gradient-primary text-primary-foreground shadow-medium' : 'bg-muted text-muted-foreground'
            }`}>
              <Shield className="w-4 h-4" />
              <span className="font-medium">Results</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {step === 'upload' && (
          <Card className="shadow-strong border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Upload Your ID Document</CardTitle>
              <CardDescription>
                Upload a clear photo of your government-issued ID, driver's license, or passport
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUpload onDocumentProcessed={handleDocumentProcessed} />
            </CardContent>
          </Card>
        )}

        {step === 'form' && (
          <Card className="shadow-strong border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Verify Your Information</CardTitle>
              <CardDescription>
                Please confirm the information extracted from your document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Extracted Data Preview */}
              <div className="bg-accent p-4 rounded-lg border border-accent-foreground/20">
                <h3 className="font-semibold text-accent-foreground mb-2">Extracted from Document:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Name: <span className="font-medium">{extractedData.name || 'Not found'}</span></div>
                  <div>DOB: <span className="font-medium">{extractedData.dateOfBirth || 'Not found'}</span></div>
                  <div>ID Number: <span className="font-medium">{extractedData.idNumber || 'Not found'}</span></div>
                  <div>Phone: <span className="font-medium">{extractedData.phoneNumber || 'Not found'}</span></div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    className="transition-all duration-200 focus:shadow-soft"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className="transition-all duration-200 focus:shadow-soft"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idNumber">ID Number</Label>
                  <Input
                    id="idNumber"
                    value={formData.idNumber}
                    onChange={(e) => handleInputChange('idNumber', e.target.value)}
                    placeholder="Enter your ID number"
                    className="transition-all duration-200 focus:shadow-soft"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="Enter your phone number"
                    className="transition-all duration-200 focus:shadow-soft"
                  />
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <Button 
                  variant="outline" 
                  onClick={resetForm}
                  className="transition-all duration-200 hover:shadow-soft"
                >
                  Start Over
                </Button>
                <Button 
                  onClick={handleVerify}
                  disabled={!formData.name || !formData.dateOfBirth || !formData.idNumber || isProcessing}
                  className="bg-gradient-primary hover:bg-gradient-trust transition-all duration-200 shadow-medium hover:shadow-strong min-w-32"
                >
                  {isProcessing ? 'Verifying...' : 'Verify Identity'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'results' && verificationResults && (
          <VerificationResult 
            results={verificationResults}
            extractedData={extractedData}
            enteredData={formData}
            onStartOver={resetForm}
          />
        )}
      </div>
    </div>
  );
};