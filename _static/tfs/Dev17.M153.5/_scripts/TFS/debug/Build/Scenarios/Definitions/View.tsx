/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />
import * as Q from "q";
import * as React from "react";
import * as ReactDOM from "react-dom";

import * as TFS_Admin_Security_NOREQUIRE from "Admin/Scripts/TFS.Admin.Security";

import { BuildViewBase } from "Build/Scenarios/BuildViewBase";
import { getAllBuildsEventManager } from "Build/Scenarios/Definitions/AllBuilds/Events/AllBuildsEventManager";
import { DefinitionsViewData } from "Build/Scenarios/Definitions/DefinitionsViewData";
import { ViewStateStore, getInstance as getViewStateStore, viewStateUpdated } from "Build/Scenarios/Definitions/ViewState";
import * as Build_Actions from "Build/Scripts/Actions/Actions";
import { getDefinitions } from "Build/Scripts/Actions/DefinitionsActionCreator";
import { UserActions } from "Build/Scripts/Constants";
import { setVssLWPPageContext, vssLWPPageContext } from "Build/Scripts/Context";
import { initializeEventManager, disposeMessageBarEventManager } from "Build/Scripts/Events/MessageBarEvents";
import { handleFolderNavigation, sanitizePath } from "Build/Scripts/Folders";
import { DataProviderKeys } from "Build/Scripts/Generated/TFS.Build.Plugins";
import { IContributionNavigationState } from "Build/Scripts/Linking";
import * as NewDefinitionDialog_NO_REQUIRE from "Build/Scripts/NewDefinitionDialog";
import { addPageLoadSplitTiming, startPageLoadScenario } from "Build/Scripts/Performance";
import * as BuildRealtime from "Build/Scripts/Realtime";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { showFolderSecurityDialog } from "Build/Scripts/Security";
import { loadSignalR } from "Build/Scripts/SignalR";
import { BuildsSource } from "Build/Scripts/Sources/Builds";
import { DefinitionSource } from "Build/Scripts/Sources/Definitions";
import { buildHistoryEntryTypeInfo, getBuildStore, initializeBuildStore } from "Build/Scripts/Stores/Builds";
import { buildChangeTypeInfo, getChangesStore, initializeChangesStore } from "Build/Scripts/Stores/Changes";
import { ContributionStore, getContributionStore } from "Build/Scripts/Stores/Contributions";
import { DefinitionFavoritesActionCreator, getDefinitionFavoriteStore, initializeDefinitionFavoriteStore } from "Build/Scripts/Stores/DefinitionFavorites";
import { DefinitionStore, getDefinitionStore } from "Build/Scripts/Stores/Definitions";
import { getQueuesStore, initializeQueuesStore, InitializeQueuesStorePayload } from "Build/Scripts/Stores/Queues";
import { PoolEvents } from "Build/Scripts/TFS.DistributedTask.AgentPool.Realtime";

import * as Utils from "Build/Scripts/Utilities/Utils";

import { BuildClientService } from "Build.Common/Scripts/ClientServices";
import { BuildLinks, DefinitionsActions } from "Build.Common/Scripts/Linking";

import { Fabric } from "OfficeFabric/components/Fabric/Fabric";

import * as PivotView from "Presentation/Scripts/TFS/Components/PivotView";
import * as PivotViewActionsHub from "Build/Scripts/PivotViewActionsHub";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as BuildContracts from "TFS/Build/Contracts";
import * as DTContracts from "TFS/DistributedTask/Contracts";
import AgentAcquisitionDialog = require("DistributedTaskControls/Components/AgentAcquisitionDialog");

import * as Dialogs_NO_REQUIRE from "VSS/Controls/Dialogs";
import * as Utils_String from "VSS/Utils/String";

import { Enhancement } from "VSS/Controls";
import { WebPageDataService } from "VSS/Contributions/Services";
import { Debug } from "VSS/Diag";
import { getService as getActionService, CommonActions } from "VSS/Events/Action";
import { getService as getEventService, EventService } from "VSS/Events/Services";
import { getHistoryService, HistoryService } from "VSS/Navigation/Services";
import { ContractSerializer } from "VSS/Serialization";
import { getService, getCollectionService } from "VSS/Service";
import { classExtend, using, tfsModuleLoaded } from "VSS/VSS";

import { getLWPModule } from "VSS/LWP";
const FPS = getLWPModule("VSS/Platform/FPS");

var definitionsViewSelector = ".build-definitions-view";

