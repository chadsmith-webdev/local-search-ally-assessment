import { AssessmentRenderer } from "@/components/rendering/AssessmentRenderer";
import { sampleAssessmentResult } from "@/fixtures/assessment-results";
import { standardAssessmentOpenUI } from "@/openui/examples";

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <AssessmentRenderer response={standardAssessmentOpenUI} result={sampleAssessmentResult} />
    </main>
  );
}
