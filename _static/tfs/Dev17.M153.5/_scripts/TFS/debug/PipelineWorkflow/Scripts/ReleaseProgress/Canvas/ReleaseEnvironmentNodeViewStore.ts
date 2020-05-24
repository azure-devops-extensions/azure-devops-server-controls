import * as Q from "q";

import { IStoreState, StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { ComputedDeploymentStatus } from "PipelineWorkflow/Scripts/Common/Types";
import { ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseEnvironmentHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentHelper";
import { ReleaseEnvironmentStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";
import { IDeploymentIssues, IIssuesCount, IReleaseEnvironmentStatusInfo } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ReleaseEnvironmentIssuesHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseEnvironmentIssuesHelper";

import { EnvironmentStatus, ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";

import * as StringUtils from "VSS/Utils/String";

export interface IReleaseEnvironmentNodeViewState extends IStoreState {

    id: number;

    definitionEnvironmentId: number;

    name: string;

    statusInfo: IReleaseEnvironmentStatusInfo;

    releaseDefinitionFolderPath?: string;

    releaseDefinitionId?: number;

    environmentStatus?: EnvironmentStatus;

    isPreDeploymentActionVisible?: boolean;


    isPostDeploymentActionVisible?: boolean;

    areTasksValid?: boolean;

    deploymentIssues?: IDeploymentIssues;

    issuesCount?: IIssuesCount;

    showArtifactConditionsNotMetMessage?: boolean;
}

export class ReleaseEnvironmentNodeViewStore extends StoreBase {

    public static getKey(): string {
        return ReleaseProgressStoreKeys.ReleaseEnvironmentNodeViewStore;
    }

    public initialize(instanceId: string): void {
        this._releaseEnvironmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, instanceId);
        this._releaseEnvironmentStore.addChangedListener(this._onDataStoreChanged);
        this._onDataStoreChanged();
    }

    protected disposeInternal(): void {
        this._releaseEnvironmentStore.removeChangedListener(this._onDataStoreChanged);
    }

    public getState(): IReleaseEnvironmentNodeViewState {
        return this._state;
    }

    public getEnvironment(): ReleaseEnvironment {
        let releaseEnvironment = this._releaseEnvironmentStore.getEnvironment();
        return releaseEnvironment;
    }

    public getLatestDeploymentAttemptId(): number {
        return this._releaseEnvironmentStore.getLatestDeploymentAttemptId();
    }

    public getStatus(): ComputedDeploymentStatus {
        return this._state.statusInfo.status;
    }

    public getIsPreDeploymentActionVisible(): boolean {
        return this._state.isPreDeploymentActionVisible;
    }

    public getIsPostDeploymentActionVisible(): boolean {
        return this._state.isPostDeploymentActionVisible;
    }

    private _onDataStoreChanged = (): void => {
        const releaseEnvironment = this._releaseEnvironmentStore.getEnvironment();
        const releaseEnvironmentHelper = new ReleaseEnvironmentHelper(releaseEnvironment);
        const statusInfo = this._releaseEnvironmentStore.getStatusInfo();
        const showArtifactConditionsNotMetMessage: boolean = releaseEnvironmentHelper.getArtifactConditionsNotMetStatus();
        const deploymentIssues: IDeploymentIssues = releaseEnvironmentHelper.getIssues();

        if (!this._state ||
            this._hasStateChanged(releaseEnvironment, statusInfo, showArtifactConditionsNotMetMessage, deploymentIssues)) {

            this._state = {
                id: releaseEnvironment.id,
                definitionEnvironmentId: releaseEnvironment.definitionEnvironmentId,
                name: releaseEnvironment.name,
                statusInfo: statusInfo,
                releaseDefinitionFolderPath: releaseEnvironment.releaseDefinition.path,
                releaseDefinitionId: releaseEnvironment.releaseDefinition.id,
                environmentStatus: releaseEnvironment.status,
                isPreDeploymentActionVisible: false,
                isPostDeploymentActionVisible: false,
                areTasksValid: this._releaseEnvironmentStore.isEnvironmentWorkflowValid(),
                deploymentIssues: deploymentIssues,
                issuesCount: this._getIssues(deploymentIssues, statusInfo.status),
                showArtifactConditionsNotMetMessage: showArtifactConditionsNotMetMessage
            };

            this._updateApprovalsVisibility(statusInfo.isPreDeploymentActionable, statusInfo.isPostDeploymentActionable);
            this.emitChanged();
        }
    }

    private _updateApprovalsVisibility(isPreDeploymentActionablePromise: IPromise<boolean>, isPostDeploymentActionablePromise: IPromise<boolean>) {
        isPreDeploymentActionablePromise = isPreDeploymentActionablePromise || Q(this._state.isPreDeploymentActionVisible) as IPromise<boolean>;
        isPostDeploymentActionablePromise = isPostDeploymentActionablePromise || Q(this._state.isPostDeploymentActionVisible) as IPromise<boolean>;
        Q.spread([isPreDeploymentActionablePromise, isPostDeploymentActionablePromise],
            (isPreDeploymentActionable: boolean, isPostDeploymentActionable: boolean) => {
                if (this._state.isPreDeploymentActionVisible === isPreDeploymentActionable && this._state.isPostDeploymentActionVisible === isPostDeploymentActionable){
                    return;
                }
                this._state.isPreDeploymentActionVisible = isPreDeploymentActionable;
                this._state.isPostDeploymentActionVisible = isPostDeploymentActionable;
                this.emitChanged();
            });
    }

    private _hasStateChanged(releaseEnvironment: ReleaseEnvironment, statusInfo: IReleaseEnvironmentStatusInfo,
        showArtifactConditionsNotMetMessage: boolean, deploymentIssues: IDeploymentIssues): boolean {
        const issuesCount = this._getIssues(deploymentIssues, statusInfo.status);
        if (this._state.id !== releaseEnvironment.id ||
            this._state.definitionEnvironmentId !== releaseEnvironment.definitionEnvironmentId ||
            this._state.name !== releaseEnvironment.name ||
            !ReleaseEnvironmentHelper.areStatusEqual(this._state.statusInfo, statusInfo) ||
            this._state.areTasksValid !== this._releaseEnvironmentStore.isEnvironmentWorkflowValid() ||
            this._state.issuesCount.errorsCount !== issuesCount.errorsCount ||
            this._state.issuesCount.warningsCount !== issuesCount.warningsCount ||
            this._state.showArtifactConditionsNotMetMessage !== showArtifactConditionsNotMetMessage) {
            return true;
        }

        return false;
    }

    private _getIssues(deploymentIssues: IDeploymentIssues, status: ComputedDeploymentStatus): IIssuesCount {
        if (deploymentIssues && ReleaseEnvironmentIssuesHelper.showIssues(status)) {
            const issuesCount = ReleaseEnvironmentIssuesHelper.combineIssuesCount(deploymentIssues.phaseLevelIssues.completedPhaseIssues,
                deploymentIssues.phaseLevelIssues.inProgressPhaseIssues,
                deploymentIssues.deploymentLevelIssues);

            return issuesCount;
        }

        return ReleaseEnvironmentIssuesHelper.getEmptyIssues();
    }

    private _releaseEnvironmentStore: ReleaseEnvironmentStore;
    private _state: IReleaseEnvironmentNodeViewState;
    private static readonly _enhanceFormat: string = "<strong>{0}</strong>";
}