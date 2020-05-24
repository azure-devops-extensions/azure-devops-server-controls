import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IState } from "DistributedTaskControls/Common/Components/Base";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";

import { DialogActions } from "PipelineWorkflow/Scripts/Common/Actions/DialogActions";
import { ArtifactUtility } from "PipelineWorkflow/Scripts/Common/ArtifactUtility";
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import { CreateReleaseKeys } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/Constants";
import {
    IDeploymentTriggerSelectedPayload,
    CreateReleaseActions,
    IArtifactSelectedVersionPayload,
    IInitializeArtifactVersionsPayload,
    IProjectDataPayload
} from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseActions";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ReleaseEnvironmentUtils, 
    IEnvironmentTrigger, 
    IArtifactVersionData, 
    ITriggerOption, 
    IEnvironmentAgentPhaseWarningData,
    ReleaseDialogContentConstants
} from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentUtils";

import { ArtifactDefinitionConstants, ArtifactTypes } from "ReleaseManagement/Core/Constants";
import { ServiceEndpoint } from "TFS/ServiceEndpoint/Contracts";
import * as Common from "DistributedTaskControls/Common/Common";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as RMContracts from "ReleaseManagement/Core/Contracts";

export interface IEnvironmentTriggerState extends IState {
    environmentTriggers: IEnvironmentTrigger[];
    // Handles warning in the deployment triggers
    hasTriggerWarning?: boolean;
}

export interface IReleaseDialogArtifactsState extends IState {
    artifactsVersionsData: IArtifactVersionData[];
    canShowArtifactsVersions?: boolean;
    // Handles error in the artifacts versions
    hasAnyErrorsInArtifacts?: boolean;
}

export interface IReleaseDialogContentState extends IEnvironmentTriggerState, IReleaseDialogArtifactsState, IState {
    description: string;
    // Handles whether required data available or not
    canShowDialogContent: boolean;
}

export interface IReleaseDialogState<T extends PipelineTypes.PipelineDefinition | PipelineTypes.PipelineRelease> extends IReleaseDialogContentState, IState {
    showDialog: boolean;
    data?: T;
    errorMessage?: string;
    hasVariables?: boolean;
    selectedProject?: RMContracts.ProjectReference;
    linkedReleaseDefinitions?: RMContracts.ReleaseDefinition[];
    // Handles if there are any errors or any pending data
    canQueue?: boolean;
}

export interface ICreateReleaseStoreArgs {
    showDialog: boolean;
    startReleaseMode?: boolean;
    linkedProjects?: RMContracts.ProjectReference[];
    buildSource?: string;
    buildId?: string;
}

export class CreateReleaseStore<T extends PipelineTypes.PipelineDefinition | PipelineTypes.PipelineRelease, P extends PipelineTypes.PipelineDefinitionEnvironment | PipelineTypes.PipelineEnvironment> extends StoreBase {
    constructor(private _options?: ICreateReleaseStoreArgs) {
        super();
        this._state = {
            showDialog: !!this._options && !!this._options.showDialog,
            selectedProject: !!this._options.linkedProjects && this._options.linkedProjects.length > 0 ?  this._options.linkedProjects[0] : null
        } as IReleaseDialogState<T>;
    }

    public static getKey(): string {
        return CreateReleaseKeys.StoreKey_CreateReleaseStoreKey;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        this._commonActions = ActionsHubManager.GetActionsHub<DialogActions>(DialogActions, instanceId);
        this._commonActions.showDialog.addListener(this._handleShowDialog);
        this._commonActions.closeDialog.addListener(this._handleCloseDialog);

        this._actions = ActionsHubManager.GetActionsHub<CreateReleaseActions<T>>(CreateReleaseActions, instanceId);
        this._actions.initializeDefinition.addListener(this._handleInitializeData);
        this._actions.initializeProject.addListener(this._handleInitializeProject);
        this._actions.initializeEnvironmentsPhasesWarning.addListener(this._handleInitializeEnvironmentsPhasesWarning);
        this._actions.initializeEnvironmentsEndpoints.addListener(this._handleInitializeEnvironmentsEndpoints);
        this._actions.updateErrorMessage.addListener(this._handleUpdateErrorMessage);
        this._actions.updateDescription.addListener(this._handleUpdateDescription);
        this._actions.updateSelectedDeploymentTrigger.addListener(this._handleUpdateSelectedDeploymentTrigger);
        this._actions.initializeDefinitionArtifactsVersions.addListener(this._handleInitializeDefinitionArtifactsVersions);
        this._actions.updateArtifactSelectedVersion.addListener(this._handleUpdateArtifactSelectedVersion);
        this._actions.toggleDeploymentTrigger.addListener(this._handleToggleDeploymentTrigger);
        this._actions.updateManualDeploymentTriggers.addListener(this._handleUpdateManualDeploymentTriggers);
    }

