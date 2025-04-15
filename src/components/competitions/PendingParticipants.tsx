import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

interface PendingParticipant {
  id: number;
  user_id: number;
  display_name: string;
  joined_at: string;
}

const PendingParticipants = ({ competitionId }: { competitionId: number }) => {
  const { token } = useAuth();
  const [pendingParticipants, setPendingParticipants] = useState<PendingParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingParticipants, setProcessingParticipants] = useState<Set<number>>(new Set());

  const fetchPendingParticipants = async () => {
    try {
      const response = await fetch(`/api/competitions/${competitionId}/pending-participants`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingParticipants(data.pendingParticipants || []);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to load pending participants");
      }
    } catch (err) {
      setError("An error occurred while fetching pending participants");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPendingParticipants();
    }
  }, [token, competitionId]);

  const handleApprove = async (participantId: number) => {
    setProcessingParticipants(prev => new Set(prev).add(participantId));

    try {
      const response = await fetch(`/api/competitions/${competitionId}/participants/${participantId}/approve`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove from pending list
        setPendingParticipants(prev =>
          prev.filter(participant => participant.id !== participantId)
        );
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to approve participant");
      }
    } catch (err) {
      setError("An error occurred while approving participant");
      console.error(err);
    } finally {
      setProcessingParticipants(prev => {
        const updated = new Set(prev);
        updated.delete(participantId);
        return updated;
      });
    }
  };

  const handleReject = async (participantId: number) => {
    setProcessingParticipants(prev => new Set(prev).add(participantId));

    try {
      const response = await fetch(`/api/competitions/${competitionId}/participants/${participantId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove from pending list
        setPendingParticipants(prev =>
          prev.filter(participant => participant.id !== participantId)
        );
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to reject participant");
      }
    } catch (err) {
      setError("An error occurred while rejecting participant");
      console.error(err);
    } finally {
      setProcessingParticipants(prev => {
        const updated = new Set(prev);
        updated.delete(participantId);
        return updated;
      });
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading pending participants...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Participants</CardTitle>
        <CardDescription>
          Review and approve participant requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {pendingParticipants.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No pending requests at this time.</p>
        ) : (
          <div className="space-y-4">
            {pendingParticipants.map(participant => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <p className="font-medium">{participant.display_name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Requested: {new Date(participant.joined_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(participant.id)}
                    disabled={processingParticipants.has(participant.id)}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(participant.id)}
                    disabled={processingParticipants.has(participant.id)}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingParticipants;