export function getContributedPageData(service: WebPageDataService): DefinitionsViewData {
    return service.getPageData<DefinitionsViewData>("ms.vss-build-web.build-definitions-hub-mine-tab-data-provider") ||
        service.getPageData<DefinitionsViewData>("ms.vss-build-web.build-definitions-hub-alldefinitions-tab-data-provider") ||
        service.getPageData<any>("ms.vss-build-web.build-definitions-hub-alldefinitions2-tab-data-provider") ||
        service.getPageData<DefinitionsViewData>("ms.vss-build-web.build-definitions-hub-queued-tab-data-provider") ||
        service.getPageData<DefinitionsViewData>("ms.vss-build-web.build-definitions-hub-allbuilds-tab-data-provider");
}

export interface IDefinitionsViewOptions {
    tfsContext?: TfsContext;
    buildService?: BuildClientService;
    buildsSource?: BuildsSource;
    definitionSource?: DefinitionSource;
    pageContext: Object;
}

class ControllerView extends React.Component<React.Props<any>, PivotView.Props> {
    private _contributionStore: ContributionStore;
    private _viewState: ViewStateStore;
    private _onStoresUpdated: () => void;

    constructor(props: React.Props<any>) {
        super(props);

        this._contributionStore = getContributionStore();

        this.state = this._getState();

        this._onStoresUpdated = () => {
            this.setState(this._getState());
        }
    }

    public render(): JSX.Element {
        return <Fabric>
            <PivotView.Component {...this.state} />
        </Fabric>;
    }

    public componentDidMount() {
        // add changed listeners
        this._contributionStore.addChangedListener(this._onStoresUpdated);
    }

    public componentWillUnmount() {
        // remove changed listeners
        this._contributionStore.removeChangedListener(this._onStoresUpdated);
    }

    private _getState(): PivotView.Props {
        let items: PivotView.PivotViewItem[] = [];

        let contributions = this._contributionStore.getContributionsForTarget("ms.vss-build-web.build-definitions-hub-tab-group", "ms.vss-web.tab");
        if (!contributions.pending && contributions.result.length > 0) {
            items = contributions.result.map((contribution: Contribution, index: number) => {
                return {
                    tabKey: contribution.properties.action,
                    title: contribution.properties.name,
                    contribution: contribution
                };
            });
        }

        return {
            items: items,
            actions: PivotViewActionsHub.getPivotViewActionsHub()
        };
    }
}

export class DefinitionsView extends BuildViewBase {
    private _tfsContext: TfsContext;
    private _buildService: BuildClientService;
    private _buildsSource: BuildsSource;
    private _eventManager: EventService;
    private _historyService: HistoryService;
    private _hub: BuildRealtime.HubBase | undefined;

    private _definitionStore: DefinitionStore;
    private _definitionSource: DefinitionSource;
    private _viewState: ViewStateStore;
    private _onViewStateUpdated: () => void;

    constructor(options?: IDefinitionsViewOptions) {
        super(options);
        if (options) {
            initializeEventManager(options.pageContext);
            setVssLWPPageContext(options.pageContext);
        }
    }

    _dispose(): void {
        super._dispose();
        if (this._hub) {
            this._hub.stop();
            this._hub = null;
            getAllBuildsEventManager().dispose();
            disposeMessageBarEventManager();
        }

        if (this._historyService) {
            this._historyService.detachNavigate(this._onViewStateUpdated);
        }

        if (this._eventManager) {
            this._eventManager.detachEvent(UserActions.NewAgent, this._onNewAgent);
            this._eventManager.detachEvent(UserActions.NewDefinition, this._onNewDefinition);
            this._eventManager.detachEvent(UserActions.AddToMyFavorites, this._onFavoriteAdded);
            this._eventManager.detachEvent(UserActions.RemoveFromMyFavorites, this._onFavoriteRemoved);
            this._eventManager.detachEvent(UserActions.GetMoreMyFavorites, this._onGetMoreFavorites);
            this._eventManager.detachEvent(UserActions.GetMoreTeamFavorites, this._onGetMoreTeamFavorites);
            this._eventManager.detachEvent(UserActions.FolderClicked, this._onFolderClicked);
            this._eventManager.detachEvent(UserActions.ViewFolderSecurity, this._onViewFolderSecurity);
            this._eventManager.detachEvent(PoolEvents.AgentAdded, this._onAgentAdded);
            this._eventManager.detachEvent(PoolEvents.AgentDeleted, this._onAgentDeleted);
            this._eventManager.detachEvent(PoolEvents.AgentRequestAssigned, this._onAgentRequestUpdated);
            this._eventManager.detachEvent(PoolEvents.AgentRequestQueued, this._onAgentRequestUpdated);
            this._eventManager.detachEvent(PoolEvents.AgentRequestStarted, this._onAgentRequestUpdated);
            this._eventManager.detachEvent(PoolEvents.AgentRequestCompleted, this._onAgentRequestUpdated);
            this._eventManager.detachEvent(UserActions.RetainBuild, this._onRetainBuild);
            this._eventManager.detachEvent(UserActions.StopRetainingBuild, this._onStopRetainingBuild);
        }

        document.body.removeEventListener("fpsLoaded", this._onViewStateUpdated);
    }

