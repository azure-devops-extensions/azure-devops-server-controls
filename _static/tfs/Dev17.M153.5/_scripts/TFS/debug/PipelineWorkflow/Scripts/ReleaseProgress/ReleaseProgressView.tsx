
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Q from "q";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Feature, Properties, Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { TelemetryUtils } from "DistributedTaskControls/Common/TelemetryUtils";
import { ProcessVariablesFilterActions } from "DistributedTaskControls/Variables/Filters/ProcessVariablesFilterActions";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import { ReleaseEnvironmentPropertiesContributionsStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPropertiesContributionsStore";
import { ReleaseEnvironmentPropertiesContributionsActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPropertiesContributionsActionCreator";

import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { NavigationConstants } from "PipelineWorkflow/Scripts/Common/Constants";
import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";
import * as NavigationService from "VSS/Navigation/Services";
import { CommonConstants, OldReleaseViewNavigateStateActions, PerfScenarios, ReleaseProgressNavigateStateActions, ReleaseSummaryEnvironmentTabsPivotItemKeys, ReleaseSummaryPivotItemKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { LogsTabActionsCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabActionsCreator";
import { DeploymentGroupLogsHub } from "PipelineWorkflow/Scripts/ReleaseProgress/DeploymentGroupLogsHub";
import { EnvironmentProgressHub } from "PipelineWorkflow/Scripts/ReleaseProgress/EnvironmentProgressHub";
import { PipelineProgressHub } from "PipelineWorkflow/Scripts/ReleaseProgress/PipelineProgressHub";
import { ReleaseActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseActionCreator";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { IInitializeReleaseData, ReleaseSignalRManager } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseSignalRManager";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as RMContracts from "ReleaseManagement/Core/Contracts";
import { ReleaseUrlUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseUrlUtils";
import * as ReleaseEventManager from "ReleasePipeline/Scripts/TFS.ReleaseManagement.ReleaseHub.ConnectionManager";

import { NavigationView } from "VSS/Controls/Navigation";
import { getRunningDocumentsTable } from "VSS/Events/Document";
import { HubsService } from "VSS/Navigation/HubsService";
import * as Performance from "VSS/Performance";
import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

import { Async, autobind } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/ReleaseProgressView";

export class ReleaseProgressView extends NavigationView {

    public initializeOptions(options) {
        super.initializeOptions(JQueryWrapper.extend({
            attachNavigate: true
        }, options));

        this._initializeFlux();
    }

    public initialize() {
        super.initialize();
        Telemetry.instance().setArea("deployment-release-progress");

        let releaseId = NavigationStateUtils.getReleaseId();
        if (releaseId > 0) {
            getRunningDocumentsTable().add("ReleaseEditor", this);
            this._initializeSignalR(releaseId);
            this._publishTelemetry();
        }

        this._async = new Async();

        // In a release containing a lot of environments, it is possible that 
        // signalR update is raised on multiple environments simultaneously.
        // It is just enough to react to the final event.
        this._delayedMergeRelease = this._async.debounce(this._mergeRelease, 1000);
    }

    public isDirty(): boolean {
        return this._releaseStore.isDirty();
    }

    public onNavigate(state: any) {
        this.getElement().addClass("release-progress-view");
        this._updateUrlIfLegacyState();

        if (state) {
            const action = NavigationStateUtils.getAction().toLocaleLowerCase();
            if (action) {

                switch (action) {
                    case ReleaseProgressNavigateStateActions.ReleasePipelineProgress:
                    case ReleaseProgressNavigateStateActions.ReleaseVariables:
                    case ReleaseProgressNavigateStateActions.ReleaseHistory:
                        let releaseId = NavigationStateUtils.getReleaseId();
                        this._initializePipelineProgressView(action, releaseId);
                        break;

                    case ReleaseProgressNavigateStateActions.ReleaseEnvironmentProgress:
                    case ReleaseProgressNavigateStateActions.ReleaseEnvironmentLogs:
                    case ReleaseProgressNavigateStateActions.ReleaseTaskEditor:
                    case ReleaseProgressNavigateStateActions.ReleaseEnvironmentVariables:
                        releaseId = NavigationStateUtils.getReleaseId();
                        let environmentId = NavigationStateUtils.getEnvironmentId();
                        this._initializeEnvironmentProgressView(action, releaseId, environmentId);
                        break;

                    case ReleaseProgressNavigateStateActions.ReleaseEnvironmentDeploymentGroupLogs:
                        releaseId = NavigationStateUtils.getReleaseId();
                        environmentId = NavigationStateUtils.getEnvironmentId();
                        this._initializeDeploymentGroupLogsView(action, releaseId, environmentId);
                        break;

                    case ReleaseProgressNavigateStateActions.ReleaseEnvironmentExtension:
                        releaseId = NavigationStateUtils.getReleaseId();
                        environmentId = NavigationStateUtils.getEnvironmentId();
                        const extensionId = NavigationStateUtils.getExtensionId();
                        this._initializeEnvironmentProgressView(action, releaseId, environmentId, extensionId);
                        break;

                    default:
                        this._navigateToReleasesExplorerView();
                        break;
                }
            } else {
                let releaseId = NavigationStateUtils.getReleaseId();
                if (releaseId) {
                    // if no action then navigate to release pipeline progress view
                    let action = ReleaseProgressNavigateStateActions.ReleasePipelineProgress;
                    this._initializePipelineProgressView(action, releaseId);
                }
                else {
                    // If no action and invalid releaseID then navigate to release explorer view
                    this._navigateToReleasesExplorerView();
                }
            }
        }
    }

    public dispose(): void {
        this._cleanupOlderState();
        ReleaseSignalRManager.dispose();
        this._cleanupFlux();
        this._async.dispose();
        super.dispose();
    }

    private _cleanupFlux(): void {
        StoreManager.dispose();
        ActionCreatorManager.dispose();
        SourceManager.dispose();
    }

    private _cleanupOlderState(): void {
        // Remove the earlier UI.
        ReactDOM.unmountComponentAtNode(this.getElement()[0]);
    }

    private _publishTelemetry(): void {
        const action = NavigationStateUtils.getAction().toLocaleLowerCase();
        let eventProperties: IDictionaryStringTo<string> = {};
        eventProperties[Properties.ActionName] = action;
        Telemetry.instance().publishEvent(Feature.ReleaseProgressView, eventProperties);
        TelemetryUtils.publishScreenResolutionTelemetry();
    }

    private _initializeEnvironmentProgressView(action: string, releaseId: number, environmentId: number, extensionId?: string): void {
        if (releaseId > 0) {
            this._initializeRelease((action: string, releaseId: number, environmentId: number, extensionId: string) => {
                this._renderEnvironmentProgressHub(action, releaseId, environmentId, extensionId);
                this._initializeDefaultFiltersForVariables(action, environmentId);
            }, action, releaseId, environmentId, extensionId);
        }
        else {
            this._navigateToReleasesExplorerView();
        }
    }

    private _initializeDefaultFiltersForVariables(action: string, environmentId: number): void {
        if (action === ReleaseProgressNavigateStateActions.ReleaseEnvironmentVariables
            || action === ReleaseProgressNavigateStateActions.ReleaseVariables) {
            const variableFilterAction = ActionsHubManager.GetActionsHub<ProcessVariablesFilterActions>(ProcessVariablesFilterActions);
            variableFilterAction.defaultFilterTrigger.invoke(environmentId);
        }
    }

    private _initializeRelease(onReleaseInitialized: (action: string, releaseId: number, environmentId?: number, extensionId?: string) => void,
        action: string,
        releaseId: number,
        environmentId?: number,
        extensionId?: string,
        isReleaseProgressView: boolean = false): void {
        const releaseActionCreator = ActionCreatorManager.GetActionCreator<ReleaseActionCreator>(ReleaseActionCreator);
        if (!this._releaseInitialized) {
            let updateContributionPromise: IPromise<void> = Q.resolve(null) as IPromise<void> ;

            if (isReleaseProgressView){
                let releaseEnvironmentPropertiesContributionsStore = StoreManager.GetStore<ReleaseEnvironmentPropertiesContributionsStore>(ReleaseEnvironmentPropertiesContributionsStore);
                let environmentContributionsActionCreator: ReleaseEnvironmentPropertiesContributionsActionCreator =
                    ActionCreatorManager.GetActionCreator<ReleaseEnvironmentPropertiesContributionsActionCreator>(ReleaseEnvironmentPropertiesContributionsActionCreator);
                updateContributionPromise = environmentContributionsActionCreator.updateContributions();
            }
            
            Q.allSettled([releaseActionCreator.initializeRelease(releaseId), updateContributionPromise]).then(results => {
                //Throw Error if initializeRelease Promise is rejected.
                if (results[0].state === "rejected"){
                    const errorMessage = this._getErrorMessage(results[0].reason);
                    return this._renderErrorComponent(errorMessage);
                }
                // Default to first environment if environment id is not specified. 
                if (!environmentId) {
                    environmentId = this._getDefaultEnvironmentId();
                }

                if (environmentId !== undefined && !this._isValidEnvironmentForRelease(releaseId, environmentId)) {
                    const errorMessage = Utils_String.localeFormat(Resources.InvalidEnvironmentErrorMessage, environmentId);
                    return this._renderErrorComponent(errorMessage);
                }

                onReleaseInitialized(action, releaseId, environmentId, extensionId);

                // Pre-fetch data
                this._prefetchData();

                this._releaseInitialized = true;

                if (action !== ReleaseProgressNavigateStateActions.ReleaseEnvironmentLogs &&
                    action !== ReleaseProgressNavigateStateActions.ReleaseEnvironmentDeploymentGroupLogs) {

                    // Refresh the release and merge it with existing release to ensure
                    // that all timeline records are fetched. 
                    //
                    // 1. If the release is in progress, this will introduce a redundant call
                    //    to fetch release since signalR initialization will do it later. However, 
                    //    doing here will ensure that we do not wait for signalR initialization to 
                    //    complete. Also we do not need to track all error paths in signalR if we
                    //    do this unconditionally
                    //
                    // 2. If the release has completed, this is needed to ensure that timeline records
                    //    are fetched.
                    releaseActionCreator.refreshRelease(releaseId, true);
                }
            });
        }
        else {
            // Default to first environment if environment id is not specified. 
            if (!environmentId) {
                environmentId = this._getDefaultEnvironmentId();
            }

            onReleaseInitialized(action, releaseId, environmentId, extensionId);
        }
    }

    private _getDefaultEnvironmentId(): number {
        let environmentId: number = 0;
        // Default to first environment if environment id is not specified. 
        const release = this._releaseStore.getRelease();
        if (release && release.environments && release.environments.length > 0) {
            environmentId = release.environments[0].id;
        }

        return environmentId;
    }

    private _initializeDeploymentGroupLogsView(action: string, releaseId: number, environmentId: number): void {
        const deploymentGroupPhaseId = NavigationStateUtils.getDeploymentGroupPhaseId();
        if (releaseId > 0 && environmentId > 0 && deploymentGroupPhaseId > 0) {
            this._initializeRelease((action: string, releaseId: number, environmentId: number, extensionId: string) => {
                ReactDOM.render(
                    <DeploymentGroupLogsHub
                        releaseId={releaseId}
                        deploymentGroupPhaseId={deploymentGroupPhaseId}
                        environmentId={environmentId}
                        instanceId={environmentId.toString()}
                        defaultPivot={ReleaseSummaryEnvironmentTabsPivotItemKeys.c_logsPivotItemKey}
                    />, this.getElement()[0], this._logReleaseProgressTTI);
            }, action, releaseId, environmentId);
        }
        else {
            this._navigateToReleasesExplorerView();
        }
    }

    private _isValidEnvironmentForRelease(releaseId: number, environmentId: number): boolean {
        const release = this._releaseStore.getRelease();

        if (release && release.id === releaseId && release.environments) {
            for (const environment of release.environments) {
                if (environment && environment.id === environmentId) {
                    return true;
                }
            }
        }

        return false;
    }

    private _prefetchData(): void {
        // Cache permissions.
        PermissionHelper.hasEditDefinitionPermission("\\", 1).then(() => { }, () => { });
    }

    @autobind
    private _logReleaseProgressTTI(): void {
        let pageLoadData: IDictionaryStringTo<string> = {};
        pageLoadData[Properties.Action] = this._getActionFragment();
        Performance.getScenarioManager().recordPageLoadScenario(CommonConstants.FeatureArea, PerfScenarios.LoadRelease, pageLoadData);
    }

    private _renderEnvironmentProgressHub(action: string, releaseId: number, environmentId: number, extensionId: string) {
        let defaultPivot: string;
        const instanceId = environmentId.toString();

        switch (action) {
            case ReleaseProgressNavigateStateActions.ReleaseTaskEditor:
                defaultPivot = ReleaseSummaryEnvironmentTabsPivotItemKeys.c_taskPivotItemKey;
                break;

            case ReleaseProgressNavigateStateActions.ReleaseEnvironmentVariables:
                defaultPivot = ReleaseSummaryEnvironmentTabsPivotItemKeys.c_variablePivotItemKey;
                break;

            case ReleaseProgressNavigateStateActions.ReleaseEnvironmentExtension:
                defaultPivot = extensionId;
                break;

            default:
                defaultPivot = ReleaseSummaryEnvironmentTabsPivotItemKeys.c_logsPivotItemKey;
                // Reset log item selection when navigating to logs tab
                const logsTabActionsCreator = ActionCreatorManager.GetActionCreator<LogsTabActionsCreator>(LogsTabActionsCreator, instanceId);
                logsTabActionsCreator.resetLogItemSelection();
                break;
        }

        ReactDOM.render(
            <EnvironmentProgressHub
                key={environmentId}
                releaseId={releaseId}
                environmentId={environmentId}
                instanceId={instanceId}
                defaultPivot={defaultPivot}
            />, this.getElement()[0], this._logReleaseProgressTTI);
    }

    private _initializePipelineProgressView(action: string, releaseId: number): void {
        if (releaseId > 0) {
            this._initializeRelease((action: string, releaseId: number) => {
                this._renderPipelineProgressHub(action, releaseId);
                this._initializeDefaultFiltersForVariables(action, null);
            }, action, releaseId, null, null, true);
        }
        else {
            this._navigateToReleasesExplorerView();
        }
    }

    private _renderPipelineProgressHub(action: string, releaseId: number): void {
        let defaultPivot: string;
        switch (action) {
            case ReleaseProgressNavigateStateActions.ReleaseHistory:
                defaultPivot = ReleaseSummaryPivotItemKeys.c_historyPivotItemKey;
                break;

            case ReleaseProgressNavigateStateActions.ReleaseVariables:
                defaultPivot = ReleaseSummaryPivotItemKeys.c_variablePivotItemKey;
                break;

            case ReleaseProgressNavigateStateActions.ReleasePipelineProgress:
            default:
                defaultPivot = ReleaseSummaryPivotItemKeys.c_pipelinePivotItemKey;
                break;
        }

        ReactDOM.render(
            <PipelineProgressHub
                instanceId={releaseId.toString()}
                key={releaseId}
                releaseId={releaseId}
                defaultPivot={defaultPivot}
            />, this.getElement()[0], this._logReleaseProgressTTI);
    }

    private _renderErrorComponent(errorMessage: string): void {
        ReactDOM.render(
            <MessageBar messageBarType={MessageBarType.error} className="release-progress-error-message-bar">
                {errorMessage}
            </MessageBar>, this.getElement()[0]);
    }

    private _getErrorMessage = (error: any): string => {
        if (!error) {
            return null;
        }
        return error.message || error;
    }

    private _releaseTaskUpdateEventHandler = (sender: any, releaseEvent: RMContracts.ReleaseTasksUpdatedEvent): void => {
        const releaseActionCreator = ActionCreatorManager.GetActionCreator<ReleaseActionCreator>(ReleaseActionCreator);
        releaseActionCreator.mergeTasks(releaseEvent);
    }

    private _releaseUpdateEventHandler = (sender: any, releaseEvent: RMContracts.ReleaseUpdatedEvent): void => {
        this._delayedMergeRelease(releaseEvent.release);
    }

    private _mergeRelease(release: RMContracts.Release): void {
        if (!ReleaseSignalRManager.instance().isLiveWatchDisabled()) {
            const signalrReleaseUpdateScenario = Performance.getScenarioManager().startScenario(CommonConstants.FeatureArea, PerfScenarios.SignalrReleaseUpdate);
            const releaseActionCreator = ActionCreatorManager.GetActionCreator<ReleaseActionCreator>(ReleaseActionCreator);
            releaseActionCreator.mergeRelease(release);
            signalrReleaseUpdateScenario.end();
        }
    }

    private _initializeFlux() {
        ActionCreatorManager.GetActionCreator<ReleaseActionCreator>(ReleaseActionCreator);
        this._releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
    }

    private _navigateToReleasesExplorerView(): void {
        const hubService = Service.getLocalService(HubsService);
        hubService.navigateToHub(NavigationConstants.ReleaseManagementExplorerHubId);
    }

    private _signalrTelemetryEventHandler = (sender: any, eventProperties: IDictionaryStringTo<string>): void => {
        // string added for compat
        const feature: string = Feature.SignalR ? Feature.SignalR : "signalr";
        Telemetry.instance().publishEvent(feature, eventProperties);
    }

    private _initializeSignalR(releaseId: number) {
        this._eventHandlerMap = {};
        this._eventHandlerMap[ReleaseEventManager.ReleaseHubEvents.RELEASE_UPDATED] = this._releaseUpdateEventHandler;
        this._eventHandlerMap[ReleaseEventManager.ReleaseHubEvents.RELEASETASKS_UPDATED] = this._releaseTaskUpdateEventHandler;
        this._eventHandlerMap[ReleaseEventManager.ReleaseHubEvents.SIGNALR_TELEMETRY_PUBLISHED] = this._signalrTelemetryEventHandler;

        let initializeReleaseData: IInitializeReleaseData = {
            releaseId: releaseId,
            eventHandlerMap: this._eventHandlerMap,
            onInitializeComplete: null,
            isViewLiveDelegate: this._isViewLiveDelegate,
            delayedForceUpdateDelegate: this._delayedForceUpdateDelegate
        };

        ReleaseSignalRManager.instance().initializeRelease(initializeReleaseData);
    }

    private _isViewLiveDelegate = (): boolean => {
        return this._releaseStore.isReleaseRunning();
    }

    private _delayedForceUpdateDelegate = (): void => {
        const releaseActionCreator = ActionCreatorManager.GetActionCreator<ReleaseActionCreator>(ReleaseActionCreator);
        const releaseId = NavigationStateUtils.getReleaseId();
        if (releaseId > 0) {
            releaseActionCreator.refreshRelease(releaseId);

            let eventProperties: IDictionaryStringTo<string> = {};
            eventProperties[Properties.forceUpdateTriggered] = "true";
            Telemetry.instance().publishEvent(Feature.SignalR, eventProperties);
        }
    }

    private _getActionFragment(): string {
        const action = NavigationStateUtils.getAction().toLocaleLowerCase();
        if (this._isLegacyActionFragment(action)) {
            return ReleaseProgressNavigateStateActions.ReleasePipelineProgress;
        }

        return action;
    }

    // Updates the old release url to new release url.
    private _updateUrlIfLegacyState(): void {
        const action = NavigationStateUtils.getAction().toLocaleLowerCase();
        if (this._isLegacyActionFragment(action)) {
            let url: string = Utils_String.empty;
            const state = NavigationService.getHistoryService().getCurrentState();
            if (action === OldReleaseViewNavigateStateActions.ReleaseLogs) {
                url = ReleaseUrlUtils.getReleaseEnvironmentLogsUrl(state.releaseId, state.environmentId);
            }
            else {
                url = ReleaseUrlUtils.getReleaseProgressUrl(state.releaseId);
            }

            NavigationService.getHistoryService().replaceState(url);
        }
    }

    private _isLegacyActionFragment(action: string): boolean {
        if (action === OldReleaseViewNavigateStateActions.ReleaseSummary
            || action === OldReleaseViewNavigateStateActions.ReleaseArtifacts
            || action === OldReleaseViewNavigateStateActions.ReleaseCommits
            || action === OldReleaseViewNavigateStateActions.ReleaseEnvironments
            || action === OldReleaseViewNavigateStateActions.ReleaseWorkitems
            || action === OldReleaseViewNavigateStateActions.ReleaseGeneralSettings
            || action === OldReleaseViewNavigateStateActions.ReleaseLogs
            || action === OldReleaseViewNavigateStateActions.ReleaseTests
            || action === OldReleaseViewNavigateStateActions.ReleaseVariables) {

            return true;
        }

        return false;
    }

    private _eventHandlerMap: IDictionaryStringTo<IEventHandler>;
    private _releaseInitialized: boolean = false;
    private _releaseStore: ReleaseStore;
    private _async: Async;
    private _delayedMergeRelease: (release: RMContracts.Release) => void;
}
