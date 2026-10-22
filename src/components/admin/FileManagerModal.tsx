import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FolderOpen,
  Image as ImageIcon,
  Trash2,
  Copy,
  Check,
  Search,
  X,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export interface UploadedFile {
  filename: string;
  url: string;
  size: number;
  createdAt: string;
}

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage?: (url: string) => void;
  currentImageUrl?: string;
  title?: string;
}

// Curated high-res culinary presets for instant restaurant setup
const GOURMET_PRESETS = [
  {
    name: 'Artisanal Smash Burger',
    category: 'Burgers',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Woodfired Truffle Pizza',
    category: 'Pizza',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Hyderabadi Dum Biryani',
    category: 'Biryani',
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Crispy Paneer Tikka',
    category: 'Starters',
    url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Creamy Butter Chicken',
    category: 'Main Course',
    url: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Belgian Chocolate Waffle',
    category: 'Desserts',
    url: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Biscoff Thick Milkshake',
    category: 'Beverages',
    url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Crispy French Fries & Dips',
    category: 'Sides',
    url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80',
  },
];

export const FileManagerModal: React.FC<FileManagerModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  currentImageUrl,
  title = 'Media & File Manager',
}) => {
  const [activeTab, setActiveTab] = useState<'uploads' | 'upload-new' | 'presets'>('uploads');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [deleteFileError, setDeleteFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch uploaded files list
  const fetchUploads = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/uploads');
      if (res.ok) {
        const data = await res.json();
        setUploadedFiles(data);
      }
    } catch (err) {
      console.error('Failed to load uploads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUploads();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Process files from file input or drag-drop
  const handleProcessFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (fileArray.length === 0) {
      alert('Please select valid image files (PNG, JPG, WebP, SVG).');
      return;
    }

    setUploadProgress(`Uploading ${fileArray.length} image(s)...`);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 10MB limit.`);
        continue;
      }

      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const dataUrl = reader.result as string;
            const res = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                dataUrl,
                filename: file.name,
              }),
            });

            if (res.ok) {
              const uploaded = await res.json();
              // If only 1 file and in selection mode, auto-select
              if (fileArray.length === 1 && onSelectImage) {
                onSelectImage(uploaded.url);
                onClose();
              }
            }
          } catch (err) {
            console.error('Upload failed:', err);
          } finally {
            resolve();
          }
        };
        reader.readAsDataURL(file);
      });
    }

    setUploadProgress(null);
    await fetchUploads();
    setActiveTab('uploads');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  const handleDeleteFile = (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteFileError(null);
    setFileToDelete(filename);
  };

  const handleConfirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setIsDeletingFile(true);
    setDeleteFileError(null);

    try {
      const res = await fetch(`/api/uploads/${encodeURIComponent(fileToDelete)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setUploadedFiles((prev) => prev.filter((f) => f.filename !== fileToDelete));
        if (currentImageUrl && currentImageUrl.includes(fileToDelete) && onSelectImage) {
          onSelectImage('');
        }
        setFileToDelete(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setDeleteFileError(data.error || 'Failed to delete file from server');
      }
    } catch (err: any) {
      console.error('Delete failed:', err);
      setDeleteFileError(err.message || 'Error occurred while deleting file.');
    } finally {
      setIsDeletingFile(false);
    }
  };

  const handleCopyLink = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.origin + url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const filteredFiles = uploadedFiles.filter((f) =>
    f.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPresets = GOURMET_PRESETS.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      id="file-manager-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="file-manager-modal"
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">{title}</h2>
              <p className="text-xs text-slate-400">
                Upload dish images from your device, choose from server files, or pick gourmet presets
              </p>
            </div>
          </div>
          <button
            id="close-file-manager-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90">
          <div className="flex items-center space-x-1.5 bg-slate-950/70 p-1 rounded-2xl border border-slate-800">
            <button
              id="file-manager-tab-uploads"
              onClick={() => setActiveTab('uploads')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'uploads'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Uploaded Media ({uploadedFiles.length})</span>
            </button>

            <button
              id="file-manager-tab-new"
              onClick={() => setActiveTab('upload-new')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'upload-new'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload from Device</span>
            </button>

            <button
              id="file-manager-tab-presets"
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'presets'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gourmet Presets</span>
            </button>
          </div>

          {/* Quick Search & Refresh */}
          {(activeTab === 'uploads' || activeTab === 'presets') && (
            <div className="flex items-center space-x-2 flex-1 max-w-xs ml-auto">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              {activeTab === 'uploads' && (
                <button
                  onClick={fetchUploads}
                  title="Refresh files"
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: UPLOADED MEDIA GALLERY */}
          {activeTab === 'uploads' && (
            <div>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                  <p className="text-xs">Loading media files...</p>
                </div>
              ) : uploadedFiles.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-3xl bg-slate-950/40 space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">No images uploaded yet</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Upload food photos directly from your device file manager, or choose from ready-to-use gourmet presets.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('upload-new')}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Your First Image</span>
                  </button>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No images matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {filteredFiles.map((file) => {
                    const isSelected = currentImageUrl === file.url;
                    return (
                      <div
                        key={file.filename}
                        onClick={() => {
                          if (onSelectImage) {
                            onSelectImage(file.url);
                            onClose();
                          }
                        }}
                        className={`group relative bg-slate-950 border rounded-2xl overflow-hidden transition-all cursor-pointer flex flex-col ${
                          isSelected
                            ? 'border-amber-500 ring-2 ring-amber-500/30'
                            : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        {/* Image Preview Thumbnail */}
                        <div className="aspect-video w-full bg-slate-900 overflow-hidden relative">
                          <img
                            src={file.url}
                            alt={file.filename}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute top-2 left-2 bg-amber-500 text-slate-950 p-1 rounded-lg shadow-md">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          )}

                          {/* Quick Actions Hover Overlay */}
                          <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleCopyLink(file.url, e)}
                              title="Copy URL"
                              className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-white rounded-lg backdrop-blur-xs text-xs transition"
                            >
                              {copiedUrl === file.url ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              onClick={(e) => handleDeleteFile(file.filename, e)}
                              title="Delete file"
                              className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-lg backdrop-blur-xs text-xs transition"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* File Details */}
                        <div className="p-2.5 flex-1 flex flex-col justify-between">
                          <p className="text-[11px] font-bold text-slate-200 truncate" title={file.filename}>
                            {file.filename}
                          </p>
                          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                            <span>{formatFileSize(file.size)}</span>
                            {onSelectImage && (
                              <span className="text-amber-400 font-bold group-hover:underline">
                                {isSelected ? 'Selected' : 'Use Image'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD FROM DEVICE (DRAG & DROP + NATIVE FILE PICKER) */}
          {activeTab === 'upload-new' && (
            <div className="space-y-4 max-w-xl mx-auto py-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                onChange={handleFileChange}
                className="hidden"
                id="file-manager-input"
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                  isDragging
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-700 bg-slate-950/40 hover:border-amber-500/60 hover:bg-slate-950/80'
                }`}
              >
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-white">
                    Choose Image Files or Drag &amp; Drop Here
                  </h3>
                  <p className="text-xs text-slate-400">
                    Click to open your device file manager (Photos, Camera, Downloads, Desktop)
                  </p>
                </div>
                <div className="pt-2">
                  <span className="inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition">
                    <FolderOpen className="w-4 h-4" />
                    <span>Browse Device Files</span>
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Supports JPG, PNG, WEBP, SVG, GIF up to 10MB per image
                </p>
              </div>

              {uploadProgress && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center space-x-3 text-xs text-amber-400">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-500 shrink-0" />
                  <span>{uploadProgress}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GOURMET FOOD PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Instantly assign high-definition gourmet photos for your dishes with one click.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {filteredPresets.map((preset) => {
                  const isSelected = currentImageUrl === preset.url;
                  return (
                    <div
                      key={preset.name}
                      onClick={() => {
                        if (onSelectImage) {
                          onSelectImage(preset.url);
                          onClose();
                        }
                      }}
                      className={`group relative bg-slate-950 border rounded-2xl overflow-hidden transition-all cursor-pointer flex flex-col ${
                        isSelected
                          ? 'border-amber-500 ring-2 ring-amber-500/30'
                          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="aspect-video w-full bg-slate-900 overflow-hidden relative">
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <span className="absolute top-2 right-2 bg-slate-950/80 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                          {preset.category}
                        </span>
                      </div>
                      <div className="p-2.5 flex-1 flex flex-col justify-between">
                        <p className="text-[11px] font-bold text-slate-200 truncate">{preset.name}</p>
                        <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                          <span className="text-amber-400 font-bold group-hover:underline">
                            {isSelected ? 'Selected' : 'Use Preset'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs">
          <div className="text-slate-400">
            {uploadedFiles.length} file(s) stored on server
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
          >
            Close
          </button>
        </div>

        {/* In-Modal Delete File Confirmation Overlay */}
        {fileToDelete && (
          <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xs w-full p-5 space-y-3 shadow-2xl text-center">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Delete Media File?</h4>
                <p className="text-[11px] text-slate-400 break-all leading-tight">
                  Are you sure you want to remove <span className="text-white font-semibold">&ldquo;{fileToDelete}&rdquo;</span> from storage?
                </p>
              </div>

              {deleteFileError && (
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-400">
                  {deleteFileError}
                </div>
              )}

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  disabled={isDeletingFile}
                  onClick={() => {
                    setFileToDelete(null);
                    setDeleteFileError(null);
                  }}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingFile}
                  onClick={handleConfirmDeleteFile}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1"
                >
                  {isDeletingFile ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
