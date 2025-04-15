import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { TrophyIcon, UsersIcon, LayoutDashboardIcon, LogOutIcon } from "lucide-react";

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="flex items-center">
                  <TrophyIcon className="h-8 w-8 text-primary mr-2" />
                  <span className="text-xl font-bold">Competition Manager</span>
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              {user && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">
                    {user.displayName} ({user.role})
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOutIcon className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar and Content */}
      <div className="flex-1 flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white dark:bg-gray-800 shadow-sm p-4 hidden md:block">
          <div className="space-y-1">
            {user?.role === "admin" ? (
              <>
                <Link
                  to="/admin/dashboard"
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <LayoutDashboardIcon className="h-5 w-5 mr-3" />
                  Dashboard
                </Link>
                <Link
                  to="/admin/competitions"
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <TrophyIcon className="h-5 w-5 mr-3" />
                  Competitions
                </Link>
                <Link
                  to="/admin/participants"
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <UsersIcon className="h-5 w-5 mr-3" />
                  Participants
                </Link>
                <Link
                  to="/admin/name-changes"
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span className="h-5 w-5 mr-3 flex items-center justify-center">🔄</span>
                  Name Change Requests
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <LayoutDashboardIcon className="h-5 w-5 mr-3" />
                  Dashboard
                </Link>
                <Link
                  to="/competitions"
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <TrophyIcon className="h-5 w-5 mr-3" />
                  Competitions
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span className="h-5 w-5 mr-3 flex items-center justify-center">👤</span>
                  My Profile
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
