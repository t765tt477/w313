import { useState } from 'react';

interface ImageUploadProps {
  onImageUpload: (url: string, publicId: string) => void;
  currentImage?: string;
  label?: string;
  accept?: string;
}

export default function ImageUpload({
  onImageUpload,
  currentImage,
  label = 'رفع صورة',
  accept = 'image/*'
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('يجب أن تكون الصورة بصيغة JPG, PNG, أو WebP');
      return;
    }

    setUploading(true);
    setError(null);

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:50000/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'فشل رفع الصورة');
      }

      onImageUpload(data.url, data.publicId);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل رفع الصورة');
      setPreview(currentImage || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onImageUpload('', '');
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>
      
      <div className="relative">
        {preview ? (
          <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-lg"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="w-full h-48 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors">
            <svg
              className="w-12 h-12 text-slate-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-slate-500 text-center">
              انقر لاختيار صورة
            </p>
            <p className="text-xs text-slate-400 text-center mt-1">
              JPG, PNG, WebP (حد أقصى 5MB)
            </p>
          </div>
        )}
        
        <input
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      {uploading && (
        <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
          <svg
            className="animate-spin w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          جاري رفع الصورة...
        </div>
      )}

      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
