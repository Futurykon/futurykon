import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-arctic/30 via-lavender/20 to-peach/20">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4 text-magenta">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Strona nie została znaleziona</p>
        <a href="/" className="text-magenta hover:text-magenta/80 underline font-medium">
          Wróć na stronę główną
        </a>
      </div>
    </div>
  );
};

export default NotFound;
