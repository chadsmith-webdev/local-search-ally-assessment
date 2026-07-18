import { startAssessmentAction } from "./assessment/actions";
import { LandingPage } from "@/components/product/assessment-funnel";

export default function Home() {
  return <LandingPage startAction={startAssessmentAction} />;
}