    public getState(): IReleaseDialogState<T> {
        return this._state;
    }

    public getlinkedProjects(): RMContracts.ProjectReference[]{
        return this._options.linkedProjects;
    }

    protected disposeInternal(): void {
        this._commonActions.showDialog.removeListener(this._handleShowDialog);
        this._commonActions.closeDialog.removeListener(this._handleCloseDialog);

        this._actions.initializeDefinition.removeListener(this._handleInitializeData);
        this._actions.initializeProject.removeListener(this._handleInitializeProject);
        this._actions.initializeEnvironmentsPhasesWarning.removeListener(this._handleInitializeEnvironmentsPhasesWarning);
        this._actions.initializeEnvironmentsEndpoints.removeListener(this._handleInitializeEnvironmentsEndpoints);
        this._actions.updateErrorMessage.removeListener(this._handleUpdateErrorMessage);
        this._actions.updateDescription.removeListener(this._handleUpdateDescription);
        this._actions.updateSelectedDeploymentTrigger.removeListener(this._handleUpdateSelectedDeploymentTrigger);
        this._actions.initializeDefinitionArtifactsVersions.removeListener(this._handleInitializeDefinitionArtifactsVersions);
        this._actions.updateArtifactSelectedVersion.removeListener(this._handleUpdateArtifactSelectedVersion);
        this._actions.toggleDeploymentTrigger.removeListener(this._handleToggleDeploymentTrigger);
        this._actions.updateManualDeploymentTriggers.removeListener(this._handleUpdateManualDeploymentTriggers);
    }

    private _handleInitializeDefinitionArtifactsVersions = (payload: IInitializeArtifactVersionsPayload): void => {
        if (payload) {
            let artifactsVersions: PipelineTypes.PipelineArtifactVersionQueryResult = payload.versions;
            let sourceArtifacts: PipelineTypes.PipelineArtifact[] = payload.artifacts;
            if (!!artifactsVersions && !!artifactsVersions.artifactVersions) {
                let artifacts: PipelineTypes.PipelineArtifactVersion[] = artifactsVersions.artifactVersions;
                let artifactsVersionsData: IArtifactVersionData[] = [];

                artifactsVersionsData = artifacts.map((artifact: PipelineTypes.PipelineArtifactVersion) => {
                    let hasError: boolean = (!!artifact.errorMessage && !!artifact.errorMessage.trim());

                    let sourceArtifact: PipelineTypes.PipelineArtifact = Utils_Array.first(sourceArtifacts, (sourceArtifact: PipelineTypes.PipelineArtifact): boolean => {
                        return Utils_String.localeIgnoreCaseComparer(artifact.alias, sourceArtifact.alias) === 0;
                    });
                    let defaultVersion: string;
                    if (!!this._options.buildId && !!this._options.buildSource && artifact.sourceId === this._options.buildSource) {
                        let version = Utils_Array.first(artifact.versions, (version: PipelineTypes.PipelineBuildVersion): boolean => {
                            return Utils_String.localeIgnoreCaseComparer(version.id, this._options.buildId) === 0;
                        });

                        if (!version) {
                            defaultVersion = this._getDefaultArtifactVersion(artifact, sourceArtifact);
                        }
                        else {
                            defaultVersion = version.name;
                        }
                    }
                    else {
                        defaultVersion = this._getDefaultArtifactVersion(artifact, sourceArtifact);
                    }

                    let artifactData: IArtifactVersionData = {
                        artifactVersion: artifact,
                        artifactSource: sourceArtifact,
                        selectedVersion: defaultVersion,
                        hasError: hasError,
                        errorMessage: hasError ? artifact.errorMessage : (defaultVersion ? undefined : Resources.ArtifactVersionSelectErrorMessageDefault)
                    };

                    if (artifactData.errorMessage) {
                        artifactData.hasError = true;
                    }

                    return artifactData;
                });

                this._state.artifactsVersionsData = artifactsVersionsData;
                this._updateDependentStateProperties();

                this.emitChanged();
            }
        }
    }

