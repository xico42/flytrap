import { useEffect, useState } from "react";

export type HealthStatus = "loading" | "healthy" | "unhealthy";

export interface HealthState {
  status: HealthStatus;
}

export function useHealth(): HealthState {
  const [status, setStatus] = useState<HealthStatus>("loading");

  useEffect(() => {
    let active = true;

    fetch("/api/health")
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setStatus("unhealthy");
          return;
        }
        const body = (await response.json()) as { status?: string };
        setStatus(body.status === "healthy" ? "healthy" : "unhealthy");
      })
      .catch(() => {
        if (active) setStatus("unhealthy");
      });

    return () => {
      active = false;
    };
  }, []);

  return { status };
}
