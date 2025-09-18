import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Upload, File, CheckCircle, AlertCircle } from "lucide-react";
import Tesseract from 'tesseract.js';

interface ExtractedData {
  name?: string;
  dateOfBirth?: string;
  idNumber?: string;
  phoneNumber?: string;
}

interface DocumentUploadProps {
  onDocumentProcessed: (data: ExtractedData) => void;
}

export const DocumentUpload = ({ onDocumentProcessed }: DocumentUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const cleanOCRText = (text: string): string => {
    return text
      // Remove extra whitespace and normalize
      .replace(/\s+/g, ' ')
      // Remove common OCR artifacts
      .replace(/[|]/g, 'I')
      .replace(/[0O]/g, '0')
      // Clean up line breaks
      .replace(/\n\s*\n/g, '\n')
      .trim();
  };

  const extractDataFromText = (text: string): ExtractedData => {
    const cleanedText = cleanOCRText(text);
    const data: ExtractedData = {};
    const lines = cleanedText.split('\n').map(line => line.trim()).filter(line => line.length > 2);
    
    console.log('Cleaned OCR text:', cleanedText);
    console.log('Lines:', lines);
    
    // Skip common header/footer text that shouldn't be names
    const skipNames = [
      'government of india',
      'unique identification authority',
      'aadhaar',
      'aadhar',
      'identity card',
      'permanent account number',
      'pan card',
      'driving license',
      'voter id'
    ];
    
    // Aadhaar-specific patterns for Indian documents
    const patterns = {
      // Aadhaar number - exactly 12 digits, often with spaces
      aadhaarNumber: [
        /\b(\d{4}\s?\d{4}\s?\d{4})\b/g,
        /\b(\d{12})\b/g
      ],
      
      // Name patterns - avoid official headers
      name: [
        // Look for lines with proper case names (not all caps headers)
        /^([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,3})$/,
        // Names after specific keywords in Indian documents
        /(?:name|naam)[\s:]+([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,3})/i,
        // Names in middle of text (not headers)
        /\b([A-Z][a-z]+\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/
      ],
      
      // DOB patterns for Indian format
      dateOfBirth: [
        // DD/MM/YYYY format (most common in India)
        /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g,
        // DD-MM-YYYY format
        /\b(\d{1,2}-\d{1,2}-\d{4})\b/g,
        // With DOB prefix
        /(?:dob|date of birth|born)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
        // Just year patterns for fallback
        /\b(19\d{2}|20\d{2})\b/g
      ],
      
      // Phone patterns for Indian numbers
      phoneNumber: [
        // Indian mobile numbers (10 digits starting with 6-9)
        /\b([6-9]\d{9})\b/g,
        // With +91 country code
        /\+91[\s\-]?([6-9]\d{9})/g,
        // With spaces or dashes
        /\b([6-9]\d{4}[\s\-]?\d{5})\b/g,
        // General 10-digit pattern
        /\b(\d{10})\b/g
      ]
    };

    // First, try to find Aadhaar number specifically
    for (const pattern of patterns.aadhaarNumber) {
      const matches = cleanedText.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const aadhaar = match[1].replace(/\s/g, '');
          if (aadhaar.length === 12 && /^\d{12}$/.test(aadhaar)) {
            data.idNumber = aadhaar;
            break;
          }
        }
      }
      if (data.idNumber) break;
    }

    // Extract phone number
    for (const pattern of patterns.phoneNumber) {
      const matches = cleanedText.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const phone = match[1].replace(/[\s\-]/g, '');
          if (phone.length === 10 && /^[6-9]\d{9}$/.test(phone)) {
            data.phoneNumber = phone;
            break;
          }
        }
      }
      if (data.phoneNumber) break;
    }

    // Extract date of birth
    for (const pattern of patterns.dateOfBirth) {
      const matches = cleanedText.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const dateStr = match[1];
          // Validate date format
          if (dateStr.includes('/') || dateStr.includes('-')) {
            const parts = dateStr.split(/[\/\-]/);
            if (parts.length === 3) {
              const year = parseInt(parts[2]);
              if (year >= 1900 && year <= 2010) { // Reasonable birth year range
                data.dateOfBirth = dateStr;
                break;
              }
            }
          } else if (dateStr.length === 4) {
            // Just year
            const year = parseInt(dateStr);
            if (year >= 1900 && year <= 2010) {
              data.dateOfBirth = dateStr;
              break;
            }
          }
        }
      }
      if (data.dateOfBirth) break;
    }

    // Extract name - be more careful to avoid headers
    for (const line of lines) {
      if (data.name) break;
      
      // Skip lines that are likely headers/official text
      const lowerLine = line.toLowerCase();
      const isHeader = skipNames.some(skip => lowerLine.includes(skip));
      if (isHeader) continue;
      
      // Skip lines with numbers (likely not names)
      if (/\d/.test(line)) continue;
      
      // Skip very short or very long lines
      if (line.length < 4 || line.length > 40) continue;
      
      // Look for proper case names
      for (const pattern of patterns.name) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const nameCandidate = match[1].trim();
          // Additional validation
          if (nameCandidate.length >= 4 && nameCandidate.length <= 35 && 
              /^[A-Z][a-z]+(?:\s[A-Z][a-z]+){1,3}$/.test(nameCandidate)) {
            // Make sure it's not a common header phrase
            const lowerName = nameCandidate.toLowerCase();
            const isValidName = !skipNames.some(skip => lowerName.includes(skip));
            if (isValidName) {
              data.name = nameCandidate;
              break;
            }
          }
        }
      }
    }

    // If we didn't find a name in individual lines, try the full text more carefully
    if (!data.name) {
      const fullText = cleanedText.replace(/\n/g, ' ');
      // Look for 2-3 word combinations that look like names
      const nameMatches = fullText.match(/\b([A-Z][a-z]{2,}\s[A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?)\b/g);
      if (nameMatches) {
        for (const nameMatch of nameMatches) {
          const lowerName = nameMatch.toLowerCase();
          const isValidName = !skipNames.some(skip => lowerName.includes(skip));
          if (isValidName && nameMatch.length >= 4 && nameMatch.length <= 35) {
            data.name = nameMatch;
            break;
          }
        }
      }
    }

    console.log('Final extracted data:', data);
    return data;
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    
    // Process the document
    await processDocument(file);
  };

  const processDocument = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Initialize Tesseract with progress tracking
      const { data: { text } } = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setUploadProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      console.log('Extracted text:', text);

      // Extract structured data from the text
      const extractedData = extractDataFromText(text);
      
      console.log('Extracted data:', extractedData);

      // Check if we extracted any meaningful data
      const hasData = Object.values(extractedData).some(value => value && value.length > 0);
      
      if (!hasData) {
        toast({
          title: "No Data Found",
          description: "Could not extract information from the document. Please ensure the image is clear and contains readable text.",
          variant: "destructive",
        });
        return;
      }

      setUploadProgress(100);
      
      // Simulate a brief pause for better UX
      setTimeout(() => {
        onDocumentProcessed(extractedData);
      }, 500);

    } catch (error) {
      console.error('Error processing document:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process the document. Please try again with a clearer image.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!uploadedFile && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-upload-border bg-upload-bg hover:bg-upload-hover 
                   transition-all duration-300 rounded-xl p-8 text-center cursor-pointer group"
          onClick={handleUploadClick}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-gradient-primary p-4 rounded-full group-hover:scale-110 transition-transform duration-300">
              <Upload className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Upload Your Document
              </h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop your ID document here, or click to browse
              </p>
              <Button variant="outline" className="hover:shadow-soft transition-all duration-200">
                Choose File
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview */}
      {uploadedFile && previewUrl && (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-accent rounded-lg">
            <File className="w-5 h-5 text-accent-foreground" />
            <div className="flex-1">
              <p className="font-medium text-accent-foreground">{uploadedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!isUploading && (
              <CheckCircle className="w-5 h-5 text-success" />
            )}
          </div>

          {/* Image Preview */}
          <div className="relative max-w-md mx-auto">
            <img
              src={previewUrl}
              alt="Document preview"
              className="w-full rounded-lg shadow-medium border border-border"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center space-y-4">
                <div className="bg-gradient-primary p-3 rounded-full animate-pulse">
                  <AlertCircle className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground mb-2">Processing Document...</p>
                  <div className="w-48">
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{uploadProgress}% complete</p>
                </div>
              </div>
            )}
          </div>

          {/* Upload Another Button */}
          {!isUploading && (
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => {
                  setUploadedFile(null);
                  setPreviewUrl('');
                  setUploadProgress(0);
                }}
                className="hover:shadow-soft transition-all duration-200"
              >
                Upload Different Document
              </Button>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="hidden"
      />

      {/* Tips */}
      <div className="bg-accent/50 p-4 rounded-lg border border-accent-foreground/20">
        <h4 className="font-medium text-accent-foreground mb-2">For best results:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Ensure the document is well-lit and clearly visible</li>
          <li>• Avoid shadows, glare, or blurry images</li>
          <li>• Include the entire document in the frame</li>
          <li>• Use a high-resolution image (recommended: 1920x1080 or higher)</li>
        </ul>
      </div>
    </div>
  );
};