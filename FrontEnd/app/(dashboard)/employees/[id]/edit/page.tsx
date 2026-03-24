import EmployeeDetail from "@/components/employee-detail";

interface EmployeeEditPageProps {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
}

export default async function EmployeeEditPage({
  params,
}: EmployeeEditPageProps) {
  const resolvedParams =
    typeof (params as Promise<{ id: string }>).then === "function"
      ? await (params as Promise<{ id: string }>)
      : (params as { id: string });
  const { id } = resolvedParams;
  return <EmployeeDetail employeeId={id} isEditMode={true} />;
}
