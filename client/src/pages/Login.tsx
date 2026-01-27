import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, BarChart3, Users, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import LinkpointLogo from "@/assets/linkpoint-logo.png";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");

  const { login, register, isLoggingIn, isRegistering } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isRegister) {
        await register({ email, password, firstName, lastName });
      } else {
        await login({ email, password });
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    }
  };

  const isSubmitting = isLoggingIn || isRegistering;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-cyan-600 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-4 mb-8">
            <img src={LinkpointLogo} alt="Linkpoint" className="h-28 w-auto" />
            <span className="px-3 py-1 bg-orange-500 text-white text-sm font-bold rounded-full uppercase tracking-wide">Beta</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Pool Service Management
          </h1>
          <p className="text-blue-100 text-lg max-w-md">
            The complete admin dashboard for managing your pool service operations, technicians, customers, and more.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4 text-white/90">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Customer Management</p>
              <p className="text-sm text-white/70">Track all your HOA accounts and properties</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-white/90">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Real-time Analytics</p>
              <p className="text-sm text-white/70">Monitor operations and performance</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-white/90">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Secure Access</p>
              <p className="text-sm text-white/70">Protected admin-only dashboard</p>
            </div>
          </div>
        </div>

        <p className="text-white/50 text-sm">
          Linkpoint Admin Portal
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 lg:hidden flex items-center gap-2 justify-center">
              <img src={LinkpointLogo} alt="Linkpoint" className="h-16 w-auto" />
              <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full uppercase">Beta</span>
            </div>
            <CardTitle className="text-2xl">
              {isRegister ? "Create Account" : "Admin Login"}
            </CardTitle>
            <CardDescription className="text-base">
              {isRegister 
                ? "Register to access the Linkpoint admin dashboard"
                : "Sign in to access the Linkpoint admin dashboard"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {isRegister && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      data-testid="input-firstName"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      data-testid="input-lastName"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  data-testid="input-password"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
                data-testid="button-submit"
              >
                {isSubmitting 
                  ? (isRegister ? "Creating Account..." : "Signing In...")
                  : (isRegister ? "Create Account" : "Sign In")
                }
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError("");
                  }}
                  className="text-sm text-blue-600 hover:underline"
                  data-testid="button-toggle-mode"
                >
                  {isRegister 
                    ? "Already have an account? Sign in"
                    : "Don't have an account? Register"
                  }
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
