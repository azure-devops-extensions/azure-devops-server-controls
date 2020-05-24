/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import Q = require("q");

import { BuildViewBase } from "Build/Scenarios/BuildViewBase";
import { DefinitionViewData } from "Build/Scenarios/Definition/DefinitionViewData";
import * as ViewState from "Build/Scenarios/Definition/ViewState";
import Build_Actions = require("Build/Scripts/Actions/Actions");
import * as CIQueueBuildDialog_NO_REQUIRE from "Build/Scripts/CIQueueBuildDialog";
import * as Constants from "Build/Scripts/Constants";
import { setVssLWPPageContext } from "Build/Scripts/Context";
import { initializeEventManager, disposeMessageBarEventManager } from "Build/Scripts/Events/MessageBarEvents";
import { FavoriteOwnerMapping } from "Build/Scripts/Favorites";
import { DataProviderKeys } from "Build/Scripts/Generated/TFS.Build.Plugins";
import BuildRealtime = require("Build/Scripts/Realtime");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import { loadSignalR } from "Build/Scripts/SignalR";
import { BuildsSource } from "Build/Scripts/Sources/Builds";
import { DefinitionSource } from "Build/Scripts/Sources/Definitions";
import * as ContributionStore from "Build/Scripts/Stores/Contributions";
import { getDefinitionStore } from "Build/Scripts/Stores/Definitions";
import { getDefinitionFavoriteStore, initializeDefinitionFavoriteStore } from "Build/Scripts/Stores/DefinitionFavorites";
import { addPageLoadSplitTiming, startPageLoadScenario } from "Build/Scripts/Performance";
import { showDefinitionSecurityDialog, showFolderSecurityDialog } from "Build/Scripts/Security";
import Telemetry = require("Build/Scripts/Telemetry");
import * as Utils from "Build/Scripts/Utilities/Utils"

import { BuildLinks } from "Build.Common/Scripts/Linking";

import BuildContracts = require("TFS/Build/Contracts");

import * as PivotView from "Presentation/Scripts/TFS/Components/PivotView";
import * as PivotViewActionsHub from "Build/Scripts/PivotViewActionsHub";
import TFS_Admin_Security_NOREQUIRE = require("Admin/Scripts/TFS.Admin.Security");

import { Fabric } from "OfficeFabric/components/Fabric/Fabric"

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");

import * as Menus from "VSS/Controls/Menus";
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Number = require("VSS/Utils/Number");
import * as Utils_String from "VSS/Utils/String";

import { WebPageDataService } from "VSS/Contributions/Services";
import VSS_Handlers = require("VSS/Events/Handlers");
import { ContractSerializer } from "VSS/Serialization";
import VSS_Events = require("VSS/Events/Services");
import { getService, getCollectionService } from "VSS/Service";
import VSS = require("VSS/VSS");

import ReactDOM = require("react-dom");

var definitionViewSelector = ".build-definition-view";
var hubTitleContentSelector = ".build-titleArea";

export function getContributedPageData(service: WebPageDataService) {
    return service.getPageData<DefinitionViewData>("ms.vss-build-web.build-definition-hub-summary-tab-data-provider") ||
        service.getPageData<DefinitionViewData>("ms.vss-build-web.build-definition-hub-history-tab-data-provider") ||
        service.getPageData<DefinitionViewData>("ms.vss-build-web.build-definition-hub-deleted-tab-data-provider");
}

class DefinitionActions {
    public static History: string = "history";
    public static Summary: string = "summary";
}

class ControllerView extends React.Component<React.Props<any>, PivotView.Props> {
    private _contributionStore: ContributionStore.ContributionStore;
    private _onStoresUpdated: () => void;

