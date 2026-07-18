import { startAssessmentAction } from "./actions";
import { AssessmentStartPage } from "@/components/product/assessment-funnel";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AssessmentPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return <AssessmentStartPage startAction={startAssessmentAction} error={firstParam(params.error)} />;
}
