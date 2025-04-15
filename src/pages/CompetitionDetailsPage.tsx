import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import PendingParticipants from "@/components/competitions/PendingParticipants";

interface Competition {
  id: number;
  name: string;
  description: string;
  status: string;
  created_at: string;
  created_by: number;
  creator_name: string;
}

interface Participant {
  participant_id: number;
  user_id: number;
  display_name: string;
  score: number;
  joined_at: string;
}

interface Matchup {
  id: number;
  participant1_id: number;
  participant1_name: string;
  participant2_id: number;
  participant2_name: string;
  participant1_score: number | null;
  participant2_score: number | null;
  round: number;
  status: string;
}

const CompetitionDetailsPage = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const { token, user } = useAuth();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const fetchCompetitionDetails = async () => {
      if (!competitionId) return;

      try {
        const response = await fetch(`/api/competitions/${competitionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCompetition(data.competition);
          setParticipants(data.participants || []);
          setMatchups(data.matchups || []);

          // Check if current user is the competition owner
          setIsOwner(data.competition.created_by === user?.id);
        } else {
          setError("Failed to load competition details");
        }
      } catch (err) {
        setError("An error occurred while fetching competition data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token && competitionId) {
      fetchCompetitionDetails();
    }
  }, [token, competitionId, user?.id]);

  if (loading) {
    return <div className="text-center p-8">Loading competition details...</div>;
  }

  if (error || !competition) {
    return (
      <Alert variant="destructive" className="mb-6">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertDescription>
          {error || "Competition not found"}
        </AlertDescription>
      </Alert>
    );
  }

  // Group matchups by round
  const matchupsByRound = matchups.reduce((acc, matchup) => {
    const round = matchup.round;
    if (!acc[round]) acc[round] = [];
    acc[round].push(matchup);
    return acc;
  }, {} as Record<number, Matchup[]>);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{competition.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Organized by {competition.creator_name} • Created {new Date(competition.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              competition.status === "active"
                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                : competition.status === "upcoming"
                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            }`}
          >
            {competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}
          </span>

          {isOwner && competition.status !== "completed" && (
            <Button size="sm" variant="outline">
              Manage Competition
            </Button>
          )}
        </div>
      </div>

      {competition.description && (
        <p className="text-gray-700 dark:text-gray-300 my-4">{competition.description}</p>
      )}

      {/* Pending Participants (visible only to the competition owner) */}
      {isOwner && (
        <PendingParticipants competitionId={Number.parseInt(competitionId!)} />
      )}

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
          <CardDescription>
            {participants.length} {participants.length === 1 ? "person" : "people"} participating
          </CardDescription>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <p className="text-gray-500">No participants have joined yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {participants.map((participant) => (
                <div
                  key={participant.participant_id}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <p className="font-medium">{participant.display_name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Score: {participant.score}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Joined: {new Date(participant.joined_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matchups by Round */}
      {Object.keys(matchupsByRound).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Matchups</CardTitle>
            <CardDescription>
              Competition rounds and results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(matchupsByRound).map(([round, roundMatchups]) => (
                <div key={round} className="space-y-2">
                  <h3 className="text-lg font-medium">Round {round}</h3>
                  <div className="grid gap-3">
                    {roundMatchups.map((matchup) => (
                      <div
                        key={matchup.id}
                        className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1 text-right mr-3">
                            <p className="font-medium">{matchup.participant1_name}</p>
                            {matchup.status === "completed" && (
                              <p className={`text-lg font-bold ${
                                matchup.participant1_score! > matchup.participant2_score!
                                  ? "text-green-600 dark:text-green-400"
                                  : matchup.participant1_score! < matchup.participant2_score!
                                  ? "text-red-600 dark:text-red-400"
                                  : ""
                              }`}>{matchup.participant1_score}</p>
                            )}
                          </div>

                          <div className="flex flex-col items-center">
                            <span className="text-xs text-gray-500 dark:text-gray-400">vs</span>
                            {matchup.status === "completed" ? (
                              <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                                Completed
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full mt-1">
                                Scheduled
                              </span>
                            )}
                          </div>

                          <div className="flex-1 ml-3">
                            <p className="font-medium">{matchup.participant2_name}</p>
                            {matchup.status === "completed" && (
                              <p className={`text-lg font-bold ${
                                matchup.participant2_score! > matchup.participant1_score!
                                  ? "text-green-600 dark:text-green-400"
                                  : matchup.participant2_score! < matchup.participant1_score!
                                  ? "text-red-600 dark:text-red-400"
                                  : ""
                              }`}>{matchup.participant2_score}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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

export default CompetitionDetailsPage;
