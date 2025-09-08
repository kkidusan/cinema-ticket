import { Suspense } from "react";
import CinemaSeatArrangementClient from "./CinemaSeatClient";

export default function CinemaSeatArrangementPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CinemaSeatArrangementClient />
    </Suspense>
  );
}