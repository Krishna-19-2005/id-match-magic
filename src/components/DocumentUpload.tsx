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

  const extractDataFromText = (text: string): ExtractedData => {
    const data: ExtractedData = {};
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    // Enhanced patterns for better matching
    const patterns = {
      // Name patterns - look for common ID document formats
      name: [
        /(?:name|given name|full name|surname|first name)[\s:]*([a-zA-Z\s]+)/i,
        /^([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/,
        /(?:MR|MS|MRS|DR)[\s.]([A-Z][a-z]+\s[A-Z][a-z]+)/i,
      ],
      
      // Date patterns - various formats
      dateOfBirth: [
        /(?:dob|date of birth|born)[\s:]*([\d]{1,2}[\/\-\.]([\d]{1,2})[\/\-\.]([\d]{2,4}))/i,
        /(?:dob|date of birth|born)[\s:]*([\d]{2,4}[\/\-\.]([\d]{1,2})[\/\-\.]([\d]{1,2}))/i,
        /([\d]{1,2}[\/\-\.]([\d]{1,2})[\/\-\.]([\d]{4}))/,
        /([\d]{4}[\/\-\.]([\d]{1,2})[\/\-\.]([\d]{1,2}))/,
      ],
      
      // ID number patterns
      idNumber: [
        /(?:id|identification|license|passport)[\s#:]*([A-Z0-9]{6,})/i,
        /(?:number|no|#)[\s:]*([\d]{8,})/i,
        /([A-Z]{1,2}[\d]{6,})/,
        /([\d]{9,})/,
      ],
      
      // Phone patterns
      phoneNumber: [
        /(?:phone|mobile|tel|contact)[\s:]*(\+?[\d\s\-\(\)]{10,})/i,
        /(\+?[\d]{1,3}[\s\-]?[\d]{3}[\s\-]?[\d]{3}[\s\-]?[\d]{4})/,
        /(\([\d]{3}\)[\s\-]?[\d]{3}[\s\-]?[\d]{4})/,
        /([\d]{10,})/,
      ]
    };

    // Process each line and try to extract information
    for (const line of lines) {
      // Skip very short lines
      if (line.length < 3) continue;
      
      // Try name extraction
      if (!data.name) {
        for (const pattern of patterns.name) {
          const match = line.match(pattern);
          if (match && match[1]) {
            const nameCandidate = match[1].trim();
            // Validate name (letters and spaces only, reasonable length)
            if (nameCandidate.length >= 3 && nameCandidate.length <= 50 && 
                /^[a-zA-Z\s]+$/.test(nameCandidate)) {
              data.name = nameCandidate;
              break;
            }
          }
        }
      }
      
      // Try date extraction
      if (!data.dateOfBirth) {
        for (const pattern of patterns.dateOfBirth) {
          const match = line.match(pattern);
          if (match && match[1]) {
            data.dateOfBirth = match[1].trim();
            break;
          }
        }
      }
      
      // Try ID number extraction
      if (!data.idNumber) {
        for (const pattern of patterns.idNumber) {
          const match = line.match(pattern);
          if (match && match[1]) {
            const idCandidate = match[1].trim();
            if (idCandidate.length >= 6 && idCandidate.length <= 20) {
              data.idNumber = idCandidate;
              break;
            }
          }
        }
      }
      
      // Try phone extraction
      if (!data.phoneNumber) {
        for (const pattern of patterns.phoneNumber) {
          const match = line.match(pattern);
          if (match && match[1]) {
            const phoneCandidate = match[1].trim();
            const digitsOnly = phoneCandidate.replace(/\D/g, '');
            if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
              data.phoneNumber = phoneCandidate;
              break;
            }
          }
        }
      }
    }

    // Additional fallback patterns for common formats
    const fullText = text.replace(/\n/g, ' ');
    
    // Look for consecutive words that might be names
    if (!data.name) {
      const nameMatch = fullText.match(/\b([A-Z][a-z]+\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/);
      if (nameMatch && nameMatch[1] && nameMatch[1].length <= 50) {
        data.name = nameMatch[1];
      }
    }
    
    // Look for dates in various formats
    if (!data.dateOfBirth) {
      const dateMatches = [
        fullText.match(/([\d]{1,2}\/[\d]{1,2}\/[\d]{4})/),
        fullText.match(/([\d]{1,2}-[\d]{1,2}-[\d]{4})/),
        fullText.match(/([\d]{4}-[\d]{1,2}-[\d]{1,2})/),
      ];
      
      for (const match of dateMatches) {
        if (match && match[1]) {
          data.dateOfBirth = match[1];
          break;
        }
      }
    }

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