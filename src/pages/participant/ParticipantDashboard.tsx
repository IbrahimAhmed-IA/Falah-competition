import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { PlusIcon, EnterIcon } from "@radix-ui/react-icons";

interface Competition {
  id: number;
  name: string;
  status: string;
  score: number;
}

interface NameChangeRequest {
  id: number;
  new_name: string;
  requested_at: string;
}

interface ParticipantProfile {
  participant: {
    id: number;
    username: string;
    display_name: string;
  };
  competitions: Competition[];
  pendingNameChangeRequest: NameChangeRequest | null;
}

const ParticipantDashboard = () => {
  const { token, user } = useAuth();
  const [profile, setProfile] = useState<ParticipantProfile | null>(null);
  const [availableCompetitions, setAvailableCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch profile data
        const profileResponse = await fetch("/api/participants/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Fetch available competitions (that user hasn't joined yet)
        const competitionsResponse = await fetch("/api/competitions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (profileResponse.ok && competitionsResponse.ok) {
          const profileData = await profileResponse.json();
          const competitionsData = await competitionsResponse.json();

          setProfile(profileData);

          // Filter out competitions the user is already part of
          const userCompetitionIds = new Set(profileData.competitions.map((c: Competition) => c.id));
          const filteredCompetitions = competitionsData.competitions.filter(
            (c: any) => !userCompetitionIds.has(c.id) && c.status !== 'completed'
          );

          setAvailableCompetitions(filteredCompetitions.slice(0, 5)); // Show only 5 available competitions
        } else {
          const errorData = await profileResponse.json();
          setError(errorData.message || "Failed to load profile");
        }
      } catch (err) {
        setError("Error fetching profile data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  if (loading) {
    return <div className="text-center p-8">Loading...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const activeCompetitions = profile?.competitions.filter(c => c.status === "active") || [];
  const upcomingCompetitions = profile?.competitions.filter(c => c.status === "upcoming") || [];
  const completedCompetitions = profile?.competitions.filter(c => c.status === "completed") || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Participant Dashboard</h1>
        <div className="space-x-2">
          <Link to="/competitions/create">
            <Button variant="outline" className="gap-2">
              <PlusIcon className="h-4 w-4" /> Create Competition
            </Button>
          </Link>
          <Link to="/competitions">
            <Button className="gap-2">
              <EnterIcon className="h-4 w-4" /> Browse Competitions
            </Button>
          </Link>
        </div>
      </div>

      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {user?.displayName}</CardTitle>
          <CardDescription>
            Your personal competition dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile?.pendingNameChangeRequest && (
            <Alert className="mb-4 bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-800">
              <AlertDescription>
                You have a pending name change request to "{profile.pendingNameChangeRequest.new_name}".
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4">
            <div>
              <h3 className="text-lg font-medium">Your Stats</h3>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Competitions</p>
                  <p className="text-2xl font-bold">{activeCompetitions.length}</p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming</p>
                  <p className="text-2xl font-bold">{upcomingCompetitions.length}</p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                  <p className="text-2xl font-bold">{completedCompetitions.length}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Competitions */}
      <Card>
        <CardHeader>
          <CardTitle>Available Competitions</CardTitle>
          <CardDescription>
            Join existing competitions or create your own
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableCompetitions.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              No available competitions at the moment. Why not create your own?
            </p>
          ) : (
            <div className="grid gap-4">
              {availableCompetitions.map((competition) => (
                <div
                  key={competition.id}
                  className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{competition.name}</h3>
                    <div className="flex gap-3 text-sm text-gray-500">
                      <span className={`${
                        competition.status === 'active'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}
                      </span>
                      <span>•</span>
                      <span>By {competition.creator_name}</span>
                    </div>
                  </div>
                  <Link to={`/competitions/${competition.id}/join`}>
                    <Button variant="outline" size="sm">Join</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Link to="/competitions" className="w-full">
            <Button variant="outline" className="w-full">
              Browse All Competitions
            </Button>
          </Link>
        </CardFooter>
      </Card>

      {/* Active Competitions */}
      {activeCompetitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Competitions</CardTitle>
            <CardDescription>
              Competitions you are currently participating in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {activeCompetitions.map((competition) => (
                <div
                  key={competition.id}
                  className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{competition.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Your current score: {competition.score}
                    </p>
                  </div>
                  <Link to={`/competitions/${competition.id}`}>
                    <Button variant="outline" size="sm">View</Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">
            {completedCompetitions.length > 0
              ? "Check your performance in previous competitions."
              : "You haven't completed any competitions yet."}
          </p>

          {completedCompetitions.length > 0 && (
            <div className="grid gap-4 mt-4">
              {completedCompetitions.slice(0, 3).map((competition) => (
                <div
                  key={competition.id}
                  className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{competition.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Final score: {competition.score}
                    </p>
                  </div>
                  <Link to={`/competitions/${competition.id}`}>
                    <Button variant="outline" size="sm">Details</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ParticipantDashboard;
