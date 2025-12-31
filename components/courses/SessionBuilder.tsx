'use client';

import { useState, useCallback, memo, useEffect } from 'react';
import { CourseSession, CourseMaterial } from '@/types/database';
import { ChevronDown, ChevronUp, Trash2, Plus, GripVertical, FileText, Upload, X, Edit2, Check } from 'lucide-react';
import { COMMON_TIMEZONES, utcToLocal, localToUTC } from '@/lib/timezone-utils';

// Memoized input components for better performance
const InputField = memo(({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
  placeholder = '',
  min,
  max,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  min?: string | number;
  max?: number;
}) => (
  <div className="flex flex-col">
    <label className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-100"
      placeholder={placeholder}
      required={required}
      min={min}
      max={max}
    />
  </div>
));
InputField.displayName = 'InputField';

const TextareaField = memo(({
  label,
  value,
  onChange,
  required = false,
  rows = 4,
  placeholder = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
  placeholder?: string;
}) => (
  <div className="flex flex-col">
    <label className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-100 resize-y"
      placeholder={placeholder}
      required={required}
    />
  </div>
));
TextareaField.displayName = 'TextareaField';

interface SessionBuilderProps {
  sessions: CourseSession[];
  onChange: (sessions: CourseSession[]) => void;
  courseId: string;
  defaultTimezone?: string;
  csrfToken?: string;
}

interface SessionFormData {
  id?: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration_minutes: number;
  timezone: string;
  meeting_url: string;
  display_order: number;
  isExpanded: boolean;
}

