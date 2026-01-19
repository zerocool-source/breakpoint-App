import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2, Server, Key, User, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { authStorage, login } from "@/lib/auth";

interface TestResult {
  endpoint: string;
  status: "pending" | "success" | "error";
  data?: unknown;
  error?: string;
  duration?: number;
}

export default function ApiSmokeTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginResult, setLoginResult] = useState<{ success: boolean; message: string } | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_URL || "(same origin - local backend)";

  const runSmokeTest = async () => {
    setIsRunning(true);
    setResults([]);

    const endpoints = [
      { endpoint: "/api/me", description: "Current User" },
      { endpoint: "/api/settings", description: "Settings" },
      { endpoint: "/api/technicians/stored", description: "Technicians" },
      { endpoint: "/api/estimates", description: "Estimates" },
      { endpoint: "/api/dashboard/overview", description: "Dashboard" },
    ];

    const newResults: TestResult[] = [];

    for (const { endpoint, description } of endpoints) {
      const result: TestResult = { endpoint: `${endpoint} (${description})`, status: "pending" };
      setResults([...newResults, result]);

      const startTime = Date.now();
      try {
        const data = await api.get(endpoint);
        result.status = "success";
        result.data = data;
        result.duration = Date.now() - startTime;
      } catch (error: any) {
        result.status = "error";
        result.error = error.message;
        result.duration = Date.now() - startTime;
      }

      newResults.push(result);
      setResults([...newResults]);
    }

    setIsRunning(false);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setLoginResult({ success: false, message: "Email and password required" });
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      setLoginResult({ success: true, message: `Logged in as ${result.user?.name || result.user?.email}` });
    } else {
      setLoginResult({ success: false, message: result.error || "Login failed" });
    }
  };

  const handleLogout = () => {
    authStorage.logout();
    setLoginResult(null);
  };

  const currentToken = authStorage.getToken();
  const currentUser = authStorage.getUser();

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-[#0078D4]" />
              API Configuration
            </CardTitle>
            <CardDescription>
              Current API base URL and connection status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Base URL:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm" data-testid="api-base-url">
                {apiBaseUrl}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Auth Token:</span>
              {currentToken ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Present ({currentToken.substring(0, 20)}...)
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Set
                </Badge>
              )}
            </div>
            {currentUser && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Current User:</span>
                <span>{currentUser.name || currentUser.email} ({currentUser.role})</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-[#FF8000]" />
              Authentication
            </CardTitle>
            <CardDescription>
              Login to get an auth token for API calls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!currentToken ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="login-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="login-password"
                    />
                  </div>
                </div>
                <Button onClick={handleLogin} data-testid="login-button">
                  <User className="h-4 w-4 mr-2" />
                  Login
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={handleLogout} data-testid="logout-button">
                Logout
              </Button>
            )}

            {loginResult && (
              <div className={`p-3 rounded ${loginResult.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                {loginResult.success ? (
                  <CheckCircle2 className="h-4 w-4 inline mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 inline mr-2" />
                )}
                {loginResult.message}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-[#17BEBB]" />
              Smoke Test
            </CardTitle>
            <CardDescription>
              Test connectivity to key API endpoints
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={runSmokeTest}
              disabled={isRunning}
              data-testid="run-smoke-test"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Smoke Test
                </>
              )}
            </Button>

            {results.length > 0 && (
              <div className="space-y-2 mt-4">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded border ${
                      result.status === "success"
                        ? "bg-green-50 border-green-200"
                        : result.status === "error"
                        ? "bg-red-50 border-red-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                    data-testid={`test-result-${idx}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {result.status === "pending" && (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                        )}
                        {result.status === "success" && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                        {result.status === "error" && (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <code className="text-sm font-mono">{result.endpoint}</code>
                      </div>
                      {result.duration && (
                        <span className="text-xs text-gray-500">{result.duration}ms</span>
                      )}
                    </div>
                    {result.error && (
                      <p className="text-sm text-red-600 mt-1">{result.error}</p>
                    )}
                    {result.status === "success" && result.data && (
                      <pre className="text-xs bg-white p-2 rounded mt-2 overflow-auto max-h-32">
                        {String(JSON.stringify(result.data, null, 2)).substring(0, 500)}
                        {String(JSON.stringify(result.data)).length > 500 && "..."}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Set <code className="bg-gray-100 px-1">VITE_API_URL</code> in your environment to connect to the external API.
            </p>
            <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
{`# For production (Render API):
VITE_API_URL=https://breakpoint-api.onrender.com

# For development (local backend):
VITE_API_URL=  # Leave empty to use same-origin`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
