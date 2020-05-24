import "VSS/LoaderPlugins/Css!fabric";

import * as ReactDOM from "react-dom";
import { TabbedNavigationView } from "VSS/Controls/Navigation";
import { getDebugMode } from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";
import { domElem } from "VSS/Utils/UI";

import * as Contribution_Services from "VSS/Contributions/Services";
import * as Service from "VSS/Service";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as Serialization from "VSS/Serialization";
import * as VCWebAccessContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCContracts from "TFS/VersionControl/Contracts";
import { showEmptyRepository } from "VersionControl/Scenarios/Shared/EmptyRepository";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

import { RepositorySelector } from "VersionControl/Scripts/Controls/RepositorySelector";
import * as TFS_ProjectsMru from "TfsCommon/Scripts/Navigation/TFS.Projects.Mru";
import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";

import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { ActionsHub } from "VersionControl/Scenarios/PullRequestList/Actions/ActionsHub";
import { PullRequestListActionCreator } from "VersionControl/Scenarios/PullRequestList/Actions/PullRequestListActionCreator";
import { ITabInfoActionCreator } from "VersionControl/Scenarios/PullRequestList/Actions/TabInfoActionCreator";
import { StoresHub } from "VersionControl/Scenarios/PullRequestList/Stores/StoresHub";
import { SourcesHub } from "VersionControl/Scenarios/PullRequestList/Sources/SourcesHub";
import { PullRequestListSource } from "VersionControl/Scenarios/PullRequestList/Sources/PullRequestListSource";
import { ArtifactStatsSource } from "VersionControl/Scenarios/PullRequestList/Sources/ArtifactStatsSource";
import { FeatureAvailabilitySource } from "VersionControl/Scenarios/Shared/Sources/FeatureAvailabilitySource";
import { ContributionsSource } from "VersionControl/Scenarios/PullRequestList/Sources/ContributionsSource";
import { PullRequestListTelemetry } from "VersionControl/Scenarios/PullRequestList/PullRequestListTelemetry";
import { DataProviderSource } from "VersionControl/Scenarios/PullRequestList/Sources/DataProviderSource";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { SettingsPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";
import { IdentitiesSource } from "VersionControl/Scenarios/ChangeDetails/Sources/IdentitiesSource";

import * as VCActionsDebugMonitor from "VersionControl/Scenarios/Shared/ActionsDebugMonitor";
import * as Constants from "VersionControl/Scenarios/Shared/Constants";
import { PagePerformance, SplitNames } from "VersionControl/Scenarios/Shared/PagePerformance";
import { GitShortcutGroup } from "VersionControl/Scenarios/Shared/GitShortcutGroup";

export class Flux {
    public actionsHub: ActionsHub;
    public storesHub: StoresHub;
    public actionCreator: PullRequestListActionCreator;
    public sourcesHub: SourcesHub;
    public tabsActionCreator: ITabInfoActionCreator;

    public tfsContext: TfsContext;
    public repositoryContext: GitRepositoryContext;

    private static _instance: Flux;
    public static get instance() {
        return this._instance;
    }

    public static initializeFlux(tfsContext: TfsContext, repositoryContext: GitRepositoryContext, telemetry: PullRequestListTelemetry) {
        const flux = new Flux();
        flux.tfsContext = tfsContext;
        flux.repositoryContext = repositoryContext;
        flux.actionsHub = new ActionsHub();
        flux.storesHub = new StoresHub(flux.actionsHub, tfsContext, repositoryContext);
        flux.sourcesHub = {
            pullRequestListSource: new PullRequestListSource(repositoryContext),
            artifactStatsSource: new ArtifactStatsSource(tfsContext),
            featureAvailabilitySource: new FeatureAvailabilitySource(),
            contributionsSource: new ContributionsSource(),
            dataProviderSource: new DataProviderSource(),
            permissionsSource: new GitPermissionsSource(repositoryContext && repositoryContext.getProjectId(), repositoryContext && repositoryContext.getRepositoryId()),
            settingsPermissionsSource: new SettingsPermissionsSource(),
            identitiesSource: new IdentitiesSource(repositoryContext),
        };
        flux.actionCreator = new PullRequestListActionCreator(repositoryContext, tfsContext, flux.actionsHub, flux.sourcesHub, flux.storesHub, telemetry);
        flux.actionCreator.queryFeatureFlags();
        this._instance = flux;
    }

    public static dispose() {
        this._instance = null;
    }
}

export abstract class PullRequestListViewBase extends TabbedNavigationView {
    public static hubContentSelector: string = ".versioncontrol-pullrequest-list-view";

    protected _hubContentElement: HTMLElement;
    protected _tfsContext: TfsContext;
    protected _repositoryContext: GitRepositoryContext;
    protected _telemetry: PullRequestListTelemetry;
    protected _emptyRepository: boolean;
    protected tabConributionsSelector: string;
    protected _projectInfo: VCContracts.VersionControlProjectInfo;
    protected _customerIntelligenceData: CustomerIntelligenceData;
    protected _reviewMode: boolean;
    protected _disposeActions: Function[] = [];

    constructor(options?) {
        super(options);
        PagePerformance.initializePage(CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            options.telemeteryFeatureArea || CustomerIntelligenceConstants.PULL_REQUESTS_LIST_VIEW_FEATURE,
            true);
        PagePerformance.scenario.addSplitTiming(SplitNames.viewInitializationStarted);
    }

    public initializeOptions(options?) {
        const webPageDataSvc = Service.getService(Contribution_Services.WebPageDataService);
        const vcViewModel = webPageDataSvc.getPageData<any>(Constants.versionControlDataProviderId);
        if (vcViewModel) {
            $.extend(options, vcViewModel);
        }
        options = Serialization.ContractSerializer.deserialize(options, VCWebAccessContracts.TypeInfo.VersionControlViewModel, false);

        this._tfsContext = options.tfsContext || TfsContext.getDefault();
        this._projectInfo = options.projectVersionControlInfo;
        this._emptyRepository = options.isEmptyRepository;
        this._reviewMode = options.reviewMode === true;
        this._customerIntelligenceData = new CustomerIntelligenceData();
        this._telemetry = new PullRequestListTelemetry();

        this.tabConributionsSelector = "ms.vss-code-web.pull-request-list-hub-tab-group";

        if (options.gitRepository) {
            this._repositoryContext = GitRepositoryContext.create(options.gitRepository, this._tfsContext);
            this._customerIntelligenceData.setRepositoryId((<GitRepositoryContext>this._repositoryContext).getRepositoryId());
        }
        
        this._setTitleMode(this._tfsContext.isHosted);
        
        super.initializeOptions($.extend({
            hubContentSelector: PullRequestListViewBase.hubContentSelector,
            attachNavigate: true
        }, options));
    }

    public initialize(options?) {
        this._customerIntelligenceData.setView("PullRequestsListView");
        PagePerformance.scenario.addSplitTiming(SplitNames.fluxInitializationStarted);

        Flux.initializeFlux(this._tfsContext, <GitRepositoryContext>this._repositoryContext, this._telemetry);
        if (getDebugMode()) {
            // TODO v-panu This should be lazy loaded only in debug mode, but then we miss initial actions.
            // Loaded in production too while we figure out a better solution.
            const debugMonitorDiv = VCActionsDebugMonitor.renderInBody(Flux.instance.actionsHub);

            this._disposeActions.push(() => ReactDOM.unmountComponentAtNode(debugMonitorDiv));
        }

        Flux.instance.tabsActionCreator = this.getTabsInfoInitializer();
        Flux.instance.tabsActionCreator.initializeTabsInfo();
        Flux.instance.actionCreator.getContributionsForTarget(this.tabConributionsSelector, "ms.vss-web.tab");
        this._disposeActions.push(() => Flux.dispose());

        PagePerformance.scenario.addSplitTiming(SplitNames.fluxInitialized);

        // if the repository context is available do additional initialization
        if (this._repositoryContext) {
            Flux.instance.actionCreator.queryPermissions();
            Flux.instance.actionCreator.querySuggestions();

            if (this._reviewMode || Utils_String.localeIgnoreCaseComparer((Navigation_Services.getHistoryService().getCurrentState() || {}).fullScreenMode, "true") === 0) {
                this.setFullScreenMode(true, this._reviewMode);
            }

            // Update the MRU Project Selector to use the Code controller so that the last used Tfvc/Git repo is selected for hybrid projects.
            TFS_ProjectsMru.projectsMru.setControllerRedirect("VersionControl", "Code");
            TFS_ProjectsMru.projectsMru.setControllerRedirect("Git", "Code");

            this._customerIntelligenceData.publish((this._emptyRepository ? "EmptyRepositoryView" : this._customerIntelligenceData.getView()) + ".FirstView", true);

            new GitShortcutGroup({
                repoContext: this._repositoryContext,
                tfsContext: this._tfsContext,
                navigateToUrl: (url) => Flux.instance.actionCreator.navigateToUrl(url),
                newPullRequestUrl: Flux.instance.storesHub.pullRequestListStore.getNewPullRequestUrl()
            });
        }

        super.initialize();

        this._hubContentElement = this._element.find(PullRequestListViewBase.hubContentSelector)[0];
        if (this._emptyRepository) {
            showEmptyRepository(
                this._hubContentElement,
                document,
                this._options.activeImportRequest,
                this._repositoryContext,
                this._tfsContext,
                this._projectInfo,
                this._options.sshEnabled,
                this._options.sshUrl,
                this._options.cloneUrl);
        } else {
            this.attachTopView(this._hubContentElement);
            PagePerformance.scenario.addSplitTiming(SplitNames.viewInitialized);
        }

        this._disposeActions.push(() => {
            if (this._hubContentElement) {
                ReactDOM.unmountComponentAtNode(this._hubContentElement);
                this._hubContentElement.remove();
                this._hubContentElement = null;
            }
        });
    }

    protected abstract getTabsInfoInitializer(): ITabInfoActionCreator;

    protected abstract attachTopView(container: HTMLElement): void;

    protected _dispose(): void {
        this._disposeActions.map(dispose => dispose());
        this._disposeActions = [];

        super._dispose();
    }
}
