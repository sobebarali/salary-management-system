import { employeeInput } from "@salary-management-system/api/schemas/employee";
import { Button } from "@salary-management-system/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@salary-management-system/ui/components/dialog";
import { Input } from "@salary-management-system/ui/components/input";
import { Label } from "@salary-management-system/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@salary-management-system/ui/components/select";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { toMajorUnits, toMinorUnits } from "@/lib/money";
import type { Employee, EmploymentType } from "@/lib/types";
import { orpc } from "@/utils/orpc";

const employmentTypeLabels: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
};

type FormValues = ReturnType<typeof defaultValuesFor>;

function buildPayload(value: FormValues) {
  return {
    firstName: value.firstName,
    lastName: value.lastName,
    jobTitle: value.jobTitle,
    countryCode: value.countryCode,
    salary: toMinorUnits(value.salary),
    currency: value.currency,
    department: value.department || undefined,
    email: value.email || undefined,
    employmentType: value.employmentType,
    hireDate: value.hireDate || undefined,
  };
}

const textFields = [
  { name: "firstName", label: "First name", type: "text" },
  { name: "lastName", label: "Last name", type: "text" },
  { name: "jobTitle", label: "Job title", type: "text" },
  {
    name: "countryCode",
    label: "Country (ISO)",
    type: "text",
    placeholder: "DE",
    maxLength: 2,
  },
  {
    name: "salary",
    label: "Salary (major units)",
    type: "number",
    placeholder: "75000",
  },
  {
    name: "currency",
    label: "Currency",
    type: "text",
    placeholder: "USD",
    maxLength: 3,
  },
  { name: "department", label: "Department", type: "text" },
  { name: "email", label: "Email", type: "email" },
  { name: "hireDate", label: "Hire date", type: "date" },
] as const;

function defaultValuesFor(employee?: Employee) {
  return {
    firstName: employee?.firstName ?? "",
    lastName: employee?.lastName ?? "",
    jobTitle: employee?.jobTitle ?? "",
    countryCode: employee?.countryCode ?? "",
    salary: employee ? String(toMajorUnits(employee.salary)) : "",
    currency: employee?.currency ?? "USD",
    department: employee?.department ?? "",
    email: employee?.email ?? "",
    employmentType: (employee?.employmentType ?? "full_time") as EmploymentType,
    hireDate: employee?.hireDate ?? "",
  };
}

export function EmployeeForm({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  employee?: Employee;
}) {
  const queryClient = useQueryClient();

  const onSuccess = (message: string) => {
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: orpc.employees.key() });
    queryClient.invalidateQueries({ queryKey: orpc.insights.key() });
    onOpenChange(false);
  };

  const createMutation = useMutation(
    orpc.employees.create.mutationOptions({
      onSuccess: () => onSuccess("Employee added"),
      onError: (error) => toast.error(error.message),
    })
  );

  const updateMutation = useMutation(
    orpc.employees.update.mutationOptions({
      onSuccess: () => onSuccess("Employee updated"),
      onError: (error) => toast.error(error.message),
    })
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm({
    defaultValues: defaultValuesFor(employee),
    validators: {
      onSubmit: ({ value }) => {
        const result = employeeInput.safeParse(buildPayload(value));
        if (result.success) {
          return;
        }
        const fields: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string" && !fields[key]) {
            fields[key] = issue.message;
          }
        }
        return { fields };
      },
    },
    onSubmit: ({ value }) => {
      const data = employeeInput.parse(buildPayload(value));
      if (employee) {
        updateMutation.mutate({ id: employee.id, ...data });
      } else {
        createMutation.mutate(data);
      }
    },
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {employee ? "Edit employee" : "Add employee"}
          </DialogTitle>
          <DialogDescription>
            Salary is entered in major units (e.g. 75000) and stored in minor
            units.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          {textFields.map((f) => (
            <form.Field key={f.name} name={f.name}>
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>{f.label}</Label>
                  <Input
                    id={field.name}
                    maxLength={"maxLength" in f ? f.maxLength : undefined}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={"placeholder" in f ? f.placeholder : undefined}
                    type={f.type}
                    value={field.state.value as string}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p className="text-destructive text-xs" key={String(error)}>
                      {String(error)}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>
          ))}

          <form.Field name="employmentType">
            {(field) => (
              <div className="space-y-1.5">
                <Label>Employment type</Label>
                <Select
                  items={employmentTypeLabels}
                  onValueChange={(value) =>
                    field.handleChange(value as EmploymentType)
                  }
                  value={field.state.value}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(employmentTypeLabels).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <DialogFooter className="sm:col-span-2">
            <Button
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
