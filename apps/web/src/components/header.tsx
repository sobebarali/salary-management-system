import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const links = [
    { to: "/employees", label: "Employees" },
    { to: "/insights", label: "Insights" },
  ] as const;

  return (
    <header className="border-b">
      <div className="flex h-12 flex-row items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link
            className="font-semibold text-sm tracking-tight"
            to="/"
            translate="no"
          >
            Salary Management
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {links.map(({ to, label }) => (
              <Link
                activeProps={{ className: "text-foreground" }}
                className="text-muted-foreground transition-colors hover:text-foreground"
                key={to}
                to={to}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
