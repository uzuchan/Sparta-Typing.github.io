import { useEffect, useState } from "react";

export type Route =
  | { name: "home" }
  | { name: "import" }
  | { name: "book"; bookId: string }
  | { name: "play"; bookId: string }
  | { name: "stats" };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#/, "");
  const parts = hash.split("/").filter(Boolean);

  if (parts[0] === "import") return { name: "import" };
  if (parts[0] === "stats") return { name: "stats" };
  if (parts[0] === "book" && parts[1]) {
    if (parts[2] === "play") return { name: "play", bookId: parts[1] };
    return { name: "book", bookId: parts[1] };
  }
  return { name: "home" };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case "home":
      return "#/";
    case "import":
      return "#/import";
    case "stats":
      return "#/stats";
    case "book":
      return `#/book/${route.bookId}`;
    case "play":
      return `#/book/${route.bookId}/play`;
  }
}

export function navigate(route: Route) {
  window.location.hash = routeToHash(route);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash());
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