    private _getDefaultArtifactVersion(artifact: PipelineTypes.PipelineArtifactVersion, artifactSource: PipelineTypes.PipelineArtifact): string {
        if (artifactSource && artifactSource.definitionReference) {
            const artifactVersion = artifactSource.definitionReference[ArtifactDefinitionConstants.Version];
            if (artifactVersion && artifactVersion.id !== Utils_String.empty && artifactVersion.name !== Utils_String.empty) {
                return artifactVersion.name;
            }
        }
        return artifact && artifact.defaultVersion ? artifact.defaultVersion.name : undefined;

    }

    private _handleUpdateArtifactSelectedVersion = (artifactSelectedVersion: IArtifactSelectedVersionPayload): void => {
        if (!!this._state.artifactsVersionsData && this._state.artifactsVersionsData.length > artifactSelectedVersion.artifactIndex) {
            let hasError: boolean = (!artifactSelectedVersion.selectedVersion || !artifactSelectedVersion.selectedVersion.trim());

            let artifactVersion = this._state.artifactsVersionsData[artifactSelectedVersion.artifactIndex].artifactVersion;
            let version: PipelineTypes.PipelineBuildVersion = null;
            
            if (artifactVersion) {
                version = Utils_Array.first(artifactVersion.versions, (version: PipelineTypes.PipelineBuildVersion): boolean => {
                    return Utils_String.localeIgnoreCaseComparer(ArtifactUtility.getArtifactVersionDisplayValue(version), artifactSelectedVersion.selectedVersion) === 0;
                });
            }

            if (version) {
                this._state.artifactsVersionsData[artifactSelectedVersion.artifactIndex].selectedVersion = version.name;
            } else {
                this._state.artifactsVersionsData[artifactSelectedVersion.artifactIndex].selectedVersion = artifactSelectedVersion.selectedVersion;
            }

            this._state.artifactsVersionsData[artifactSelectedVersion.artifactIndex].hasError = hasError;
            this._state.artifactsVersionsData[artifactSelectedVersion.artifactIndex].errorMessage = hasError ? Resources.ArtifactVersionSelectErrorMessageDefault : undefined;

            this._updateDependentStateProperties();
            this.emitChanged();
        }
    }

    private _handleInitializeData = (data: T) => {
        if (data && data.environments && data.environments.length > 0) {
            let environmentTriggers: IEnvironmentTrigger[] = [];
            let environments: P[] = data.environments as P[];

            for (let environment of environments) {
                let manualOptionKey: number = ReleaseDialogContentConstants.EnvironmentTrigger_ManualOptionValueKey;
                let additionalOptionText: string = this._getAdditionalTriggerOptionText(environment.conditions, environment.schedules);
                let manualTriggerOption: ITriggerOption = { key: manualOptionKey, text: Resources.ManualTriggerText };

                let environmentTrigger: IEnvironmentTrigger = {} as IEnvironmentTrigger;
                environmentTrigger.environmentName = environment.name;
                environmentTrigger.environmentId = environment.id;
                environmentTrigger.selectedTriggerKey = manualOptionKey;
                environmentTrigger.triggerOptions = [];

                if (additionalOptionText) {
                    let selectedKey: number = manualOptionKey + 1;
                    let manualTriggerOption: ITriggerOption = { key: selectedKey, text: additionalOptionText };
                    environmentTrigger.triggerOptions.push(manualTriggerOption);
                    environmentTrigger.selectedTriggerKey = selectedKey;
                }

                // Manual trigger option will be second option rather than first one.
                environmentTrigger.triggerOptions.push(manualTriggerOption);

                environmentTriggers.push(environmentTrigger);
            }

            this._state.data = data;
            this._state.environmentTriggers = environmentTriggers;
            this._state.errorMessage = Utils_String.empty;
            this._state.description = Utils_String.empty;
            this._updateDependentStateProperties();

            this.emitChanged();
        }
    }

