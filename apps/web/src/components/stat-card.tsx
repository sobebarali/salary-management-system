import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@salary-management-system/ui/components/card";

export function StatCard({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="font-normal text-muted-foreground text-xs">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent
        className="font-semibold text-lg tabular-nums"
        data-testid={testId}
      >
        {value}
      </CardContent>
    </Card>
  );
}
