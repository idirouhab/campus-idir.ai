'use client';

import { useState, useEffect } from 'react';
import { CourseMaterial } from '@/types/database';
import MaterialItem from '@/components/courses/MaterialItem';
import { Upload, FileText } from 'lucide-react';

interface SessionMaterialsManagerProps {
  courseId: string;
  sessionId: string;
  csrfToken?: string;
}

export default function SessionMaterialsManager({
  courseId,
  sessionId,
  csrfToken,
}: SessionMaterialsManagerProps) {
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Fetch session materials
  useEffect(() => {
    const fetchMaterials = async () => {
      setMaterialsLoading(true);
      try {
        const response = await fetch(`/api/courses/${courseId}/materials`);
        const data = await response.json();
        if (data.success) {
          // Filter for session-specific materials
          const sessionMaterials = (data.materials || []).filter(
            (m: CourseMaterial) => m.session_id === sessionId
          );
          setMaterials(sessionMaterials);
        }
      } catch (error) {
        console.error('Error fetching materials:', error);
      } finally {
        setMaterialsLoading(false);
      }
    };

    fetchMaterials();
  }, [courseId, sessionId]);

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint',
      ];

      if (!allowedTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Only PDF, DOCX, and PPTX are allowed.`);
        setTimeout(() => setError(null), 5000);
        continue;
      }

      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        setError(`File too large: ${file.name}. Maximum size is 10MB.`);
        setTimeout(() => setError(null), 5000);
        continue;
      }

      // Add to uploading set
      setUploadingFiles((prev) => new Set(prev).add(file.name));

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('courseId', courseId);
        formData.append('sessionId', sessionId);
        formData.append('displayFilename', file.name);

        const response = await fetch('/api/upload-course-material', {
          method: 'POST',
          body: formData,
          headers: {
            'X-CSRF-Token': csrfToken || '',
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Upload failed');
        }

        // Add to materials list
        setMaterials((prev) => [...prev, data.material]);
        setSuccess(`Successfully uploaded: ${file.name}`);
        setTimeout(() => setSuccess(null), 5000);
      } catch (err: any) {
        console.error('Upload error:', err);
        setError(err.message || `Failed to upload: ${file.name}`);
        setTimeout(() => setError(null), 5000);
      } finally {
        setUploadingFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(file.name);
          return newSet;
        });
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleMaterialDeleted = (materialId: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== materialId));
  };

  const handleMaterialUpdated = (updatedMaterial: CourseMaterial) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === updatedMaterial.id ? updatedMaterial : m))
    );
  };

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
          {success}
        </div>
      )}

      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-gray-300 hover:border-emerald-500 hover:bg-emerald-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600 mb-2">
          Drag and drop files here, or click to select
        </p>
        <p className="text-sm text-gray-500 mb-4">
          PDF, DOC, DOCX, PPT, PPTX (max 10MB)
        </p>

        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.ppt,.pptx"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
          id="file-upload"
        />

        <label
          htmlFor="file-upload"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer transition-colors font-medium"
        >
          <Upload size={20} />
          Choose Files
        </label>
      </div>

      {/* Uploading Files Progress */}
      {uploadingFiles.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700 font-medium mb-2">Uploading files...</p>
          <ul className="list-disc list-inside text-blue-600 text-sm">
            {Array.from(uploadingFiles).map((filename) => (
              <li key={filename}>{filename}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Materials List */}
      {materialsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
        </div>
      ) : materials.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-600">No materials uploaded for this session yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Session Materials ({materials.length})
          </h3>
          {materials.map((material) => (
            <MaterialItem
              key={material.id}
              material={material}
              csrfToken={csrfToken}
              onDeleted={handleMaterialDeleted}
              onUpdated={handleMaterialUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
