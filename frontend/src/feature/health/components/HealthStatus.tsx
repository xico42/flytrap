import { useHealth } from "../hooks/useHealth";

export function HealthStatus() {
  const { status } = useHealth();

  if (status === "loading") {
    return (
      <span aria-label="loading">
        <span className="loading loading-dots loading-sm" aria-hidden="true" />
        <span className="sr-only">loading</span>
      </span>
    );
  }

  return <span data-testid="health-status">{status}</span>;
}

export default HealthStatus;
