import { highRiskAssessmentResult, sampleAssessmentResult, strongAssessmentResult } from "@/fixtures/assessment-results";
import { composeAssessmentOpenUI } from "./compose";

export const standardAssessmentOpenUI = composeAssessmentOpenUI(sampleAssessmentResult);
export const incompleteAssessmentOpenUI = composeAssessmentOpenUI(highRiskAssessmentResult);
export const strongAssessmentOpenUI = composeAssessmentOpenUI(strongAssessmentResult);
