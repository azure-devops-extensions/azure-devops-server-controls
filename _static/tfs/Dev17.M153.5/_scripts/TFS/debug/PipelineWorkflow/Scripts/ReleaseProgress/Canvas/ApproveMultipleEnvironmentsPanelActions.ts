import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { IReleaseApprovalsData, IReleaseApprovalItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentApprovalTypes";
import { ReleaseProgressActionKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { IEnvironmentAgentPhaseWarningData } from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentUtils";
import { ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";
import { ServiceEndpoint } from "TFS/DistributedTask/Contracts";

export enum IEnvironmentApproveProgressState {
    Initial,
    InProgress,
    Error
}

export interface IApprovableEnvironments {
    preApprovableEnvironments: ReleaseEnvironment[];
    postApprovableEnvironments: ReleaseEnvironment[];
}

export interface IEnvironmentSkeleton {
    id: number;
    name: string;
}

export interface IDetailedReleaseApprovalData {
    approvalData: IReleaseApprovalsData;
    isPreDeploy: boolean;
}

export interface IApprovalDataForList {
    currentlyApproving: IReleaseApprovalItem[];
    alreadyApproved: IReleaseApprovalItem[];
    pendingApprovals: IReleaseApprovalItem[];
    isDeferred: boolean;
    deferApprovalMessage: string;
}

export class ApproveMultipleEnvironmentsPanelActions extends ActionBase.ActionsHubBase {
    public static readonly SOURCE_KEY = "multiple-environment-approval";
    public static getKey(): string {
        return ReleaseProgressActionKeys.ApprovalMultipleEnvironmentsPanel;
    }

    public initialize(instanceId: string): void {
        this._updateReleaseToCompare = new ActionBase.Action<IDictionaryNumberTo<IDetailedReleaseApprovalData>>();
        this._updateDemands = new ActionBase.Action<IEnvironmentAgentPhaseWarningData[]>();
        this._updateErrorInApproval = new ActionBase.Action<string>();
        this._updateApprovalState = new ActionBase.Action<IEnvironmentApproveProgressState>();
        this._updateApprovableEnvironments = new ActionBase.Action<IEnvironmentSkeleton[]>();
        this._updateErrorInFetchingApprovals = new ActionBase.Action<boolean>();
        this._updateDeferDeploymentEnabled = new ActionBase.Action<boolean>();
        this._updatedeploymentDeferredTiming = new ActionBase.Action<Date>();
        this._updateSelectedEnvironments = new ActionBase.Action<number[]>();
    }

    public get updateApprovalData(): ActionBase.Action<IDictionaryNumberTo<IDetailedReleaseApprovalData>> {
        return this._updateReleaseToCompare;
    }

    public get updateDemands(): ActionBase.Action<IEnvironmentAgentPhaseWarningData[]> {
        return this._updateDemands;
    }

    public get updateApprovalState(): ActionBase.Action<IEnvironmentApproveProgressState> {
        return this._updateApprovalState;
    }

    public get updateErrorInApproval(): ActionBase.Action<string> {
        return this._updateErrorInApproval;
    }

    public get updateApprovableEnvironments(): ActionBase.Action<IEnvironmentSkeleton[]> {
        return this._updateApprovableEnvironments;
    }

    public get updateErrorInFetchingApprovals(): ActionBase.Action<boolean> {
        return this._updateErrorInFetchingApprovals;
    }

    public get updateDeferDeploymentEnabled(): ActionBase.Action<boolean> {
        return this._updateDeferDeploymentEnabled;
    }

    public get updatedeploymentDeferredTiming(): ActionBase.Action<Date> {
        return this._updatedeploymentDeferredTiming;
    }

    public get updateSelectedEnvironments(): ActionBase.Action<number[]> {
        return this._updateSelectedEnvironments;
    }

    private _updateApprovableEnvironments: ActionBase.Action<IEnvironmentSkeleton[]>;
    private _updateErrorInFetchingApprovals: ActionBase.Action<boolean>;
    private _updateReleaseToCompare: ActionBase.Action<IDictionaryNumberTo<IDetailedReleaseApprovalData>>;
    private _updateDemands: ActionBase.Action<IEnvironmentAgentPhaseWarningData[]>;
    private _updateApprovalState: ActionBase.Action<IEnvironmentApproveProgressState>;
    private _updateErrorInApproval: ActionBase.Action<string>;
    private _updateDeferDeploymentEnabled: ActionBase.Action<boolean>;
    private _updatedeploymentDeferredTiming: ActionBase.Action<Date>;
    private _updateSelectedEnvironments: ActionBase.Action<number[]>;
}