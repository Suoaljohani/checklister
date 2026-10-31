import { Suspense } from "react";
import { DepartmentView } from "./department-view";

export default function Page() {
  return (
    <Suspense>
      <DepartmentView />
    </Suspense>
  );
}
