import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

interface Competition {
  id: number;
  name: string;
  status: string;
  participant_count: number;
}

interface NameChangeRequest {
  id: number;
  user_id: number;
  current_name: string;
  new_name: string;
  status: string;
  requested_at: string;
}

const AdminDashboard = () => {
  const { token } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [nameChangeRequests, setNameChangeRequests] = useState<NameChangeRequest[]>([]);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch competitions
        const competitionsResponse = await fetch("/api/competitions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Fetch name change requests
        const requestsResponse = await fetch("/api/users/name-changes/all", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Fetch participants count
        const participantsResponse = await fetch("/api/users/participants", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (competitionsResponse.ok && requestsResponse.ok && participantsResponse.ok) {
          const competitionsData = await competitionsResponse.json();
          const requestsData = await requestsResponse.json();
          const participantsData = await participantsResponse.json();

          setCompetitions(competitionsData.competitions || []);
          setNameChangeRequests(
            (requestsData.requests || []).filter((req: NameChangeRequest) => req.status === "pending")
          );
          setParticipantCount(participantsData.participants?.length || 0);
        } else {
          setError("Failed to load dashboard data");
        }
      } catch (err) {
        setError("Error fetching dashboard data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDashboardData();
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

  const activeCompetitions = competitions.filter(c => c.status === "active");
  const upcomingCompetitions = competitions.filter(c => c.status === "upcoming");
  const completedCompetitions = competitions.filter(c => c.status === "completed");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Link to="/admin/competitions/new">
          <Button>Create Competition</Button>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{participantCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Active Competitions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeCompetitions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{upcomingCompetitions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{completedCompetitions.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pending Name Change Requests</CardTitle>
          <CardDescription>
            Requests requiring your approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {nameChangeRequests.length === 0 ? (
            <p className="text-gray-500">No pending name change requests.</p>
          ) : (
            <div className="grid gap-4">
              {nameChangeRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      From "{request.current_name}" to "{request.new_name}"
                    </p>
                    <p className="text-sm text-gray-500">
                      Requested: {new Date(request.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link to="/admin/name-changes">
                    <Button variant="outline" size="sm">Review</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
          {nameChangeRequests.length > 0 && (
            <div className="mt-4">
              <Link to="/admin/name-changes">
                <Button variant="outline">View All Requests</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Competitions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Competitions</CardTitle>
          <CardDescription>
            Your most recent active and upcoming competitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {competitions.length === 0 ? (
            <p className="text-gray-500">No competitions found. Create one to get started.</p>
          ) : (
            <div className="grid gap-4">
              {[...activeCompetitions, ...upcomingCompetitions]
                .slice(0, 5)
                .map((competition) => (
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
                            : competition.status === 'upcoming'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}
                        </span>
                        <span>•</span>
                        <span>{competition.participant_count} participants</span>
                      </div>
                    </div>
                    <Link to={`/admin/competitions/${competition.id}`}>
                      <Button variant="outline" size="sm">Manage</Button>
                    </Link>
                  </div>
                ))}
            </div>
          )}
          <div className="mt-4">
            <Link to="/admin/competitions">
              <Button variant="outline">View All Competitions</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
