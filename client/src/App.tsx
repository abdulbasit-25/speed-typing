import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { SiteLayout } from "./layouts/SiteLayout.js";
import { AdminPage } from "./pages/AdminPage.js";
import { CompetePage } from "./pages/CompetePage.js";
import { DisplayPage } from "./pages/DisplayPage.js";
import { HomePage } from "./pages/HomePage.js";
import { LeaderboardPage } from "./pages/LeaderboardPage.js";

const routeMetadata: Record<string, { title: string; description: string; indexable: boolean }> = {
  "/": {
    title: "RapidStrike Championship | Speed Typing at Air University",
    description: "Take your place at the keys in the RapidStrike Championship, a Tech Vanguard typing competition at Air University, Islamabad. Compete for a place in the live rankings.",
    indexable: true,
  },
  "/compete": {
    title: "Compete | RapidStrike Championship",
    description: "Register for the RapidStrike Championship at Air University, Islamabad, and test your typing speed, accuracy, and focus.",
    indexable: true,
  },
  "/leaderboard": {
    title: "Live Typing Leaderboard | RapidStrike",
    description: "See the latest verified results and rankings from the RapidStrike Championship at Air University, Islamabad.",
    indexable: true,
  },
  "/admin": {
    title: "Organizer Control | RapidStrike",
    description: "RapidStrike Championship organizer controls.",
    indexable: false,
  },
  "/display": {
    title: "Projector Display | RapidStrike Championship",
    description: "Live projector display for the RapidStrike Championship.",
    indexable: false,
  },
};

function RouteMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const metadata = routeMetadata[pathname] ?? {
      title: "Page not found | RapidStrike",
      description: "The requested RapidStrike page could not be found.",
      indexable: false,
    };
    const canonicalUrl = `https://rapidstrike.vercel.app${pathname}`;
    const setMetaContent = (selector: string, content: string) => {
      document.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
    };

    document.title = metadata.title;
    setMetaContent('meta[name="description"]', metadata.description);
    setMetaContent('meta[name="robots"]', metadata.indexable ? "index, follow" : "noindex, nofollow");
    setMetaContent('meta[property="og:title"]', metadata.title);
    setMetaContent('meta[property="og:description"]', metadata.description);
    setMetaContent('meta[property="og:url"]', canonicalUrl);
    setMetaContent('meta[name="twitter:title"]', metadata.title);
    setMetaContent('meta[name="twitter:description"]', metadata.description);
    setMetaContent('meta[name="twitter:url"]', canonicalUrl);

    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (metadata.indexable) {
      canonical?.setAttribute("href", canonicalUrl);
    } else {
      canonical?.removeAttribute("href");
    }
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteMetadata />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/compete" element={<CompetePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route path="/display" element={<DisplayPage />} />
        <Route path="*" element={<main className="not-found"><p className="eyebrow">404 / PAGE NOT FOUND</p><h1>This page isn’t on the board.</h1><a className="text-link" href="/">Return to the competition</a></main>} />
      </Routes>
    </BrowserRouter>
  );
}