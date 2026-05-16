import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import type { GuestFeedback } from "@/types/api";
import { MessageSquare, Star, Check, Reply } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function FeedbackAdminPage() {
  const qc = useQueryClient();
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.feedback,
    queryFn: () => get<GuestFeedback[]>("/guest_feedback"),
  });

  const replyMut = useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) =>
      put(`/guest_feedback/${id}`, { reply }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.feedback });
      toast.success("Reply saved");
      setReplyId(null);
      setReplyText("");
    },
    onError: () => toast.error("Failed to save reply"),
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => put(`/guest_feedback/${id}`, { status: "resolved" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.feedback });
      toast.success("Marked as resolved");
    },
  });

  const feedback = data ?? [];

  function renderStars(rating: number) {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={14}
            className={n <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
          />
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Guest Feedback</h1>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Guest Feedback</h1>

      {feedback.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No feedback received yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedback.map((fb) => (
            <Card key={fb.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold">{fb.guest_name || "Anonymous"}</span>
                      {renderStars(fb.rating)}
                      <Badge variant={fb.resolved ? "success" : "warning"}>
                        {fb.resolved ? "Resolved" : "Open"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(fb.created_at), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!fb.resolved && (
                      <Button variant="ghost" size="sm" onClick={() => resolveMut.mutate(fb.id)}>
                        <Check size={14} className="mr-1" /> Resolve
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReplyId(replyId === fb.id ? null : fb.id);
                        setReplyText(fb.reply || "");
                      }}
                    >
                      <Reply size={14} className="mr-1" /> Reply
                    </Button>
                  </div>
                </div>

                {fb.comment && <p className="text-sm mt-2">{fb.comment}</p>}

                {fb.reply && replyId !== fb.id && (
                  <div className="mt-3 pl-4 border-l-2 border-primary/30">
                    <p className="text-xs text-muted-foreground mb-1">Staff Reply</p>
                    <p className="text-sm">{fb.reply}</p>
                  </div>
                )}

                {replyId === fb.id && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => replyMut.mutate({ id: fb.id, reply: replyText })}
                        disabled={replyMut.isPending || !replyText.trim()}
                      >
                        Save Reply
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setReplyId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
