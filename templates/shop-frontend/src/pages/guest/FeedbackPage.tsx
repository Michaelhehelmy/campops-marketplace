import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { post } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { MessageSquare, Star } from "lucide-react";
import toast from "react-hot-toast";

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reservationRef, setReservationRef] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMut = useMutation({
    mutationFn: (data: { rating: number; comment?: string; reservation_id?: string }) =>
      post("/guest_feedback", data),
    onSuccess: () => {
      toast.success("Thank you for your feedback!");
      setSubmitted(true);
    },
    onError: () => toast.error("Failed to submit feedback"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    submitMut.mutate({
      rating,
      comment: comment || undefined,
      reservation_id: reservationRef || undefined,
    });
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2" data-testid="feedback-success">
              Feedback Submitted!
            </h2>
            <p className="text-muted-foreground mb-4">
              We appreciate your time and will use your feedback to improve.
            </p>
            <Button
              onClick={() => {
                setSubmitted(false);
                setRating(0);
                setComment("");
                setReservationRef("");
              }}
            >
              Submit Another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-6" data-testid="feedback-heading">
        Share Your Feedback
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>How was your experience?</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="feedback-form">
            {/* Star Rating */}
            <div>
              <Label className="mb-2 block">Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    data-testid={`star-${n}`}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(n)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      size={32}
                      className={`transition-colors ${(hoverRating || rating) >= n ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
                </p>
              )}
            </div>

            {/* Comment */}
            <div>
              <Label>Comment (optional)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us more about your experience..."
                rows={4}
              />
            </div>

            {/* Reference */}
            <div>
              <Label>Reservation / Order Reference (optional)</Label>
              <Input
                value={reservationRef}
                onChange={(e) => setReservationRef(e.target.value)}
                placeholder="e.g. RES-2026-001"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitMut.isPending}
              data-testid="submit-feedback-btn"
            >
              Submit Feedback
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
