'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlusCircle, Pencil, Trash2, Loader2, FileText, RefreshCw } from 'lucide-react';
import { PluginShell } from '@/app/PluginShell';

interface PostRow {
  id: string;
  postTitle: string;
  postStatus: string;
  postSlug: string | null;
  postType: string;
  createdAt: number | null;
  updatedAt: number | null;
  meta: Record<string, string | null>;
}

export default function GenericPostListPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.listingId as string;
  const postType = params.postType as string;
  const locale = params.locale as string;

  const [posts, setPosts] = useState<PostRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const base = `/${locale}/manage/${listingId}/posts/${postType}`;

  const fetchPosts = () => {
    startTransition(() => {
      void (async () => {
        try {
          setLoading(true);
          const res = await fetch(
            `/api/site/posts?siteId=${encodeURIComponent(listingId)}&type=${encodeURIComponent(postType)}&status=publish,draft,pending&limit=50&orderBy=updated_at&order=DESC`
          );
          if (!res.ok) throw new Error(`Failed to load posts: ${res.status}`);
          const data = await res.json();
          setPosts(data.posts ?? []);
          setTotal(data.total ?? 0);
          setError(null);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      })();
    });
  };

  useEffect(() => {
    fetchPosts();
  }, [listingId, postType]);

  const handleTrash = async (postId: string) => {
    if (!confirm('Move this post to trash?')) return;
    try {
      const res = await fetch(`/api/site/posts/${postId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to trash post');
      fetchPosts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const displayType = postType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">{displayType}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} item{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPosts}
            className="p-2 rounded-xl text-gray-400 hover:text-brand-600 hover:bg-gray-50 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href={`${base}/new`}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-2xl font-bold text-sm hover:bg-brand-700 transition-all shadow-lg shadow-brand-200"
          >
            <PlusCircle className="h-4 w-4" />
            New {displayType}
          </Link>
        </div>
      </div>

      <PluginShell name={`manager.${postType}.list.top`} props={{ listingId, postType }} />

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-sm font-medium">
          {error}
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">
            No {displayType.toLowerCase()} yet
          </p>
          <Link
            href={`${base}/new`}
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-brand-600 text-white rounded-2xl font-bold text-sm hover:bg-brand-700 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            Create your first {displayType.toLowerCase()}
          </Link>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest">
                  Title
                </th>
                <th className="text-left px-6 py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="text-left px-6 py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest hidden md:table-cell">
                  Updated
                </th>
                <th className="px-6 py-4 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post, i) => (
                <tr
                  key={post.id}
                  className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                    i === posts.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`${base}/${post.id}`}
                      className="font-bold text-gray-900 hover:text-brand-600 transition-colors"
                    >
                      {post.postTitle || <span className="text-gray-400 italic">(untitled)</span>}
                    </Link>
                    {post.postSlug && (
                      <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                        {post.postSlug}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={post.postStatus} />
                  </td>
                  <td className="px-6 py-4 text-gray-400 hidden md:table-cell">
                    {post.updatedAt ? new Date(post.updatedAt * 1000).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`${base}/${post.id}`}
                        className="p-2 rounded-xl text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleTrash(post.id)}
                        className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Trash"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PluginShell
        name={`manager.${postType}.list.bottom`}
        props={{ listingId, postType, posts }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    publish: 'bg-green-50 text-green-600',
    draft: 'bg-yellow-50 text-yellow-600',
    pending: 'bg-blue-50 text-blue-600',
    trash: 'bg-red-50 text-red-500',
  };
  const cls = map[status] ?? 'bg-gray-50 text-gray-500';
  return (
    <span
      className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${cls}`}
    >
      {status}
    </span>
  );
}
