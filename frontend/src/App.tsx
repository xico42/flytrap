import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { HealthStatus } from "./feature/health/components/HealthStatus";

export default function App() {
  return (
    <div className="min-h-screen bg-base-200 p-8">
      <header className="flex items-center justify-between max-w-xl mx-auto mb-8">
        <h1 className="text-3xl font-bold">Hello, Flytrap</h1>
        <ThemeSwitcher />
      </header>
      <main className="max-w-xl mx-auto">
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">API health</h2>
            <p>
              Status: <HealthStatus />
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