    initializeOptions(options?: IDefinitionsViewOptions): void {
        this._tfsContext = (options && options.tfsContext) ? options.tfsContext : TfsContext.getDefault();
        this._buildService = (options && options.buildService) ? options.buildService : getCollectionService(BuildClientService);
        this._buildsSource = (options && options.buildsSource) ? options.buildsSource : getCollectionService(BuildsSource);
        this._definitionSource = (options && options.definitionSource) ? options.definitionSource : getCollectionService(DefinitionSource);

        super.initializeOptions($.extend({
            hubContentSelector: ".build-definitions-view-content",
            attachNavigate: true
        }, options));
    }

    initialize(): void {
        super.initialize();
        const projectGuid = this._options.projectGuid || this._tfsContext.navigation.projectId;

        this._historyService = getHistoryService();
        let urlState = this._historyService.getCurrentState();
        this._viewState = getViewStateStore(urlState);

        // start the PLT scenario. this view will render a ControllerView, which will render a PivotView, and the tab it renders will end the PLT scenario
        let performance = startPageLoadScenario(this._viewState.getScenarioName());

        addPageLoadSplitTiming("begin initialize");
        this._onViewStateUpdated = () => {
            viewStateUpdated.invoke({
                urlState: this._historyService.getCurrentState()
            });
        }
        this._historyService.attachNavigate(this._onViewStateUpdated);
        document.body.addEventListener("fpsLoaded", this._onViewStateUpdated);
        this._onViewStateUpdated();

        // initialize stores
        this._definitionStore = getDefinitionStore();

        let contributionService: WebPageDataService = (this._options && this._options.contributionService) ? this._options.contributionService : getService(WebPageDataService);
        let definitionSource = getCollectionService(DefinitionSource);

        const pageData = getContributedPageData(contributionService) || {} as DefinitionsViewData;
        const definitionsViewData = {
            favorites: pageData.favorites || [],
            definitions: ContractSerializer.deserialize(pageData.definitions || pageData[DataProviderKeys.Definitions], BuildContracts.TypeInfo.BuildDefinition) || [],
            builds: ContractSerializer.deserialize(pageData.builds || pageData[DataProviderKeys.Builds], BuildContracts.TypeInfo.Build) || [],
            buildHistory: ContractSerializer.deserialize(pageData.buildHistory || pageData[DataProviderKeys.BuildHistory], buildHistoryEntryTypeInfo) || [],
            changes: ContractSerializer.deserialize(pageData.changes || pageData[DataProviderKeys.Changes], buildChangeTypeInfo) || [],
            queues: ContractSerializer.deserialize(pageData.queues || pageData[DataProviderKeys.Queues], null) || null
        } as DefinitionsViewData;

        if (definitionsViewData.definitions.length > 0) {
            definitionSource.initializeDefinitions(definitionsViewData.definitions);
            if (this._definitionStore.getDefinitions(DefinitionStore.exists, 1).length > 0) {
                this._subscribeToProject(projectGuid);
            }
        }
        else {
            getDefinitions(definitionSource).then(result => {
                if (result.definitions && result.definitions.length > 0) {
                    this._subscribeToProject(projectGuid);
                }
            });
        }

        addPageLoadSplitTiming("initialized DefinitionStore");

        getDefinitionFavoriteStore();
        initializeDefinitionFavoriteStore.invoke(() => {
            return {
                favorites: definitionsViewData.favorites,
                teams: pageData.myTeams
            };
        });
        addPageLoadSplitTiming("initialized DefinitionFavoriteStore");

        if (definitionsViewData.queues) {
            getQueuesStore();
            initializeQueuesStore.invoke(() => { return { queues: definitionsViewData.queues }; });
            addPageLoadSplitTiming("initialized QueuesStore");
        }

        getBuildStore();
        initializeBuildStore.invoke(() => {
            return {
                allBuilds: definitionsViewData.builds,
                buildHistory: definitionsViewData.buildHistory
            };
        });
        addPageLoadSplitTiming("initialized BuildStore");

        getChangesStore();
        initializeChangesStore.invoke(() => {
            return {
                allChanges: definitionsViewData.changes
            };
        });
        addPageLoadSplitTiming("initialized ChangesStore");

        this._eventManager = getEventService();

        this._eventManager.attachEvent(UserActions.NewAgent, this._onNewAgent);
        this._eventManager.attachEvent(UserActions.NewDefinition, this._onNewDefinition);
        this._eventManager.attachEvent(UserActions.AddToMyFavorites, this._onFavoriteAdded);
        this._eventManager.attachEvent(UserActions.RemoveFromMyFavorites, this._onFavoriteRemoved);
        this._eventManager.attachEvent(UserActions.GetMoreMyFavorites, this._onGetMoreFavorites);
        this._eventManager.attachEvent(UserActions.GetMoreTeamFavorites, this._onGetMoreTeamFavorites);
        this._eventManager.attachEvent(UserActions.FolderClicked, this._onFolderClicked);
        this._eventManager.attachEvent(UserActions.ViewFolderSecurity, this._onViewFolderSecurity);
        this._eventManager.attachEvent(PoolEvents.AgentAdded, this._onAgentAdded);
        this._eventManager.attachEvent(PoolEvents.AgentDeleted, this._onAgentDeleted);
        this._eventManager.attachEvent(PoolEvents.AgentRequestAssigned, this._onAgentRequestUpdated);
        this._eventManager.attachEvent(PoolEvents.AgentRequestQueued, this._onAgentRequestUpdated);
        this._eventManager.attachEvent(PoolEvents.AgentRequestStarted, this._onAgentRequestUpdated);
        this._eventManager.attachEvent(PoolEvents.AgentRequestCompleted, this._onAgentRequestUpdated);
        this._eventManager.attachEvent(UserActions.RetainBuild, this._onRetainBuild);
        this._eventManager.attachEvent(UserActions.StopRetainingBuild, this._onStopRetainingBuild);

        let hubContent = this._element.find(this._options.hubContentSelector);
        Debug.assert(hubContent.length > 0, "Unable to find right hub content element");

        ReactDOM.render(<ControllerView />, hubContent[0]);

        addPageLoadSplitTiming("end initialize");

        if (this._viewState.getAction() === "new") {
            getEventService().fire(UserActions.NewDefinition, this);
        }

    }

