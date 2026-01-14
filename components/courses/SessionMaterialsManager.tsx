'use client';

import { useState, useEffect } from 'react';
import { CourseMaterial } from '@/types/database';
import MaterialItem from '@/components/courses/MaterialItem';
import { Upload, FileText, Link2 } from 'lucide-react';

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

  // Link resource states
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDisplayName, setLinkDisplayName] = useState('');
  const [addingLink, setAddingLink] = useState(false);

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

  const handleMaterialRename = async (materialId: string, newName: string) => {
    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        body: JSON.stringify({ displayFilename: newName }),
      });

      const data = await response.json();

      if (data.success) {
        setMaterials(prev => prev.map(m => m.id === materialId ? data.material : m));
        setSuccess('File renamed successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to rename file');
        setTimeout(() => setError(null), 5000);
      }
    } catch (error) {
      console.error('Rename error:', error);
      setError('Failed to rename file');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleMaterialDelete = async (materialId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': csrfToken || '',
        },
      });

      const data = await response.json();

      if (data.success) {
        setMaterials(prev => prev.filter(m => m.id !== materialId));
        setSuccess('File deleted successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to delete file');
        setTimeout(() => setError(null), 5000);
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete file');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim()) {
      setError('Please enter a Google Drive link');
      setTimeout(() => setError(null), 5000);
      return;
    }

    setAddingLink(true);
    setError(null);

    try {
      const response = await fetch('/api/add-course-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify({
          url: linkUrl.trim(),
          displayName: linkDisplayName.trim() || null,
          courseId,
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to add link');
      }

      // Add to materials list
      setMaterials((prev) => [...prev, data.material]);

      // Reset form
      setLinkUrl('');
      setLinkDisplayName('');
      setSuccess('Link added successfully');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Add link error:', err);
      setError(err.message || 'Failed to add link');
      setTimeout(() => setError(null), 5000);
    } finally {
      setAddingLink(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Error/Success Messages */}
      {error && (
        <div className="p-1.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
          {error}
        </div>
      )}

      {success && (
        <div className="p-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded text-xs">
          {success}
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex gap-1">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            activeTab === 'upload'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Upload
        </button>
        <button
          onClick={() => setActiveTab('link')}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            activeTab === 'link'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Add Link
        </button>
      </div>

      {/* Upload Zone */}
      {activeTab === 'upload' ? (
      <div
        className={`border border-dashed rounded p-3 text-center transition-colors ${
          dragActive
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-gray-300 hover:border-emerald-500 hover:bg-emerald-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-5 w-5 text-gray-400 mb-1.5" />
        <p className="text-xs text-gray-600 mb-0.5">
          Drag files or click to select
        </p>
        <p className="text-xs text-gray-400 mb-2">
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
          className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 cursor-pointer transition-colors font-medium"
        >
          <Upload size={12} />
          Choose
        </label>
      </div>
      ) : (
          <div className="border border-solid rounded p-2.5 bg-gray-50">
              {/* Link Input Form */}
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                  <Link2 size={14} className="text-emerald-600" />
                  Add Google Drive Link
              </h3>
        {/* Google Drive URL Input */}
        <div className="mb-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Link <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://drive.google.com/file/d/..."
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
            disabled={addingLink}
          />
        </div>

        {/* Display Name Input */}
        <div className="mb-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Name (optional)
          </label>
          <input
            type="text"
            value={linkDisplayName}
            onChange={(e) => setLinkDisplayName(e.target.value)}
            placeholder="Auto-detect if empty"
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
            disabled={addingLink}
          />
        </div>

        {/* Add Button */}
        <button
          onClick={handleAddLink}
          disabled={addingLink || !linkUrl.trim()}
          className="w-full px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-1"
        >
          {addingLink ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div>
              Adding...
            </>
          ) : (
            <>
              <Link2 size={12} />
              Add
            </>
          )}
        </button>
      </div>
      )}

      {/* Uploading Files Progress */}
      {uploadingFiles.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-1.5">
          <p className="text-blue-700 font-medium mb-1 text-xs">Uploading...</p>
          <ul className="list-disc list-inside text-blue-600 text-xs">
            {Array.from(uploadingFiles).map((filename) => (
              <li key={filename}>{filename}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Materials List */}
      {materialsLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-emerald-600"></div>
        </div>
      ) : materials.length === 0 ? (
        <div className="text-center py-4 bg-gray-50 rounded border border-gray-200">
          <FileText className="mx-auto h-6 w-6 text-gray-400 mb-1" />
          <p className="text-xs text-gray-600">No materials yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold text-gray-900">
            Materials ({materials.length})
          </h3>
          {materials.map((material) => (
            <MaterialItem
              key={material.id}
              material={material}
              onRename={handleMaterialRename}
              onDelete={handleMaterialDelete}
              isUploading={material.original_filename ? uploadingFiles.has(material.original_filename) : false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
