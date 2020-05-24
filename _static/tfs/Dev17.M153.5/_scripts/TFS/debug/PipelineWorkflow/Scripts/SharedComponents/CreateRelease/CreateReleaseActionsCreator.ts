import * as Q from "q";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { Properties } from "DistributedTaskControls/Common/Telemetry";
import { VariableList } from "DistributedTaskControls/Variables/Common/Types";
import { ProcessVariablesActionCreator } from "DistributedTaskControls/Variables/ProcessVariables/Actions/ProcessVariablesActionCreator";
import { IProcessVariableActionPayload, IScopePermission } from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";
import { VariableConstants as DTCVariableConstants } from "DistributedTaskControls/Variables/Common/Constants";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ProgressIndicatorActionsCreator } from "PipelineWorkflow/Scripts/Common/Actions/ProgressIndicatorActionsCreator";
import { DialogActions } from "PipelineWorkflow/Scripts/Common/Actions/DialogActions";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { CommonConstants, PerfScenarios } from "PipelineWorkflow/Scripts/Common/Constants";
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import { TelemetryHelper } from "PipelineWorkflow/Scripts/Common/TelemetryHelper";
import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";
import { DefinitionVariablesUtils } from "PipelineWorkflow/Scripts/Editor/Common/DefinitionVariablesUtils";
import { AadAuthorizerSource } from "PipelineWorkflow/Scripts/Editor/Sources/AadAuthorizerSource";
import { DeployPipelineDefinitionSource } from "PipelineWorkflow/Scripts/Editor/Sources/DeployPipelineDefinitionSource";
import { ReleaseSource } from "PipelineWorkflow/Scripts/Shared/Sources/ReleaseSource";
import {
    CreateReleaseKeys,
    CreateReleaseProgressIndicatorAction
} from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/Constants";
import { ReleaseEnvironmentUtils, 
    IEnvironmentTrigger, 
    IArtifactVersionData, 
    ITriggerOption, 
    IEnvironmentAgentPhaseWarningData, 
    ReleaseDialogContentConstants
} from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentUtils";
import {
    CreateReleaseActions,
    IDeploymentTriggerSelectedPayload,
    IArtifactSelectedVersionPayload,
    IProjectDataPayload
} from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseActions";
import * as Store from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseStore";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ProgressIndicatorStore } from "PipelineWorkflow/Scripts/Common/Stores/ProgressIndicatorStore";
import { EnvironmentListActionCreator } from "PipelineWorkflow/Scripts/Shared/EnvironmentList/EnvironmentListActionCreator";
import { PermissionHelper, IPermissionCollection } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { ArtifactSource } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactSource";
import { VariablesUtils } from "PipelineWorkflow/Scripts/Shared/Utils/VariablesUtils";

import { ServiceEndpoint } from "TFS/ServiceEndpoint/Contracts";

import * as RMContracts from "ReleaseManagement/Core/Contracts";
import * as RMUtilsCore from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core";
import Types = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Types");
import * as Performance from "VSS/Performance";
import * as VSS from "VSS/VSS";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as VSSContext from "VSS/Context";

export class CreateReleaseActionsCreator<T extends PipelineTypes.PipelineDefinition | PipelineTypes.PipelineRelease, P extends PipelineTypes.PipelineDefinitionEnvironment | PipelineTypes.PipelineEnvironment> extends ActionsBase.ActionCreatorBase {

    public static getKey(): string {
        return CreateReleaseKeys.ActionsCreatorKey_CreateReleaseActionsCreator;
    }

    public initialize(instanceId: string): void {
        this._actions = ActionsHubManager.GetActionsHub<CreateReleaseActions<T>>(CreateReleaseActions, instanceId);
        this._commonActions = ActionsHubManager.GetActionsHub<DialogActions>(DialogActions, instanceId);
        this._processVariablesActionCreator = ActionCreatorManager.GetActionCreator<ProcessVariablesActionCreator>(ProcessVariablesActionCreator, instanceId);        
    }

