'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Avatar from '@/components/Avatar';
import { getProfile, type Profile } from '@/lib/profile';
import {
  MAX_COMMENT_LENGTH,
  addComment,
  deleteComment,
  setCommentLiked,
  subscribeToComments,
  timeAgo,
  type Comment,
} from '@/lib/social';

const profileCache = new Map<string, Promise<Profile | null>>();

function useAuthorProfile(uid: string) {
  const [loaded, setLoaded] = useState<{ uid: string; profile: Profile | null } | null>(null);
  useEffect(() => {
    let active = true;
    let request = profileCache.get(uid);
    if (!request) {
      request = getProfile(uid).catch(() => null);
      profileCache.set(uid, request);
    }
    request.then((profile) => {
      if (active) setLoaded({ uid, profile });
    });
    return () => {
      active = false;
    };
  }, [uid]);
  return loaded?.uid === uid ? loaded.profile : null;
}

function CommentForm({
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  submitLabel: string;
  onSubmit: (text: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(text);
      setText('');
    } catch (err) {
      console.error('Error posting comment:', err);
      setError('Could not post your comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_COMMENT_LENGTH}
        rows={2}
        placeholder={placeholder}
        className="w-full bg-gray-900 border border-gray-700 focus:border-brand-500 outline-none rounded-lg p-3 text-white placeholder-gray-500 resize-y"
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-gray-300 hover:text-white">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="px-4 py-2 rounded-lg font-semibold bg-brand-500 hover:bg-brand-600 text-black transition-colors disabled:opacity-50"
        >
          {submitting ? 'Posting...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function CommentItem({
  comment,
  user,
  onReply,
  onLike,
  onDelete,
}: {
  comment: Comment;
  user: User | null;
  onReply?: () => void;
  onLike: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
}) {
  const liked = !!user && comment.likes.includes(user.uid);
  const profile = useAuthorProfile(comment.authorUid);
  const name = profile?.displayName || comment.authorName;
  return (
    <div className="flex gap-3">
      <Link href={`/users/${comment.authorUid}`} className="flex-shrink-0">
        <Avatar name={name} photoURL={profile?.photoURL} size={36} />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <Link href={`/users/${comment.authorUid}`} className="font-semibold text-white hover:text-brand-400">{name}</Link>
          <span className="text-xs text-gray-500">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-gray-300 whitespace-pre-wrap break-words">{comment.text}</p>
        <div className="flex gap-4 mt-1 text-sm">
          <button
            onClick={() => onLike(comment)}
            disabled={!user}
            className={`transition-colors disabled:cursor-default ${
              liked ? 'text-brand-500' : 'text-gray-400 hover:text-brand-400'
            }`}
            aria-pressed={liked}
          >
            {liked ? '❤' : '♡'} {comment.likes.length}
          </button>
          {user && onReply && (
            <button onClick={onReply} className="text-gray-400 hover:text-brand-400 transition-colors">
              Reply
            </button>
          )}
          {user?.uid === comment.authorUid && (
            <button onClick={() => onDelete(comment)} className="text-gray-400 hover:text-red-400 transition-colors">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Comments({
  packId,
  songId,
  noun = 'pack',
}: {
  packId: string;
  songId?: string;
  noun?: string;
}) {
  const target = useMemo(() => ({ packId, songId }), [packId, songId]);
  const [user, setUser] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    return subscribeToComments(
      target,
      (items) => {
        setComments(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading comments:', error);
        setLoadError(true);
        setLoading(false);
      }
    );
  }, [target]);

  const { topLevel, repliesByParent } = useMemo(() => {
    const topLevel = comments.filter((c) => !c.parentId);
    const repliesByParent = new Map<string, Comment[]>();
    for (const c of comments) {
      if (c.parentId) repliesByParent.set(c.parentId, [...(repliesByParent.get(c.parentId) || []), c]);
    }
    return { topLevel, repliesByParent };
  }, [comments]);

  const handleLike = async (comment: Comment) => {
    if (!user) return;
    try {
      await setCommentLiked(target, comment.id, user.uid, !comment.likes.includes(user.uid));
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleDelete = async (comment: Comment) => {
    const hasReplies = (repliesByParent.get(comment.id) || []).length > 0;
    if (!confirm(hasReplies ? 'Delete this comment and all of its replies?' : 'Delete this comment?')) return;
    try {
      await deleteComment(target, comment.id);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold text-white mb-4">Comments ({comments.length})</h2>

      <div className="mb-8">
        {user ? (
          <CommentForm
            placeholder={`Share your thoughts on this ${noun}...`}
            submitLabel="Comment"
            onSubmit={(text) => addComment(target, user, text)}
          />
        ) : (
          <p className="text-gray-400">
            <Link href="/login" className="text-brand-500 hover:text-brand-400 underline">Log in</Link> to join the conversation.
          </p>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400">Loading comments...</div>
      ) : loadError ? (
        <div className="text-red-400">Comments could not be loaded.</div>
      ) : topLevel.length === 0 ? (
        <div className="text-gray-400">No comments yet. Be the first!</div>
      ) : (
        <div className="space-y-6">
          {topLevel.map((comment) => {
            const replies = repliesByParent.get(comment.id) || [];
            return (
              <div key={comment.id}>
                <CommentItem
                  comment={comment}
                  user={user}
                  onReply={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  onLike={handleLike}
                  onDelete={handleDelete}
                />
                {(replies.length > 0 || (replyingTo === comment.id && user)) && (
                  <div className="ml-12 mt-4 pl-4 border-l border-gray-800 space-y-4">
                    {replies.map((reply) => (
                      <CommentItem
                        key={reply.id}
                        comment={reply}
                        user={user}
                        onLike={handleLike}
                        onDelete={handleDelete}
                      />
                    ))}
                    {replyingTo === comment.id && user && (
                      <CommentForm
                        placeholder={`Reply to ${comment.authorName}...`}
                        submitLabel="Reply"
                        onSubmit={async (text) => {
                          await addComment(target, user, text, comment.id);
                          setReplyingTo(null);
                        }}
                        onCancel={() => setReplyingTo(null)}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
