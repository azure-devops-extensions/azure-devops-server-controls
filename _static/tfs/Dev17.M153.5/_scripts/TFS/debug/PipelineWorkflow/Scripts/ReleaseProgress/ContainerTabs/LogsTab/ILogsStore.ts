import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";

import { IJobItem, ILicenseInfo, ILogLine, JobSortType } from "DistributedTaskUI/Logs/Logs.Types";

import { IQueueInfo } from "PipelineWorkflow/Scripts/ReleaseProgress/JobRequests/JobRequestsStore";
import { ILogsFilterState } from "PipelineWorkflow/Scripts/ReleaseProgress/Types";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import { TaskAgentJobRequest } from "TFS/DistributedTask/Contracts";

export interface ILogsStore extends StoreBase {
    getLogItems(): IJobItem[];
    getJobToLogsMap(): IDictionaryStringTo<ILogLine[]>;
    getState(): ILogsState;
}

export interface ILogsState {
    logItems: IJobItem[];
    environment: RMContracts.ReleaseEnvironment;
    jobToLogsMap: IDictionaryStringTo<ILogLine[]>;
    currentSelectedItemKey: string;
    selectedAttempt?: number;
    environmentName?: string;
    selectedSortOrder?: JobSortType;
    currentFilterState?: ILogsFilterState;
}