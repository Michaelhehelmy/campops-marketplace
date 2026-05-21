'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PluginShell } from '@/app/PluginShell';

interface Post {
  id: string;
  postTitle: string;
  postContent: string | null;
  postStatus: string;
  postSlug: string | null;
  postType: string;
  menuOrder: number;
  meta: Record<string, string | null>;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function GenericPostEditorPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.listingId as string;
  const postType = params.postType as string;
  const postId = params.postId as string;
  const locale = params.locale as string;
  const isNew = postId === 'new';

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('publish');
  const [slug, setSlug] = useState('');
  const [metaFields, setMetaFields] = useState<Record<string, string>>({});

  const listBase = `/${locale}/manage/${listingId}/posts/${postType}`;
  const displayType = postType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  useEffect(() => {
    if (isNew) return;
    void (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/site/posts/${postId}`);
        if (!res.ok) throw new Error(`Post not found (${res.status})`);
        const data = await res.json();
        const p: Post = data.post;
        setPost(p);
        setTitle(p.postTitle ?? '');
        setContent(p.postContent ?? '');
        setStatus(p.postStatus ?? 'publish');
        setSlug(p.postSlug ?? '');
        const meta: Record<string, string> = {};
        for (const [k, v] of Object.entries(p.meta ?? {})) {
          if (v !== null) meta[k] = v;
        }
        setMetaFields(meta);
      } catch (err: any) {
        setLoadError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [postId, isNew]);

  const handleSave = async () => {
    setSaveState('saving');
    setSaveError(null);
    try {
      if (isNew) {
        const res = await fetch('/api/site/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteId: listingId,
            postType,
            postTitle: title,
            postContent: content || null,
            postSlug: slug || null,
            postStatus: status,
            meta: metaFields,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? 'Failed to create post');
        }
        const data = await res.json();
        setSaveState('saved');
        router.replace(`${listBase}/${data.post.id}`);
      } else {
        const res = await fetch(`/api/site/posts/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postTitle: title,
            postContent: content || null,
            postSlug: slug || null,
            postStatus: status,
            meta: metaFields,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? 'Failed to save post');
        }
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
      }
    } catch (err: any) {
      setSaveState('error');
      setSaveError(err.message);
    }
  };

  const setMeta = (key: string, value: string) => {
    setMetaFields((prev) => ({ ...prev, [key]: value }));
  };

  const addMetaField = () => {
    const key = prompt('Enter meta key name:');
    if (key && key.trim()) setMetaFields((prev) => ({ ...prev, [key.trim()]: '' }));
  };

  const removeMetaField = (key: string) => {
    setMetaFields((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-6 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <span className="font-medium">{loadError}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={listBase}
            className="p-2 rounded-xl text-gray-400 hover:text-brand-600 hover:bg-gray-50 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {isNew ? `New ${displayType}` : title || `Edit ${displayType}`}
            </h1>
            {!isNew && post && <p className="text-xs text-gray-400 mt-0.5 font-mono">{post.id}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveState === 'saved' && (
            <span className="flex items-center gap-1.5 text-green-600 text-sm font-bold">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
          {saveState === 'error' && saveError && (
            <span className="flex items-center gap-1.5 text-red-500 text-sm font-medium">
              <AlertCircle className="h-4 w-4" /> {saveError}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saveState === 'saving'}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-2xl font-bold text-sm hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 disabled:opacity-60"
          >
            {saveState === 'saving' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      <PluginShell
        name={`manager.${postType}.editor.top`}
        props={{ listingId, postType, postId, post }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`${displayType} title…`}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-gray-900 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-friendly-slug"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-gray-600 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 p-6">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Post content…"
              rows={12}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-all resize-y leading-relaxed"
            />
          </div>

          {/* Plugin editor slots — registered meta panels injected here */}
          <PluginShell
            name={`manager.${postType}.editor.main`}
            props={{ listingId, postType, postId, post, metaFields, setMeta }}
          />
        </div>

        {/* Sidebar column */}
        <div className="space-y-5">
          {/* Publish box */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 p-6 space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Publish
            </h3>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-gray-700 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all"
              >
                <option value="publish">Published</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending Review</option>
              </select>
            </div>
            <button
              onClick={handleSave}
              disabled={saveState === 'saving'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white rounded-2xl font-bold text-sm hover:bg-brand-700 transition-all disabled:opacity-60"
            >
              {saveState === 'saving' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isNew ? 'Create' : 'Update'}
            </button>
          </div>

          {/* Meta fields panel */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Custom Fields
              </h3>
              <button
                onClick={addMetaField}
                className="text-[10px] font-black text-brand-600 hover:text-brand-700 uppercase tracking-widest transition-colors"
              >
                + Add
              </button>
            </div>

            {Object.keys(metaFields).length === 0 && (
              <p className="text-xs text-gray-400 italic">No custom fields yet.</p>
            )}

            {Object.entries(metaFields).map(([key, value]) => (
              <div key={key} className="group">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">
                    {key}
                  </label>
                  <button
                    onClick={() => removeMetaField(key)}
                    className="text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all font-bold"
                  >
                    remove
                  </button>
                </div>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setMeta(key, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all"
                />
              </div>
            ))}
          </div>

          {/* Plugin sidebar slot */}
          <PluginShell
            name={`manager.${postType}.editor.sidebar`}
            props={{ listingId, postType, postId, post, metaFields, setMeta }}
          />
        </div>
      </div>

      <PluginShell
        name={`manager.${postType}.editor.bottom`}
        props={{ listingId, postType, postId, post }}
      />
    </div>
  );
}
