import type { AppRouterClient } from "@salary-management-system/api/routers/index";

export type Employee = Awaited<ReturnType<AppRouterClient["employees"]["get"]>>;
export type EmploymentType = Employee["employmentType"];
export type ListInput = Parameters<AppRouterClient["employees"]["list"]>[0];
export type SortOption = NonNullable<ListInput["sort"]>;
