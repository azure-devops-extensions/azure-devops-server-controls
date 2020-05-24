/// <reference types="react" />
/// <reference types="react-dom" />

/**
 * Entry point for Deploy pipeline definition workflow
 */

import * as ReactDOM from "react-dom";
import * as React from "react";
import * as Q from "q";

import { IAddMessagePayload, MessageHandlerActions } from "DistributedTaskControls/Actions/MessageHandlerActions";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { AppContext, AppCapability } from "DistributedTaskControls/Common/AppContext";
import * as ExtensionUtils_LAZY_LOAD from "DistributedTaskControls/Common/ExtensionUtils";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { LoadingUtils } from "DistributedTaskControls/Common/LoadingUtils";
import { ServiceClientManager } from "DistributedTaskControls/Common/Service/ServiceClientManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Telemetry, Properties } from "DistributedTaskControls/Common/Telemetry";
import { TelemetryUtils } from "DistributedTaskControls/Common/TelemetryUtils";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { Component as ErrorMessageBar } from "DistributedTaskControls/Components/InformationBar";
import { Component as MarkdownRenderer } from "DistributedTaskControls/Components/MarkdownRenderer";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";

import { AllDefinitionsContentKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { CommonConstants, PerfScenarios, NavigationConstants } from "PipelineWorkflow/Scripts/Common/Constants";
import { ErrorMessageParentKeyConstants, OldReleaseDefinitionNavigateStateActions, TemplateConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { EditorActions } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { DefinitionHelper } from "PipelineWorkflow/Scripts/Editor/Common/DefinitionHelper";
import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";
import { PipelineDefinition, PipelineDefinitionContractMetadata } from "PipelineWorkflow/Scripts/Common/Types";
import { DefinitionActionsCreator } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionActionsCreator";
import { DefinitionStore } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionStore";
import { DefinitionViewStore, IDefinitionViewStoreArgs } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionViewStore";
import { DeployWorkflowView } from "PipelineWorkflow/Scripts/Editor/DeployWorkflowContainerView";
import { DeployServiceClient } from "PipelineWorkflow/Scripts/ServiceClients/DeployServiceClient";
import { DeployPipelineDefinitionSource } from "PipelineWorkflow/Scripts/Editor/Sources/DeployPipelineDefinitionSource";
import { EnvironmentTemplateSource } from "PipelineWorkflow/Scripts/Editor/Sources/EnvironmentTemplateSource";
import { DefinitionUtils } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionUtils";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as RMUtilsCore from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core";

import { TaskDefinition } from "TFS/DistributedTask/Contracts";

import { NavigationView } from "VSS/Controls/Navigation";
import * as Diag from "VSS/Diag";
import { getRunningDocumentsTable, RunningDocumentsTableEntry } from "VSS/Events/Document";
import { HubsService } from "VSS/Navigation/HubsService";
import * as NavigationService from "VSS/Navigation/Services";
import * as Performance from "VSS/Performance";
import Serialization = require("VSS/Serialization");
import * as Service from "VSS/Service";
import * as StringUtils from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

/**
 * @brief WebAccess Control to load Deploy pipeline definition
 */
export class DeployPipelineDefinition extends NavigationView {

    public initializeOptions(options) {
        super.initializeOptions(JQueryWrapper.extend({
            attachNavigate: true
        }, options));

        /*
         There is a race condition between view initialization and creation of stores via flux initialization.
         This causes race condition where get store is called before create store for TaskTabStore (Bug 1038614).
         We should begin initialization of view after flux initialization is over.
         */
        this._initializeFlux();
    }

    public onNavigate(state: any) {
        if (state) {
            this._updateUrlIfLegacyState();
            const action = this._options.action = NavigationStateUtils.getAction().toLowerCase();
            const pageSource = NavigationStateUtils.getRequestSource();
            let properties = DefinitionUtils.createDefinitionProperties(pageSource);
            this._landingPageAction = this._getLandingPageAction(action);

            switch (this._landingPageAction) {
                case EditorActions.ACTION_EDIT_DEFINITION:
                    this._executeAsyncAction(() => { return this._edit(action); });
                    return;

                case EditorActions.ACTION_CREATE_DEFINITION:
                    this._executeAsyncAction(() => {
                        return this._create(action,
                            NavigationStateUtils.getPath(),
                            NavigationStateUtils.getBuildDefinitionId(),
                            NavigationStateUtils.getBuildDefinitionName(),
                            NavigationStateUtils.getProjectId(),
                            NavigationStateUtils.getProjectName(),
                            NavigationStateUtils.getTemplateId(),
                            properties);
                    });
                    return;

                case EditorActions.ACTION_CLONE_DEFINITION:
                    this._executeAsyncAction(() => { return this._clone(action, properties); });
                    return;

                case EditorActions.ACTION_IMPORT_DEFINITION:
                    this._executeAsyncAction(() => { return this._import(action, NavigationStateUtils.getPath(), properties); });
                    return;
                default:
                    // current default is the explorer hub. This may change in future.
                    this._executeAsyncAction(() => { return this._navigateToReleasesExplorerView(); });
                    return;
            }
        }
    }

    /**
     * @brief Initialize the main Store, ActionCreator and ServiceClient
     */
    public initialize(): void {
        super.initialize();

        Telemetry.instance().setArea("Deployment-Definition");
        AppContext.instance().IsSystemVariable = RMUtilsCore.Systemvariableprovider.isWellKnownReleaseSystemVariable;

        // Initialize the Service Client manager with DeployServiceClient object
        ServiceClientManager.GetServiceClient<DeployServiceClient>(DeployServiceClient);

        this._releaseDefinitionEditorEntry = getRunningDocumentsTable().add("ReleaseDefinitionEditor", this);
        TelemetryUtils.publishScreenResolutionTelemetry();
        this._registerShortcuts();
    }

    public dispose(): void {
        ReactDOM.unmountComponentAtNode(this.getElement()[0]);
        this._unregisterShortcuts();
        StoreManager.dispose();
        ActionCreatorManager.dispose();
        super.dispose();
    }

    public isDirty(): boolean {
        return this._dataStore.isDirty();
    }

    private _isValidAction(action: string): boolean {
        switch (action) {
            case EditorActions.ACTION_CREATE_DEFINITION:
            case EditorActions.ACTION_CLONE_DEFINITION:
            case EditorActions.ACTION_IMPORT_DEFINITION:
            case EditorActions.ACTION_EDIT_DEFINITION:
            case EditorActions.ACTION_PIPELINE_TAB:
            case EditorActions.ACTION_TASKS_TAB:
            case EditorActions.ACTION_HISTORY_TAB:
            case EditorActions.ACTION_VARIABLES_TAB:
            case EditorActions.ACTION_RETENTIONS_TAB:
            case EditorActions.ACTION_OPTIONS_TAB:
                return true;
            default:
                return false;
        }
    }

    /**
     * @brief gets the main landing page action
     */
    private _getLandingPageAction(action: string): string {

        if (!this._isValidAction(action)) {
            // if action is not valid, return
            return StringUtils.empty;
        }

        // in case of save of imported or cloned definition, action can change
        // so returning the main action
        if (action === EditorActions.ACTION_CLONE_DEFINITION ||
            action === EditorActions.ACTION_IMPORT_DEFINITION ||
            action === EditorActions.ACTION_CREATE_DEFINITION ||
            action === EditorActions.ACTION_EDIT_DEFINITION) {
            return action;
        }

        const definitionId = NavigationStateUtils.getDefinitionId();
        if (definitionId > 0) {
            return EditorActions.ACTION_EDIT_DEFINITION;
        }

        if (this._landingPageAction) {
            return this._landingPageAction;
        }

        return null;
    }

    private _executeAsyncAction(action: () => IPromise<void | void[]>): void {
        (action() as Q.Promise<void | void[]>).finally(() => {
            LoadingUtils.instance().cleanupLoadingControl();
        });
    }

    /**
     * Creates the view of Create New Definition workflow
     * @param buildDefinitionId 
     * @param buildDefinitionName 
     * @param projectId 
     * @param projectName 
     */
    private _create(action: string, path: string, buildDefinitionId: number, buildDefinitionName: string, projectId: string, projectName: string, templateId: string, properties?: IDictionaryStringTo<any>): IPromise<void[]> {

        if (!this._isViewCreated) {
            this._prefetchData();
            let createDefinitionPromise = this._actionCreator.createDefinition(path, buildDefinitionId, buildDefinitionName, projectId, projectName, templateId, properties);
            this._createView(action, path, 0, 0);
            this._isViewCreated = true;
            this._currentDefinitionId = 0;
            Performance.getScenarioManager().recordPageLoadScenario(CommonConstants.FeatureArea, PerfScenarios.CreateDefinition);
            return createDefinitionPromise;
        } else {
            this._updateView(action, 0);
            return Q.resolve<void[]>();
        }
    }


    /**
     * Creates the view for Edit Definition workflow
     * @param action 
     * @param definitionId 
     * @param environmentId 
     */
    private _edit(action: string): IPromise<void> {
        let definitionId = NavigationStateUtils.getDefinitionId();

        if (definitionId <= 0) {
            let error = StringUtils.format(Resources.InvalidDefinitionIdError, definitionId);
            this._createErrorBar(error);
            return Q.reject<void>(error);
        }

        let environmentId = NavigationStateUtils.getEnvironmentId();
        this._options.defintionId = definitionId;
        this._options.environmentId = environmentId;

        if (!this._isViewCreated) {

            return Q.all([
                TaskDefinitionSource.instance().getTaskDefinitionList(true),
                DeployPipelineDefinitionSource.instance().get(definitionId)
            ]).spread<void>((taskDefn: TaskDefinition[], definition: PipelineDefinition) => {
                this._actionCreator.editDefinition(definition);
                this._createView(action, definition.path, definitionId, environmentId);
                this._isViewCreated = true;
                this._currentDefinitionId = definitionId;
                Performance.getScenarioManager().recordPageLoadScenario(CommonConstants.FeatureArea, PerfScenarios.EditDefinition);

                this._prefetchData();
            }, (error) => {
                this._createErrorBar(error);
                return Q.reject<void>(error);
            });
        }
        else {
            this._updateView(action, definitionId);
            return Q.resolve<void>();
        }
    }

    private _clone(action: string, properties?: IDictionaryStringTo<any>): IPromise<void> {
        if (!this._isViewCreated) {
            const sourceDefinitionId = NavigationStateUtils.geSourceId();
            if (sourceDefinitionId <= 0) {
                let error = StringUtils.format(Resources.InvalidDefinitionIdError, sourceDefinitionId);
                this._createErrorBar(error);
                return Q.reject<void>(error);
            }

            this._options.defintionId = sourceDefinitionId;
            return Q.all([
                TaskDefinitionSource.instance().getTaskDefinitionList(true),
                DeployPipelineDefinitionSource.instance().get(sourceDefinitionId)
            ]).spread<void>((taskDefn: TaskDefinition[], definition: PipelineDefinition) => {
                definition = DefinitionHelper.normalizeDefinitionForClone(definition, properties);
                this._actionCreator.cloneDefinition(definition);
                this._createView(action, definition.path, definition.id);
                this._isViewCreated = true;
                this._currentDefinitionId = sourceDefinitionId;
                Performance.getScenarioManager().recordPageLoadScenario(CommonConstants.FeatureArea, PerfScenarios.CloneDefinition);
                this._prefetchData();
            }, (error) => {
                this._createErrorBar(error);
                return Q.reject<void>(error);
            });
        } else {
            this._updateView(action, 0);
            return Q.resolve<void>();
        }
    }

    private _import(action: string, path: string, properties?: IDictionaryStringTo<any>): IPromise<void> {
        if (!this._isViewCreated) {
            if (!this._importedDefinition) {
                this._importedDefinition = this._getImportedDefinition();
            }

            if (!this._importedDefinition) {
                return Q.resolve<void>();
            }

            this._importedDefinition.path = path ? path : AllDefinitionsContentKeys.PathSeparator;

            return TaskDefinitionSource.instance().getTaskDefinitionList(true).then((taskDefn: TaskDefinition[]) => {
                this._importedDefinition.properties = properties;
                this._actionCreator.importDefinition(this._importedDefinition).then(() => {

                    this._createView(action, path, 0, 0);
                    this._isViewCreated = true;
                    this._currentDefinitionId = this._importedDefinition.id;
                    Performance.getScenarioManager().recordPageLoadScenario(CommonConstants.FeatureArea, PerfScenarios.ImportDefinition);
                }, (error) => {
                    this._createErrorBar(error);
                    return Q.reject(error);
                });
                this._prefetchData();
            }, (error) => {

                this._createErrorBar(error);
                return Q.reject(error);
            });
        } else {
            this._updateView(action, 0);
            return Q.resolve<void>();
        }
    }

    private _updateView(action: string, definitionId: number): void {
        const environmentId = NavigationStateUtils.getEnvironmentId();
        this._view.update(action, definitionId, environmentId);
    }

    private _getImportedDefinition(): PipelineDefinition {
        const rdJsonString = window.sessionStorage.getItem(this.c_importedDefinitionSessionStorageKey);
        if (!!rdJsonString) {
            window.sessionStorage.removeItem(this.c_importedDefinitionSessionStorageKey);
            return this._getNormalizedDefinition(rdJsonString);
        }
        else {
            this._createErrorBar(Resources.ImportDefinitionError);
            return null;
        }
    }

    private _getNormalizedDefinition(rdJsonString: string): PipelineDefinition {
        try {
            const rawdefinition = JSON.parse(rdJsonString) as PipelineDefinition;
            const definition = Serialization.ContractSerializer.deserialize(rawdefinition, PipelineDefinitionContractMetadata);
            return DefinitionHelper.normalizeDefinitionForImport(definition);
        } catch (error) {
            this._createErrorBar(error);
        }

        return null;
    }

    private _prefetchData(): void {
        // prefetch tasks
        TaskDefinitionSource.instance().getTaskDefinitionList(true);

        // prefetch extensions
        if (AppContext.instance().isCapabilitySupported(AppCapability.MarketplaceExtensions)) {
            VSS.using(["DistributedTaskControls/Common/ExtensionUtils"], (ExtensionUtilsModule: typeof ExtensionUtils_LAZY_LOAD) => {
                ExtensionUtilsModule.ExtensionUtils.prefetchExtensions();
            });
        }

        //pretech template list
        EnvironmentTemplateSource.instance().updateTemplateList();
        // prefetch empty template data
        DeployPipelineDefinitionSource.instance().getEnvironmentTemplate(TemplateConstants.EmptyTemplateGuid);
    }

    private _initializeFlux() {
        // Initialize the ActionCreator
        this._actionCreator = ActionCreatorManager.GetActionCreator<DefinitionActionsCreator>(DefinitionActionsCreator);

        const definitionId = NavigationStateUtils.getDefinitionId();
        const environmentId = NavigationStateUtils.getEnvironmentId();

        // Initialize the store
        this._dataStore = StoreManager.GetStore<DefinitionStore>(DefinitionStore);
        this._viewStore = StoreManager.CreateStore<DefinitionViewStore, IDefinitionViewStoreArgs>(
            DefinitionViewStore,
            StringUtils.empty,
            {
                definitionId: definitionId || 0,
                environmentId: environmentId || 0
            }
        );
        this._messageHandlerActions = ActionsHubManager.GetActionsHub<MessageHandlerActions>(MessageHandlerActions);
    }

    /**
     * @brief Creates the view
     */
    private _createView(action: string, path?: string, definitionId?: number, environmentId?: number): void {

        if (this._view) {
            StoreManager.dispose();
            ActionCreatorManager.dispose();
            this._unregisterShortcuts();
            ReactDOM.unmountComponentAtNode(this.getElement()[0]);
            this._initializeFlux();
        }

        // Start the rendering of React based view
        this._view = ReactDOM.render(React.createElement(DeployWorkflowView, {
            action: action,
            path: path,
            definitionId: definitionId,
            environmentId: environmentId
        }), this.getElement()[0]);

        // Do a dummy markdown render so that the required modules for markdown are available.
        MarkdownRenderer.marked("markdown-preload-helper");
    }

    private _createErrorBar(error: any) {
        ReactDOM.render(React.createElement(ErrorMessageBar, {
            cssClass: "cd-error-message-bar",
            parentKey: ErrorMessageParentKeyConstants.MainParentKey
        }), this.getElement()[0]);

        let errorMessage = error.message || error;
        Diag.logError("[DeployPipelineDefinition._createErrorBar]: Error " + errorMessage);
        this._messageHandlerActions.addMessage.invoke({
            parentKey: ErrorMessageParentKeyConstants.MainParentKey,
            message: errorMessage,
            statusCode: error.status
        } as IAddMessagePayload);
    }

    private _navigateToReleasesExplorerView(): IPromise<void> {
        // Navigate to releases hub.
        const hubService = Service.getLocalService(HubsService);
        if (hubService.getSelectedHubId() === NavigationConstants.ReleaseManagementEditorHubId) {
            hubService.navigateToHub(NavigationConstants.ReleaseManagementExplorerHubId);
        }
        return Q.resolve<void>();
    }

    private _registerShortcuts() {
        DtcUtils.registertShortcuts();
    }

    private _unregisterShortcuts() {
        DtcUtils.unregisterShortcuts();
    }

    // Updates the old release url to new release url.
    private _updateUrlIfLegacyState(): void {
        let action = NavigationStateUtils.getAction().toLocaleLowerCase();
        const currentUrlState = NavigationService.getHistoryService().getCurrentState();
        if (this._isLegacyActionFragment(action)) {
            switch (action) {
                case EditorActions.ACTION_CLONE_DEFINITION:
                case EditorActions.ACTION_CREATE_DEFINITION:
                case EditorActions.ACTION_IMPORT_DEFINITION:
                    break;
                default:
                    action = EditorActions.ACTION_EDIT_DEFINITION;
            }

            const url = DefinitionUtils.getReleaseDefinitionUrl(action, currentUrlState);
            NavigationService.getHistoryService().replaceState(url);
        }
    }

    private _isLegacyActionFragment(action: string): boolean {
        if (action === OldReleaseDefinitionNavigateStateActions.ACTION_ENVIRONMENTS_EDITOR
            || action === OldReleaseDefinitionNavigateStateActions.ACTION_ARTIFACTS_EDITOR
            || action === OldReleaseDefinitionNavigateStateActions.ACTION_VARIABLES_EDITOR
            || action === OldReleaseDefinitionNavigateStateActions.ACTION_CONFIGURATIONS_EDITOR
            || action === OldReleaseDefinitionNavigateStateActions.ACTION_TRIGGERS_EDITOR
            || action === OldReleaseDefinitionNavigateStateActions.ACTION_GENERAL_SETTINGS_EDITOR
            || action === OldReleaseDefinitionNavigateStateActions.ACTION_RETENTION_POLICY_EDITOR
            || action === OldReleaseDefinitionNavigateStateActions.ACTION_DEFINITIONS_HISTORY
            || action === OldReleaseDefinitionNavigateStateActions.ACTION_ENVIRONMENTS_EDITOR_PREVIEW
            || action === OldReleaseDefinitionNavigateStateActions.ACTION_CREATE_DEFINITION
            || action === OldReleaseDefinitionNavigateStateActions.ACTION_IMPORT_DEFINITION
            || action === OldReleaseDefinitionNavigateStateActions.ACTION_CLONE_DEFINITION) {

            return true;
        }

        return false;
    }

    private _viewStore: DefinitionViewStore;
    private _dataStore: DefinitionStore;
    private _actionCreator: DefinitionActionsCreator;
    private _currentDefinitionId: number;
    private _view: DeployWorkflowView;
    private _messageHandlerActions: MessageHandlerActions;
    private _releaseDefinitionEditorEntry: RunningDocumentsTableEntry;
    private _landingPageAction: string;
    private _importedDefinition: PipelineDefinition;
    private _isViewCreated: boolean;

    private c_importedDefinitionSessionStorageKey = "microsoft.vsts.releasemanagement.importedDefinition";
}