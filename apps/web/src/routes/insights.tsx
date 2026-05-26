import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@salary-management-system/ui/components/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@salary-management-system/ui/components/chart";
import { Label } from "@salary-management-system/ui/components/label";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { Combobox } from "@/components/combobox";
import { authClient } from "@/lib/auth-client";
import { formatMoney, toMajorUnits } from "@/lib/money";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/insights")({
  component: InsightsPage,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

const salaryChartConfig = {
  value: { label: "Avg salary", color: "var(--chart-1)" },
} satisfies ChartConfig;

const histogramChartConfig = {
  count: { label: "Employees", color: "var(--chart-2)" },
} satisfies ChartConfig;

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="font-normal text-muted-foreground text-xs">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="font-semibold text-lg">{value}</CardContent>
    </Card>
  );
}

function InsightsPage() {
  const overview = useQuery(orpc.insights.overview.queryOptions());
  const salaryByCountry = useQuery(
    orpc.insights.salaryByCountry.queryOptions()
  );
  const topJobTitles = useQuery(
    orpc.insights.topJobTitles.queryOptions({ input: { limit: 10 } })
  );
  const jobTitleOptionsQuery = useQuery(
    orpc.insights.topJobTitles.queryOptions({ input: { limit: 50 } })
  );

  const [bandCountry, setBandCountry] = useState<string | undefined>();
  const [roleCountry, setRoleCountry] = useState<string | undefined>();
  const [roleJobTitle, setRoleJobTitle] = useState<string | undefined>();

  const band = useQuery({
    ...orpc.insights.byCountry.queryOptions({
      input: { country: bandCountry ?? "" },
    }),
    enabled: Boolean(bandCountry),
  });
  const histogram = useQuery({
    ...orpc.insights.histogram.queryOptions({
      input: { country: bandCountry ?? "" },
    }),
    enabled: Boolean(bandCountry),
  });
  const role = useQuery({
    ...orpc.insights.jobTitleInCountry.queryOptions({
      input: { country: roleCountry ?? "", jobTitle: roleJobTitle ?? "" },
    }),
    enabled: Boolean(roleCountry && roleJobTitle),
  });

  const currency = overview.data?.currency ?? "USD";
  const money = (value: number | null | undefined) =>
    value == null ? "—" : formatMoney(value, currency);

  const countryOptions = (salaryByCountry.data ?? []).map((r) => r.country);
  const jobTitleOptions = (jobTitleOptionsQuery.data ?? []).map(
    (r) => r.jobTitle
  );

  const byCountryChartData = (salaryByCountry.data ?? [])
    .slice(0, 12)
    .map((r) => ({ label: r.country, value: toMajorUnits(r.avg) }));
  const topRolesChartData = (topJobTitles.data ?? []).map((r) => ({
    label: r.jobTitle,
    value: toMajorUnits(r.avg),
  }));
  const histogramChartData = (histogram.data ?? []).map((r) => ({
    label: `${(r.bucket - 1) * 30}k–${r.bucket * 30}k`,
    count: r.count,
  }));

  return (
    <div className="container mx-auto flex flex-col gap-6 px-4 py-4">
      <h1 className="font-semibold text-xl">Insights</h1>

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

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Average salary by country</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64 w-full" config={salaryChartConfig}>
              <BarChart accessibilityLayer data={byCountryChartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  tickLine={false}
                  tickMargin={8}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top-paying job titles</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64 w-full" config={salaryChartConfig}>
              <BarChart accessibilityLayer data={topRolesChartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  tickLine={false}
                  tickMargin={8}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label>Country salary band</Label>
            <Combobox
              allLabel="Select a country"
              onChange={setBandCountry}
              options={countryOptions}
              placeholder="Select a country"
              value={bandCountry}
            />
          </div>
        </div>
        {bandCountry ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatCard label="Minimum" value={money(band.data?.min)} />
              <StatCard label="Maximum" value={money(band.data?.max)} />
              <StatCard label="Average" value={money(band.data?.avg)} />
              <StatCard label="Median" value={money(band.data?.median)} />
              <StatCard
                label="Headcount"
                value={band.data?.headcount.toLocaleString() ?? "—"}
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Salary distribution — {bandCountry}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-64 w-full"
                  config={histogramChartConfig}
                >
                  <BarChart accessibilityLayer data={histogramChartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      axisLine={false}
                      dataKey="label"
                      tickLine={false}
                      tickMargin={8}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Pick a country to see its salary band and distribution.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <CardTitle className="text-sm">
          Average for a role in a country
        </CardTitle>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Combobox
              allLabel="Select a country"
              onChange={setRoleCountry}
              options={countryOptions}
              placeholder="Select a country"
              value={roleCountry}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Job title</Label>
            <Combobox
              allLabel="Select a job title"
              onChange={setRoleJobTitle}
              options={jobTitleOptions}
              placeholder="Select a job title"
              value={roleJobTitle}
            />
          </div>
        </div>
        {roleCountry && roleJobTitle ? (
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Average" value={money(role.data?.avg)} />
            <StatCard label="Median" value={money(role.data?.median)} />
            <StatCard
              label="Headcount"
              value={role.data?.headcount.toLocaleString() ?? "—"}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Pick a country and a job title to see the average compensation.
          </p>
        )}
      </section>
    </div>
  );
}
