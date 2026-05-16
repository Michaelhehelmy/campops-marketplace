import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { post } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { KeyRound, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function GuestChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [succeeded, setSucceeded] = useState(false);

  const changeMut = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      post("/auth/change-password", data),
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setSucceeded(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to change password");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    changeMut.mutate({ current_password: currentPassword, new_password: newPassword });
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-6" data-testid="change-password-heading">
        Change Password
      </h1>

      {succeeded && (
        <Card
          className="mb-4 border-green-200 bg-green-50"
          data-testid="change-password-success-status"
        >
          <CardContent className="py-6 flex items-center gap-3 text-green-700">
            <CheckCircle className="h-6 w-6 shrink-0" />
            <p className="font-medium">Password changed successfully!</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound size={20} />
            Update Password
          </CardTitle>
          <CardDescription>Enter your current password and choose a new one.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="change-password-form">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <Input
                id="current_password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                data-testid="current-password-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                data-testid="new-password-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                data-testid="confirm-password-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={changeMut.isPending || !currentPassword || !newPassword || !confirmPassword}
              data-testid="change-password-btn"
            >
              {changeMut.isPending ? "Saving..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
