import { GitCodeMetricsData, TfvcCodeMetricsData } from "ProjectOverview/Scripts/Generated/Contracts";

export interface CodeMetricsData {
    gitCodeMetrics: GitCodeMetricsData;
    tfvcCodeMetrics: TfvcCodeMetricsData;
}

export const enum ProjectPermissions {
    None = 0,
    EditBuild = 1,
    EditGitCode = 2,
    EditRelease = 4,
    EditTfvcCode = 8,
    ViewActivityPane = 16,
}

