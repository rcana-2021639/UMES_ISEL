import { Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { HomePage } from "@/pages/HomePage";
import { ProgramDetailPage } from "@/pages/ProgramDetailPage";

/**
 * Resets scroll position on route change; if the new URL carries a hash
 * (e.g. Link to="/#programas" from a detail page), scrolls that section
 * into view instead of jumping to the top.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        // Wait a tick so the target page has mounted before measuring it.
        requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/programas/:slug" element={<ProgramDetailPage />} />
      </Routes>
    </>
  );
}
