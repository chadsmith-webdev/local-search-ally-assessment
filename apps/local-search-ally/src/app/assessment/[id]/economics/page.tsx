import { StepRoute } from "../StepRoute";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EconomicsPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  return <StepRoute assessmentId={id} step="economics" searchParams={searchParams} />;
}
