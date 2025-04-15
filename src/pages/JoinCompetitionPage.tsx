import { useParams } from "react-router-dom";
import JoinCompetitionForm from "@/components/competitions/JoinCompetitionForm";

const JoinCompetitionPage = () => {
  const { competitionId } = useParams<{ competitionId: string }>();

  if (!competitionId || isNaN(Number.parseInt(competitionId))) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Competition</h1>
          <p>The competition ID is invalid or missing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Join Competition</h1>
      <JoinCompetitionForm competitionId={Number.parseInt(competitionId)} />
    </div>
  );
};

export default JoinCompetitionPage;