    private _handleInitializeProject = (projectData: IProjectDataPayload) => {
        this._state.linkedReleaseDefinitions = projectData.releaseDefinitions;
        this._state.selectedProject = projectData.project;
    }

    private _handleInitializeEnvironmentsPhasesWarning = (warningsData: IEnvironmentAgentPhaseWarningData[]) => {
        let state = this._state;
        if (state.environmentTriggers && state.environmentTriggers.length > 0 && warningsData && warningsData.length > 0) {
            state.environmentTriggers.forEach((trigger: IEnvironmentTrigger): void => {
                let environmentWarnings: string[] = [];

                warningsData.forEach((warningData: IEnvironmentAgentPhaseWarningData) => {
                    if (warningData && warningData.environmentId === trigger.environmentId && warningData.hasWarning) {
                        environmentWarnings.push(warningData.warningMessage);
                    }

                });

                if (environmentWarnings.length > 0) {
                    // Endpoints warning may exist, so taking care of it also
                    trigger.warningMessage = this._getWarningMessage(environmentWarnings.join(Utils_String.newLine), trigger.warningMessage);
                    // If getting demand data is delayed, user would have acted on changing the trigger option
                    // So we should check for the current option of the trigger also.
                    trigger.hasWarning = this._canSetEnvironmentTriggerWarning(trigger);
                }
            });

            this._updateDependentStateProperties();

            this.emitChanged();
        }
    }

    private _handleInitializeEnvironmentsEndpoints = (endpointsDictionary: IDictionaryNumberTo<ServiceEndpoint[]>) => {
        let state = this._state;
        let hasAnyWarningUpdated: boolean = false;
        if (state.environmentTriggers && state.environmentTriggers.length > 0 && endpointsDictionary) {
            state.environmentTriggers.forEach((trigger: IEnvironmentTrigger): void => {
                let subscriptionNames: string[] = [];
                let endpoints: ServiceEndpoint[] = endpointsDictionary[trigger.environmentId];

                if (endpoints && endpoints.length > 0) {

                    trigger.endpoints = Utils_Array.clone(endpoints);

                    endpoints.forEach((endpoint: ServiceEndpoint) => {
                        if (endpoint && endpoint.data && endpoint.data[ReleaseDialogContentConstants.Environment_Endpoint_SubscriptionNameKey]) {
                            subscriptionNames.push(endpoint.data[ReleaseDialogContentConstants.Environment_Endpoint_SubscriptionNameKey]);
                        }
                    });
                }

                if (subscriptionNames.length > 0) {
                    hasAnyWarningUpdated = true;
                    let endpointsWarningMessage = Utils_String.localeFormat(Resources.DeploymentAuthorizationRequiredFor, subscriptionNames.join(Resources.JoinNames));
                    // Trigger warning may exist, so taking care of it.
                    trigger.warningMessage = this._getWarningMessage(trigger.warningMessage, endpointsWarningMessage);

                    // If getting endpoints data is delayed, user would have acted on changing the trigger option
                    // So we should check for the current option of the trigger also.
                    trigger.hasWarning = this._canSetEnvironmentTriggerWarning(trigger);
                }
            });

            // If there is no change in the data, then we should not emit change
            if (hasAnyWarningUpdated) {
                this._updateDependentStateProperties();
                this.emitChanged();
            }
        }
    }

    private _handleUpdateErrorMessage = (errorMessage: string) => {
        if (Utils_String.localeComparer(this._state.errorMessage, errorMessage) !== 0) {
            this._state.errorMessage = !errorMessage ? Utils_String.empty : errorMessage;
            this.emitChanged();
        }
    }

    private _handleUpdateDescription = (newDescription: string) => {
        if (Utils_String.localeComparer(this._state.description, newDescription) !== 0) {
            this._state.description = !newDescription ? Utils_String.empty : newDescription;
            this.emitChanged();
        }
    }