    public initializeData(id: number, progressStoreInstanceId: string, environmentListStoreInstanceId: string, startReleaseMode?: boolean, project?: RMContracts.ProjectReference, buildDefinitionId?: string): void {
        this._progressIndicatorActionsCreator = ActionCreatorManager.GetActionCreator<ProgressIndicatorActionsCreator>(ProgressIndicatorActionsCreator, progressStoreInstanceId);
        this._environmentListActionCreator = ActionCreatorManager.GetActionCreator<EnvironmentListActionCreator<P>>(EnvironmentListActionCreator, environmentListStoreInstanceId);
        if (id === -1) {
            this._initializeProjectData(project, buildDefinitionId, progressStoreInstanceId);
        }
        else {
            this._initializeData(id, progressStoreInstanceId, startReleaseMode, project, buildDefinitionId);
        }
    }

    public createRelease(
        callOnSuccess: (pipelineRelease: PipelineTypes.PipelineRelease, projectName?: string) => void,
        state: Store.IReleaseDialogState<T>,
        variableList: VariableList,
        startReleaseMode: boolean,
        projectName?: string,
        pageSource?: string): void {

        this._logActionStart(CreateReleaseProgressIndicatorAction.authorizeDeploymentAction);

        // Based on the OBO authorization output, proceed further
        this._authorizeAutomatedDeployments(state)
            .then(() => {
                if (!startReleaseMode) {
                    return this._createNewRelease(callOnSuccess, state as Store.IReleaseDialogState<PipelineTypes.PipelineDefinition>, variableList, projectName, pageSource);
                } else {
                    return this._startRelease(callOnSuccess, state, projectName);
                }
            })
            .catch((error: any) => {
                this.updateErrorMessage(VSS.getErrorMessage(error));
            })
            .fin(() => {
                // Reset the authorization header in all scenarios once call is done
                ReleaseSource.instance().setDeploymentAuthorizationHeader(undefined);

                // Make sure report the action completion
                this._logActionComplete(CreateReleaseProgressIndicatorAction.authorizeDeploymentAction);
            });
    }

    public updateErrorMessage(errorMessage: string): void {
        if (errorMessage) {
            this._actions.updateErrorMessage.invoke(errorMessage);
        }
    }

    public updateDescription(description: string): void {
        this._actions.updateDescription.invoke(description);
    }

    public updateSelectedDeploymentTrigger(payload: IDeploymentTriggerSelectedPayload): void {
        this._actions.updateSelectedDeploymentTrigger.invoke(payload);
    }

    public updateArtifactSelectedVersion(artifactIndex: number, newSelectedVersion: string): void {
        let payload: IArtifactSelectedVersionPayload = { artifactIndex: artifactIndex, selectedVersion: newSelectedVersion };
        this._actions.updateArtifactSelectedVersion.invoke(payload);
    }

    public toggleDeploymentTrigger(environmentId: number): void {
        this._actions.toggleDeploymentTrigger.invoke(environmentId);
    }

    public updateManualDeploymentTriggers(environmentIds: string[]): void {
        this._actions.updateManualDeploymentTriggers.invoke(environmentIds);
    }

    private _initializeData(id: number, progressStoreInstanceId: string, startReleaseMode?: boolean, project?: RMContracts.ProjectReference, buildDefinitionId?: string): void {
        let progressStore = StoreManager.GetStore<ProgressIndicatorStore>(ProgressIndicatorStore, progressStoreInstanceId);
        if (!progressStore.isActionInProgress(CreateReleaseProgressIndicatorAction.initializeDefinitionAction)) {
            this._progressIndicatorActionsCreator.actionStarted(CreateReleaseProgressIndicatorAction.initializeDefinitionAction);
        }
        let promise: Q.Promise<T>;
        let forceFetch = (project && project.name) ? false : true;
        if (!startReleaseMode) {
            promise = <Q.Promise<T>>DeployPipelineDefinitionSource.instance().get(id, forceFetch, !!project ? project.name : Utils_String.empty);
        } else {
            promise = <Q.Promise<T>>ReleaseSource.instance().getRelease(id);
        }

        promise.then((data: T) => {
            if (data.id === id) {
                this._actions.initializeDefinition.invoke(data);
                this._initializeEnvironmentsPhasesWarning(data.environments as P[]);
                this._initializeEnvironmentsForCanvas(data.environments as P[]);
                this._initializeEnvironmentsEndpoints(data.environments as P[]);
                let release = data as PipelineTypes.PipelineRelease;

                // if it is not startReleaseMode then id is ReleaseDefinition Id.
                this._initializeArtifactsVersionsByArtifacts(release.artifacts, startReleaseMode ? release.releaseDefinition.id : id, !!project ? project.name : Utils_String.empty);

                if (!startReleaseMode) {
                    this._initializeOverridableVariables(data as PipelineTypes.PipelineDefinition);
                }
            }
        }, (error: any) => {
            this.updateErrorMessage(VSS.getErrorMessage(error));
            Performance.getScenarioManager().abortScenario(CommonConstants.FeatureArea, PerfScenarios.CreateReleaseDialog);
        }).fin(() => {
            this._progressIndicatorActionsCreator.actionCompleted(CreateReleaseProgressIndicatorAction.initializeDefinitionAction);
        });
    }

