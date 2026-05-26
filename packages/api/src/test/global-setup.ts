import setupDb from "@salary-management-system/db/test/global-setup";

export default function setup(): Promise<void> {
  return setupDb();
}
