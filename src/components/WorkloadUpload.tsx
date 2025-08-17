import React, { useState, useCallback, useRef } from 'react';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

interface WorkloadUploadProps {
  className?: string;
}

export default function WorkloadUpload({ className = '' }: WorkloadUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Nur .xlsx Dateien sind erlaubt');
      return false;
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Datei ist zu groß (max. 50MB)');
      return false;
    }

    return true;
  };

  const uploadFile = async (file: File) => {
    console.log('🚀 [WorkloadUpload] Starting upload process', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      user: user?.uid
    });

    if (!user) {
      console.error('❌ [WorkloadUpload] No user authenticated');
      toast.error('Bitte melden Sie sich an');
      return;
    }

    if (!validateFile(file)) {
      console.error('❌ [WorkloadUpload] File validation failed');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Create filename with timestamp
      const timestamp = Date.now();
      const filename = `${timestamp}.xlsx`;
      const storagePath = `uploads/auslastung/${user.uid}/${filename}`;
      
      console.log('📁 [WorkloadUpload] Upload path created', {
        storagePath,
        timestamp,
        filename
      });
      
      // Create storage reference
      const storageRef = ref(storage, storagePath);
      
      // Start upload with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress tracking
          const progressValue = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          const roundedProgress = Math.round(progressValue);
          setProgress(roundedProgress);
          
          console.log('📊 [WorkloadUpload] Upload progress', {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            progress: `${roundedProgress}%`,
            state: snapshot.state
          });
        },
        (error) => {
          // Error handling
          console.error('❌ [WorkloadUpload] Upload error:', {
            error: error.message,
            code: error.code,
            serverResponse: error.serverResponse
          });
          toast.error(`Upload-Fehler: ${error.message}`);
          setUploading(false);
        },
        async () => {
          // Success
          try {
            console.log('✅ [WorkloadUpload] Upload completed successfully', {
              path: storagePath,
              timestamp: new Date().toISOString()
            });
            
            // File uploaded successfully
            toast.success('Auslastungsplan erfolgreich hochgeladen!');
            
            console.log('🔄 [WorkloadUpload] Waiting for Cloud Function processing...');
            
            // Navigate to workload view page after short delay
            setTimeout(() => {
              console.log('🧭 [WorkloadUpload] Navigating to workload view');
              navigate('/workload/latest');
            }, 1500);
          } catch (error) {
            console.error('❌ [WorkloadUpload] Error after upload:', error);
            toast.error('Upload abgeschlossen, aber unerwarteter Fehler');
          } finally {
            setUploading(false);
            setProgress(0);
          }
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Unerwarteter Upload-Fehler');
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      if (uploading) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        uploadFile(files[0]);
      }
    },
    [uploading]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleClick = () => {
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (!user) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Anmeldung erforderlich
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Sie müssen angemeldet sein, um Auslastungspläne hochzuladen.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : uploading 
              ? 'border-gray-300 bg-gray-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        
        <div className="text-center">
          {uploading ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Uploading... {progress}%
                </p>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Auslastungsplan hochladen
                </p>
                <p className="text-sm text-gray-500 mt-1 cursor-pointer" onClick={handleClick}>
                  Ziehen Sie eine .xlsx Datei hierher oder klicken Sie zum Auswählen
                </p>
              </div>
              <div className="text-xs text-gray-400">
                <p>Nur Excel-Dateien (.xlsx) bis 50MB</p>
                <p>Sheet: "Auslastung operativ" mit KW-Spalten</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          📋 Erwartetes Format:
        </h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Sheet-Name: "Auslastung operativ"</li>
          <li>• Header in Zeile 3: Name, CC, BL, Bereich, Team, Standort, LBS, Projekt, Kunde, KW 33, KW 34, ...</li>
          <li>• Name im Format: "Nachname, Vorname"</li>
          <li>• Stunden als Zahlen in KW-Spalten</li>
        </ul>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Nach erfolgreichem Upload werden Sie automatisch zur Auslastungsübersicht weitergeleitet.
          </p>
        </div>
      </div>
    </div>
  );
}
