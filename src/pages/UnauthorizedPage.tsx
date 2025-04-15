import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleRedirect = () => {
    // Redirect to the appropriate dashboard based on role
    if (user?.role === "admin") {
      navigate("/admin/dashboard");
    } else if (user?.role === "participant") {
      navigate("/dashboard");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">
          Access Denied
        </h1>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          You don't have permission to access this page. Please return to your dashboard.
        </p>
        <Button onClick={handleRedirect}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
