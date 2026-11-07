import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Proactive Agentic Inspection",
    short_name: "Proactive Agentic Inspection",
    description: "Build inspection plans and complete P2H with Lumo.",
    start_url: "/",
    display: "standalone",
    background_color: "white",
    theme_color: "white",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
