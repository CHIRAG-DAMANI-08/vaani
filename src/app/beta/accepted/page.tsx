import { Suspense } from "react";
import BetaAcceptedClient from "./BetaAcceptedClient";

export default function BetaAcceptedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
      <BetaAcceptedClient />
    </Suspense>
  );
}