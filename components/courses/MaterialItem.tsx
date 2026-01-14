'use client';

import { useState } from 'react';
import { CourseMaterial } from '@/types/database';
import { FileText, Presentation, Edit2, Trash2, Check, X, Link2, ExternalLink, File } from 'lucide-react';

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
    // Check if it's a link resource
    if (material.resource_type === 'link') {
      return <Link2 className="w-4 h-4 text-emerald-500" />;
    }

    // File type icons
    switch (material.file_type.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'doc':
      case 'docx':
        return <File className="w-4 h-4 text-blue-500" />;
      case 'ppt':
      case 'pptx':
        return <Presentation className="w-4 h-4 text-orange-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
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
    <div className="flex items-center gap-1.5 p-1.5 bg-gray-50 rounded hover:bg-gray-100 transition-colors group">
      {/* File Icon */}
      <div className="flex-shrink-0">
        {getFileIcon()}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-1">
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
              className="flex-1 px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#10b981]"
              disabled={isRenaming}
              autoFocus
            />
            <button
              onClick={handleRename}
              disabled={isRenaming}
              className="p-0.5 text-green-600 hover:bg-green-50 rounded"
              title="Save"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditName(material.display_filename);
              }}
              disabled={isRenaming}
              className="p-0.5 text-red-600 hover:bg-red-50 rounded"
              title="Cancel"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium text-gray-900 truncate leading-tight">
              {material.display_filename}
            </p>
            <p className="text-xs text-gray-500 leading-tight">
              {material.resource_type === 'link'
                ? 'Google Drive'
                : `${formatFileSize(material.file_size_bytes!)} • ${material.file_type.toUpperCase()}`
              }
            </p>
          </>
        )}
      </div>

      {/* Actions */}
      {!isEditing && !isDeleting && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-gray-600 hover:text-[#10b981] hover:bg-white rounded transition-colors"
            title="Rename"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 text-gray-600 hover:text-red-600 hover:bg-white rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <a
            href={material.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-1.5 py-0.5 text-xs font-medium text-[#10b981] hover:bg-[#10b981] hover:text-white border border-[#10b981] rounded transition-colors flex items-center gap-0.5"
          >
            {material.resource_type === 'link' ? (
              <>
                <ExternalLink className="w-2.5 h-2.5" />
                Open
              </>
            ) : (
              'Download'
            )}
          </a>
        </div>
      )}

      {isDeleting && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <div className="animate-spin w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full"></div>
          Deleting...
        </div>
      )}
    </div>
  );
}