    constructor(props: React.Props<any>) {
        super(props);

        this._contributionStore = ContributionStore.getContributionStore();

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

        let contributions = this._contributionStore.getContributionsForTarget("ms.vss-build-web.build-definition-hub-tab-group", "ms.vss-web.tab");
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

export interface IDefinitionViewOptions {
    buildsSource?: BuildsSource;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    pageContext: Object;
}

export class DefinitionView extends BuildViewBase {
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _buildsSource: BuildsSource;
    private _eventManager: VSS_Events.EventService;
    private _hub: BuildRealtime.HubBase;
    private _viewState: ViewState.ViewStateStore;
    private _historyService: Navigation_Services.HistoryService;
    private _onViewStateUpdated: () => void;

    constructor(options?: IDefinitionViewOptions) {
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
        }

        if (this._historyService) {
            this._historyService.detachNavigate(this._onViewStateUpdated);
        }

        document.body.removeEventListener("fpsLoaded", this._onViewStateUpdated);

        disposeMessageBarEventManager();
    }

    initializeOptions(options?: any): void {
        this._tfsContext = (options && options.tfsContext) ? options.tfsContext : TFS_Host_TfsContext.TfsContext.getDefault();
        this._buildsSource = (options && options.buildsSource) ? options.buildsSource : getCollectionService(BuildsSource);

        super.initializeOptions($.extend({
            hubContentSelector: ".build-definition-view-content",
            attachNavigate: true
        }, options));

        this._tfsContext = (options && options.tfsContext) ? options.tfsContext : TFS_Host_TfsContext.TfsContext.getDefault();
    }

    public initialize(): void {
        super.initialize();

        this._historyService = Navigation_Services.getHistoryService();
        let urlState = this._historyService.getCurrentState();
        this._viewState = ViewState.getInstance(urlState);

        // start the PLT scenario. this view will render a ControllerView, which will render a PivotView, and the tab it renders will end the PLT scenario
        let performance = startPageLoadScenario(this._viewState.getScenarioName());

        // if we're coming from a new contributed hub, we need to pull in SignalR
        const projectGuid = this._options.projectGuid || this._tfsContext.navigation.projectId;
        if (!($ as any).hubConnection) {
            loadSignalR().then(() => {
                this._hub = BuildRealtime.HubFactory.createRealTimeHub(null); // null buildClient - no need to auto-refresh
                this._hub.subscribeToProject(projectGuid);
            });
        }
        else {
            this._hub = BuildRealtime.HubFactory.createRealTimeHub(null); // null buildClient - no need to auto-refresh
            this._hub.subscribeToProject(projectGuid);
        }

        this._eventManager = VSS_Events.getService();

        // hack to select Definitions instead of Explorer. remove this silliness when contributed hubs can be "selected" at more than one URL
        let definitionsHub = $("[data-hubid='ms.vss-build-web.build-definitions-hub']");
        if (definitionsHub.length > 0) {
            definitionsHub.addClass("selected");

            let hubs = definitionsHub.parent();
            hubs.children().each((index: number, hub: Element) => {
                if (hub !== definitionsHub[0]) {
                    $(hub).removeClass("selected");
                }
            });
        }

        this._onViewStateUpdated = () => {
            ViewState.viewStateUpdated.invoke({
                urlState: this._historyService.getCurrentState()
            });
        }
        this._historyService.attachNavigate(this._onViewStateUpdated);
        document.body.addEventListener("fpsLoaded", this._onViewStateUpdated);
        this._onViewStateUpdated();

        // initialize stores
        let contributionService: WebPageDataService = (this._options && this._options.contributionService) ? this._options.contributionService : getService(WebPageDataService);
        let definitionSource = getCollectionService(DefinitionSource);

        let teamFavoriteDefinitionIds = [];
        let myFavoriteDefinitionIds = [];

        getDefinitionStore();
        let pageData = getContributedPageData(contributionService);
        if (pageData) {
            const allDefinitions: BuildContracts.BuildDefinitionReference[] = ContractSerializer.deserialize(pageData.definitions || pageData[DataProviderKeys.Definitions], BuildContracts.TypeInfo.BuildDefinition) || [];

            definitionSource.initializeDefinitions(allDefinitions);
        }
        addPageLoadSplitTiming("initialized DefinitionStore");

        getDefinitionFavoriteStore();
        initializeDefinitionFavoriteStore.invoke(() => {
            return {
                favorites: pageData ? pageData.favorites : [],
                teams: []
            };
        });
        addPageLoadSplitTiming("initialized DefinitionFavoriteStore");

        this._eventManager.attachEvent(Constants.UserActions.QueueBuild, (sender: any, eventArgs: any) => {
            if (eventArgs) {
                this._showQueueBuildDialog(eventArgs);
            }
        });

        this._eventManager.attachEvent(Constants.UserActions.RetainBuild, (sender: any, eventArgs: any) => {
            this._buildsSource.retainBuild(eventArgs.build.id, true);
        });

        this._eventManager.attachEvent(Constants.UserActions.StopRetainingBuild, (sender: any, eventArgs: any) => {
            let build: BuildContracts.Build = eventArgs.build;
            if (!build.keepForever || confirm(BuildResources.ConfirmStopRetainingIndefinitely)) {
                this._buildsSource.retainBuild(eventArgs.build.id, false);
            }
        });

        this._eventManager.attachEvent(Constants.UserActions.FolderClicked, (sender: any, path: string) => {
            let urlState = this._historyService.getCurrentState();
            let action = "allDefinitions";
            // honor context only if user clicks on root breadcrumb, if it's folder, it should goto default alldefinitions action
            if (path === "\\" && urlState && urlState.context) {
                action = urlState.context;
            }

            let routeData = {
                _a: action,
                path: path
            };

            let url = this._tfsContext.getActionUrl("index", "Build", routeData as any);
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
                url: url
            });
        });