    onNavigate(state: IContributionNavigationState): void {
        if (state) {
            if (Utils_String.equals(state.action, DefinitionsActions.All, true)) {
                let path = state.path || "\\";
                getEventService().fire(UserActions.FolderClicked, this, sanitizePath(path));
            }
            else if (Utils_String.equals(state.action, DefinitionsActions.AllBuilds, true)) {
                getAllBuildsEventManager().raiseNavigationStateChanged();
            }
            else if ((state as any).buildUri) {
                // buildUri is only sent by VS. casting state to any instead of adding buildUri to the IContributionNavigationState definition to discourage further use

                // for logs and drop, VS generates URLs like
                // http://scdallam-x230:8080/tfs/defaultcollection/MyTfvcProject/_build#buildUri=vstfs%3A%2F%2F%2FBuild%2FBuild%2F2&logPath=&_a=diagnostics
                // everything after the # never goes to the server, so the mvc controller just sends us to the default page
                // so we need to look at the buildUri and the action (_a) here.
                // if we have a buildUri and the action is diagnostics or drop, it's a link from VS to a XAML build
                // for other links like "Open in browser" VS uses actual querystring (?) parameters, so those Just Work

                // purposely using string literals here and not constants: these are for back-compat and should not be refactored
                if (Utils_String.equals(state.action, "diagnostics", true)
                    || Utils_String.equals(state.action, "drop", true)) {
                    // the web framework conveniently translated the # to ? for us but didn't actually navigate, so navigate now.
                    getActionService().performAction(CommonActions.ACTION_WINDOW_NAVIGATE, {
                        url: window.location
                    });
                }
            }
        }
    }

    private _subscribeToProject(projectGuid: string): void {
        // if we're coming from a new contributed hub, we need to pull in SignalR
        loadSignalR().then(() => {
            this._hub = BuildRealtime.HubFactory.createRealTimeHub(this._buildService);
            this._hub.subscribeToProject(projectGuid);
        });
    }

