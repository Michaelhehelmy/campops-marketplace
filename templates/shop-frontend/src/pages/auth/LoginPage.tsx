/**
 * Login Page Component
 * Handles user authentication with email and password
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Leaf, Eye, EyeOff } from "lucide-react";
import { loginSchema, type LoginFormData } from "@/lib/validation";
import { GoogleLogin } from "@react-oauth/google";
import { BrandLogo } from "@/components/branding/BrandLogo";

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const branding = useBranding();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Diagnostic: Check if Google Client ID is loaded
  const googleId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  console.log(
    "[DEBUG] Google Client ID loaded:",
    googleId ? `Present (${googleId.substring(0, 10)}...)` : "MISSING"
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData & { rememberMe?: boolean }>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  const rememberMe = watch("rememberMe");

  const onSubmit = async (data: LoginFormData & { rememberMe?: boolean }) => {
    setAuthError(null);
    try {
      await login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe ?? true,
      });
    } catch {
      setAuthError("Invalid credentials");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] px-4 relative overflow-hidden">
      {/* Decorative Ornaments */}
      <div className="absolute top-[-10%] left-[-5%] w-64 h-64 bg-acacia/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-acacia/5 rounded-full blur-3xl" />

      <Card className="w-full max-w-md border-none shadow-2xl shadow-charcoal/5 rounded-[2.5rem] overflow-hidden bg-white/90 backdrop-blur-md relative z-10">
        <CardHeader className="space-y-4 text-center pt-12">
          <BrandLogo className="scale-110 mb-2" />
          <CardTitle className="font-serif text-3xl text-charcoal">Welcome Back</CardTitle>
          <CardDescription className="text-stone-500 font-medium">
            Your serene escape awaits.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-charcoal/80 ml-4 font-medium">
                Email
              </Label>
              <Input
                id="email"
                data-testid="email-input"
                type="email"
                placeholder="name@example.com"
                className="rounded-full h-12 px-6 border-stone-200 focus:ring-acacia"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive ml-4 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-charcoal/80 ml-4 font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  data-testid="password-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="rounded-full h-12 px-6 border-stone-200 focus:ring-acacia"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-acacia transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive ml-4 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between px-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked: boolean | "indeterminate") =>
                    setValue("rememberMe", checked === true)
                  }
                  className="rounded border-stone-300 data-[state=checked]:bg-acacia"
                />
                <Label
                  htmlFor="rememberMe"
                  className="text-sm font-normal cursor-pointer text-charcoal/70"
                >
                  Keep me signed in
                </Label>
              </div>
              <Link
                to="/forgot-password"
                title="Forgot Password"
                className="text-sm font-medium text-acacia hover:underline decoration-oasis"
              >
                Forgot?
              </Link>
            </div>

            {authError && (
              <p className="text-sm text-destructive font-medium text-center bg-destructive/5 py-2 rounded-full border border-destructive/10">
                {authError}
              </p>
            )}

            <Button
              type="submit"
              data-testid="login-button"
              variant={isSubmitting ? "secondary" : "default"}
              className="w-full h-12 rounded-full text-lg shadow-lg shadow-acacia/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Opening the doors..." : branding.loginButtonLabel}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/90 px-2 text-stone-500 font-medium">Or continue with</span>
            </div>
          </div>

          <div className="flex justify-center min-h-[44px]">
            {googleId ? (
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  if (credentialResponse.credential) {
                    googleLogin(credentialResponse.credential);
                  }
                }}
                onError={() => {
                  console.error("Google Login Failed");
                  setAuthError("Google authentication failed");
                }}
                useOneTap={!navigator.webdriver}
                shape="pill"
                theme="outline"
                width="360px"
              />
            ) : (
              <div className="text-xs text-stone-400 border border-dashed border-stone-200 rounded-full px-4 py-2">
                Google Login currently unavailable (Check Cloudflare Env)
              </div>
            )}
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            New to the camp?{" "}
            <Link to="/signup" className="font-bold text-acacia hover:underline decoration-oasis">
              Create an Account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
