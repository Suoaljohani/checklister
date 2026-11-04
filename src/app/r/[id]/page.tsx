import { Suspense } from "react";
import { ReportView } from "./report-view";

export default function Page() {
  return (
    <Suspense>
      <ReportView />
    </Suspense>
  );
}
