import { ShallowTestCaseResult, FieldDetailsForTestResults, TestLog} from "TFS/TestManagement/Contracts";

export interface ITestCaseResultsWithContinuationToken {
    results: ShallowTestCaseResult[];
    continuationToken: string;
}

export interface ITestResultsFieldDetailsWithContinuationToken {
	fieldDetails: FieldDetailsForTestResults[];
	continuationToken: string;
}

export interface ITestLogWithContinuationToken {
    results: TestLog[];
    continuationToken: string;
}