export default function SessionBuilder({
  sessions,
  onChange,
  courseId,
  defaultTimezone = 'America/New_York',
  csrfToken,
}: SessionBuilderProps) {
  // Materials state for each session
  const [sessionMaterials, setSessionMaterials] = useState<Record<string, CourseMaterial[]>>({});
  const [loadingMaterials, setLoadingMaterials] = useState<Record<string, boolean>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, Set<string>>>({});
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  // Convert sessions to form data format with local date/time
  const sessionsToFormData = useCallback((sessions: CourseSession[]): SessionFormData[] => {
    return sessions.map((session, index) => {
      const { date, time } = utcToLocal(session.session_date, session.timezone);
      return {
        id: session.id,
        title: session.title,
        description: session.description || '',
        date,
        time,
        duration_minutes: session.duration_minutes,
        timezone: session.timezone,
        meeting_url: session.meeting_url || '',
        display_order: session.display_order,
        isExpanded: index === 0, // First session expanded by default
      };
    });
  }, []);

  const [formSessions, setFormSessions] = useState<SessionFormData[]>(
    sessions.length > 0 ? sessionsToFormData(sessions) : []
  );

  // Convert form data back to sessions format
  const formDataToSessions = useCallback((formData: SessionFormData[]): CourseSession[] => {
    return formData.map((form, index) => ({
      id: form.id || `temp-${index}`,
      course_id: courseId,
      title: form.title,
      description: form.description || undefined,
      session_date: localToUTC(form.date, form.time, form.timezone),
      duration_minutes: form.duration_minutes,
      timezone: form.timezone,
      meeting_url: form.meeting_url || undefined,
      display_order: index,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }, [courseId]);

  // Update parent whenever form sessions change
  const updateParent = useCallback((newFormSessions: SessionFormData[]) => {
    setFormSessions(newFormSessions);
    onChange(formDataToSessions(newFormSessions));
  }, [onChange, formDataToSessions]);

  const handleAddSession = () => {
    const newSession: SessionFormData = {
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      time: '19:00', // Default to 7 PM
      duration_minutes: 120, // Default to 2 hours
      timezone: defaultTimezone,
      meeting_url: '',
      display_order: formSessions.length,
      isExpanded: true,
    };

    updateParent([...formSessions, newSession]);
  };

  const handleRemoveSession = (index: number) => {
    const newSessions = formSessions.filter((_, i) => i !== index);
    updateParent(newSessions);
  };

  const handleUpdateSession = (index: number, field: keyof SessionFormData, value: any) => {
    const newSessions = [...formSessions];
    newSessions[index] = { ...newSessions[index], [field]: value };
    updateParent(newSessions);
  };

  const toggleExpanded = (index: number) => {
    const newSessions = [...formSessions];
    newSessions[index].isExpanded = !newSessions[index].isExpanded;
    setFormSessions(newSessions);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSessions = [...formSessions];
    [newSessions[index - 1], newSessions[index]] = [newSessions[index], newSessions[index - 1]];
    updateParent(newSessions);
  };

  const handleMoveDown = (index: number) => {
    if (index === formSessions.length - 1) return;
    const newSessions = [...formSessions];
    [newSessions[index], newSessions[index + 1]] = [newSessions[index + 1], newSessions[index]];
    updateParent(newSessions);
  };

  // Fetch materials for a session
  const fetchSessionMaterials = useCallback(async (sessionId: string) => {
    if (!sessionId || sessionId.startsWith('temp-')) return;

    setLoadingMaterials(prev => ({ ...prev, [sessionId]: true }));
    try {
      const response = await fetch(`/api/courses/${courseId}/materials`);
      const data = await response.json();
      if (data.success) {
        const materials = (data.materials || []).filter((m: CourseMaterial) => m.session_id === sessionId);
        setSessionMaterials(prev => ({ ...prev, [sessionId]: materials }));
      }
    } catch (error) {
      console.error('Error fetching session materials:', error);
    } finally {
      setLoadingMaterials(prev => ({ ...prev, [sessionId]: false }));
    }
  }, [courseId]);

  // Fetch materials when sessions change
  useEffect(() => {
    formSessions.forEach(session => {
      if (session.id && !session.id.startsWith('temp-') && !sessionMaterials[session.id]) {
        fetchSessionMaterials(session.id);
      }
    });
  }, [formSessions, sessionMaterials, fetchSessionMaterials]);

  // Handle file upload for a session
  const handleFileUpload = async (sessionId: string, files: FileList) => {
    if (!files || files.length === 0 || !csrfToken) return;

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
        alert(`Invalid file type: ${file.name}. Only PDF, DOCX, and PPTX are allowed.`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert(`File too large: ${file.name}. Maximum size is 10MB.`);
        continue;
      }

      // Add to uploading set
      setUploadingFiles(prev => ({
        ...prev,
        [sessionId]: new Set([...(prev[sessionId] || []), file.name])
      }));

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('courseId', courseId);
        formData.append('sessionId', sessionId);

        const response = await fetch('/api/upload-course-material', {
          method: 'POST',
          body: formData,
          headers: {
            'X-CSRF-Token': csrfToken,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Upload failed');
        }

        // Add to materials list
        setSessionMaterials(prev => ({
          ...prev,
          [sessionId]: [...(prev[sessionId] || []), data.material]
        }));
      } catch (err: any) {
        console.error('Upload error:', err);
        alert(err.message || `Failed to upload: ${file.name}`);
      } finally {
        setUploadingFiles(prev => {
          const newSet = new Set(prev[sessionId] || []);
          newSet.delete(file.name);
          return { ...prev, [sessionId]: newSet };
        });
      }
    }
  };

  // Handle material deletion
  const handleDeleteMaterial = async (sessionId: string, materialId: string) => {
    if (!confirm('Delete this file?') || !csrfToken) return;

    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      const data = await response.json();

      if (data.success) {
        setSessionMaterials(prev => ({
          ...prev,
          [sessionId]: (prev[sessionId] || []).filter(m => m.id !== materialId)
        }));
      } else {
        alert(data.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete file');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle start editing material name
  const handleStartEditMaterial = (materialId: string, currentName: string) => {
    setEditingMaterial(materialId);
    setEditingName(currentName);
  };

  // Handle save material name
  const handleSaveMaterialName = async (sessionId: string, materialId: string) => {
    if (!editingName.trim() || !csrfToken) {
      setEditingMaterial(null);
      return;
    }

    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ displayFilename: editingName.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionMaterials(prev => ({
          ...prev,
          [sessionId]: (prev[sessionId] || []).map(m =>
            m.id === materialId ? { ...m, display_filename: editingName.trim() } : m
          )
        }));
        setEditingMaterial(null);
      } else {
        alert(data.error || 'Rename failed');
      }
    } catch (error) {
      console.error('Rename error:', error);
      alert('Failed to rename file');
    }
  };

  // Handle cancel editing
  const handleCancelEditMaterial = () => {
    setEditingMaterial(null);
    setEditingName('');
  };

  return (
    <div className="space-y-4">
      {formSessions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 mb-4">No sessions configured for this course.</p>
          <button
            type="button"
            onClick={handleAddSession}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <Plus size={20} />
            Add First Session
          </button>
        </div>
      ) : (
        <>
          {formSessions.map((session, index) => (
            <div
              key={session.id || index}
              className="border-2 border-gray-300 rounded-lg p-4 bg-white hover:border-emerald-500 transition-colors"
            >
              {/* Session Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                    title="Drag to reorder"
                  >
                    <GripVertical size={20} />
                  </button>

                  <div className="flex-1">
                    {session.title ? (
                      <h3 className="font-semibold text-gray-900">
                        Session {index + 1}: {session.title}
                      </h3>
                    ) : (
                      <h3 className="font-semibold text-gray-400">Session {index + 1} (Untitled)</h3>
                    )}
                    {session.date && session.time && (
                      <p className="text-sm text-gray-500">
                        {new Date(`${session.date}T${session.time}`).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        at {session.time}
                      </p>
                    )}
                    {/* Show material count badge if session has materials */}
                    {session.id && !session.id.startsWith('temp-') && sessionMaterials[session.id] && sessionMaterials[session.id].length > 0 && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full">
                        <FileText size={12} />
                        {sessionMaterials[session.id].length} {sessionMaterials[session.id].length === 1 ? 'file' : 'files'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Move buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === formSessions.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>

                  {/* Expand/collapse button */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(index)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {session.isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveSession(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete session"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {/* Session Form Fields */}
              {session.isExpanded && (
                <div className="mt-4 space-y-4 pt-4 border-t border-gray-200">
                  {/* Title */}
                  <InputField
                    label="Session Title"
                    value={session.title}
                    onChange={(value) => handleUpdateSession(index, 'title', value)}
                    required
                    placeholder="e.g., Introduction to Python"
                  />

                  {/* Description */}
                  <TextareaField
                    label="Description"
                    value={session.description}
                    onChange={(value) => handleUpdateSession(index, 'description', value)}
                    rows={3}
                    placeholder="Brief description of what will be covered in this session..."
                  />

                  {/* Date, Time, Duration */}
                  <div className="grid grid-cols-3 gap-4">
                    <InputField
                      label="Date"
                      value={session.date}
                      onChange={(value) => handleUpdateSession(index, 'date', value)}
                      type="date"
                      required
                    />

                    <InputField
                      label="Start Time"
                      value={session.time}
                      onChange={(value) => handleUpdateSession(index, 'time', value)}
                      type="time"
                      required
                    />

                    <InputField
                      label="Duration (minutes)"
                      value={session.duration_minutes}
                      onChange={(value) =>
                        handleUpdateSession(index, 'duration_minutes', parseInt(value) || 0)
                      }
                      type="number"
                      min={1}
                      max={480}
                      required
                      placeholder="120"
                    />
                  </div>

                  {/* Timezone */}
                  <div className="flex flex-col">
                    <label className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">
                      Timezone <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={session.timezone}
                      onChange={(e) => handleUpdateSession(index, 'timezone', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-100"
                      required
                    >
                      {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Meeting URL */}
                  <InputField
                    label="Meeting URL (Optional)"
                    value={session.meeting_url}
                    onChange={(value) => handleUpdateSession(index, 'meeting_url', value)}
                    type="url"
                    placeholder="https://meet.google.com/... or https://zoom.us/..."
                  />

                  {/* Session Materials Section - Only show for saved sessions */}
                  {session.id && !session.id.startsWith('temp-') && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold uppercase tracking-wide text-gray-700 flex items-center gap-2">
                          <FileText size={16} className="text-emerald-600" />
                          Session Materials
                        </h4>
                      </div>

                      {/* Upload Button */}
                      <div className="mb-4">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.ppt,.pptx"
                          onChange={(e) => e.target.files && handleFileUpload(session.id!, e.target.files)}
                          className="hidden"
                          id={`file-upload-${session.id}`}
                        />
                        <label
                          htmlFor={`file-upload-${session.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 cursor-pointer transition-colors"
                        >
                          <Upload size={16} />
                          Upload Files
                        </label>
                        <p className="text-xs text-gray-500 mt-2">PDF, DOC, DOCX, PPT, PPTX (max 10MB)</p>
                      </div>

                      {/* Uploading indicator */}
                      {uploadingFiles[session.id!] && uploadingFiles[session.id!].size > 0 && (
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-700 font-medium mb-1">Uploading...</p>
                          <ul className="text-xs text-blue-600 list-disc list-inside">
                            {Array.from(uploadingFiles[session.id!]).map((filename) => (
                              <li key={filename}>{filename}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Materials List */}
                      {loadingMaterials[session.id!] ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600 mx-auto"></div>
                          <p className="text-sm text-gray-500 mt-2">Loading materials...</p>
                        </div>
                      ) : sessionMaterials[session.id!] && sessionMaterials[session.id!].length > 0 ? (
                        <div className="space-y-2">
                          {sessionMaterials[session.id!].map((material) => (
                            <div
                              key={material.id}
                              className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-emerald-500 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText size={20} className="text-emerald-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  {editingMaterial === material.id ? (
                                    <input
                                      type="text"
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveMaterialName(session.id!, material.id);
                                        if (e.key === 'Escape') handleCancelEditMaterial();
                                      }}
                                      className="text-sm font-medium text-gray-900 w-full px-2 py-1 border border-emerald-500 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                      autoFocus
                                    />
                                  ) : (
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {material.display_filename}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500">
                                    {material.file_type.toUpperCase()} • {formatFileSize(material.file_size_bytes)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {editingMaterial === material.id ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveMaterialName(session.id!, material.id)}
                                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                      title="Save"
                                    >
                                      <Check size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditMaterial}
                                      className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                      title="Cancel"
                                    >
                                      <X size={16} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditMaterial(material.id, material.display_filename)}
                                      className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                      title="Rename"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMaterial(session.id!, material.id)}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="Delete file"
                                    >
                                      <X size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic text-center py-4">
                          No materials uploaded yet
                        </p>
                      )}
                    </div>
                  )}

                  {/* Note for unsaved sessions */}
                  {(!session.id || session.id.startsWith('temp-')) && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        💡 <strong>Tip:</strong> Save this session first to upload materials.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add Session Button */}
          <button
            type="button"
            onClick={handleAddSession}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add Another Session
          </button>
        </>
      )}
    </div>
  );
}
