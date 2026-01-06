/**
 * Settings Index Page
 * 
 * Redirects to user settings by default.
 */

import { Navigate } from "react-router-dom";

export default function SettingsPage() {
  // Redirect to user settings by default
  return <Navigate to="/settings/user" replace />;
}