    private _handleUpdateSelectedDeploymentTrigger = (payload: IDeploymentTriggerSelectedPayload) => {
        if (payload && this._state.environmentTriggers && this._state.environmentTriggers.length > 0) {
            let trigger = Utils_Array.first(this._state.environmentTriggers, (trigger: IEnvironmentTrigger): boolean => {
                return (trigger.environmentId === payload.environmentId && trigger.selectedTriggerKey !== payload.selectedTriggerOptionKey);
            });

            if (trigger) {
                trigger.selectedTriggerKey = payload.selectedTriggerOptionKey;
                // For manual option remove the warning boolean alone and not the message,
                // so when user resets the option to non- manual we can reuse the message
                trigger.hasWarning = this._canSetEnvironmentTriggerWarning(trigger);

                this._updateDependentStateProperties();
                this.emitChanged();
            }
        }
    }

    private _handleShowDialog = () => {
        this._updateDialogVisibility(this._state.showDialog, true);
    }

    private _handleCloseDialog = () => {
        this._updateDialogVisibility(this._state.showDialog, false);
    }

    private _updateDialogVisibility(originalValue: boolean, newValue: boolean): void {
        // Emit changes only if original value and new value are different.
        if (originalValue !== newValue) {
            this._state.showDialog = newValue;
            this.emitChanged();
        }
    }

    private _getAdditionalTriggerOptionText(
        conditions: PipelineTypes.PipelineEnvironmentTriggerCondition[],
        schedules: PipelineTypes.PipelineReleaseSchedule[]): string {

        let triggerText: string = Utils_String.empty;
        let hasAnyScedules: boolean = !!schedules && schedules.length > 0;

        if (conditions && conditions.length > 0) {
            if (conditions.length === 1) {
                triggerText = this._getFirstConditionTriggerOptionText(conditions[0], hasAnyScedules);
            }
            else {
                let conditionEnvironmentNames = conditions.map((condition) => condition.name).join(Resources.JoinNames);
                let triggerFormatText: string = hasAnyScedules
                    ? Resources.ScheduledTriggerAfterEnvironmentsText
                    : Resources.AutoTriggerAfterEnvironmentsText;
                triggerText = Utils_String.localeFormat(triggerFormatText, conditionEnvironmentNames);
            }
        }

        return triggerText;
    }

    private _getFirstConditionTriggerOptionText(
        condition: PipelineTypes.PipelineEnvironmentTriggerCondition,
        hasAnySchedules: boolean): string {

        let triggerText: string = Utils_String.empty;

        if (condition != null) {
            if (condition.conditionType === PipelineTypes.PipelineEnvironmentTriggerConditionType.Event) {
                triggerText = hasAnySchedules
                    ? Resources.ScheduledTriggerAfterReleaseText
                    : Resources.AutoTriggerAfterReleaseText;
            }
            else if (condition.conditionType === PipelineTypes.PipelineEnvironmentTriggerConditionType.EnvironmentState) {
                let triggerFormatText: string = hasAnySchedules
                    ? Resources.ScheduledTriggerAfterEnvironmentText
                    : Resources.AutoTriggerAfterEnvironmentText;
                triggerText = Utils_String.localeFormat(triggerFormatText, condition.name);
            }
        }

        return triggerText;
    }

    private _updateDependentStateProperties(): void {
        // Order of seeting properties is important

        // Represent PipelineDefinition and ArtifactsVersions are fetched.
        this._state.canShowDialogContent = this._canShowDialogContent();

        // Represents, whether we can show artifcatsversions, so user can choose among them.
        this._state.canShowArtifactsVersions = this._canShowArtifactsVersions();
        // In the listed artifacts, are there any errors
        this._state.hasAnyErrorsInArtifacts = this._hasAnyErrorsInArtifacts();
        // Has data available and there are no error conditions, then one can create release
        this._state.canQueue = this._canCreatePipelineRelease();
        // Add hasTriggerWarning computation also here
        this._state.hasTriggerWarning = this._hasAnyTriggersWarning();
    }

    private _hasAnyErrorsInArtifacts(): boolean {
        let state = this._state;
        let errorArtifact: IArtifactVersionData;
        if (state.canShowArtifactsVersions) {
            errorArtifact = Utils_Array.first(state.artifactsVersionsData, (artifact): boolean => {
                return artifact.hasError;
            });
        }

        return !!errorArtifact;
    }

    private _hasAnyTriggersWarning(): boolean {
        let state = this._state;

        if (!state.environmentTriggers || state.environmentTriggers.length <= 0) {
            return false;
        }

        let warning = Utils_Array.first(state.environmentTriggers, (trigger: IEnvironmentTrigger) => { return trigger.hasWarning; });

        return !!warning;
    }

