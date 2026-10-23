import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SiteLayout } from "./layouts/SiteLayout.js";
import { AdminPage } from "./pages/AdminPage.js";
import { CompetePage } from "./pages/CompetePage.js";
import { DisplayPage } from "./pages/DisplayPage.js";
import { HomePage } from "./pages/HomePage.js";
import { LeaderboardPage } from "./pages/LeaderboardPage.js";

export default function App() {
  return (
    <BrowserRouter>
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