    private _initializeProjectData( project: RMContracts.ProjectReference, buildDefinitionId: string, progressStoreInstanceId: string): void {
        this._progressIndicatorActionsCreator.actionStarted(CreateReleaseProgressIndicatorAction.initializeDefinitionAction);
        const sourceId = Utils_String.format("{0}:{1}",  VSSContext.getDefaultWebContext().project.id, buildDefinitionId);
        let promise = <Q.Promise<RMContracts.ReleaseDefinition[]>>DeployPipelineDefinitionSource.instance().getReleaseDefinitionsForArtifactSource(Types.ArtifactTypes.Build, sourceId, null, !!project ? project.name : Utils_String.empty);
        promise.then((releaseDefinitions: RMContracts.ReleaseDefinition[]) => {
                let projectData = {project: project, releaseDefinitions: releaseDefinitions} as IProjectDataPayload;
                this._actions.initializeProject.invoke(projectData);
                this._initializeData(releaseDefinitions[0].id, progressStoreInstanceId, false, project, buildDefinitionId);
        }, (error: any) => {
                this.updateErrorMessage(VSS.getErrorMessage(error));
                Performance.getScenarioManager().abortScenario(CommonConstants.FeatureArea, PerfScenarios.CreateReleaseDialog);
                this._progressIndicatorActionsCreator.actionCompleted(CreateReleaseProgressIndicatorAction.initializeDefinitionAction);
        });
    }

    private _initializeOverridableVariables(definition: RMContracts.ReleaseDefinition): void {
        let variablesData = DefinitionVariablesUtils.mapDefinitionToVariablesData(definition, true);
        let environmentVariablesData = variablesData.environments;
        let environmentIds = (definition.environments || []).map((environment) => { return environment.id; });

        if (!!environmentVariablesData && environmentVariablesData.length > 0) {
            this._progressIndicatorActionsCreator.actionStarted(CreateReleaseProgressIndicatorAction.initializeOverridableVariablesAction);
            let permissionsPromise = <Q.Promise<IScopePermission[]>>DefinitionVariablesUtils.getScopePermissions(definition.path, definition.id, environmentIds);

            permissionsPromise.then((permissions: IScopePermission[]) => {
                const permissionsMap: IDictionaryNumberTo<boolean> = this._getPermissionsMap(permissions);
                variablesData.environments = environmentVariablesData.filter((variablesData: PipelineTypes.IEnvironmentVariablesData) => {
                    // Do not filter out the variables incase permissions for an environment are not found.
                    if (permissionsMap[variablesData.definitionId] === undefined || permissionsMap[variablesData.definitionId]) {
                        return true;
                    }
                });
            }, (error) => {
                // If fetching permissions fails do not attempt to filter
                variablesData.environments = environmentVariablesData;
            }).fin(() => {
                const payload: IProcessVariableActionPayload = {
                    skipSystemVariables: true,
                    definitionId: variablesData.definitionId,
                    variableList: DefinitionVariablesUtils.getProcessVariables(variablesData),
                    scopes: DefinitionVariablesUtils.getScopes(variablesData.environments),
                    disabledMode: false,
                    hideAddVariables: true
                };

                this._processVariablesActionCreator.createProcessVariables(payload);
                this._progressIndicatorActionsCreator.actionCompleted(CreateReleaseProgressIndicatorAction.initializeOverridableVariablesAction);
            });
        }
    }
    
    private _getPermissionsMap(permissions: IScopePermission[]): IDictionaryNumberTo<boolean> {
        let map = {};

        if (!!permissions && permissions.length > 0) {
            permissions.forEach((permission: IScopePermission) => {
                map[permission.scopeKey] = permission.hasPermission;
            });
        }

        return map;
    }