    private _canShowDialogContent(): boolean {
        let state = this._state;

        if (!state.data) {
            return false;
        }

        let hasEnvironments = !!state.data.environments && state.data.environments.length > 0;
        let hasTriggersData = hasEnvironments && !!state.environmentTriggers && state.environmentTriggers.length === state.data.environments.length;

        let hasArtifacts = !!state.data.artifacts && state.data.artifacts.length > 0;
        let hasArtifactsData = !hasArtifacts || (!!state.artifactsVersionsData && state.artifactsVersionsData.length > 0);

        return hasTriggersData && hasArtifactsData;
    }

    private _canShowArtifactsVersions(): boolean {
        let state = this._state;

        if (!state.data) {
            return false;
        }

        let hasArtifacts = !!state.data.artifacts && state.data.artifacts.length > 0;
        let showArtifactsData = hasArtifacts && !!state.artifactsVersionsData && state.artifactsVersionsData.length > 0;

        return showArtifactsData;
    }

    private _canCreatePipelineRelease(): boolean {
        // We do not consider trigger warnings as error case
        return this._state.canShowDialogContent && !this._state.hasAnyErrorsInArtifacts;
    }

    private _canSetEnvironmentTriggerWarning(trigger: IEnvironmentTrigger): boolean {
        return (trigger
            && trigger.selectedTriggerKey !== ReleaseDialogContentConstants.EnvironmentTrigger_ManualOptionValueKey
            && !!trigger.warningMessage);
    }

    private _getWarningMessage(triggerWarning: string, endpointsWarning: string): string {
        // If both warnings exist, then return them by joining, otherwise return individual ones.
        if (triggerWarning && endpointsWarning) {
            // order matters, so do not change order in which we join messages
            return [triggerWarning, endpointsWarning].join(Utils_String.newLine);
        }

        if (triggerWarning) {
            return triggerWarning;
        }

        if (endpointsWarning) {
            return endpointsWarning;
        }

        return Utils_String.empty;
    }

    private _handleToggleDeploymentTrigger = (environmentId: number) => {
        if (this._state.environmentTriggers && this._state.environmentTriggers.length > 0) {
            let trigger = Utils_Array.first(this._state.environmentTriggers, (trigger: IEnvironmentTrigger): boolean => {
                return (trigger.environmentId === environmentId);
            });

            const _isManualTrigger: boolean = ReleaseEnvironmentUtils.isDeploymentTriggerManual(trigger);

            if (trigger && !_isManualTrigger) {

                if (trigger.selectedTriggerKey === ReleaseDialogContentConstants.EnvironmentTrigger_ManualOptionValueKey) {
                    trigger.selectedTriggerKey = ReleaseDialogContentConstants.EnvironmentTrigger_AutomatedOptionValueKey;
                } else {
                    trigger.selectedTriggerKey = ReleaseDialogContentConstants.EnvironmentTrigger_ManualOptionValueKey;
                }

                trigger.hasWarning = this._canSetEnvironmentTriggerWarning(trigger);

                this._updateDependentStateProperties();
                this.emitChanged();
            }
        }
    }

    private _handleUpdateManualDeploymentTriggers = (serializedEnvironmentIds: string[]) => {
        let environmentIds: string[] = serializedEnvironmentIds || [];
        for (let trigger of this._state.environmentTriggers) {
            const _isManualTrigger: boolean = ReleaseEnvironmentUtils.isDeploymentTriggerManual(trigger);
            if (!_isManualTrigger) {
                if (Utils_Array.contains(environmentIds, trigger.environmentId.toString())) {
                    trigger.selectedTriggerKey = ReleaseDialogContentConstants.EnvironmentTrigger_ManualOptionValueKey;
                } else {
                    trigger.selectedTriggerKey = ReleaseDialogContentConstants.EnvironmentTrigger_AutomatedOptionValueKey;
                }
            }
        }
        this._updateDependentStateProperties();
        this.emitChanged();
    }     
        
    private _state: IReleaseDialogState<T>;
    private _commonActions: DialogActions;
    private _actions: CreateReleaseActions<T>;
}
