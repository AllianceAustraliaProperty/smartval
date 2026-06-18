'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Eye,
  Mail,
  X,
  CheckCircle,
  AlertTriangle,
  Image as ImageIcon,
  PenLine,
} from 'lucide-react';
import { apiRepository } from '@/lib/api-repository';
import { getCurrentUser } from '@/lib/auth';
import { RichTextEditor, type RichTextEditorHandle } from '@/components/RichTextEditor';

interface TemplateVariable {
  token: string;
  label: string;
}

const SIGNATURE_SNIPPET =
  '<p style="margin-top:16px;color:#374151;font-size:13px;">' +
  '<strong>Australian Appraisers</strong><br/>Property Valuation<br/>Phone: <br/>Email: </p>';

const LOGO_SNIPPET =
  '<img src="{{ logo_url }}" alt="Logo" style="max-height:60px;" />';

function SenderSelect({
  value,
  defaultSender,
  onChange,
}: {
  value: string;
  defaultSender: string;
  onChange: (email: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<{ name: string; email: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(async () => {
      try {
        setLoading(true);
        const res = await apiRepository.searchGraphUsers(query);
        setResults(res.users || []);
        setWarning(res.warning || null);
      } catch (e) {
        setResults([]);
        setWarning(e instanceof Error ? e.message : 'Could not load users');
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query, open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <input
        type="email"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={defaultSender ? `Default: ${defaultSender}` : 'sender@yourdomain.com'}
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
      />
      {open && (loading || warning || results.length > 0) && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto">
          {loading && <div className="px-4 py-2 text-sm text-gray-500">Searching…</div>}
          {!loading && warning && (
            <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50">
              {warning} — you can still type an address manually.
            </div>
          )}
          {!loading &&
            results.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => {
                  onChange(u.email);
                  setQuery(u.email);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900">{u.name}</div>
                <div className="text-xs text-gray-500">{u.email}</div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [sender, setSender] = useState('');
  const [defaultSender, setDefaultSender] = useState('');
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [isCustom, setIsCustom] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);

  const editorRef = useRef<RichTextEditorHandle>(null);

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!user) { router.push('/login'); return; }
        setAuthChecked(true);
      } catch {
        router.push('/login');
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    (async () => {
      try {
        setIsLoading(true);
        const data = await apiRepository.getInvoiceEmailTemplate();
        setSubject(data.subject);
        setBodyHtml(data.body);
        setSender(data.sender || '');
        setDefaultSender(data.defaultSender || '');
        setVariables(data.variables || []);
        setIsCustom(data.isCustom);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load template.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [authChecked]);

  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setError(null);
    window.setTimeout(() => setSuccess(null), 4000);
  };

  const handleSave = async () => {
    if (!subject.trim()) { setError('Subject is required.'); return; }
    if (!bodyHtml.trim()) { setError('Email body is required.'); return; }
    try {
      setIsSaving(true);
      setError(null);
      const result = await apiRepository.saveInvoiceEmailTemplate({ subject, body: bodyHtml, sender });
      setIsCustom(result.isCustom);
      flashSuccess('Template saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset the invoice email template back to the default? Your customisations will be lost.')) return;
    try {
      setIsSaving(true);
      setError(null);
      const result = await apiRepository.resetInvoiceEmailTemplate();
      setSubject(result.subject);
      setBodyHtml(result.body);
      setSender(result.sender || '');
      setDefaultSender(result.defaultSender || '');
      setIsCustom(false);
      flashSuccess('Template reset to default.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset template.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    try {
      setIsPreviewing(true);
      setError(null);
      const result = await apiRepository.previewInvoiceEmailTemplate({ subject, body: bodyHtml });
      setPreviewSubject(result.subject);
      setPreviewHtml(result.html);
      setShowPreview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview template.');
    } finally {
      setIsPreviewing(false);
    }
  };

  if (!authChecked || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 animate-pulse">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-blue-100">
      <div className="max-w-5xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/valuation-reports')}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-gray-700 bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Manage application configuration</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Invoice Email Template</h2>
              <p className="text-sm text-gray-500">
                Used when sending an invoice from a valuation report.
                {isCustom ? (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Custom
                  </span>
                ) : (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Default
                  </span>
                )}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-red-800 font-medium text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-green-800 font-medium text-sm">{success}</p>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">From (sender)</label>
            <SenderSelect value={sender} defaultSender={defaultSender} onChange={setSender} />
            <p className="mt-2 text-xs text-gray-500">
              Start typing to search your organisation&apos;s mailboxes. Leave blank to use the default
              {defaultSender ? (
                <> (<code className="px-1 bg-gray-100 rounded">{defaultSender}</code>)</>
              ) : null}.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Invoice {{ invoice_number }} - Property Valuation"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Insert a variable (added at the cursor in the body)
            </label>
            <div className="flex flex-wrap gap-2">
              {variables.map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => editorRef.current?.insertText(v.token)}
                  title={`Insert ${v.token}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  {v.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => editorRef.current?.insertHtml(LOGO_SNIPPET)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors inline-flex items-center gap-1"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Insert logo
              </button>
              <button
                type="button"
                onClick={() => editorRef.current?.insertHtml(SIGNATURE_SNIPPET)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors inline-flex items-center gap-1"
              >
                <PenLine className="w-3.5 h-3.5" /> Insert signature
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Body</label>
            <RichTextEditor ref={editorRef} value={bodyHtml} onChange={setBodyHtml} />
            <p className="mt-2 text-xs text-gray-500">
              Variables like <code className="px-1 bg-gray-100 rounded">{'{{ client_name }}'}</code> are filled in when the invoice is sent.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              onClick={handleReset}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-gray-700 bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to default
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={handlePreview}
                disabled={isPreviewing}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-blue-700 bg-blue-50 border-2 border-blue-200 hover:border-blue-300 hover:shadow-md transition-all disabled:opacity-50"
              >
                <Eye className="w-4 h-4 mr-2" />
                {isPreviewing ? 'Loading...' : 'Preview'}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center px-6 py-2.5 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Email Preview</h3>
                <p className="text-sm text-gray-500">Rendered with sample data</p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
              <span className="text-xs font-medium text-gray-500">Subject</span>
              <p className="text-sm font-semibold text-gray-900">{previewSubject}</p>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              <iframe
                title="Email preview"
                srcDoc={previewHtml}
                sandbox=""
                className="w-full h-[55vh] bg-white rounded-lg border border-gray-200"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