    private _initializeArtifactsVersionsByArtifacts(artifacts: RMContracts.Artifact[], rdId: number, projectName?: string): void {
        let artifactsPromise = <Q.Promise<PipelineTypes.PipelineArtifactVersionQueryResult>>ArtifactSource.instance().getDefinitionArtifactsVersions(rdId, !projectName ? true : false, projectName);
        this._initializeArtifactVersions(artifactsPromise, artifacts);
    }

    private _initializeArtifactVersions(artifactsPromise: Q.Promise<PipelineTypes.PipelineArtifactVersionQueryResult>, artifacts: RMContracts.Artifact[]) {
        this._progressIndicatorActionsCreator.actionStarted(CreateReleaseProgressIndicatorAction.initializeArtifactVersionsAction);

        artifactsPromise.then((artifactsVersions: PipelineTypes.PipelineArtifactVersionQueryResult) => {
            this._actions.initializeDefinitionArtifactsVersions.invoke({ artifacts: artifacts, versions: artifactsVersions });
            Performance.getScenarioManager().endScenario(CommonConstants.FeatureArea, PerfScenarios.CreateReleaseDialog);
        }, (error: any) => {
            this.updateErrorMessage(VSS.getErrorMessage(error));
            Performance.getScenarioManager().abortScenario(CommonConstants.FeatureArea, PerfScenarios.CreateReleaseDialog);
        }).fin(() => {
            this._progressIndicatorActionsCreator.actionCompleted(CreateReleaseProgressIndicatorAction.initializeArtifactVersionsAction);
        });
    }

    private _initializeEnvironmentsForCanvas(environments: P[]): void {
        this._environmentListActionCreator.refreshEnvironmentList(environments);
    }

    private _initializeEnvironmentsPhasesWarning(environments: P[]): void {
        // Start querying for data
        this._progressIndicatorActionsCreator.actionStarted(CreateReleaseProgressIndicatorAction.initializeEnvironmentPhaseWarningAction);
        let warningsDataPromise = ReleaseEnvironmentUtils.getEnvironmentsPhasesDemandsWarning(environments);

        warningsDataPromise.then((data: IEnvironmentAgentPhaseWarningData[]) => {
            this._actions.initializeEnvironmentsPhasesWarning.invoke(data);
            // All data processing is done.
            this._progressIndicatorActionsCreator.actionCompleted(CreateReleaseProgressIndicatorAction.initializeEnvironmentPhaseWarningAction);
        });
    }

    private _initializeEnvironmentsEndpoints(environments: P[]): void {
        // Start querying for data
        this._progressIndicatorActionsCreator.actionStarted(CreateReleaseProgressIndicatorAction.initializeEnvironmentEndpointsAction);

        let endpointsPromise = <Q.Promise<IDictionaryNumberTo<ServiceEndpoint[]>>>ReleaseEnvironmentUtils.getEnvironmentsEndpoints(environments);

        endpointsPromise.then((data: IDictionaryNumberTo<ServiceEndpoint[]>) => {
            this._actions.initializeEnvironmentsEndpoints.invoke(data);
        }, (error: any) => {
            this.updateErrorMessage(VSS.getErrorMessage(error));
        }).fin(() => {
            // All data processing is done.
            this._progressIndicatorActionsCreator.actionCompleted(CreateReleaseProgressIndicatorAction.initializeEnvironmentEndpointsAction);
        });
    }

    private _authorizeAutomatedDeployments(state: Store.IReleaseDialogState<T>): Q.Promise<{}> {
        if (state && FeatureFlagUtils.isDeploymentAuthorizationEnabled()) {
            let environmentsAuthInfo = ReleaseEnvironmentUtils.getEnvironmentsAuthInfo(state.environmentTriggers);
            return ReleaseEnvironmentUtils.authorizeDeployments(environmentsAuthInfo);
        }
        else {
            return Q.resolve(undefined);
        }
    }

