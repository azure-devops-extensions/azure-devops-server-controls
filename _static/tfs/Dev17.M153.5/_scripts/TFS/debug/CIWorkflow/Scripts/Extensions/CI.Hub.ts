//
// This is a temporary entry point for the new Build-CI workflow extension.
// This will eventually change and the workflow extension will be instantiated via URI
//

/// <reference types="react" />
/// <reference types="react-dom" />

import * as Q from "q";

import * as React from "react";
import * as ReactDOM from "react-dom";

import { CommonConstants, ContributionConstants, BuildTasksVisibilityFilter } from "CIWorkflow/Scripts/Common/Constants";
import { DefaultPath } from "CIWorkflow/Scripts/Common/PathUtils";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import * as BuildDefinitionView_LAZY_LOAD from "CIWorkflow/Scripts/Scenarios/Definition/BuildDefinitionView";
import { INavigationView } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { NavigationUtils } from "CIWorkflow/Scripts/Common/NavigationUtils";
import { GettingStartedGetSourcesView } from "CIWorkflow/Scripts/Scenarios/Definition/GettingStartedGetSourcesView";
import { GettingStartedView } from "CIWorkflow/Scripts/Scenarios/Definition/GettingStartedView";
import * as BuildDefinitionSource_LAZY_LOAD from "CIWorkflow/Scripts/Scenarios/Definition/Sources/BuildDefinitionSource";
import * as DefaultRepositorySource_LAZY_LOAD from "CIWorkflow/Scripts/Scenarios/Definition/Sources/DefaultRepositorySource";
import { DefaultRepositorySource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/DefaultRepositorySource";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { AppContext, AppCapability } from "DistributedTaskControls/Common/AppContext";
import * as ExtensionUtils_LAZY_LOAD from "DistributedTaskControls/Common/ExtensionUtils";
import { LoadingUtils } from "DistributedTaskControls/Common/LoadingUtils";
import { Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { TelemetryUtils } from "DistributedTaskControls/Common/TelemetryUtils";
import * as TaskDefinitionSource_LAZY_LOAD from "DistributedTaskControls/Sources/TaskDefinitionSource";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import * as Controls from "VSS/Controls";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as NavigationService from "VSS/Navigation/Services";
import * as Service from "VSS/Service";
import * as SDK from "VSS/SDK/Shim";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Extensions/CI.Hub";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

export class CIHub extends Controls.Control<{}> {
    private _lastNavigationState: INavigationState;
    private _currentNavigationView: INavigationView;
    private _buildDefinitionView: BuildDefinitionView_LAZY_LOAD.BuildDefinition;

    public initialize(): void {
        this._disposeManagers();

        // TODO: Work with open ALM to identify the best way to set the direction property.
        // For now setting it here to ensure that all office fabric styles work properly
        // This will not have any side effect on other elements because the dir="ltr" is set
        // on all pages that inherit from TFS master page.
        $("html").attr("dir", "ltr");

        // The default min width of main container is set to 1024px. This causes multiple horizontal
        // scrollbars when the window is resized. Setting this to a lower min-width to ensure that
        // multiple horizontal scrollbars do not come often.
        let element = $(".main-container > .main");
        if (element.length >= 0) {
            element.css("min-width", "700px");
        }

        this.getElement().addClass("ci-workflow");

        this._setAppContextCapabilities();

        let state = NavigationService.getHistoryService().getCurrentState();
        if (!state.action) {
            // if there is no action, default to the getting-started experience. yes, this will clobber anything else on the query string.
            NavigationService.getHistoryService().pushState(`?_a=${ContributionConstants.ACTION_BUILD_DEFINITION_GETTING_STARTED}`);
        }

        NavigationService.getHistoryService().attachNavigate(ContributionConstants.ACTION_CREATE_BUILD_DEFINITION, this._actionCreateDefinitionHandler, true);
        NavigationService.getHistoryService().attachNavigate(ContributionConstants.ACTION_EDIT_BUILD_DEFINITION, this._actionEditDefinitionHandler, true);
        NavigationService.getHistoryService().attachNavigate(ContributionConstants.ACTION_CLONE_BUILD_DEFINITION, this._actionCloneDefinitionHandler, true);
        NavigationService.getHistoryService().attachNavigate(ContributionConstants.ACTION_IMPORT_BUILD_DEFINITION, this._actionImportDefinitionHandler, true);
        NavigationService.getHistoryService().attachNavigate(ContributionConstants.ACTION_BUILD_DEFINITION_GETTING_STARTED, this._actionGettingStartedHandler, true);
        NavigationService.getHistoryService().attachNavigate(ContributionConstants.ACTION_BUILD_DEFINITION_GETTING_STARTED_TEMPLATE, this._actionGettingStartedTemplateHandler, true);

        // Create telemetry object and initialize with right feature area
        Telemetry.instance().setArea(CommonConstants.FeatureArea);

        TelemetryUtils.publishScreenResolutionTelemetry();
    }

    public dispose() {
        this._disposeManagers();
        // Dispose task definition cache
        VSS.using([
            "DistributedTaskControls/Sources/TaskDefinitionSource",
        ], (TaskDefinitionSourceModule: typeof TaskDefinitionSource_LAZY_LOAD) => {
                TaskDefinitionSourceModule.TaskDefinitionSource.instance().disposeTaskDefinitionCache();
            });

        super.dispose();
        NavigationService.getHistoryService().detachNavigate(ContributionConstants.ACTION_CREATE_BUILD_DEFINITION, this._actionCreateDefinitionHandler);
        NavigationService.getHistoryService().detachNavigate(ContributionConstants.ACTION_EDIT_BUILD_DEFINITION, this._actionEditDefinitionHandler);
        NavigationService.getHistoryService().detachNavigate(ContributionConstants.ACTION_CLONE_BUILD_DEFINITION, this._actionCloneDefinitionHandler);
        NavigationService.getHistoryService().detachNavigate(ContributionConstants.ACTION_IMPORT_BUILD_DEFINITION, this._actionImportDefinitionHandler);
        NavigationService.getHistoryService().detachNavigate(ContributionConstants.ACTION_BUILD_DEFINITION_GETTING_STARTED, this._actionGettingStartedHandler);
        NavigationService.getHistoryService().detachNavigate(ContributionConstants.ACTION_BUILD_DEFINITION_GETTING_STARTED_TEMPLATE, this._actionGettingStartedTemplateHandler);
    }

    private _actionCreateDefinitionHandler = () => {
        this._processNavigation(ContributionConstants.ACTION_CREATE_BUILD_DEFINITION);
    }

    private _actionEditDefinitionHandler = () => {
        this._processNavigation(ContributionConstants.ACTION_EDIT_BUILD_DEFINITION);
    }

    private _actionCloneDefinitionHandler = () => {
        this._processNavigation(ContributionConstants.ACTION_CLONE_BUILD_DEFINITION);
    }

    private _actionImportDefinitionHandler = () => {
        this._processNavigation(ContributionConstants.ACTION_IMPORT_BUILD_DEFINITION);
    }

    private _actionGettingStartedHandler = () => {
        this._processNavigation(ContributionConstants.ACTION_BUILD_DEFINITION_GETTING_STARTED);
    }

    private _actionGettingStartedTemplateHandler = () => {
        this._processNavigation(ContributionConstants.ACTION_BUILD_DEFINITION_GETTING_STARTED_TEMPLATE);
    }

    private _disposeManagers(): void {
        StoreManager.dispose();
        ActionCreatorManager.dispose();
        SourceManager.dispose();
    }

    private _processNavigation(action: string): void {
        if (!this._currentNavigationView || this._currentNavigationView.canNavigateAway(action)) {

            if (this._currentNavigationView) {
                this._currentNavigationView.dispose();
            }

            if (this.getElement()) {
                this.getElement().empty();
            }

            switch (action) {
                case ContributionConstants.ACTION_CREATE_BUILD_DEFINITION:
                case ContributionConstants.ACTION_EDIT_BUILD_DEFINITION:
                case ContributionConstants.ACTION_CLONE_BUILD_DEFINITION:
                case ContributionConstants.ACTION_IMPORT_BUILD_DEFINITION:
                    this._showDefinitionEditorView(action);
                    break;

                case ContributionConstants.ACTION_BUILD_DEFINITION_GETTING_STARTED:
                    StoreManager.dispose();
                    this._showAppropriateGettingStartedView();
                    break;

                case ContributionConstants.ACTION_BUILD_DEFINITION_GETTING_STARTED_TEMPLATE:
                    this._showGettingStartedTemplateView();
                    break;

                default:
                    break;
            }

            this._lastNavigationState = {
                action: action,
                data: NavigationService.getHistoryService().getCurrentState(),
                windowTitle: document.title
            };
        }
        else {
            NavigationService.getHistoryService().addHistoryPoint(this._lastNavigationState.action, this._lastNavigationState.data, this._lastNavigationState.windowTitle, true);
        }
    }

    private _showAppropriateGettingStartedView(): void {
        // If there is already a repo selected then go to templates page
        if (NavigationUtils.getRepositoryNameFromUrl()) {
            this._showGettingStartedTemplateView();
        }
        else {
            this._showGettingStartedView();
        }
    }

    private _showGettingStartedTemplateView(): void {
        this._currentNavigationView = Controls.Control.create(GettingStartedView, this.getElement(), { isPartOfFlow: true });

        VSS.using([
            "DistributedTaskControls/Sources/TaskDefinitionSource",
            "CIWorkflow/Scripts/Scenarios/Definition/Sources/BuildDefinitionSource"
        ], (TaskDefinitionSourceModule: typeof TaskDefinitionSource_LAZY_LOAD,
            BuildDefinitionSourceModule: typeof BuildDefinitionSource_LAZY_LOAD) => {

                // Prefetch task definitions so that it is available when templates are applied.
                TaskDefinitionSourceModule.TaskDefinitionSource.instance().getTaskDefinitionList(true, BuildTasksVisibilityFilter);
                BuildDefinitionSourceModule.BuildDefinitionSource.instance().getBuildOptionDefinitions();
                BuildDefinitionSourceModule.BuildDefinitionSource.instance().getRetentionSettings();
            });

        VSS.using(
            [
                "CIWorkflow/Scripts/Scenarios/Definition/BuildDefinitionView",
                "CIWorkflow/Scripts/Scenarios/Definition/Sources/DefaultRepositorySource"
            ],
            (
                BuildDefinitionModule: typeof BuildDefinitionView_LAZY_LOAD,
                DefaultRepositorySourceModule: typeof DefaultRepositorySource_LAZY_LOAD
            ) => {
                // Start fetching the BuildDefinition view in anticipation. The main TTI scenario is the Getting started experience for build.
                // Load any other view asynchronously to ensure that "Getting Started" experience has the minimum bundle size.

                // This means that refreshing a page with "Create Build Definition" and "Edit Build Definition" will be slightly slower.

                // Start fetching the default repository source while the user is in getting started page so that the creation of build definition is fast.
                DefaultRepositorySourceModule.DefaultRepositorySource.instance().getDefaultRepositoryForProject();
            });
    }

    private _showGettingStartedView(): void {
        this._currentNavigationView = Controls.Control.create(GettingStartedGetSourcesView, this.getElement(), { isPartOfFlow: true });
    }

    private _showDefinitionEditorView(action: any): void {
        let loadingContainer = LoadingUtils.instance().createLoadingControl("ci-loading-container");

        // Prefetch extensions
        if (AppContext.instance().isCapabilitySupported(AppCapability.MarketplaceExtensions)) {
            VSS.using(["DistributedTaskControls/Common/ExtensionUtils"], (ExtensionUtilsModule: typeof ExtensionUtils_LAZY_LOAD) => {
                ExtensionUtilsModule.ExtensionUtils.prefetchExtensions();
            });
        }

        VSS.using(["CIWorkflow/Scripts/Scenarios/Definition/BuildDefinitionView"], (BuildDefinitionModule: typeof BuildDefinitionView_LAZY_LOAD) => {

            this._buildDefinitionView = this._currentNavigationView = Controls.Control.create<BuildDefinitionView_LAZY_LOAD.BuildDefinition, any>(BuildDefinitionModule.BuildDefinition, this.getElement(), null);
            switch (action) {
                case ContributionConstants.ACTION_CREATE_BUILD_DEFINITION:
                    this._executeAsyncAction(() => { return this._buildDefinitionView.create(this._getTemplatedId(), this._getFolderPath(), this._getRepositoryName(), this._getRepositoryType(), this._getTriggers()); });
                    break;

                case ContributionConstants.ACTION_EDIT_BUILD_DEFINITION:
                    this._executeAsyncAction(() => { return this._handleEditOrCloneAction(this._buildDefinitionView); });
                    break;

                case ContributionConstants.ACTION_CLONE_BUILD_DEFINITION:
                    this._executeAsyncAction(() => { return this._handleEditOrCloneAction(this._buildDefinitionView, true); });
                    break;

                case ContributionConstants.ACTION_IMPORT_BUILD_DEFINITION:
                    this._executeAsyncAction(() => { return this._buildDefinitionView.import(); });
                    break;

                default:
                    this._cleanupLoadingControl();
                    break;
            }
        }, (error) => {
            this._cleanupLoadingControl();
            this._handleError(error.message || error);
        });
    }

    private _setAppContextCapabilities(): void {
        let capabilities: AppCapability[] = [
            AppCapability.Build,
            AppCapability.LinkProcessParameters,
            AppCapability.ViewYAML,
            AppCapability.VariablesForTasktimeout,
            AppCapability.PhaseJobCancelTimeout
        ];

        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.MarketplaceExtensionSupport, false)) {
            capabilities.push(AppCapability.MarketplaceExtensions);
        }

        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.ShowTaskGroupDemands, false)) {
            capabilities.push(AppCapability.ShowTaskGroupDemands);
        }

        AppContext.instance().Capabilities = capabilities;
    }

    private _executeAsyncAction(action: () => IPromise<void>): void {
        (action() as Q.Promise<void>).finally(() => {
            this._cleanupLoadingControl();
        });
    }

    private _cleanupLoadingControl(): void {
        LoadingUtils.instance().cleanupLoadingControl();
        if (this._buildDefinitionView) {
            this._buildDefinitionView.refreshViewAfterLoad();
        }
    }

    private _handleEditOrCloneAction(buildDefinitionView: any, isClone: boolean = false): IPromise<void> {
        let id = this._getBuildDefinitionId();
        if (id > 0) {
            if (isClone) {
                return buildDefinitionView.clone(id);
            }
            else {
                return buildDefinitionView.edit(id);
            }
        }
        else {
            let error = Utils_String.format(Resources.InvalidBuildDefinitionIdError, id);
            this._handleError(error);
            return Q.reject<void>(error);
        }
    }

    private _getTemplatedId(): string {
        let state = NavigationService.getHistoryService().getCurrentState();
        let templateId = "blank";
        if (state && state.templateId) {
            templateId = state.templateId;
        }

        return templateId;
    }

    private _getFolderPath(): string {
        let state = NavigationService.getHistoryService().getCurrentState();
        let folderPath = (state && state.path) ? state.path : DefaultPath;
        return folderPath;
    }

    private _getRepositoryName(): string {
        let state = NavigationService.getHistoryService().getCurrentState();
        let repository = (state && state.repository) ? state.repository : null;
        return repository;
    }

    private _getRepositoryType(): string {
        let state = NavigationService.getHistoryService().getCurrentState();
        let repositoryType = (state && state.repositoryType) ? state.repositoryType : null;
        return repositoryType;
    }

    private _getBuildDefinitionId(): number {
        let state = NavigationService.getHistoryService().getCurrentState();
        let id = 0;
        if (state && state.id) {
            id = parseInt(state.id);
        }

        return id;
    }

    private _getTriggers(): string {
        let state = NavigationService.getHistoryService().getCurrentState();
        return (state && state.triggers) ? state.triggers : null;
    }

    private _handleError(error: string): void {
        alert(error);
    }
}

interface INavigationState {
    action: string;
    data: any;
    windowTitle: string;
}

SDK.registerContent("ci-workflow-hub", (context) => {
    AppContext.instance().PageContext = context.options._pageContext;
    return Controls.Control.create<CIHub, {}>(CIHub, context.$container, {});
});
