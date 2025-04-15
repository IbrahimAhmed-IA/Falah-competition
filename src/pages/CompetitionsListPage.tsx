import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExclamationTriangleIcon, PlusIcon } from "@radix-ui/react-icons";

interface Competition {
  id: number;
  name: string;
  description: string;
  status: string;
  creator_name: string;
  participant_count: number;
  created_at: string;
}

interface UserCompetition {
  id: number;
}

const CompetitionsListPage = () => {
  const { token } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [myCompetitions, setMyCompetitions] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        // Get all competitions
        const competitionsResponse = await fetch("/api/competitions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Get competitions the user is already part of
        const profileResponse = await fetch("/api/participants/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (competitionsResponse.ok && profileResponse.ok) {
          const competitionsData = await competitionsResponse.json();
          const profileData = await profileResponse.json();

          setCompetitions(competitionsData.competitions || []);

          // Create a set of competition IDs that the user is already part of
          const userCompetitions = (profileData.competitions || []) as UserCompetition[];
          const userCompetitionIds = new Set(
            userCompetitions.map((c) => c.id)
          );

          setMyCompetitions(userCompetitionIds);
        } else {
          setError("Failed to load competitions");
        }
      } catch (err) {
        setError("An error occurred while fetching competitions");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchCompetitions();
    }
  }, [token]);

  if (loading) {
    return <div className="text-center p-8">Loading competitions...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case "upcoming":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      case "completed":
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200";
    }
  };

  const activeCompetitions = competitions.filter(c => c.status === "active");
  const upcomingCompetitions = competitions.filter(c => c.status === "upcoming");
  const completedCompetitions = competitions.filter(c => c.status === "completed").slice(0, 5); // Show only 5 completed

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Competitions</h1>
        <Link to="/competitions/create">
          <Button className="gap-2">
            <PlusIcon className="h-4 w-4" /> Create Competition
          </Button>
        </Link>
      </div>

      {/* Active Competitions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Competitions</CardTitle>
        </CardHeader>
        <CardContent>
          {activeCompetitions.length === 0 ? (
            <p className="text-gray-500">No active competitions at the moment.</p>
          ) : (
            <div className="grid gap-4">
              {activeCompetitions.map((competition) => (
                <div
                  key={competition.id}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{competition.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(
                          competition.status
                        )}`}
                      >
                        {competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Organized by {competition.creator_name} • {competition.participant_count} participants
                    </p>
                    {competition.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {competition.description.length > 100
                          ? `${competition.description.substring(0, 100)}...`
                          : competition.description}
                      </p>
                    )}
                  </div>
                  <div>
                    {myCompetitions.has(competition.id) ? (
                      <Link to={`/competitions/${competition.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    ) : (
                      <Link to={`/competitions/${competition.id}/join`}>
                        <Button size="sm">Join</Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Competitions */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Competitions</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingCompetitions.length === 0 ? (
            <p className="text-gray-500">No upcoming competitions at the moment.</p>
          ) : (
            <div className="grid gap-4">
              {upcomingCompetitions.map((competition) => (
                <div
                  key={competition.id}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{competition.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(
                          competition.status
                        )}`}
                      >
                        {competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Organized by {competition.creator_name} • {competition.participant_count} participants
                    </p>
                    {competition.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {competition.description.length > 100
                          ? `${competition.description.substring(0, 100)}...`
                          : competition.description}
                      </p>
                    )}
                  </div>
                  <div>
                    {myCompetitions.has(competition.id) ? (
                      <Link to={`/competitions/${competition.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    ) : (
                      <Link to={`/competitions/${competition.id}/join`}>
                        <Button size="sm">Join</Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Competitions */}
      {completedCompetitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Completed Competitions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {completedCompetitions.map((competition) => (
                <div
                  key={competition.id}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{competition.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(
                          competition.status
                        )}`}
                      >
                        {competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Organized by {competition.creator_name} • {competition.participant_count} participants
                    </p>
                  </div>
                  <div>
                    <Link to={`/competitions/${competition.id}`}>
                      <Button variant="outline" size="sm">
                        Results
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CompetitionsListPage;