    private _getPipelineReleaseStartParameters(state: Store.IReleaseDialogState<PipelineTypes.PipelineDefinition>, variableList: VariableList, pageSource?: string): PipelineTypes.PipelineReleaseStartMetadata {
        let manualEnvironments: string[] = [];

        // Select all environments in which user has selected a manual option
        // We skip environments which are having Manual option already.
        state.environmentTriggers.forEach((trigger: IEnvironmentTrigger, index: number) => {
            if (trigger.triggerOptions
                && trigger.triggerOptions.length > 1
                && trigger.selectedTriggerKey === ReleaseDialogContentConstants.EnvironmentTrigger_ManualOptionValueKey) {
                manualEnvironments.push(trigger.environmentName);
            }
        });

        let properties: IDictionaryStringTo<any> = {};
        properties[Properties.ReleaseCreationSource] = pageSource || PipelineTypes.PipelineReleaseCreationSourceConstants.Other;

        let pipelineReleaseParameters = {
            definitionId: state.data.id,
            isDraft: false,
            description: !!state.description ? state.description : Utils_String.empty,
            manualEnvironments: manualEnvironments,
            artifacts: this._getArtifactsMetadata(state as Store.IReleaseDialogState<T>),
            variables: VariablesUtils.getVariablesInScope(variableList, DTCVariableConstants.DefaultScopeKey),
            environmentsMetadata: this._getEnvironmentMetadata(state.data.environments, variableList),
            properties: properties
        } as PipelineTypes.PipelineReleaseStartMetadata;

        return pipelineReleaseParameters;
    }

    private _getEnvironmentMetadata(environments: PipelineTypes.PipelineDefinitionEnvironment[], variables: VariableList): RMContracts.ReleaseStartEnvironmentMetadata[] {
        if (!environments || environments.length === 0) {

            return[];
        }

        let environmentsMetaData = [];
                
        for (let environment of environments) { 
            let envVariables = VariablesUtils.getVariablesInScope(variables, environment.id);
            environmentsMetaData.push({ definitionEnvironmentId: environment.id, variables: envVariables } as RMContracts.ReleaseStartEnvironmentMetadata);            
        }

        return environmentsMetaData;
    }
     
    private _getBuildTypeUnfetchedVersions(state: Store.IReleaseDialogState<T>): IArtifactVersionData[] {

        let unfetchedVersions: IArtifactVersionData[] = [];

        for (let versionsData of state.artifactsVersionsData) {
            let version = Utils_Array.first(versionsData.artifactVersion.versions, (version: PipelineTypes.PipelineBuildVersion): boolean => {
                return Utils_String.localeIgnoreCaseComparer(version.name, versionsData.selectedVersion) === 0;
            });

            if (!version && versionsData.artifactSource.type === Types.ArtifactTypes.Build) {
                unfetchedVersions.push(versionsData);
            }
        }
        return unfetchedVersions;
    }

    private _fetchNotFoundVersions(state: Store.IReleaseDialogState<T>): IPromise<void>[] {
        let artifactsMetadataPromises: Q.Promise<void>[] = [];
        let unfetchedVersions = this._getBuildTypeUnfetchedVersions(state);

        // Try fetching artifactMetadata, but never reject this artifactMetadataPromise, except for the build artifacts to give first class experience.
        // The other artifact really may not exists or service may not have access to it but the agent may have access. 
        // If we reject here, the release creation will fail. Instead we would like the agent report the error if the artifact is not reachable.

        unfetchedVersions.forEach((version: IArtifactVersionData) => {
            let artifactMetadataPromise: Q.Deferred<void> = Q.defer<void>();
            artifactsMetadataPromises.push(artifactMetadataPromise.promise);

            let artifactSource = version.artifactSource;
            let artifactVersionPromise = ArtifactSource.instance().getArtifactVersionDetails(artifactSource, version.selectedVersion);
            artifactVersionPromise
                .then((resultVersion: RMContracts.BuildVersion) => {
                    this._fetchedVersions[artifactSource.alias] = resultVersion;
                },
                (error) => {
                    if (artifactSource.type === Types.ArtifactTypes.Build) {
                        let error = Utils_String.localeFormat(Resources.InvalidIdForBuildArtifactErrorMessage, artifactSource.alias);
                        artifactMetadataPromise.reject(error);
                    }
                })
                .fin(() => { artifactMetadataPromise.resolve(null); });
        });

        return artifactsMetadataPromises;
    }

