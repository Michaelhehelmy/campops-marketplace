import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMyProfile, useUpdateMyProfile } from "@/hooks/queries/useGuests";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { guestProfileSchema, type GuestProfileFormData } from "@/lib/validation";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { User, Mail, Phone, Globe, Info, Bell, Shield, Palette } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Controller } from "react-hook-form";
import { Select } from "@/components/ui/Select";

export default function GuestProfilePage() {
  const { data: profile, isLoading, isError } = useMyProfile();
  const updateMutation = useUpdateMyProfile();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<GuestProfileFormData>({
    resolver: zodResolver(guestProfileSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      nationality: "",
      language: "en",
      bio: "",
      marketing_emails: true,
      push_notifications: true,
      preferred_theme: "light",
    },
  });

  // Use a separate effect to reset the form when profile data is loaded
  // This is more stable than the 'values' prop for E2E tests
  useEffect(() => {
    if (profile) {
      console.log("[FRONTEND] Profile data received:", profile);
      reset(profile);
    }
  }, [profile, reset]);

  const onSubmit = async (data: GuestProfileFormData) => {
    console.log("[FRONTEND] Submitting form with data:", data);
    try {
      await updateMutation.mutateAsync(data);
      console.log("[FRONTEND] Mutation completed");
    } catch (err) {
      console.error("[FRONTEND] Mutation failed:", err);
    }
  };

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("[FRONTEND] Form errors current:", errors);
    }
  }, [errors]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-2xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6 max-w-2xl text-center">
        <h2 className="text-2xl font-bold text-destructive mb-2">Error Loading Profile</h2>
        <p className="text-muted-foreground">Please try refreshing the page.</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight" data-testid="profile-heading">
            Your Profile
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal information and preferences
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1 text-sm capitalize">
          {profile?.tier || "Standard"} Member
        </Badge>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Personal Information</CardTitle>
          </div>
          <CardDescription>Update your display name and contact details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm font-semibold">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="full_name"
                    className="pl-10"
                    placeholder="John Doe"
                    {...register("full_name")}
                    data-testid="full-name-input"
                  />
                </div>
                {errors.full_name && (
                  <p className="text-xs text-destructive font-medium">{errors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-10 bg-muted/30"
                    placeholder="john@example.com"
                    {...register("email")}
                    data-testid="email-input"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive font-medium">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    className="pl-10"
                    placeholder="+1 (555) 000-0000"
                    {...register("phone")}
                    data-testid="phone-input"
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs text-destructive font-medium">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationality" className="text-sm font-semibold">
                  Nationality
                </Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nationality"
                    className="pl-10"
                    placeholder="Kenyan"
                    {...register("nationality")}
                    data-testid="nationality-input"
                  />
                </div>
                {errors.nationality && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.nationality.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm font-semibold">
                Bio
              </Label>
              <div className="relative">
                <Info className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <textarea
                  id="bio"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                  placeholder="Tell us a bit about yourself..."
                  {...register("bio")}
                  data-testid="bio-input"
                />
              </div>
              {errors.bio && (
                <p className="text-xs text-destructive font-medium">{errors.bio.message}</p>
              )}
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-border/50">
              <Button
                type="submit"
                size="lg"
                data-testid="save-profile-btn"
                disabled={updateMutation.isPending || !isDirty}
                className="w-full md:w-auto px-8 transition-all duration-300 active:scale-95"
              >
                {updateMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Saving...
                  </div>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-secondary/10 pb-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Preferences & Settings</CardTitle>
          </div>
          <CardDescription>Manage your app experience and notifications</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Notifications
                </h3>

                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/5 border border-border/50 hover:bg-secondary/10 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <Label
                        htmlFor="marketing_emails"
                        className="text-sm font-semibold cursor-pointer"
                      >
                        Marketing Emails
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Receive updates about offers and events
                    </p>
                  </div>
                  <Controller
                    name="marketing_emails"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="marketing_emails"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="marketing-emails-switch"
                      />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/5 border border-border/50 hover:bg-secondary/10 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      <Label
                        htmlFor="push_notifications"
                        className="text-sm font-semibold cursor-pointer"
                      >
                        Push Notifications
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Get real-time alerts on your device
                    </p>
                  </div>
                  <Controller
                    name="push_notifications"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="push_notifications"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="push-notifications-switch"
                      />
                    )}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Appearance & Language
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-primary" />
                      <Label htmlFor="preferred_theme" className="text-sm font-semibold">
                        Display Theme
                      </Label>
                    </div>
                    <Controller
                      name="preferred_theme"
                      control={control}
                      render={({ field }) => (
                        <Select
                          id="preferred_theme"
                          className="w-full bg-secondary/5 border-border/50"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          options={[
                            { value: "light", label: "Light Mode" },
                            { value: "dark", label: "Dark Mode" },
                            { value: "system", label: "System Default" },
                          ]}
                          placeholder="Select theme"
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      <Label htmlFor="language" className="text-sm font-semibold">
                        Preferred Language
                      </Label>
                    </div>
                    <Controller
                      name="language"
                      control={control}
                      render={({ field }) => (
                        <Select
                          id="language"
                          className="w-full bg-secondary/5 border-border/50"
                          value={field.value || "en"}
                          onChange={(e) => field.onChange(e.target.value)}
                          options={[
                            { value: "en", label: "English" },
                            { value: "es", label: "Español" },
                            { value: "fr", label: "Français" },
                            { value: "de", label: "Deutsch" },
                          ]}
                          placeholder="Select language"
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-border/50">
              <Button
                type="submit"
                disabled={updateMutation.isPending || !isDirty}
                className="w-full md:w-auto px-8 transition-all duration-300 active:scale-95 shadow-lg shadow-primary/20"
                data-testid="save-settings-btn"
              >
                {updateMutation.isPending ? "Saving..." : "Apply Settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
