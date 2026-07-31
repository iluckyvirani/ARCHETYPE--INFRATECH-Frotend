import { Navigate, Outlet } from "react-router-dom";
import { isAppUnlocked } from "../lib/access";

/** Blocks app routes until password unlock in this browser session. */
export function RequireAccess() {
  if (!isAppUnlocked()) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