    private _getArtifactsMetadata(state: Store.IReleaseDialogState<T>): PipelineTypes.PipelineArtifactMetadata[] {
        let artifactsMetadata: PipelineTypes.PipelineArtifactMetadata[] = [];

        if (state.canShowArtifactsVersions && !state.hasAnyErrorsInArtifacts) {
            artifactsMetadata = state.artifactsVersionsData.map((artifact: IArtifactVersionData): PipelineTypes.PipelineArtifactMetadata => {
                let artifactMetadata: PipelineTypes.PipelineArtifactMetadata = { alias: artifact.artifactVersion.alias, instanceReference: undefined };

                let version = Utils_Array.first(artifact.artifactVersion.versions, (version: PipelineTypes.PipelineBuildVersion): boolean => {
                    return Utils_String.localeIgnoreCaseComparer(version.name, artifact.selectedVersion) === 0;
                });

                if (version) {
                    artifactMetadata.instanceReference = version;
                } else if (this._isVersionFetched(artifactMetadata.alias, artifact.selectedVersion)) {
                    artifactMetadata.instanceReference = this._fetchedVersions[artifactMetadata.alias];
                } else {
                    artifactMetadata.instanceReference = {
                        name: artifact.selectedVersion,
                        id: artifact.selectedVersion
                    } as PipelineTypes.PipelineBuildVersion;
                }

                return artifactMetadata;
            });
        }

        return artifactsMetadata;
    }

    private _isVersionFetched(alias: string, selectedVersion: string): boolean {
        if (this._fetchedVersions.hasOwnProperty(alias)) {
            let version = this._fetchedVersions[alias];
            return version.id === selectedVersion;
        }
        return false;
    }

    private _createNewRelease(callOnSuccess: (pipelineRelease: PipelineTypes.PipelineRelease, projectName: string) => void,
        state: Store.IReleaseDialogState<PipelineTypes.PipelineDefinition>,
        variableList: VariableList,
        projectName: string,
        pageSource?: string) {

        let errorCallback = (error) => {
            this.updateErrorMessage(VSS.getErrorMessage(error));
            this._logActionComplete(CreateReleaseProgressIndicatorAction.createReleaseAction);
            Performance.getScenarioManager().abortScenario(CommonConstants.FeatureArea, PerfScenarios.StartRelease);
        };

        this._logActionStart(CreateReleaseProgressIndicatorAction.createReleaseAction);
        Q.all(this._fetchNotFoundVersions(state as Store.IReleaseDialogState<T>)).then(
            () => { 
                let pipelineReleaseParameters = this._getPipelineReleaseStartParameters(state, variableList, pageSource);
                let createReleasePromise = ReleaseSource.instance().createRelease(pipelineReleaseParameters, projectName);
                TelemetryHelper.publishReleaseTimeVariablesTelemetry(state.data, variableList);

                return createReleasePromise.then((pipelineRelease: PipelineTypes.PipelineRelease) => {
                        this._logActionComplete(CreateReleaseProgressIndicatorAction.createReleaseAction);
                        if (callOnSuccess) {
                            callOnSuccess(pipelineRelease, projectName);
                        }
                        Performance.getScenarioManager().endScenario(CommonConstants.FeatureArea, PerfScenarios.StartRelease);
                    }, errorCallback);
            }, errorCallback);
    }

    private _startRelease(
        callOnSuccess: (pipelineRelease: PipelineTypes.PipelineRelease) => void,
        state: Store.IReleaseDialogState<T>,
        projectName?: string) {

        let errorCallback = (error) => {
            this.updateErrorMessage(VSS.getErrorMessage(error));
            this._logActionComplete(CreateReleaseProgressIndicatorAction.updateReleaseAction);
            Performance.getScenarioManager().abortScenario(CommonConstants.FeatureArea, PerfScenarios.StartRelease);
        };

        this._logActionStart(CreateReleaseProgressIndicatorAction.updateReleaseAction);
        Q.all(this._fetchNotFoundVersions(state)).then(() => {
            let releaseData = state.data as PipelineTypes.PipelineRelease;
            let artifactVersionsDetails = this._getArtifactsMetadata(state);
            this._updateArtifactVersionMetaData(releaseData, artifactVersionsDetails);

            this._dropApprovals(releaseData);
            releaseData.description = state.description;

            return ReleaseSource.instance().updateRelease(releaseData).then((pipelineRelease: PipelineTypes.PipelineRelease) => {
                let switchedEnvironmentsToManual: string[] = this._getEnvironmentsSwitchedFromAutomatedToManual(state);
                let releaseMetaData: RMContracts.ReleaseUpdateMetadata = <RMContracts.ReleaseUpdateMetadata>{
                    status: RMContracts.ReleaseStatus.Active,
                    manualEnvironments: switchedEnvironmentsToManual,
                    comment: pipelineRelease.description
                };

                ReleaseSource.instance().patchRelease(releaseData.id, releaseMetaData).then((release: PipelineTypes.PipelineRelease) => {
                    this._logActionComplete(CreateReleaseProgressIndicatorAction.updateReleaseAction);
                    if (callOnSuccess) {
                        callOnSuccess(release);
                    }
                    Performance.getScenarioManager().endScenario(CommonConstants.FeatureArea, PerfScenarios.StartRelease);
                }, errorCallback);
            }, errorCallback);
        }, errorCallback);
    }