    private _getAgentPlatforms(): IDictionaryStringTo<AgentAcquisitionDialog.IAgentAcquisitionGuidance> {
        let platforms: IDictionaryStringTo<AgentAcquisitionDialog.IAgentAcquisitionGuidance> = {};
        platforms[AgentAcquisitionDialog.PackagePlatforms.Windows] = { createAgentScript: BuildResources.AgentAcquisitionWindowsCreateAgentMarkdownFormat, configureAgentScript: BuildResources.AgentAcquisitionWindowsConfigureAgentMarkdownFormat, runAgentScript: BuildResources.AgentAcquisitionWindowsRunAgentMarkdown, detailedInstructionsLink: "http://go.microsoft.com/fwlink/?LinkID=825113" };
        platforms[AgentAcquisitionDialog.PackagePlatforms.Linux] = { createAgentScript: BuildResources.AgentAcquisitionLinuxCreateAgentMarkdownFormat, configureAgentScript: BuildResources.AgentAcquisitionLinuxConfigureAgentMarkdownFormat, runAgentScript: BuildResources.AgentAcquisitionLinuxRunAgentMarkdown, detailedInstructionsLink: "http://go.microsoft.com/fwlink/?LinkID=825115" };
        platforms[AgentAcquisitionDialog.PackagePlatforms.Darwin] = { createAgentScript: BuildResources.AgentAcquisitionDarwinCreateAgentMarkdownFormat, configureAgentScript: BuildResources.AgentAcquisitionDarwinConfigureAgentMarkdownFormat, runAgentScript: BuildResources.AgentAcquisitionDarwinRunAgentMarkdown, detailedInstructionsLink: "http://go.microsoft.com/fwlink/?LinkID=825114" };

        return platforms;
    }

    private _onNewAgent = (sender: any, eventArgs: any) => {
        var options: AgentAcquisitionDialog.IAgentAcquisitionDialogOptions = {
            agentAcquisitionGuidances: this._getAgentPlatforms()
        }
        using(["VSS/Controls/Dialogs"], (_Dialogs: typeof Dialogs_NO_REQUIRE) => {
            _Dialogs.show(AgentAcquisitionDialog.AgentAcquisitionDialog, options);
        });
    };

    private _onNewDefinition = (sender: any, eventArgs: NewDefinitionDialog_NO_REQUIRE.INewDefinitionDialogOptions) => {
        let path = (eventArgs && eventArgs.folderPath) ? eventArgs.folderPath : Utils.getFolderPathFromUrl();
        let source = (eventArgs && eventArgs.source) ? eventArgs.source : Utils.getSourceFromUrl();
        let newDefinitonUrl = BuildLinks.getGettingStartedUrl(path, source);
        FPS.onClickFPS(vssLWPPageContext, newDefinitonUrl, true);
    };

    private _onFavoriteAdded = (sender: any, eventArgs: any) => {
        DefinitionFavoritesActionCreator.addDefinitionToFavorites(eventArgs.definition, this._tfsContext.contextData.user.id);
    };

    private _onFavoriteRemoved = (sender: any, eventArgs: any) => {
        DefinitionFavoritesActionCreator.removeDefinitionFromFavorites(eventArgs.definition, this._tfsContext.contextData.user.id);
    };

    private _onGetMoreFavorites = (sender: any, eventArgs: any) => {
        Build_Actions.moreMyFavoritesRequested.invoke(null);
    };

    private _onGetMoreTeamFavorites = (sender: any, eventArgs: any) => {
        Build_Actions.moreTeamFavoritesRequested.invoke(null);
    };

    private _onFolderClicked = (sender: any, path: string) => {
        handleFolderNavigation(this._historyService, path);
    };

    private _onViewFolderSecurity = (sender: any, path: string) => {
        showFolderSecurityDialog(path);
    };

    private _onAgentAdded = (sender: any, agent: DTContracts.TaskAgent) => {
        Build_Actions.agentsUpdated.invoke({
            agents: [agent]
        });
    };

    private _onAgentDeleted = (sender: any, agentId: number) => {
        Build_Actions.agentDeleted.invoke(agentId);
    };

    private _onAgentRequestUpdated = (sender: any, request: DTContracts.TaskAgentJobRequest) => {
        Build_Actions.jobRequestsUpdated.invoke([request]);
    };

    private _onRetainBuild = (sender: any, eventArgs: any) => {
        this._buildsSource.retainBuild(eventArgs.build.id, true);
    };

    private _onStopRetainingBuild = (sender: any, eventArgs: any) => {
        let build: BuildContracts.Build = eventArgs.build;
        if (!build.keepForever || confirm(BuildResources.ConfirmStopRetainingIndefinitely)) {
            this._buildsSource.retainBuild(eventArgs.build.id, false);
        }
    };

}

classExtend(DefinitionsView, TfsContext.ControlExtensions);
Enhancement.registerEnhancement(DefinitionsView, definitionsViewSelector);

// TFS plugin model requires this call for each tfs module.
tfsModuleLoaded("Definitions", exports);
