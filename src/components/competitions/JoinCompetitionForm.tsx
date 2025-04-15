import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

interface Competition {
  id: number;
  name: string;
  description: string;
  status: string;
  creator_name: string;
  public: boolean;
  participant_count: number;
}

const JoinCompetitionForm = ({ competitionId }: { competitionId: number }) => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompetition = async () => {
      try {
        const response = await fetch(`/api/competitions/${competitionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCompetition(data.competition);
        } else {
          setError("Competition not found");
        }
      } catch (err) {
        setError("Failed to load competition details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchCompetition();
    }
  }, [token, competitionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/competitions/${competitionId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.approved) {
          // If automatically approved, redirect to competition page
          navigate(`/competitions/${competitionId}`);
        } else {
          // If pending approval, show message
          setMessage(data.message || "Request submitted. Waiting for admin approval.");
          setPassword("");
        }
      } else {
        setError(data.message || "Failed to join competition");
      }
    } catch (err) {
      setError("An error occurred while joining the competition");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading...</div>;
  }

  if (!competition) {
    return (
      <Alert variant="destructive">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertDescription>Competition not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Join Competition</CardTitle>
        <CardDescription>
          Join "{competition.name}" organized by {competition.creator_name}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              <strong>Status:</strong> {competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}
              <br />
              <strong>Participants:</strong> {competition.participant_count}
              <br />
              {competition.description && (
                <>
                  <strong>Description:</strong> {competition.description}
                </>
              )}
            </p>
          </div>

          {!competition.public && (
            <div className="space-y-2">
              <Label htmlFor="password">Competition Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/competitions")}
          >
            Back
          </Button>
          <Button type="submit" disabled={submitting || !!message}>
            {submitting ? "Joining..." : "Join Competition"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default JoinCompetitionForm;
