/**
 * @brief Store for Deploy environment
 */

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { FeatureFlag_CDProcessParameters } from "DistributedTaskControls/Common/Common";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { AggregatorDataStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";
import { DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DeployPhaseListStore, IDeployPhaseListStoreArgs } from "DistributedTaskControls/Phase/Stores/DeployPhaseListStore";
import * as DeployPhaseTypes from "DistributedTaskControls/Phase/Types";
import { IProcessManagementStoreArgs, ProcessManagementStore } from "DistributedTaskControls/ProcessManagement/ProcessManagementStore";
import { ProcessManagementCapabilities } from "DistributedTaskControls/ProcessManagement/Types";

import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";

import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import { ArtifactListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListStore";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { IRetentionPolicyStoreArgs, RetentionPolicyStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionPolicyStore";
import { CoreDefinitionStore } from "PipelineWorkflow/Scripts/Editor/Definition/CoreDefinitionStore";
import { ApprovalPoliciesStore } from "PipelineWorkflow/Scripts/Editor/Environment/ApprovalPoliciesStore";
import { EnvironmentAutoRedeployTriggerStore, IAutoRedeployTriggerArgs } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentAutoRedeployTriggerStore";
import { EnvironmentNameStore, IEnvironmentNameStoreArgs } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentNameStore";
import { GatesPhaseStore, IGatesPhaseStorePhase } from "PipelineWorkflow/Scripts/Editor/Environment/GatesPhaseStore";
import { EnvironmentOwnerStore, IEnvironmentOwnerStoreArgs } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentOwnerStore";
import { EnvironmentStoreActionsHub, IUpdateEnvironmentRankPayload } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStoreActionsHub";
import { EnvironmentTriggerStore, IEnvironmentTriggerStoreArgs } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerStore";
import { IPostDeploymentApprovalStoreArgs, PostDeploymentApprovalStore } from "PipelineWorkflow/Scripts/Editor/Environment/PostDeploymentApprovalStore";
import { PostDeploymentGatesStore } from "PipelineWorkflow/Scripts/Editor/Environment/PostDeploymentGatesStore";
import { IPreDeploymentApprovalStoreArgs, PreDeploymentApprovalStore } from "PipelineWorkflow/Scripts/Editor/Environment/PreDeploymentApprovalStore";
import { PreDeploymentGatesStore } from "PipelineWorkflow/Scripts/Editor/Environment/PreDeploymentGatesStore";
import { IQueueSettingsStoreArgs, QueueSettingsStore } from "PipelineWorkflow/Scripts/Editor/Environment/QueueSettingsStore";
import { IPayloadUpdateGates as IGatesStoreArgs } from "PipelineWorkflow/Scripts/Editor/Environment/Types";
import { TaskTabActions } from "PipelineWorkflow/Scripts/Shared/ContainerTabs/TaskTab/TaskTabActions";
import { IEnvironmentApprovalPoliciesStoreArgs } from "PipelineWorkflow/Scripts/Shared/Environment/EnvironmentApprovalPoliciesStore";
import { EnvironmentApprovalPoliciesUtils } from "PipelineWorkflow/Scripts/Shared/Environment/EnvironmentApprovalPoliciesUtils";
import { IEnvironmentListModel } from "PipelineWorkflow/Scripts/Shared/EnvironmentList/EnvironmentListModel";
import { ArtifactFetcherSource } from "PipelineWorkflow/Scripts/Shared/Sources/ArtifactFetcherSource";
import { IArtifactPickerOptions } from "PipelineWorkflow/Scripts/Shared/Utils/ArtifactPathPickerUtils";
import { IProcessDataStoreArgs, ProcessDataStore } from "PipelineWorkflow/Scripts/Shared/Process/ProcessDataStore";
import { EnvironmentUtils } from "PipelineWorkflow/Scripts/Shared/Utils/EnvironmentUtils";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");

import { ApprovalExecutionOrder as PipelineApprovalExecutionOrder, EnvironmentTrigger, DeployPhaseTypes as RMDeployPhaseTypes } from "ReleaseManagement/Core/Contracts";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { ReleaseDeployPhaseHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseDeployPhaseHelper";
import { ReleaseEnvironmentPropertiesContributionsActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPropertiesContributionsActions";

export interface IDeployEnvironmentStoreArgs {
    environment: PipelineTypes.PipelineDefinitionEnvironment;
    environmentListModel: IEnvironmentListModel<PipelineTypes.PipelineDefinitionEnvironment>;
    isTemporary: boolean;
}

/**
 * @brief React store to contain information of Pipeline environment 
 */
export class DeployEnvironmentStore extends AggregatorDataStoreBase {

    constructor(args: IDeployEnvironmentStoreArgs) {
        super();
        this._environment = args.environment;
        this._environmentListModel = args.environmentListModel;
        this._isTemporary = args.isTemporary;
        this._actions = ActionsHubManager.GetActionsHub<TaskTabActions>(TaskTabActions);
        this._currentRank = this._originalRank = this._environment ? this._environment.rank : 0;
        this._currentIsPullRequestDeploymentEnabled = this._originalIsPullRequestDeploymentEnabled = this._environment.environmentOptions ? !!this._environment.environmentOptions.pullRequestDeploymentEnabled : false;
    }

    /**
     * @brief Returns store key
     */
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineEnvironmentStoreKey;
    }

    /**
     * @brief Initializes the store object
     */
    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._environmentStoreActionsHub = ActionsHubManager.GetActionsHub<EnvironmentStoreActionsHub>(EnvironmentStoreActionsHub, instanceId);

        // initialize the process management store
        StoreManager.CreateStore<ProcessManagementStore, IProcessManagementStoreArgs>(ProcessManagementStore, this.getInstanceId(),
            {
                processManagementCapabilities: ProcessManagementCapabilities.All
            } as IProcessManagementStoreArgs
        );

        // Add Deploy phase store
        // convert tasks from WorkflowTask to ITask
        let deployPhases = EnvironmentUtils.getDeployPhases(this._environment.deployPhases);

        let taskDelegates = {
            filePathPickerDelegate: this._artifactPathPickerDelegate.bind(this),
            fileContentProviderDelegate: this._artifactContentFetcherDelegate.bind(this)
        };

        this.addToStoreList(this._processDataStore = StoreManager.CreateStore<ProcessDataStore, IProcessDataStoreArgs>(ProcessDataStore,
            this.getInstanceId(),
            {
                processParameters: this._environment.processParameters,
                taskDelegates: taskDelegates,
                phaseList: deployPhases
            }
        ));

        let phaseDefinitions: DeployPhaseTypes.IPhaseDefinition[] = EnvironmentUtils.getPhaseDefinitions();

        let isSelectiveArtifactsFeatureEnabled = FeatureFlagUtils.isBuildArtifactTasksEnabled();
       
        this.addToStoreList(this._phaseListStore = StoreManager.CreateStore<DeployPhaseListStore, IDeployPhaseListStoreArgs>(DeployPhaseListStore,
            this.getInstanceId(),
            {
                phaseList: deployPhases,
                itemSelectionInstanceId: this.getInstanceId(),
                taskDelegates: taskDelegates,
                addTaskVisibilityFilter: [],
                defaultItems: [],
                processParametersNotSupported: !(FeatureAvailabilityService.isFeatureEnabled(FeatureFlag_CDProcessParameters, false)),
                allowInheritAgentQueues: false,
                hideSkipArtifactDownload: isSelectiveArtifactsFeatureEnabled,
                phaseDefinitions: isSelectiveArtifactsFeatureEnabled ? phaseDefinitions : null,
                minimumPhaseCount: 1,
                createPhaseStoreDelegateMap: ReleaseDeployPhaseHelper.getCreatePhaseStoreDelegateMap(),
                getDefaultDeployPhase: ReleaseDeployPhaseHelper.getDefaultDeployPhase
            }));

        // Approval store should be added prior to policies store
        // Add Pre deployment store
        this.addToStoreList(this._preDeploymentApprovalStore = StoreManager.CreateStore<PreDeploymentApprovalStore, IPreDeploymentApprovalStoreArgs>(
            PreDeploymentApprovalStore,
            this.getInstanceId(),
            { approvals: this._environment.preDeployApprovals }));

        // Add Post deployment store
        this.addToStoreList(this._postDeploymentApprovalStore = StoreManager.CreateStore<PostDeploymentApprovalStore, IPostDeploymentApprovalStoreArgs>(
            PostDeploymentApprovalStore,
            this.getInstanceId(),
            { approvals: this._environment.postDeployApprovals }));

        // Add environment policy store
        this.addToStoreList(this._approvalPoliciesStore = StoreManager.CreateStore<ApprovalPoliciesStore, IEnvironmentApprovalPoliciesStoreArgs>(
            ApprovalPoliciesStore,
            this.getInstanceId(),
            EnvironmentApprovalPoliciesUtils.getEnvironmentApprovalPoliciesArgs(this._environment.preDeployApprovals, this._environment.postDeployApprovals)
        ));

        // Add environment triggers
        this.addToStoreList(this._environmentTriggerStore = StoreManager.CreateStore<EnvironmentTriggerStore, IEnvironmentTriggerStoreArgs>(
            EnvironmentTriggerStore,
            this.getInstanceId(),
            {
                environmentTriggerConditions: this._environment.conditions,
                environmentTriggerSchedules: this._environment.schedules,
                environmentListModel: this._environmentListModel
            }));

        // Add environment name store
        this.addToStoreList(this._environmentNameStore = StoreManager.CreateStore<EnvironmentNameStore, IEnvironmentNameStoreArgs>(
            EnvironmentNameStore,
            this.getInstanceId(),
            {
                environmentName: this._environment.name,
                environmentListModel: this._environmentListModel
            }));

        // Add environment settings store
        this.addToStoreList(this._environmentOwnerStore = StoreManager.CreateStore<EnvironmentOwnerStore, IEnvironmentOwnerStoreArgs>(EnvironmentOwnerStore,
            this.getInstanceId(),
            {
                environmentOwner: this._environment.owner
            }));

        // Add queue settings store
        this.addToStoreList(this._queueSettingsStore = StoreManager.CreateStore<QueueSettingsStore, IQueueSettingsStoreArgs>(
            QueueSettingsStore,
            this.getInstanceId(),
            {
                executionPolicy: this._environment.executionPolicy
            }));

        // add gates [green-lighting] store for pre-deployment
        const preApprovalOptions: PipelineTypes.PipelineEnvironmentApprovalOptions = this._environment.preDeployApprovals.approvalOptions;
        const postApprovalOptions: PipelineTypes.PipelineEnvironmentApprovalOptions = this._environment.postDeployApprovals.approvalOptions;
        const preApprovalExecutionOrder: PipelineApprovalExecutionOrder = preApprovalOptions && !!preApprovalOptions.executionOrder
            ? preApprovalOptions.executionOrder : PipelineApprovalExecutionOrder.BeforeGates;
        this.addToStoreList(this._preDeploymentGatesStore = StoreManager.CreateStore<PreDeploymentGatesStore, IGatesStoreArgs>(
            PreDeploymentGatesStore,
            this.getInstanceId(),
            {
                gatesStep: this._environment.preDeploymentGates || {} as PipelineTypes.PipelineEnvironmentGatesStep,
                approvalExecutionOrder: preApprovalExecutionOrder
            } as IGatesStoreArgs));

        // add gates [green-lighting] store for post-deployment
        const postApprovalExecutionOrder: PipelineApprovalExecutionOrder = postApprovalOptions && !!postApprovalOptions.executionOrder
            ? postApprovalOptions.executionOrder : PipelineApprovalExecutionOrder.AfterSuccessfulGates;
        this.addToStoreList(this._postDeploymentGatesStore = StoreManager.CreateStore<PostDeploymentGatesStore, IGatesStoreArgs>(
            PostDeploymentGatesStore,
            this.getInstanceId(),
            {
                gatesStep: this._environment.postDeploymentGates || {} as PipelineTypes.PipelineEnvironmentGatesStep,
                approvalExecutionOrder: postApprovalExecutionOrder
            } as IGatesStoreArgs));

        // Add retention policy store
        this.addToStoreList(this._retentionPolicyStore = StoreManager.CreateStore<RetentionPolicyStore, IRetentionPolicyStoreArgs>(
            RetentionPolicyStore,
            this.getInstanceId(),
            {
                retentionPolicy: this._environment.retentionPolicy
            }));

        // Add auto redeploy trigger store
        this.addToStoreList(this._autoRedeployTriggerStore = StoreManager.CreateStore<EnvironmentAutoRedeployTriggerStore, IAutoRedeployTriggerArgs>(
        EnvironmentAutoRedeployTriggerStore,
        this.getInstanceId(),
        {
            triggers: this._environment.environmentTriggers           
        } as IAutoRedeployTriggerArgs));

        this._actions.updateArtifactPathPickerVisibility.addListener(this._updateArtifactPathPickerVisibility);
        this._environmentStoreActionsHub.updateEnvironment.addListener(this._updateEnvironment);
        this._environmentStoreActionsHub.markEnvironmentAsPermanent.addListener(this._markEnvironmentAsPermanent);
        this._environmentStoreActionsHub.markEnvironmentAsDeleting.addListener(this._markEnvironmentAsDeleting);
        this._environmentStoreActionsHub.updateRank.addListener(this._handleUpdateRank);
        this._environmentStoreActionsHub.togglePullRequestDeployment.addListener(this._handlePullRequestDeploymentToggled);
    }

    public disposeInternal(): void {
        this._actions.updateArtifactPathPickerVisibility.removeListener(this._updateArtifactPathPickerVisibility);
        this._environmentStoreActionsHub.updateEnvironment.removeListener(this._updateEnvironment);
        this._environmentStoreActionsHub.markEnvironmentAsPermanent.removeListener(this._markEnvironmentAsPermanent);
        this._environmentStoreActionsHub.markEnvironmentAsDeleting.removeListener(this._markEnvironmentAsDeleting);
        this._environmentStoreActionsHub.updateRank.removeListener(this._handleUpdateRank);
        this._environmentStoreActionsHub.togglePullRequestDeployment.removeListener(this._handlePullRequestDeploymentToggled);
        super.disposeInternal();
    }

    public haveTriggersChanged(): boolean {
        return this._environmentTriggerStore && this._environmentTriggerStore.haveTriggerConditionsChanged();
    }

    public hasRankChanged(): boolean {
        return this._currentRank !== this._originalRank;
    }

    public updateVisitor(visitor: PipelineTypes.PipelineDefinitionEnvironment): void {

        // Update the definition from all the children stores.
        this.getDataStoreList().forEach((store: DataStoreBase) => {
            store.updateVisitor(this._environment);
        });

        // To handle the case of user deleting an artifact without opening phase properties (extension wouldn't load)
        let artifactListStore: ArtifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore);
        let artifactList: PipelineTypes.PipelineArtifact[] = artifactListStore.getArtifactList();

        // convert tasks from ITask to WorkflowTask
        let deployPhaseList: DeployPhaseTypes.IPhaseListContainer = { deployPhases: [] };
        this._phaseListStore.updateVisitor(deployPhaseList);
        let deployPhases: PipelineTypes.PipelineDeployPhase[] = EnvironmentUtils.getWorkflowTasksAndDeploymentInputs(deployPhaseList, artifactList);

        this._environment.deployPhases = deployPhases;
        this._environment.rank = this._currentRank;

        if (!this._isEnvironmentManualOnly()) {
            this._environment.environmentOptions.pullRequestDeploymentEnabled = this._currentIsPullRequestDeploymentEnabled;
        }
        else
        {
            this._environment.environmentOptions.pullRequestDeploymentEnabled = false;
        }

        // Section where we will update data that is at environment store level.
        // TODO
        JQueryWrapper.extendDeep(visitor, this._environment);
    }

    public isDirty(): boolean {
        return (this._currentRank !== this._originalRank
            || (this._currentIsPullRequestDeploymentEnabled !== this._originalIsPullRequestDeploymentEnabled && !this._isEnvironmentManualOnly())
            || super.isDirty());
    }

    /**
     * Removes temporary flag
     */
    private _markEnvironmentAsPermanent = () => {
        this._isTemporary = false;
        this.emitChanged();
    }

    private _markEnvironmentAsDeleting = () => {
        this._isDeleting = true;
        this.emitChanged();
    }

    private _updateEnvironment = (environment: PipelineTypes.PipelineDefinitionEnvironment) => {
        this._originalRank = this._currentRank = environment ? environment.rank : 0;
        this._originalIsPullRequestDeploymentEnabled = this._currentIsPullRequestDeploymentEnabled =
            environment.environmentOptions ? !!environment.environmentOptions.pullRequestDeploymentEnabled : false;
        this._environment = JQueryWrapper.extendDeep({}, environment);
    }

    private _handleUpdateRank = (payload: IUpdateEnvironmentRankPayload) => {
        this._currentRank = payload.rank;
        if (payload.forceRefresh) {
            this.emitChanged();
        }
    }

    private _handlePullRequestDeploymentToggled = (value: boolean) => {
        this._currentIsPullRequestDeploymentEnabled = value;
        this.emitChanged();
    }

    public getRetentionPolicyStore(): RetentionPolicyStore {
        return this._retentionPolicyStore;
    }

    public getPhaseListStore(): DeployPhaseListStore {
        return this._phaseListStore;
    }

    public getEnvironmentNameStore(): EnvironmentNameStore {
        return this._environmentNameStore;
    }

    public getEnvironmentName(): string {
        return this._environment.name;
    }

    public getEnvironmentId(): number {
        return this._environment.id;
    }

    public getEnvironmentAutoLinkWorkItemsOption(): boolean {
        return this._environment.environmentOptions ? !!this._environment.environmentOptions.autoLinkWorkItems : false;
    }

    public isPullRequestDeploymentEnabled(): boolean {
        return this._currentIsPullRequestDeploymentEnabled;
    }

    public getEnvironmentRank(): number {
        return this._currentRank;
    }

    public isEnvironmentSetToDeletion(): boolean {
        return this._isDeleting;
    }

    public getCurrentState(): PipelineTypes.PipelineDefinitionEnvironment {
        let environment: PipelineTypes.PipelineDefinitionEnvironment = <PipelineTypes.PipelineDefinitionEnvironment>{};
        this.updateVisitor(environment);
        return environment;
    }

    public isTemporary(): boolean {
        return this._isTemporary;
    }

    public getArtifactPickerOptions(): IArtifactPickerOptions {
        return this._artifactPickerOptions;
    }

    public isEnvironmentWorkflowValid(): boolean {
        return this._phaseListStore.isValid() && this._processDataStore.isValid();
    }

    private _updateArtifactPathPickerVisibility = (isVisible: boolean): void => {
        if (this._artifactPickerOptions) {
            this._artifactPickerOptions.showArtifactPicker = isVisible;
        }
        this.emitChanged();
    }

    public getPreDeploymentApprovalStore(): PreDeploymentApprovalStore {
        return this._preDeploymentApprovalStore;
    }

    public getPostDeploymentApprovalStore(): PostDeploymentApprovalStore {
        return this._postDeploymentApprovalStore;
    }

    private _isEnvironmentManualOnly(): boolean {
        return !this._environment.conditions || !!!RMUtilsCore.ArrayHelper.hasItems(this._environment.conditions);
    }

    private _artifactPathPickerDelegate(initialValue: string, callback: (selectedValue: ISelectedPathNode) => void) {
        let artifactListStore: ArtifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore);
        let artifactList: PipelineTypes.PipelineArtifact[] = artifactListStore.getArtifactList();
        this._artifactPickerOptions = {
            showArtifactPicker: true,
            artifacts: artifactList,
            initialValue: initialValue,
            callback: callback
        };
        this.emitChanged();
    }

    private _artifactContentFetcherDelegate(filePath: string, callback: (content: any) => void, errorCallback: (error: any) => void): void {
        let artifactListStore: ArtifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore);
        let artifactList: PipelineTypes.PipelineArtifact[] = artifactListStore.getArtifactList();
        ArtifactFetcherSource.getFileContents(filePath, artifactList)
            .then((result) => {
                if ($.isFunction(callback)) {
                    callback(result);
                }
            },
            (error) => {
                if ($.isFunction(errorCallback)) {
                    errorCallback(error);
                }
            });
    }

    private _phaseListStore: DeployPhaseListStore;
    private _preDeploymentApprovalStore: PreDeploymentApprovalStore;
    private _processDataStore: ProcessDataStore;
    private _postDeploymentApprovalStore: PostDeploymentApprovalStore;
    private _approvalPoliciesStore: ApprovalPoliciesStore;
    private _environmentTriggerStore: EnvironmentTriggerStore;
    private _preDeploymentGatesStore: PreDeploymentGatesStore;
    private _postDeploymentGatesStore: PostDeploymentGatesStore;
    private _environmentOwnerStore: EnvironmentOwnerStore;
    private _environmentNameStore: EnvironmentNameStore;
    private _queueSettingsStore: QueueSettingsStore;
    private _retentionPolicyStore: RetentionPolicyStore;
    private _autoRedeployTriggerStore: EnvironmentAutoRedeployTriggerStore;
    private _artifactPickerOptions: IArtifactPickerOptions;
    private _actions: TaskTabActions;
    private _environmentStoreActionsHub: EnvironmentStoreActionsHub;
    private _isDeleting: boolean = false;

    private _environment: PipelineTypes.PipelineDefinitionEnvironment;
    private _environmentListModel: IEnvironmentListModel<PipelineTypes.PipelineDefinitionEnvironment>;
    private _isTemporary: boolean;

    private _originalRank: number;
    private _currentRank: number;

    private _originalIsPullRequestDeploymentEnabled: boolean;
    private _currentIsPullRequestDeploymentEnabled: boolean;
}