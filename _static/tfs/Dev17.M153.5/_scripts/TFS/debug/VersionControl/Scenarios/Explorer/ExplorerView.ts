import * as Q from "q";
import * as ReactDOM from "react-dom";
import { WebPageDataService } from "VSS/Contributions/Services";
import * as Controls from "VSS/Controls";
import { NavigationView } from "VSS/Controls/Navigation";
import { getDebugMode } from "VSS/Diag";
import { getHistoryService } from "VSS/Navigation/Services";
import { ContractSerializer } from "VSS/Serialization";
import * as VSSService from "VSS/Service";
import * as VSS from "VSS/VSS";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ActionCreator } from "VersionControl/Scenarios/Explorer/ActionCreator";
import { ActionsHub } from "VersionControl/Scenarios/Explorer/ActionsHub";
import { AddToDashboardCommand } from "VersionControl/Scenarios/Explorer/Commands/AddToDashboardCommand";
import { IExtensionHost } from "VersionControl/Scenarios/Explorer/Commands/ExtensionHost";
import { OpenInVisualStudioCommand } from "VersionControl/Scenarios/Explorer/Commands/OpenInVisualStudioCommand";
import * as VCPage from "VersionControl/Scenarios/Explorer/Components/Page";
import { ExplorerShortcutGroup, GitExplorerShortcutGroup } from "VersionControl/Scenarios/Explorer/ExplorerShortcuts";
import { DashboardsSource } from "VersionControl/Scenarios/Explorer/Sources/DashboardsSource";
import { EditingDialogsSource } from "VersionControl/Scenarios/Explorer/Sources/EditingDialogsSource";
import { PageSource } from "VersionControl/Scenarios/Explorer/Sources/PageSource";
import { RepositorySource } from "VersionControl/Scenarios/Explorer/Sources/RepositorySource";
import { StatusesSource } from "VersionControl/Scenarios/Explorer/Sources/StatusesSource";
import { TelemetrySpy } from "VersionControl/Scenarios/Explorer/Sources/TelemetrySpy";
import { TelemetryWriter } from "VersionControl/Scenarios/Explorer/Sources/TelemetryWriter";
import { StoresHub, AggregateState, CompositeStore } from "VersionControl/Scenarios/Explorer/Stores/StoresHub";
import * as UrlPageHandler from "VersionControl/Scenarios/Explorer/UrlPageHandler";
import { HistoryCommitsSource } from "VersionControl/Scenarios/History/GitHistory/Sources/HistoryCommitsSource";
import { TfvcHistoryListSource } from "VersionControl/Scenarios/History/TfvcHistory/Sources/TfvcHistoryListSource";
import * as VCActionsDebugMonitor from "VersionControl/Scenarios/Shared/ActionsDebugMonitor";
import { CommittingSource } from "VersionControl/Scenarios/Shared/Committing/CommittingSource";
import * as Constants from "VersionControl/Scenarios/Shared/Constants";
import { showEmptyRepository } from "VersionControl/Scenarios/Shared/EmptyRepository";
import { LazyPathsSearchSource } from "VersionControl/Scenarios/Shared/Path/LazyPathsSearchSource";
import { BuildPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/BuildPermissionsSource";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { ValidateRepository } from "VersionControl/Scenarios/Shared/ValidateRepository";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { TypeInfo, VersionControlViewModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { startCodeSearchEngagements } from "VersionControl/Scripts/Utils/CodeSearch";
import { reloadPageIfRepositoryChanged } from "VersionControl/Scripts/Utils/XhrNavigationUtilsNonReact";
import { GitShortcutGroup, TfvcShortcutGroup } from "VersionControl/Scripts/Views/CommonShortcuts";

import "VSS/LoaderPlugins/Css!VersionControl/NewExplorer";

/**
 * A view for the Explorer page.
 */
export class ExplorerView extends NavigationView {
    private actionCreator: ActionCreator;
    private getAggregateState: () => AggregateState;
    private telemetrySpy: TelemetrySpy;
    private rawState: any;
    private disposeActions: Function[] = [];

    public initializeOptions(options?: any) {
        super.initializeOptions({ attachNavigate: true, ...options });
    }

    public initialize() {
        const tfsContext = this._options.tfsContext || TfsContext.getDefault();
        const webPageDataSvc = VSSService.getService(WebPageDataService);
        const viewModel =
            webPageDataSvc.getPageData<VersionControlViewModel>(Constants.versionControlDataProviderId) ||
            {} as VersionControlViewModel;

        ContractSerializer.deserialize(viewModel, TypeInfo.VersionControlViewModel, false);

        const repositorySource = new RepositorySource(
            tfsContext,
            viewModel.gitRepository,
            viewModel.defaultGitBranchName,
            viewModel.deletedUserDefaultBranchName);

        const repositoryContext = repositorySource.getRepositoryContext();

        if (ValidateRepository.isEmptyRepository()) {
            this.initializeEmpty(tfsContext, repositoryContext as GitRepositoryContext, viewModel);
        } else {
            this.initializeFlux(repositorySource);

            const commonShortcutGroup = repositorySource.isGit()
                ? new GitShortcutGroup(repositoryContext)
                : new TfvcShortcutGroup(repositoryContext);
            this.disposeActions.push(() => commonShortcutGroup.removeShortcutGroup());

            const explorerShortcutGroup = repositorySource.isGit()
                ? new GitExplorerShortcutGroup(this.actionCreator)
                : new ExplorerShortcutGroup(this.actionCreator);
            this.disposeActions.push(() => explorerShortcutGroup.removeShortcutGroup());

            startCodeSearchEngagements("CodeExplorer", tfsContext.isHosted);
        }

        repositoryContext.getClient()._setUserPreferencesFromViewData(viewModel.vcUserPreferences);

        super.initialize();
    }

    private getRootElement() {
        return document.querySelector(".hub-content") as HTMLElement;
    }

    private initializeEmpty(
        tfsContext: TfsContext,
        repositoryContext: GitRepositoryContext,
        viewModel: VersionControlViewModel,
    ): void {
        showEmptyRepository(
            this.getRootElement(),
            document,
            viewModel.activeImportRequest,
            repositoryContext as GitRepositoryContext,
            tfsContext,
            viewModel.projectVersionControlInfo,
            viewModel.sshEnabled,
            viewModel.sshUrl,
            viewModel.cloneUrl);

        this.disposeActions.push(() =>
            ReactDOM.unmountComponentAtNode(this.getRootElement()));
    }

    private initializeFlux(repositorySource: RepositorySource): void {
        const actionsHub = new ActionsHub();

        if (getDebugMode()) {
            // TODO v-panu This should be lazy loaded only in debug mode, but then we miss initial actions.
            // Loaded in production too while we figure out a better solution.
            const debugMonitorDiv = VCActionsDebugMonitor.renderInBody(actionsHub);

            this.disposeActions.push(() => ReactDOM.unmountComponentAtNode(debugMonitorDiv));
        }

        const repositoryContext = repositorySource.getRepositoryContext();
        const lazyPathsSearchSource = repositorySource.isGit() ? new LazyPathsSearchSource(repositoryContext) : undefined;
        const telemetryWriter = new TelemetryWriter(repositoryContext);
        this.telemetrySpy = new TelemetrySpy(telemetryWriter, actionsHub);

        const storesHub = new StoresHub(actionsHub, repositorySource.isGit());
        this.getAggregateState = storesHub.getAggregateState;

        const gitRespositoryContext = repositoryContext as GitRepositoryContext;
        const historyCommitsSource = repositorySource.isGit()
            ? new HistoryCommitsSource(gitRespositoryContext)
            : {
                getCommitsFromJsonIsland: () => undefined,
                getCommitsFromDataProvider: () => Q(undefined),
                getQueryCriteria: x => x,
            } as any;

        const sharedPermissionsSource: GitPermissionsSource = repositorySource.isGit()
            ? new GitPermissionsSource(gitRespositoryContext.getRepository().project.id, gitRespositoryContext.getRepositoryId())
            : {
                queryDefaultGitRepositoryPermissionsAsync: () => Q(undefined),
              } as any;

        this.actionCreator = new ActionCreator(
            actionsHub,
            {
                repository: repositorySource,
                committing: new CommittingSource(),
                page: new PageSource(this, repositoryContext),
                statuses: new StatusesSource(repositoryContext),
                search: lazyPathsSearchSource,
                dialogs: new EditingDialogsSource(repositoryContext),
                historyCommits: historyCommitsSource,
                permissions: sharedPermissionsSource,
                tfvcHistory: new TfvcHistoryListSource(repositoryContext),
                buildPermissions: new BuildPermissionsSource(),
            },
            this.getAggregateState,
            telemetryWriter);

        const extensionHost: IExtensionHost = {
            notify: this.actionCreator.displayInfoNotification,
            publishTelemetryEvent: telemetryWriter.publish,
        };

        const addToDashboardExtension = new AddToDashboardCommand(new DashboardsSource(repositoryContext), extensionHost);

        this.actionCreator.loadExtension(addToDashboardExtension.getCommand);

        this.actionCreator.loadExtension(new OpenInVisualStudioCommand(extensionHost).getCommand);

        this.actionCreator.changeRepository();

        VCPage.renderInto(
            this.getRootElement(),
            {
                actionCreator: this.actionCreator,
                storesHub,
            });

        this.disposeActions.push(() =>
            ReactDOM.unmountComponentAtNode(this.getRootElement()));

        this.registerStoreChanged(storesHub.getCompositeStore(["path", "version"]), this.updateTitle);
        this.registerStoreChanged(storesHub.getCompositeStore(["pivotTabs", "fileContent", "historyList", "compare", "tfvcHistoryFilter"]), this.updateUrl);
    }

    public setHubPivotVisibility(visible: boolean): void {
        $(".hub-pivot").toggle(visible);
    }

    public _onNavigate(state: any) {
        if (this.actionCreator) {
            const aggregateState = this.getAggregateState();
            if (!reloadPageIfRepositoryChanged(aggregateState.repositoryContext, CodeHubContributionIds.gitFilesHub)) {
                UrlPageHandler.applyNavigatedUrl(this.actionCreator, state, aggregateState);
            }
        }
    }

    private registerStoreChanged(store: CompositeStore, handler: IEventHandler): void {
        store.addChangedListener(handler);

        this.disposeActions.push(() => store.removeChangedListener(handler));
    }

    private updateTitle = (): void => {
        const { pathState: { itemName, isRoot, repositoryName }, versionSpec, isGit } = this.getAggregateState();

        if (isGit) {
            if (isRoot) {
                this.setWindowTitle(repositoryName);
            } else {
                this.setWindowTitle(itemName);
            }
        } else {
            if (versionSpec) {
                this.setWindowTitle(versionSpec.formatPath(itemName));
            } else {
                this.setWindowTitle(itemName);
            }
        }
    }

    private updateUrl = (): void => {
        const nextParams = UrlPageHandler.getUrlParameters(this.getAggregateState(), this.rawState || {});
        const suppressNavigate = true;
        const mergeParams = { dont: false };

        if (!this.rawState) {
            // The first time, this is not a navigation, we're just normalizing the original URL, like
            // 1. a URL with path always contains a version too, and
            // 2. the path is normalized (from `a\b` to `/a/b`).
            getHistoryService().replaceHistoryPoint(nextParams.action, nextParams, undefined, suppressNavigate, mergeParams.dont);
        } else if (!UrlPageHandler.areEqualUrlParameters(nextParams, this.rawState)) {
            getHistoryService().addHistoryPoint(nextParams.action, nextParams, undefined, suppressNavigate, mergeParams.dont);
        }

        this.rawState = nextParams;
    }

    protected _dispose() {
        this.disposeActions.map(dispose => dispose());
        this.disposeActions = undefined;
        super._dispose();
    }
}

VSS.classExtend(ExplorerView, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(ExplorerView, ".versioncontrol-explorer-view");