        this._eventManager.attachEvent(Constants.UserActions.EditDefinition, (sender: any, definitionId: number) => {
            const editDefinitionUrl = BuildLinks.getEditDefinitionUrl(definitionId);
            if (editDefinitionUrl) {
                Utils.openUrl(editDefinitionUrl);
            }
        });

        this._eventManager.attachEvent(Constants.UserActions.ViewDefinitionSecurity, (sender: any, definition: BuildContracts.DefinitionReference) => {
            showDefinitionSecurityDialog(definition);
        });

        this._eventManager.attachEvent(Constants.UserActions.ViewFolderSecurity, (sender: any, path: string) => {
            showFolderSecurityDialog(path);
        });

        Menus.menuManager.attachExecuteCommand(Utils_Core.delegate(this, this._onMenuItemClick));


        let hubContent = this._element.find(this._options.hubContentSelector);
        Diag.Debug.assert(hubContent.length > 0, "Unable to find hub content element");

        ReactDOM.render(<ControllerView />, hubContent[0]);

        if (this._viewState.getAction() === "queuebuild") {
            let eventService = VSS_Events.getService();
            eventService.fire(Constants.UserActions.QueueBuild, this, this._viewState.getDefinitionId());
        }
    }

    private _showQueueBuildDialog(definitionId: number) {
        VSS.using(['Build/Scripts/CIQueueBuildDialog'], (_CIQueueBuildDialog: typeof CIQueueBuildDialog_NO_REQUIRE) => {
            var ciQueueBuildDialog = new _CIQueueBuildDialog.CIQueueBuildDialog(definitionId, Telemetry.Sources.DefinitionView);
            ciQueueBuildDialog.open();
        });
    }

    private _onMenuItemClick(sender: any, args?: VSS_Handlers.CommandEventArgs) {
        var command: string = args.get_commandName();
        var commandArgument: any = args.get_commandArgument();

        switch (command) {
            case Constants.UserActions.ViewBuild: {
                let action: string = commandArgument.newTab ? Events_Action.CommonActions.ACTION_WINDOW_OPEN : Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE;
                let webLink = BuildLinks.getBuildDetailLink(commandArgument.build.id);
                Events_Action.getService().performAction(action, {
                    url: webLink
                });
                break;
            }
            case Constants.UserActions.RetainBuild: {
                this._buildsSource.retainBuild(commandArgument.build.id, true);
                break;
            }
            case Constants.UserActions.StopRetainingBuild: {
                let build: BuildContracts.Build = commandArgument.build;
                if (!build.keepForever || confirm(BuildResources.ConfirmStopRetainingIndefinitely)) {
                    this._buildsSource.retainBuild(build.id, false);
                }
                break;
            }
            case Constants.UserActions.DeleteBuild: {
                let builds: BuildContracts.Build[] = commandArgument.builds;
                let title = "";

                if (builds.length == 0) {
                    return;
                }

                let canDelete = true;
                if (builds.length > 1) {
                    // check for retainedByRelease or KeepForever
                    if (builds.some(buildLockedFromDelete)) {
                        // use alternate message
                        title = BuildResources.DeleteMultipleBuildsSomeLockedConfirmation;
                    }
                    else {
                        title = BuildResources.DeleteMultipleBuildsConfirmation;
                    }
                }
                else {

                    // check for retainedByRelease or KeepForever
                    if (builds[0].keepForever || builds[0].retainedByRelease) {
                        // use alternate message and don't attempt delete since it will intentionally fail
                        title = Utils_String.format(BuildResources.CantDeleteBuild, builds[0].buildNumber);
                        canDelete = false;
                    }
                    else {
                        title = Utils_String.format(BuildResources.ConfirmDeleteBuild, builds[0].buildNumber);
                    }
                }

                if (confirm(title) && canDelete) {
                    builds.forEach((build) => {
                        this._buildsSource.deleteBuild(build);
                    });
                }

                break;
            }
        }
    }

    private _getSecurityTokenPath(path: string) {
        path = path.replace(/\\/g, this._options.separator);
        if (path[0] == this._options.separator) {
            //unroot the path
            path = path.slice(1, path.length);
        }
        return path;
    }
}

function onQueueBuildClicked(event: any) {
    // telemetry for creating new definitions is reported in the dialog's ok/cancel handlers
    let eventService = VSS_Events.getService();
    eventService.fire(Constants.UserActions.QueueBuild, this);
}

function buildLockedFromDelete(build: BuildContracts.Build) {
    if (build.keepForever || build.retainedByRelease) {
        return true;
    }
    return false
}

VSS.classExtend(DefinitionView, TFS_Host_TfsContext.TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(DefinitionView, definitionViewSelector);
