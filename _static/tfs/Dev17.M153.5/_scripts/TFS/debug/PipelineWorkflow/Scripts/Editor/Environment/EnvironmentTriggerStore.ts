// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DataStoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import * as Common from "DistributedTaskControls/Common/Common";
import { IScheduleTriggerOptions } from "DistributedTaskControls/Common/Types";
import { INodeData } from "DistributedTaskControls/Components/Canvas/Types";
import { GraphLayoutHelper } from "DistributedTaskControls/Components/Canvas/GraphLayoutHelper";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { AggregatorDataStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { DeployPipelineStoreKeys, EnvironmentTriggerStoreChangedEvents, EnvironmentTriggerConditionsType } from "PipelineWorkflow/Scripts/Editor/Constants";
import * as Types from "PipelineWorkflow/Scripts/Common/Types";
import {
    EnvironmentTriggerActionsHub, IEnvironmentTriggerSelectionPayload, IPostEnvironmentDeploymentTriggerPayload, IUpdateEnvironmentTriggerPayload, IUpdatePostEnvironmentTriggerPayload,
    IBranchPayload, ITagsPayload, IArtifactAliasPayload, IEnvironmentPayload
} from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerActionsHub";
import { EnvironmentTriggerComparer } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerComparer";
import { EnvironmentUtils } from "PipelineWorkflow/Scripts/Shared/Utils/EnvironmentUtils";
import { IEnvironmentListModel } from "PipelineWorkflow/Scripts/Shared/EnvironmentList/EnvironmentListModel";
import { ScheduleUtils } from "PipelineWorkflow/Scripts/Editor/Common/ScheduleUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { EnvironmentArtifactTriggerStore, IEnvironmentArtifactTriggerStoreArgs } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentArtifactTriggerStore";

import * as Diag from "VSS/Diag";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export interface IEnvironmentTriggerState extends IStoreState {
    environmentTriggerConditions: Types.IEnvironmentTriggerCondition[];
    artifactTriggerConditions: Types.IEnvironmentTriggerCondition[];
    environmentTriggerSchedules: Types.PipelineReleaseSchedule[];
    selectedTabItemKey: string;
    isScheduleEnabled?: boolean;
}

export class EnvironmentTriggerTabKeys {
    public static PostReleaseTriggerKey: string = "post-release-trigger";
    public static PostEnvironmentDeploymentTriggerKey: string = "post-environment-deployment-trigger";
    public static ManualTriggerKey: string = "manual-trigger";
}

export interface IEnvironmentTriggerStoreArgs {
    environmentTriggerConditions: Types.PipelineEnvironmentTriggerCondition[];
    environmentTriggerSchedules: Types.PipelineReleaseSchedule[];
    environmentListModel: IEnvironmentListModel<Types.PipelineDefinitionEnvironment>;
}

/**
 * Store to contain trigger condition associated with environment
 */
// tslint:disable-next-line:max-classes-per-file
export class EnvironmentTriggerStore extends AggregatorDataStoreBase {

    constructor(args: IEnvironmentTriggerStoreArgs) {
        super();
        this._environmentListModel = args.environmentListModel;
        this._setInitialStates(args.environmentTriggerConditions, args.environmentTriggerSchedules);
    }

    /**
     * Returns store key
     */
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineEnvironmentTriggerStoreKey;
    }

    /**
     *  Get the environment id
     */
    public getEnvironmentId(): number {
        return this._environmentListModel.getEnvironmentIdFromInstanceId(this.getInstanceId());
    }

    /**
     * Initializes actions listeners for Environment Trigger
     */
    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this.addToStoreList(this._environmentArtifactTriggerStore = StoreManager.CreateStore<EnvironmentArtifactTriggerStore, IEnvironmentArtifactTriggerStoreArgs>(
            EnvironmentArtifactTriggerStore,
            this.getInstanceId(),
            {
                artifactTriggerConditions: this._artifactConditions
            }
        ));
        this._actions = ActionsHubManager.GetActionsHub<EnvironmentTriggerActionsHub>(EnvironmentTriggerActionsHub, instanceId);
        this._actions.selectEnvironmentTriggerTab.addListener(this._handleSelectEnvironmentTrigger);
        this._actions.updateEnvironmentTriggerCondition.addListener(this._handleUpdateEnvironmentTriggerCondition);
        this._actions.updatePartiallySucceededCondition.addListener(this._handleUpdatePartiallySucceededCondition);
        this._actions.updateEnvironmentSchedule.addListener(this._handleUpdateSchedule);
        this._actions.updateEnableSchedule.addListener(this._handleUpdateToggleSchedule);
        this._actions.updateEnvironmentName.addListener(this._handleChangedEnvironmentName);
        this._actions.updateEnvironmentTrigger.addListener(this._handleUpdateEnvironmentTrigger);
        this._actions.updatePostEnvironmentTrigger.addListener(this._handleUpdatePostEnvironmentTrigger);
        this._actions.addArtifactCondition.addListener(this._handleAddArtifactCondition);
        this._actions.deleteArtifactCondition.addListener(this._handleDeleteArtifactCondition);
        this._actions.artifactAliasChange.addListener(this._handleArtifactAliasChange);
        this._actions.branchChange.addListener(this._handleBranchChange);
        this._actions.tagsChanged.addListener(this._handleTagsChanged);
    }

    /**
     * Disposing actions listeners for Environment Trigger
     */
    public disposeInternal(): void {
        this._actions.selectEnvironmentTriggerTab.removeListener(this._handleSelectEnvironmentTrigger);
        this._actions.updateEnvironmentTriggerCondition.removeListener(this._handleUpdateEnvironmentTriggerCondition);
        this._actions.updatePartiallySucceededCondition.removeListener(this._handleUpdatePartiallySucceededCondition);
        this._actions.updateEnvironmentSchedule.removeListener(this._handleUpdateSchedule);
        this._actions.updateEnableSchedule.removeListener(this._handleUpdateToggleSchedule);
        this._actions.updateEnvironmentName.removeListener(this._handleChangedEnvironmentName);
        this._actions.updateEnvironmentTrigger.removeListener(this._handleUpdateEnvironmentTrigger);
        this._actions.addArtifactCondition.removeListener(this._handleAddArtifactCondition);
        this._actions.deleteArtifactCondition.removeListener(this._handleDeleteArtifactCondition);
        this._actions.artifactAliasChange.removeListener(this._handleArtifactAliasChange);
        this._actions.branchChange.removeListener(this._handleBranchChange);
        this._actions.tagsChanged.removeListener(this._handleTagsChanged);
    }

    public updateVisitor(environment: Types.PipelineDefinitionEnvironment): void {
        if (!!environment) {
            environment.conditions = JQueryWrapper.extend([], null);
            environment.schedules = JQueryWrapper.extend([], null);

            if (!this._isManualTriggerTabSelected() && this._currentState.isScheduleEnabled) {
                JQueryWrapper.extendDeep(environment.schedules, this._currentState.environmentTriggerSchedules);
            }

            if (!this._isManualTriggerTabSelected()) {
                JQueryWrapper.extendDeep(environment.conditions, this._currentState.environmentTriggerConditions);                
                this._currentState.artifactTriggerConditions.forEach((artifactCondition) => {
                    environment.conditions.push(artifactCondition);
                });
                this._environmentArtifactTriggerStore.updateVisitor(environment);
            }
        }
    }

    /**
     * Check if environment trigger store is dirty or not
     */
    public isDirty(): boolean {
        let isEnvironmentTriggerConditionsDirty: boolean = !(Utils_Array.arrayEquals(this._currentState.environmentTriggerConditions,
            this._originalState.environmentTriggerConditions, EnvironmentTriggerComparer.areConditionsEqual));

        let isEnvironmentTriggerSchedulesDirty: boolean = !this._isManualTriggerTabSelected() && this._isScheduleDirty();

        let isArtifactTriggerConditionsDirty: boolean = !this._isManualTriggerTabSelected() && (!(Utils_Array.arrayEquals(this._currentState.artifactTriggerConditions,
            this._originalState.artifactTriggerConditions, EnvironmentTriggerComparer.areConditionsEqual)) || this._environmentArtifactTriggerStore.isDirty());

        return this._currentState.selectedTabItemKey !== this._originalState.selectedTabItemKey ||
            isEnvironmentTriggerConditionsDirty || isEnvironmentTriggerSchedulesDirty || isArtifactTriggerConditionsDirty;
    }

    public haveTriggerConditionsChanged(): boolean {
        if (this._currentState.selectedTabItemKey !== this._originalState.selectedTabItemKey) {
            return true;
        }

        return !(Utils_Array.arrayEquals(this._currentState.environmentTriggerConditions,
            this._originalState.environmentTriggerConditions, EnvironmentTriggerComparer.areEnvironmentTriggerConditionsEqual));
    }

    /**
     * Check if environment trigger store is valid or not
     */
    public isValid(): boolean {
        let isValid: boolean = true;
        if (!this._isManualTriggerTabSelected()) {
            if (!this._isValidSchedules() || !this._isValidArtifactCondition() ||
                this.getPostDeploymentEnvironmentTriggerErrorMessage() !== Utils_String.empty) {
                isValid = false;
            }
        }

        return isValid && super.isValid();
    }

    public isAutomatedTrigger(): boolean {
        return this._currentState.selectedTabItemKey === EnvironmentTriggerTabKeys.PostEnvironmentDeploymentTriggerKey ||
            this._currentState.selectedTabItemKey === EnvironmentTriggerTabKeys.PostReleaseTriggerKey;
    }

    /**
     * Get the error message for the post deployment environment trigger tab
     */
    public getPostDeploymentEnvironmentTriggerErrorMessage(): string {
        let errorMessage: string = Utils_String.empty;
        if (this._currentState.selectedTabItemKey === EnvironmentTriggerTabKeys.PostEnvironmentDeploymentTriggerKey) {
            if (this._currentState.environmentTriggerConditions && this._currentState.environmentTriggerConditions.length <= 0) {
                errorMessage = Resources.PostEnvironmentDeploymentSelectionErrorMessage;
            }
            else if (this._environmentTriggerCircularDependency) {
                errorMessage = Resources.EnvironmentTriggerCircularDependencyError;
            }
            else {
                errorMessage = Utils_String.empty;
            }
        }

        return errorMessage;
    }

    /**
     * Return the current state of the environment trigger store
     */
    public getState(): IEnvironmentTriggerState {
        return this._currentState;
    }

    /**
     * Get the partially succeeded value for the post environment deployment trigger condition
     */
    public getPartiallySucceededValue(): string {
        return (
            Types.PipelineEnvironmentTriggerConditionEnvironmentStatus.Succeeded |
            Types.PipelineEnvironmentTriggerConditionEnvironmentStatus.PartiallySucceeded
        ).toString();
    }

    private _isScheduleDirty(): boolean {
        if (this._currentState.isScheduleEnabled !== this._originalState.isScheduleEnabled) {
            return true;
        } else if (this._currentState.isScheduleEnabled) {
            return !(ScheduleUtils.areSchedulesArrayEqual(this._currentState.environmentTriggerSchedules,
                this._originalState.environmentTriggerSchedules));
        } else {
            return false;
        }
    }


    private _isManualTriggerTabSelected(): boolean {
        return this._currentState.selectedTabItemKey === EnvironmentTriggerTabKeys.ManualTriggerKey;
    }

    private _isValidSchedules(): boolean {
        let isValid: boolean = true;

        if (this._currentState.isScheduleEnabled) {
            let schedules = this._currentState.environmentTriggerSchedules;
            if (!schedules || schedules.length <= 0) {
                isValid = false;
            } else {
                isValid = !ScheduleUtils.isNoDaySelected(schedules[0]);
            }
        }
        return isValid;
    }

    private _isValidArtifactCondition(): boolean {
        let isValid: boolean = true;

        if (this._currentState.artifactTriggerConditions) {
            for (let index: number = 0; index < this._currentState.artifactTriggerConditions.length; index++) {
                let condition = this._currentState.artifactTriggerConditions[index];
                if (!(condition && condition.name)) {
                    isValid = false;
                    break;
                }
            }
        }
        return isValid;
    }

    private _handleSelectEnvironmentTrigger = (payload: IEnvironmentTriggerSelectionPayload) => {
        // Ignore if same tab selected again
        if (this._currentState.selectedTabItemKey !== payload.selectedTabItemKey) {
            this._environmentTriggerTypeToConditionsMap[this._currentState.selectedTabItemKey] = this._currentState.environmentTriggerConditions;
            this._currentState.selectedTabItemKey = payload.selectedTabItemKey;

            this._updateEnvironmentTriggerCondition(payload.selectedTabItemKey);

            this._publishEnvironmentTriggerTabSelectionTelemetry(payload.selectedTabItemKey);

            this.emitChanged();
        }
    }

    private _handleUpdateEnvironmentTriggerCondition = (payload: IPostEnvironmentDeploymentTriggerPayload) => {
        let environmentIds: string[] = payload.selectedEnvironments || [];
        this._currentState.environmentTriggerConditions = [];        
        environmentIds.forEach((environmentId) => {
            let environmentName = (payload.environmentIdToNameMap && payload.environmentIdToNameMap[environmentId]) || Utils_String.empty;
            let value: string = payload.partiallySucceededDeployment ?
                this.getPartiallySucceededValue() : Types.PipelineEnvironmentTriggerConditionEnvironmentStatus.Succeeded.toString();
            let environmentPostEnvironmentTriggerCondition: Types.IEnvironmentTriggerCondition = {
                conditionType: Types.PipelineEnvironmentTriggerConditionType.EnvironmentState,
                name: environmentName,
                value: value,
                environmentId: Number(environmentId)
            };
            this._currentState.environmentTriggerConditions.push(environmentPostEnvironmentTriggerCondition);
        });

        this._validateEnvironmentTriggerCircularDependency();

        this._publishEnvironmentTriggerConditionsUpdateTelemetry(this._currentState.environmentTriggerConditions.length);

        this.emitChanged();
    }

    private _publishEnvironmentTriggerTabSelectionTelemetry(selectedTriggerTab: string) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.TriggerTab] = selectedTriggerTab;
        Telemetry.instance().publishEvent(Feature.EnvironmentTriggerCondition, eventProperties);
    }

    private _publishEnvironmentTriggerConditionsUpdateTelemetry(triggerConditionsCount: number) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.TriggerConditionsCount] = triggerConditionsCount;
        Telemetry.instance().publishEvent(Feature.EnvironmentTriggerConditionsUpdate, eventProperties);
    }

    private _handleUpdatePartiallySucceededCondition = (isPartiallySucceeded: boolean) => {
        let value: string = isPartiallySucceeded ?
            this.getPartiallySucceededValue() : Types.PipelineEnvironmentTriggerConditionEnvironmentStatus.Succeeded.toString();
        let environmentTriggerConditions: Types.IEnvironmentTriggerCondition[] = [];
        this._currentState.environmentTriggerConditions.forEach((environmentTriggerCondition) => {
            if (environmentTriggerCondition.conditionType === Types.PipelineEnvironmentTriggerConditionType.EnvironmentState) {
                let environmentPostEnvironmentTriggerCondition: Types.IEnvironmentTriggerCondition = {
                    conditionType: Types.PipelineEnvironmentTriggerConditionType.EnvironmentState,
                    name: environmentTriggerCondition.name,
                    value: value,
                    environmentId: environmentTriggerCondition.environmentId
                };

                environmentTriggerConditions.push(environmentPostEnvironmentTriggerCondition);
            }
        });

        this._currentState.environmentTriggerConditions = environmentTriggerConditions;

        this.emitChanged();
    }

    private _handleUpdateToggleSchedule = (enableSchedule: boolean): void => {
        if (enableSchedule) {
            if (!this._currentState.environmentTriggerSchedules || this._currentState.environmentTriggerSchedules.length <= 0) {
                this._currentState.environmentTriggerSchedules = [ScheduleUtils.getDefaultSchedule()];
            }
        }
        this._currentState.isScheduleEnabled = !!enableSchedule;

        this._publishEnvironmentScheduleTriggerToggleTelemetry(enableSchedule);

        this.emitChanged();
    }

    private _publishEnvironmentScheduleTriggerToggleTelemetry(state: boolean) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.ToggleState] = state;
        Telemetry.instance().publishEvent(Feature.EnvironmentScheduleTriggerToggle, eventProperties);
    }

    private _handleUpdateSchedule = (scheduleOption: IScheduleTriggerOptions): void => {
        let environmentSchedule: Types.PipelineReleaseSchedule;

        if (scheduleOption) {
            environmentSchedule = {
                daysToRelease: scheduleOption.day,
                startHours: scheduleOption.hour,
                startMinutes: scheduleOption.minute,
                timeZoneId: scheduleOption.timeZoneId,
                jobId: null
            };
        } else {
            environmentSchedule = ScheduleUtils.getDefaultSchedule();
        }
        this._currentState.environmentTriggerSchedules = [environmentSchedule];

        this.emitChanged();
    }

    private _handleUpdateEnvironmentTrigger = (updateEnvironmentTriggerPayload: IUpdateEnvironmentTriggerPayload): void => {
        this._setInitialStates(updateEnvironmentTriggerPayload.triggerConditions, updateEnvironmentTriggerPayload.triggerSchedules);
    }

    private _handleUpdatePostEnvironmentTrigger = (updateEnvironmentTriggerPayload: IUpdatePostEnvironmentTriggerPayload): void => {
        let environmentTriggerTab = this._getEnviromentTriggerTab(updateEnvironmentTriggerPayload.triggerConditions, updateEnvironmentTriggerPayload.triggerConditions);
        this._complementEnvironmentTriggerConditions(environmentTriggerTab, updateEnvironmentTriggerPayload.triggerConditions);
        let newState =
            {
                environmentTriggerConditions: JQueryWrapper.extendDeep([], updateEnvironmentTriggerPayload.triggerConditions),
                selectedTabItemKey: environmentTriggerTab
            };
        this._currentState = JQueryWrapper.extend(this._currentState, newState);
    }

    private _updateEnvironmentTriggerCondition(selectedTabItemKey: string) {
        this._currentState.environmentTriggerConditions = [];
        switch (selectedTabItemKey) {
            case EnvironmentTriggerTabKeys.PostReleaseTriggerKey:
                let environmentPostReleaseTriggerCondition: Types.PipelineEnvironmentTriggerCondition = {
                    conditionType: Types.PipelineEnvironmentTriggerConditionType.Event,
                    name: Types.PipelineEnvironmentTriggerTypeConstants.ReleaseStarted,
                    value: Utils_String.empty
                };
                this._currentState.environmentTriggerConditions.push(environmentPostReleaseTriggerCondition);
                break;

            case EnvironmentTriggerTabKeys.ManualTriggerKey:
                this._currentState.environmentTriggerConditions = [];
                break;

            case EnvironmentTriggerTabKeys.PostEnvironmentDeploymentTriggerKey:
                this._currentState.environmentTriggerConditions = this._environmentTriggerTypeToConditionsMap[EnvironmentTriggerTabKeys.PostEnvironmentDeploymentTriggerKey];
                break;
        }
    }

    private _handleAddArtifactCondition = () => {
        this._addDefaultTriggerCondition();

        this.emitChanged();
    }

    private _addDefaultTriggerCondition() {
        let artifactFilter: Types.PipelineArtifactFilter = this._getDefaultArtifactFilter();
        this._currentState.artifactTriggerConditions.push({
            conditionType: Types.PipelineEnvironmentTriggerConditionType.Artifact,
            name: Utils_String.empty,
            value: JSON.stringify(artifactFilter)
        });
    }

    private _handleDeleteArtifactCondition = (index: number) => {
        if (index >= 0) {
            this._currentState.artifactTriggerConditions.splice(index, 1);

            this.emitChanged();
        }
        else {
            Diag.logError("[EnvironmentTriggerStore._handleDeleteArtifactCondition]: Index out of range, Index: " + index);
        }
    }

    private _handleArtifactAliasChange = (data: IArtifactAliasPayload) => {
        if (this._currentState.artifactTriggerConditions.length > 0 && data &&
            this._currentState.artifactTriggerConditions[data.index]) {
            this._currentState.artifactTriggerConditions[data.index].name = data.artifactAlias;

            this.emitChanged();
        }
        else {
            Diag.logError("[EnvironmentTriggerStore._handleArtifactAliasChange]: Invalid artifactTriggerConditions or payload");
        }
    }

    private _handleBranchChange = (data: IBranchPayload) => {
        if (this._currentState.artifactTriggerConditions.length > 0 && data &&
            this._currentState.artifactTriggerConditions[data.index]) {
            let artifactFilter = this._parseArtifactConditionValue(this._currentState.artifactTriggerConditions[data.index].value);
            artifactFilter.sourceBranch = data.branchName;
            this._currentState.artifactTriggerConditions[data.index].value = JSON.stringify(artifactFilter);

            this.emitChanged();
        }
        else {
            Diag.logError("[EnvironmentTriggerStore._handleBranchChange]: Invalid artifactTriggerConditions or payload");
        }
    }

    private _handleTagsChanged = (data: ITagsPayload) => {
        if (this._currentState.artifactTriggerConditions.length > 0 && data &&
            this._currentState.artifactTriggerConditions[data.index]) {
            let artifactFilter = this._parseArtifactConditionValue(this._currentState.artifactTriggerConditions[data.index].value);
            artifactFilter.tags = data.tags;
            this._currentState.artifactTriggerConditions[data.index].value = JSON.stringify(artifactFilter);

            this.emitChanged();
        }
        else {
            Diag.logError("[EnvironmentTriggerStore._handleTagsChanged]: Invalid artifactTriggerConditions or payload");
        }
    }

    private _parseArtifactConditionValue(conditionValue: string): Types.PipelineArtifactFilter {
        let artifactFilter: Types.PipelineArtifactFilter = this._getDefaultArtifactFilter();
        if (conditionValue) {
            try {
                artifactFilter = JSON.parse(conditionValue);
            }
            catch (e) {
                Diag.logError("[EnvironmentTriggerStore._parseArtifactConditionValue]: Json parsing Error " + e);
            }
        }

        return artifactFilter;
    }

    private _getDefaultArtifactFilter(): Types.PipelineArtifactFilter {
        return {
            sourceBranch: null,
            tags: [],
            useBuildDefinitionBranch: false,
            createReleaseOnBuildTagging: false
        };
    }

    private _getEnviromentTriggerTab(environmentTriggerConditions: Types.PipelineEnvironmentTriggerCondition[],
        nonArtifactEnvironmentTriggerConditions: Types.PipelineEnvironmentTriggerCondition[]): string {
        let triggerTabItemKey = EnvironmentTriggerTabKeys.ManualTriggerKey;
        if (nonArtifactEnvironmentTriggerConditions.length > 0) {
            switch (nonArtifactEnvironmentTriggerConditions[0].conditionType) {
                case Types.PipelineEnvironmentTriggerConditionType.EnvironmentState:
                    triggerTabItemKey = EnvironmentTriggerTabKeys.PostEnvironmentDeploymentTriggerKey;
                    break;
                case Types.PipelineEnvironmentTriggerConditionType.Event:
                    triggerTabItemKey = EnvironmentTriggerTabKeys.PostReleaseTriggerKey;
                    break;
                case Types.PipelineEnvironmentTriggerConditionType.Artifact:
                case Types.PipelineEnvironmentTriggerConditionType.Undefined:
                default:
                    triggerTabItemKey = EnvironmentTriggerTabKeys.ManualTriggerKey;
                    break;
            }
        }

        return triggerTabItemKey;
    }

    /**
     * Filter out artifact and non artifact conditions from the environment trigger condition 
     * @param environmentTriggerCondition
     */
    private _filterOutArtifactAndNonArtifactConditions(environmentTriggerConditions: Types.PipelineEnvironmentTriggerCondition[]):
        IDictionaryStringTo<Types.PipelineEnvironmentTriggerCondition[]> {
        let nonArtifactConditions: Types.PipelineEnvironmentTriggerCondition[] = [];
        let artifactConditions: Types.PipelineEnvironmentTriggerCondition[] = [];
        if (!!environmentTriggerConditions) {
            environmentTriggerConditions.forEach((condition: Types.PipelineEnvironmentTriggerCondition) => {
                if (condition.conditionType !== Types.PipelineEnvironmentTriggerConditionType.Artifact) {
                    nonArtifactConditions.push({ conditionType: condition.conditionType, name: condition.name, value: condition.value });
                }
                else {
                    artifactConditions.push({ conditionType: condition.conditionType, name: condition.name, value: condition.value });
                }
            });
        }

        let triggerConditionsMap: IDictionaryStringTo<Types.PipelineEnvironmentTriggerCondition[]> = {};
        triggerConditionsMap[EnvironmentTriggerConditionsType.ArtifactTriggerCondition] = artifactConditions;
        triggerConditionsMap[EnvironmentTriggerConditionsType.NonArtifactTriggerCondition] = nonArtifactConditions;
        this._artifactConditions = artifactConditions;
        return triggerConditionsMap;
    }

    /**
     * For PostEnvironmentDeployment Trigger condition track environment id also. Condition name in PostEnvironmentDeployment trigger condition
     * is nothing but environment name, to make trigger condition update reliably on environment name update we need environment id as well
     * @param environmentTriggerConditions
     */
    private _complementEnvironmentTriggerConditions(environmentTriggerTab: string, environmentTriggerConditions: Types.PipelineEnvironmentTriggerCondition[]): Types.IEnvironmentTriggerCondition[] {
        let conditions: Types.IEnvironmentTriggerCondition[] = JQueryWrapper.extendDeep([], environmentTriggerConditions);
        if (environmentTriggerTab === EnvironmentTriggerTabKeys.PostEnvironmentDeploymentTriggerKey) {
            if (conditions) {
                let environmentNameIdMap = this._environmentListModel.getEnvironmentNameIdMap();
                conditions.forEach((condition) => {
                    let environmentId: number = environmentNameIdMap[condition.name.toLocaleLowerCase()];
                    if (environmentId) {
                        condition.environmentId = environmentId;
                    }
                });
            }
        }

        return conditions;
    }

    private _handleChangedEnvironmentName = (environmentPayload: IEnvironmentPayload): void => {
        if (this._currentState.selectedTabItemKey === EnvironmentTriggerTabKeys.PostEnvironmentDeploymentTriggerKey) {
            if (this._currentState.environmentTriggerConditions) {
                let environmentTriggerConditions: Types.IEnvironmentTriggerCondition[] = [];
                this._currentState.environmentTriggerConditions.forEach((environmentTriggerCondition) => {
                    if (environmentTriggerCondition.conditionType === Types.PipelineEnvironmentTriggerConditionType.EnvironmentState) {
                        if (environmentTriggerCondition.environmentId === environmentPayload.environmentId) {
                            environmentTriggerCondition.name = environmentPayload.environmentName;
                        }

                        let environmentPostEnvironmentTriggerCondition: Types.IEnvironmentTriggerCondition = {
                            conditionType: Types.PipelineEnvironmentTriggerConditionType.EnvironmentState,
                            name: environmentTriggerCondition.name,
                            value: environmentTriggerCondition.value,
                            environmentId: environmentTriggerCondition.environmentId
                        };

                        environmentTriggerConditions.push(environmentPostEnvironmentTriggerCondition);
                    }
                });

                this._currentState.environmentTriggerConditions = environmentTriggerConditions;
                this.emit(EnvironmentTriggerStoreChangedEvents.EnvironmentNameUpdatedEvent, null);
            }
        }
    }

    private _setInitialStates(environmentTriggerConditions: Types.PipelineEnvironmentTriggerCondition[],
        environmentTriggerSchedules: Types.PipelineReleaseSchedule[]) {
        this._initializeEnvironmentTriggerTypeToConditionsMap();
        let artifactAndNonArtifactTriggerConditionsMap = this._filterOutArtifactAndNonArtifactConditions(environmentTriggerConditions);
        let nonArtifactTriggerConditions = artifactAndNonArtifactTriggerConditionsMap[EnvironmentTriggerConditionsType.NonArtifactTriggerCondition];
        let artifactTriggerConditions = artifactAndNonArtifactTriggerConditionsMap[EnvironmentTriggerConditionsType.ArtifactTriggerCondition];
        let environmentTriggerTab = this._getEnviromentTriggerTab(environmentTriggerConditions, nonArtifactTriggerConditions);
        let envTriggerConditions: Types.IEnvironmentTriggerCondition[] =
            this._complementEnvironmentTriggerConditions(environmentTriggerTab, nonArtifactTriggerConditions);
        this._currentState =
            {
                environmentTriggerConditions: JQueryWrapper.extendDeep([], envTriggerConditions),
                environmentTriggerSchedules: JQueryWrapper.extendDeep([], environmentTriggerSchedules),
                artifactTriggerConditions: JQueryWrapper.extendDeep([], artifactTriggerConditions),
                selectedTabItemKey: environmentTriggerTab,
                isScheduleEnabled: environmentTriggerSchedules && environmentTriggerSchedules.length > 0 ? true : false
            };
        this._originalState =
            {
                environmentTriggerConditions: JQueryWrapper.extendDeep([], envTriggerConditions),
                environmentTriggerSchedules: JQueryWrapper.extendDeep([], environmentTriggerSchedules),
                artifactTriggerConditions: JQueryWrapper.extendDeep([], artifactTriggerConditions),
                selectedTabItemKey: environmentTriggerTab,
                isScheduleEnabled: environmentTriggerSchedules && environmentTriggerSchedules.length > 0 ? true : false
            };
        this._environmentTriggerCircularDependency = false;
        this._environmentTriggerTypeToConditionsMap[environmentTriggerTab] = envTriggerConditions;
    }

    private _validateEnvironmentTriggerCircularDependency() {
        let environments: Types.PipelineDefinitionEnvironment[] = [];
        JQueryWrapper.extendDeep(environments, this._environmentListModel.getEnvironmentList());

        let storeEnvironmentId: number = this._environmentListModel.getEnvironmentIdFromInstanceId(this.getInstanceId());

        // To detect the loop, update the environment trigger condition as per the current state
        environments.forEach((environment) => {
            if (environment.id === storeEnvironmentId) {
                environment.conditions = this._currentState.environmentTriggerConditions;
            }
        });

        let edges = this._environmentListModel.getEnvironmentConnectionsFromEnvironments(environments);
        let nodes = EnvironmentUtils.getNodes(this._environmentListModel.getEnvironmentsData(), null);
        try {
            let stagingOrderAndDependencies = GraphLayoutHelper.createStagingOrderAndDependencies(nodes, edges);

            this._environmentTriggerCircularDependency = stagingOrderAndDependencies.layoutError ? true : false;
        }
        // TODO: Fix, we need to catch specific exception
        catch (e) {
            Diag.logWarning(e.message || e);
        }
    }

    private _initializeEnvironmentTriggerTypeToConditionsMap() {
        this._environmentTriggerTypeToConditionsMap = {};
        this._environmentTriggerTypeToConditionsMap[EnvironmentTriggerTabKeys.ManualTriggerKey] = [];
        this._environmentTriggerTypeToConditionsMap[EnvironmentTriggerTabKeys.PostEnvironmentDeploymentTriggerKey] = [];
        this._environmentTriggerTypeToConditionsMap[EnvironmentTriggerTabKeys.PostReleaseTriggerKey] = [];
    }

    private _currentState: IEnvironmentTriggerState;
    private _originalState: IEnvironmentTriggerState;
    private _actions: EnvironmentTriggerActionsHub;
    private _environmentTriggerTypeToConditionsMap: IDictionaryStringTo<Types.IEnvironmentTriggerCondition[]>;
    private _environmentArtifactTriggerStore: EnvironmentArtifactTriggerStore;
    private _artifactConditions: Types.PipelineEnvironmentTriggerCondition[];
    private _environmentListModel: IEnvironmentListModel<Types.PipelineDefinitionEnvironment>;
    private _environmentTriggerCircularDependency: boolean;
}