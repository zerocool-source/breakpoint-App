import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets, Shield, BarChart3, Users } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-cyan-600 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Droplets className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Pool Brain Admin</span>
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
          Pool Brain Admin Portal
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 lg:hidden">
              <Droplets className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <CardDescription className="text-base">
              Sign in to access the Pool Brain admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <Button
              asChild
              size="lg"
              className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
              data-testid="button-login"
            >
              <a href="/api/login">
                Sign in with Replit
              </a>
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Use your Replit account to securely access the admin dashboard.
              Supports Google, GitHub, Apple, and email login.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