    private _updateArtifactVersionMetaData(release: PipelineTypes.PipelineRelease, artifactVersionDetails: PipelineTypes.PipelineArtifactMetadata[]) {
        if (release && release.artifacts && artifactVersionDetails && artifactVersionDetails.length > 0) {
            for (let artifactSource of release.artifacts) {
                if (artifactSource.alias) {
                    let alias = artifactSource.alias;
                    let artifactMetadata = this._getArtifactMetadata(alias, artifactVersionDetails);
                    artifactSource.definitionReference[PipelineTypes.PipelineArtifactDefinitionConstants.Version].id = artifactMetadata.instanceReference.id;
                    artifactSource.definitionReference[PipelineTypes.PipelineArtifactDefinitionConstants.Version].name = artifactMetadata.instanceReference.name;

                    let sourceBranch: string = artifactMetadata.instanceReference.sourceBranch;
                    artifactSource.definitionReference[PipelineTypes.PipelineArtifactDefinitionConstants.BranchId] = { id: sourceBranch, name: sourceBranch };
                }
            }
        }
    }

    private _logActionStart(name: string): void {
        if (this._progressIndicatorActionsCreator) {
            this._progressIndicatorActionsCreator.actionStarted(name);
        }
    }

    private _logActionComplete(name: string): void {
        if (this._progressIndicatorActionsCreator) {
            this._progressIndicatorActionsCreator.actionCompleted(name);
        }
    }

    private _getArtifactMetadata(alias: string, artifactsMetadata: PipelineTypes.PipelineArtifactMetadata[]): PipelineTypes.PipelineArtifactMetadata {
        let artifactMetadata: PipelineTypes.PipelineArtifactMetadata = { alias: alias, instanceReference: { commitMessage: "", id: "", name: "", isMultiDefinitionType: false, definitionId: "", definitionName: "", sourceBranch: "", sourceVersion: "", sourceRepositoryId: "", sourceRepositoryType: "", sourcePullRequestVersion: null } };
        for (const artifact of artifactsMetadata) {
            if (alias === artifact.alias) {
                artifactMetadata = artifact;
                break;
            }
        }
        return artifactMetadata;
    }

    private _dropApprovals(release: PipelineTypes.PipelineRelease) {
        release.environments.forEach((environment: PipelineTypes.PipelineEnvironment) => {
            environment.preDeployApprovals = [];
            environment.postDeployApprovals = [];
        });
    }

    protected _getEnvironmentsSwitchedFromAutomatedToManual(state: Store.IReleaseDialogState<T>): string[] {
        let toggledEnvironmentNames: string[] = [];
        let toggledManualTriggers: IEnvironmentTrigger[] = ReleaseEnvironmentUtils.getToggledManuallyTriggeredEnvironment(state.environmentTriggers);
        for (let trigger of toggledManualTriggers) {
            toggledEnvironmentNames.push(trigger.environmentName);
        }
        return toggledEnvironmentNames;
    }
    private _actions: CreateReleaseActions<T>;
    private _commonActions: DialogActions;
    private _progressIndicatorActionsCreator: ProgressIndicatorActionsCreator;
    private _processVariablesActionCreator: ProcessVariablesActionCreator;
    private _environmentListActionCreator: EnvironmentListActionCreator<P>;
    private _fetchedVersions: IDictionaryStringTo<RMContracts.BuildVersion> = {};
}
