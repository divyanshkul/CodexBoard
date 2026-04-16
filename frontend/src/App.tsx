import { startTransition, useEffect, useState } from "react";
import { Board } from "./components/Board";
import { LandingPage } from "./components/LandingPage";

const HOME_PATH = "/";
const DASHBOARD_PATH = "/dashboard";

function getCurrentPath() {
  if (typeof window === "undefined") {
    return HOME_PATH;
  }

  return window.location.pathname;
}

export default function App() {
  const [pathname, setPathname] = useState(getCurrentPath);

  useEffect(() => {
    const handlePopState = () => {
      startTransition(() => {
        setPathname(getCurrentPath());
      });
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    document.title =
      pathname === DASHBOARD_PATH ? "CodexBoard Dashboard" : "CodexBoard";
  }, [pathname]);

  const navigate = (nextPath: string) => {
    if (typeof window === "undefined" || nextPath === pathname) {
      return;
    }

    window.history.pushState({}, "", nextPath);
    startTransition(() => {
      setPathname(nextPath);
    });
  };

  if (pathname === DASHBOARD_PATH) {
    return <Board />;
  }

  return <LandingPage onOpenDashboard={() => navigate(DASHBOARD_PATH)} />;
}
