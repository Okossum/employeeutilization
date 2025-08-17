import React, { useState, useCallback, useRef } from 'react';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

interface EinsatzplanUploadProps {
  className?: string;
}

export default function EinsatzplanUpload({ className = '' }: EinsatzplanUploadProps) {
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
    if (!user) {
      toast.error('Bitte melden Sie sich an');
      return;
    }

    if (!validateFile(file)) {
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Create filename with timestamp
      const timestamp = Date.now();
      const filename = `${timestamp}.xlsx`;
      const storagePath = `uploads/einsatzplaene/${user.uid}/${filename}`;
      
      // Create storage reference
      const storageRef = ref(storage, storagePath);
      
      // Start upload with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress tracking
          const progressValue = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(Math.round(progressValue));
        },
        (error) => {
          // Error handling
          console.error('Upload error:', error);
          toast.error(`Upload-Fehler: ${error.message}`);
          setUploading(false);
        },
        async () => {
          // Success
          try {
            // File uploaded successfully
            toast.success('Einsatzplan erfolgreich hochgeladen!');
            
            // Navigate to plan view page after short delay
            setTimeout(() => {
              navigate('/einsatzplan/view');
            }, 1500);
          } catch (error) {
            console.error('Error after upload:', error);
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
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <p className="text-gray-600">Bitte melden Sie sich an, um Einsatzpläne hochzuladen.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white border-2 border-dashed rounded-lg transition-colors ${className} ${
      isDragOver 
        ? 'border-blue-400 bg-blue-50' 
        : uploading 
        ? 'border-gray-300 bg-gray-50' 
        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
    }`}>
      <div
        className="p-8 text-center cursor-pointer"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />

        {/* Upload Icon */}
        <div className="mb-4">
          <svg
            className={`mx-auto ${
              isDragOver ? 'text-blue-500' : 'text-gray-400'
            }`}
            width="48"
            height="48"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Text */}
        <div className="mb-4">
          {uploading ? (
            <div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Upload läuft... {progress}%
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : isDragOver ? (
            <p className="text-lg font-medium text-blue-600">
              Datei hier ablegen...
            </p>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-700">
                Einsatzplan-Datei hochladen
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Ziehen Sie eine .xlsx Datei hierher oder klicken Sie zum Auswählen
              </p>
            </div>
          )}
        </div>

        {/* Upload Button */}
        {!uploading && (
          <button
            type="button"
            disabled={uploading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="-ml-1 mr-2"
              width="16"
              height="16"
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
            Datei auswählen
          </button>
        )}

        {/* File format info */}
        <p className="text-xs text-gray-400 mt-3">
          Unterstützt: .xlsx (max. 50MB)
        </p>
      </div>
    </div>
  );
}
