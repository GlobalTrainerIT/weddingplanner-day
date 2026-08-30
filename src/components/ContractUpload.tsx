import { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, Eye, Download, Trash2, RefreshCw, CheckCircle, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import type { Vendor } from '../types';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const ALLOWED_EXT = ['.pdf', '.png', '.jpg', '.jpeg'];

interface Props {
  vendor: Vendor;
  weddingId: string;
  onVendorUpdated: (v: Vendor) => void;
}

function fileExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ContractUpload({ vendor, weddingId, onVendorUpdated }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [showSignedPrompt, setShowSignedPrompt] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [retryFile, setRetryFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filePath = vendor.contract_file_path;
  const fileName = filePath ? filePath.split('/').pop() || 'Contract' : null;

  // ===== Upload logic =====
  const doUpload = useCallback(async (file: File): Promise<boolean> => {
    setError('');

    // Validate type
    const ext = fileExt(file.name);
    const typeOk = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXT.includes(ext);
    if (!typeOk) {
      setError('Only PDF, PNG, or JPG files are allowed.');
      showToast('Unsupported file type', 'error');
      return false;
    }

    if (file.size > MAX_SIZE) {
      setError(`File is ${fmtSize(file.size)} — max is 10 MB.`);
      showToast('File exceeds 10 MB limit', 'error');
      return false;
    }

    setUploading(true);
    setProgress(0);

    // Build a unique path: contracts/{wedding_id}/{vendor_id}/{timestamp}_{filename}
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${weddingId}/${vendor.id}/${Date.now()}_${safeName}`;

    try {
      const { error: upErr } = await supabase.storage
        .from('contracts')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (upErr) {
        console.error('contract upload failed', upErr);
        setError('Upload failed. Please try again.');
        setUploading(false);
        setProgress(0);
        return false;
      }

      setProgress(100);

      // Update vendor row with the new path
      const { data: updated, error: dbErr } = await supabase
        .from('vendors')
        .update({ contract_file_path: path })
        .eq('id', vendor.id)
        .select()
        .single();

      if (dbErr || !updated) {
        console.error('vendor path update failed', dbErr);
        setError('File uploaded but could not link to vendor. Please try again.');
        setUploading(false);
        setProgress(0);
        return false;
      }

      onVendorUpdated(updated);
      setUploading(false);
      setProgress(0);
      setRetryFile(null);
      setShowSignedPrompt(true);
      showToast('Contract attached');
      return true;
    } catch (err) {
      console.error('contract upload exception', err);
      setError('Upload failed. Check your connection and try again.');
      setUploading(false);
      setProgress(0);
      return false;
    }
  }, [vendor.id, weddingId, onVendorUpdated]);

  const handleFileSelected = useCallback(async (file: File) => {
    const ok = await doUpload(file);
    if (!ok) setRetryFile(file);
  }, [doUpload]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); };

  // ===== Actions =====
  const viewContract = async () => {
    if (!filePath) return;
    const { data, error: err } = await supabase.storage
      .from('contracts')
      .createSignedUrl(filePath, 60); // 60-second signed URL
    if (err || !data?.signedUrl) {
      showToast('Could not generate a view link', 'error');
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const downloadContract = async () => {
    if (!filePath) return;
    const { data, error: err } = await supabase.storage
      .from('contracts')
      .download(filePath);
    if (err || !data) {
      showToast('Could not download contract', 'error');
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'contract';
    a.click();
    URL.revokeObjectURL(url);
  };

  const replaceContract = () => {
    fileInputRef.current?.click();
  };

  const confirmDeleteContract = async () => {
    if (!filePath) return;
    setConfirmDelete(false);

    // Optimistically clear the path
    const prevPath = filePath;
    const { data: updated } = await supabase
      .from('vendors')
      .update({ contract_file_path: null })
      .eq('id', vendor.id)
      .select()
      .single();

    if (updated) onVendorUpdated(updated);

    // Remove the file from storage (best-effort)
    await supabase.storage.from('contracts').remove([prevPath]);

    showToast('Contract removed', 'deleted', async () => {
      // Undo: re-link the path (file may still exist in storage)
      const { data: restored } = await supabase
        .from('vendors')
        .update({ contract_file_path: prevPath })
        .eq('id', vendor.id)
        .select()
        .single();
      if (restored) onVendorUpdated(restored);
      showToast('Contract restored');
    });
  };

  const markSigned = async (signed: boolean) => {
    setShowSignedPrompt(false);
    const { data: updated } = await supabase
      .from('vendors')
      .update({ contract_signed: signed })
      .eq('id', vendor.id)
      .select()
      .single();
    if (updated) {
      onVendorUpdated(updated);
      showToast(signed ? 'Contract marked as signed' : 'Contract not signed');
    }
  };

  // ===== Render =====

  // Signed prompt modal
  if (showSignedPrompt) {
    return (
      <>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle size={20} className="text-emerald-600" />
          </div>
          <div className="text-[#2a1f15] font-medium text-sm mb-1">Contract uploaded successfully</div>
          <div className="text-[#5d4e3e] text-xs mb-4">Would you like to mark this contract as signed?</div>
          <div className="flex gap-2 justify-center">
            <button onClick={() => markSigned(true)} className="bg-emerald-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-emerald-700 font-medium">Yes, mark signed</button>
            <button onClick={() => markSigned(false)} className="border border-stone-200 text-[#5d4e3e] text-xs px-4 py-2 rounded-lg hover:bg-stone-50">Not yet</button>
          </div>
        </div>
        {/* Still render the contract info below */}
        {filePath && <ContractFileInfo fileName={fileName!} vendor={vendor} onView={viewContract} onDownload={downloadContract} onReplace={replaceContract} onDelete={() => setConfirmDelete(true)} />}
      </>
    );
  }

  // Upload-in-progress state
  if (uploading) {
    return (
      <div className="border border-stone-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Loader2 size={16} className="text-[#8a6d3b] animate-spin" />
          <span className="text-sm text-[#5d4e3e]">Uploading…</span>
        </div>
        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#c9a96e] rounded-full transition-all duration-300" style={{ width: `${progress > 0 ? progress : 30}%` }} />
        </div>
      </div>
    );
  }

  // Error state with retry
  if (error && retryFile) {
    return (
      <div className="border border-rose-200 bg-rose-50/50 rounded-lg p-4">
        <div className="flex items-start gap-2 mb-3">
          <X size={16} className="text-rose-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm text-rose-700 font-medium">Upload failed</div>
            <div className="text-xs text-rose-600 mt-0.5">{error}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleFileSelected(retryFile)} className="flex items-center gap-1.5 bg-[#8a6d3b] text-white text-xs px-3 py-2 rounded-lg hover:bg-[#7a6030] font-medium">
            <RefreshCw size={12} /> Retry
          </button>
          <button onClick={() => { setRetryFile(null); setError(''); }} className="border border-stone-200 text-[#5d4e3e] text-xs px-3 py-2 rounded-lg hover:bg-stone-50">Cancel</button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!filePath) {
    return (
      <>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-[#c9a96e] bg-[#c9a96e]/5' : 'border-stone-300 hover:border-[#c9a96e]/50 hover:bg-stone-50/50'}`}
        >
          <UploadCloud size={24} className="text-[#6b5d4f] mx-auto mb-2" />
          <div className="text-sm text-[#5d4e3e] font-medium">No contract attached yet</div>
          <div className="text-xs text-[#6b5d4f] mt-1">Drag & drop or click to upload a PDF, PNG, or JPG (max 10 MB)</div>
        </div>
        <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={onInputChange} className="hidden" />
      </>
    );
  }

  // Contract attached
  return (
    <>
      <ContractFileInfo
        fileName={fileName!}
        vendor={vendor}
        onView={viewContract}
        onDownload={downloadContract}
        onReplace={replaceContract}
        onDelete={() => setConfirmDelete(true)}
      />
      <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={onInputChange} className="hidden" />
      {confirmDelete && (
        <ConfirmDialog
          title="Remove Contract"
          message={`Remove "${fileName}" from this vendor? You can undo this.`}
          onConfirm={confirmDeleteContract}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}

// ===== Info display sub-component =====

function ContractFileInfo({ fileName, vendor, onView, onDownload, onReplace, onDelete }: {
  fileName: string;
  vendor: Vendor;
  onView: () => void;
  onDownload: () => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="border border-stone-200 rounded-lg p-4 bg-stone-50/30">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-[#c9a96e]/10 border border-[#c9a96e]/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText size={18} className="text-[#8a6d3b]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#2a1f15] truncate">{fileName}</span>
            {vendor.contract_signed && (
              <span className="text-xs text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1 flex-shrink-0">
                <CheckCircle size={10} /> Signed
              </span>
            )}
          </div>
          <div className="text-xs text-[#6b5d4f] mt-0.5">Attached to {vendor.business_name}</div>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3 flex-wrap">
        <button onClick={onView} className="flex items-center gap-1 text-xs text-[#8a6d3b] hover:text-[#b8955a] font-medium px-2 py-1.5 hover:bg-[#c9a96e]/5 rounded">
          <Eye size={13} /> View
        </button>
        <button onClick={onDownload} className="flex items-center gap-1 text-xs text-[#5d4e3e] hover:text-[#2a1f15] px-2 py-1.5 hover:bg-stone-100 rounded">
          <Download size={13} /> Download
        </button>
        <button onClick={onReplace} className="flex items-center gap-1 text-xs text-[#5d4e3e] hover:text-[#2a1f15] px-2 py-1.5 hover:bg-stone-100 rounded">
          <RefreshCw size={13} /> Replace
        </button>
        <button onClick={onDelete} className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-600 px-2 py-1.5 hover:bg-rose-50 rounded ml-auto">
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
}
