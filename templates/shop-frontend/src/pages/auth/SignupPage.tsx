/**
 * Signup Page Component
 * New user registration with Zod validation
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useState } from "react";
import { z } from "zod";
import { GoogleLogin } from "@react-oauth/google";

import { useSearchParams } from "react-router-dom";

// Extended schema with confirmPassword
const signupSchemaWithConfirm = z
  .object({
    full_name: z.string().min(1, "Full name is required").max(100, "Name is too long"),
    email: z.string().email("Invalid email format"),
    phone: z.string().optional(),
    referral_code: z.string().optional(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(50, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchemaWithConfirm>;

import { BrandLogo } from "@/components/branding/BrandLogo";

export default function SignupPage() {
  const { signup, googleLogin } = useAuth();
  const branding = useBranding();
  const [searchParams] = useSearchParams();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchemaWithConfirm),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      referral_code: searchParams.get("ref") || "",
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    setApiError(null);
    try {
      const { confirmPassword, ...signupData } = data;
      await signup(signupData);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "";
      if (msg.toLowerCase().includes("exist") || msg.toLowerCase().includes("already")) {
        setApiError("Email already exists");
      } else {
        setApiError("Failed to create account");
      }
    }
  };

  const googleId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] px-4 relative overflow-hidden">
      {/* Decorative Ornaments */}
      <div className="absolute top-[-10%] left-[-5%] w-64 h-64 bg-acacia/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-acacia/5 rounded-full blur-3xl" />

      <Card className="w-full max-w-md border-none shadow-2xl shadow-charcoal/5 rounded-[2.5rem] overflow-hidden bg-white/90 backdrop-blur-md relative z-10">
        <CardHeader className="space-y-4 text-center pt-10">
          <BrandLogo className="scale-110 mb-2" />
          <CardTitle className="font-serif text-3xl text-charcoal">Create Account</CardTitle>
          <CardDescription className="text-stone-500 font-medium">
            Join our community of travelers.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <div className="flex justify-center min-h-[44px] mb-6">
            {googleId ? (
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  if (credentialResponse.credential) {
                    googleLogin(credentialResponse.credential);
                  }
                }}
                onError={() => {
                  console.error("Google Signup Failed");
                  setApiError("Google authentication failed");
                }}
                useOneTap
                shape="pill"
                theme="outline"
                width="360px"
              />
            ) : (
              <div className="text-xs text-stone-400 border border-dashed border-stone-200 rounded-full px-4 py-2">
                Google Signup currently unavailable
              </div>
            )}
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/90 px-2 text-stone-500 font-medium">
                Or register with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-charcoal/80 ml-4 font-medium">
                Full Name
              </Label>
              <Input
                id="full_name"
                type="text"
                placeholder="John Doe"
                className="rounded-full h-12 px-6 border-stone-200 focus:ring-acacia"
                {...register("full_name")}
                data-testid="signup-name-input"
              />
              {errors.full_name && (
                <p className="text-xs text-destructive ml-4 font-medium">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-charcoal/80 ml-4 font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="rounded-full h-12 px-6 border-stone-200 focus:ring-acacia"
                {...register("email")}
                data-testid="signup-email-input"
              />
              {errors.email && (
                <p className="text-xs text-destructive ml-4 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-charcoal/80 ml-4 font-medium">
                Phone (optional)
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                className="rounded-full h-12 px-6 border-stone-200 focus:ring-acacia"
                {...register("phone")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referral_code" className="text-charcoal/80 ml-4 font-medium">
                Referral Code (optional)
              </Label>
              <Input
                id="referral_code"
                type="text"
                placeholder="FRIEND2026"
                className="rounded-full h-12 px-6 border-stone-200 focus:ring-acacia uppercase"
                {...register("referral_code")}
              />
              {errors.referral_code && (
                <p className="text-xs text-destructive ml-4 font-medium">
                  {errors.referral_code.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-charcoal/80 ml-4 font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password"
                className="rounded-full h-12 px-6 border-stone-200 focus:ring-acacia"
                {...register("password")}
                data-testid="signup-password-input"
              />
              {errors.password && (
                <p className="text-xs text-destructive ml-4 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-charcoal/80 ml-4 font-medium">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                className="rounded-full h-12 px-6 border-stone-200 focus:ring-acacia"
                {...register("confirmPassword")}
                data-testid="signup-confirm-password-input"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive ml-4 font-medium">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {apiError && (
              <p className="text-sm text-destructive font-medium text-center bg-destructive/5 py-2 rounded-full border border-destructive/10">
                {apiError}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-full text-lg shadow-lg shadow-acacia/20"
              disabled={isSubmitting}
              data-testid="signup-submit-button"
            >
              {isSubmitting ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/90 px-2 text-stone-500 font-medium">Or join with</span>
            </div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                if (credentialResponse.credential) {
                  googleLogin(credentialResponse.credential);
                }
              }}
              onError={() => {
                console.error("Google Login Failed");
                setApiError("Google authentication failed");
              }}
              useOneTap
              shape="pill"
              theme="outline"
              width="360px"
            />
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-acacia hover:underline decoration-oasis">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
