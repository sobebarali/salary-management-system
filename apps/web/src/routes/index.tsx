import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { BarChart3Icon, UsersIcon } from "lucide-react";

import { StatCard } from "@/components/stat-card";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

const quickLinks = [
  {
    to: "/employees",
    title: "Employees",
    description: "Search, filter, add, edit, and remove people.",
    icon: UsersIcon,
  },
  {
    to: "/insights",
    title: "Insights",
    description: "Salary bands, role averages, and distributions.",
    icon: BarChart3Icon,
  },
] as const;

function HomeComponent() {
  const { session } = Route.useRouteContext();
  const overview = useQuery(orpc.insights.overview.queryOptions());

  return (
    <div className="container mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
      <div className="space-y-0.5">
        <h1 className="font-semibold text-xl tracking-tight">
          Welcome, {session.data?.user.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage your organization's people and compensation.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total employees"
          value={overview.data?.totalEmployees.toLocaleString() ?? "—"}
        />
        <StatCard
          label="Countries"
          value={overview.data?.countries.toLocaleString() ?? "—"}
        />
        <StatCard
          label="Dominant currency"
          value={overview.data?.currency ?? "—"}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {quickLinks.map(({ to, title, description, icon: Icon }) => (
          <Link
            className="group flex items-center gap-3 border bg-card p-4 transition-colors hover:bg-muted/50"
            key={to}
            to={to}
          >
            <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
            <div className="min-w-0">
              <p className="font-medium text-sm">{title}</p>
              <p className="truncate text-muted-foreground text-xs">
                {description}
              </p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
