'use client';

import { useState } from 'react';
import { CourseMaterial } from '@/types/database';
import { FileText, Presentation, Edit2, Trash2, Check, X } from 'lucide-react';

interface MaterialItemProps {
  material: CourseMaterial;
  onRename: (materialId: string, newName: string) => Promise<void>;
  onDelete: (materialId: string) => Promise<void>;
  isUploading?: boolean;
}

export default function MaterialItem({ material, onRename, onDelete, isUploading }: MaterialItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(material.display_filename);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  const getFileIcon = () => {
    switch (material.file_type.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-6 h-6 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-6 h-6 text-blue-500" />;
      case 'ppt':
      case 'pptx':
        return <Presentation className="w-6 h-6 text-orange-500" />;
      default:
        return <FileText className="w-6 h-6 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleRename = async () => {
    if (editName.trim() === '' || editName === material.display_filename) {
      setIsEditing(false);
      setEditName(material.display_filename);
      return;
    }

    setIsRenaming(true);
    try {
      await onRename(material.id, editName.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Rename failed:', error);
      setEditName(material.display_filename);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(material.id);
    } catch (error) {
      console.error('Delete failed:', error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
      {/* File Icon */}
      <div className="flex-shrink-0">
        {getFileIcon()}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setEditName(material.display_filename);
                }
              }}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#10b981]"
              disabled={isRenaming}
              autoFocus
            />
            <button
              onClick={handleRename}
              disabled={isRenaming}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
              title="Save"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditName(material.display_filename);
              }}
              disabled={isRenaming}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-900 truncate">
              {material.display_filename}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(material.file_size_bytes)} • {material.file_type.toUpperCase()}
            </p>
          </>
        )}
      </div>

      {/* Actions */}
      {!isEditing && !isDeleting && (
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-gray-600 hover:text-[#10b981] hover:bg-white rounded transition-colors"
            title="Rename"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-white rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <a
            href={material.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-xs font-medium text-[#10b981] hover:bg-[#10b981] hover:text-white border border-[#10b981] rounded transition-colors"
          >
            Download
          </a>
        </div>
      )}

      {isDeleting && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"></div>
          Deleting...
        </div>
      )}
    </div>
  );
}
