import { Suspense } from "react";
import { ChecklistForm } from "./checklist-form";

export default function Page() {
  return (
    <Suspense>
      <ChecklistForm />
    </Suspense>
  );
}
