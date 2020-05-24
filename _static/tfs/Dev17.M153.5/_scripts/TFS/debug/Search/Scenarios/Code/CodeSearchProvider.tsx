import * as React from "react";
import * as _CommandsContainer from "Search/Scenarios/Code/Components/Commands";
import * as _NotificationBannerContainer from "Search/Scenarios/Code/Components/NotificationBanner";
import * as Constants from "Search/Scenarios/Code/Constants";
import * as _NavigationHandler from "Search/Scenarios/Hub/NavigationHandler";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ResultsContainer } from "Search/Scenarios/Code/Components/Results";
import { SearchInputContainer } from "Search/Scenarios/Code/Components/SearchInput";
import { ActionCreator } from "Search/Scenarios/Code/Flux/ActionCreator";
import { ActionsHub } from "Search/Scenarios/Code/Flux/ActionsHub";
import { CodeSearchSource } from "Search/Scenarios/Code/Flux/Sources/CodeSearchSource";
import { ContentRendererSource } from "Search/Scenarios/Code/Flux/Sources/ContentRendererSource";
import { CountSpy } from "Search/Scenarios/Code/Flux/Sources/CountSpy";
import { PivotStateServiceSpy } from "Search/Scenarios/Code/Flux/Sources/PivotStateServiceSpy";
import { FileContentSource } from "Search/Scenarios/Code/Flux/Sources/FileContentSource";
import { FilePathsSource } from "Search/Scenarios/Code/Flux/Sources/FilePathsSource";
import { PageSource } from "Search/Scenarios/Code/Flux/Sources/PageSource";
import { RepositorySource } from "Search/Scenarios/Code/Flux/Sources/RepositorySource";
import { TelemetrySpy } from "Search/Scenarios/Code/Flux/Sources/TelemetrySpy";
import { TelemetryWriter } from "Search/Scenarios/Code/Flux/Sources/TelemetryWriter";
import { TenantSource } from "Search/Scenarios/Code/Flux/Sources/TenantSource";
import { OrgInfoDataProviderSource } from "Search/Scenarios/Shared/Base/Sources/OrgInfoDataProviderSource";
import { StoresHub } from "Search/Scenarios/Code/Flux/StoresHub";
import { applyNavigatedUrl, updateUrl } from "Search/Scenarios/Code/NavigationHandler";
import { ContributedSearchTab, ISearchUserPermissions, getSearchUserPermissions } from "Search/Scenarios/Shared/Base/ContributedSearchTab";
import { SearchSecurityConstants } from "Search/Scenarios/Shared/Constants";
import { serializeFilters, getWindowTitle } from "Search/Scenarios/Shared/Utils";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { getHistoryService } from "VSS/Navigation/Services";
import { Filter } from "SearchUI/Utilities/Filter";

export class CodeSearchProvider extends ContributedSearchTab {
    private actionCreator: ActionCreator;
    private storesHub: StoresHub;
    private telemetrySpy: TelemetrySpy;
    private countSpy: CountSpy;
    private pivotStateServiceSpy: PivotStateServiceSpy;
    private onFullScreen: (isFullScreen: boolean) => void;
    private telemetryWriter: TelemetryWriter;

    constructor(
        initializedOnTabSwitch: boolean,
        private isProjectContext: boolean,
        pageContext: Object,
        providerContributionId: string,
        onFullScreen?: (isFullScreen: boolean) => void) {
        super(Constants.EntityTypeUrlParam, initializedOnTabSwitch, pageContext, providerContributionId);
        this.telemetryWriter = new TelemetryWriter(!this.initializedOnTabSwitch);
        this.setUserPermissions();
        this.onFullScreen = onFullScreen;
        this.initializeFlux(onFullScreen);
    }

    protected onRenderNotificationBanner(): JSX.Element {
        return <NotificationContainerAsync actionCreator={this.actionCreator} storesHub={this.storesHub} />;
    }

    protected onRenderInput(): JSX.Element {
        return <SearchInputContainer actionCreator={this.actionCreator} storesHub={this.storesHub} isMember={this.isMember} />;
    }

    protected onRenderResults(): JSX.Element {
        return <ResultsContainer actionCreator={this.actionCreator} storesHub={this.storesHub} isMember={this.isMember}/>;
    }

    protected onRenderCommands(): JSX.Element {
        return <CommandsContainerAsync
            actionCreator={this.actionCreator}
            storesHub={this.storesHub}
            isMember={this.isMember} />;
    }

    protected onDispose(): void {
        this.storesHub.dispose();
        this.telemetrySpy.dispose();
        this.countSpy.dispose();
        this.pivotStateServiceSpy.dispose();
        this.actionCreator.dispose();
        document.removeEventListener("keydown", this.actionCreator.applyDocumentKeyDown);
    }

    protected onNavigate(rawState: _NavigationHandler.UrlParams): void {
        applyNavigatedUrl(this.actionCreator, rawState, this.storesHub.getAggregatedState());
        if (this.onFullScreen) {
            this.onFullScreen(false);
        }
    }

    protected onInitialize(): void {
        const providerId: string = this.isProjectContext
                ? "ms.vss-code-web.versioncontrol-project-search-provider"
                : "ms.vss-code-web.versioncontrol-collection-search-provider";

        const currentParams: _NavigationHandler.UrlParams = getHistoryService().getCurrentState();
        if (currentParams.text && currentParams.text.trim()) {
            if (!this.initializedOnTabSwitch) {
                this.actionCreator.loadInitialState(
                    currentParams.text,
                    currentParams.filters,
                    currentParams.sortOptions,
                    currentParams.result,
                    currentParams.action,
                    currentParams.lp);
            }
            else {
                // Add project filter if in project context
                const storedState = this.tabStateProviderService.getState(this.providerContributionId);
                const filters = (storedState && storedState.filtersString) ? storedState.filtersString : this.getFilters();

                this.actionCreator.loadInitialState(currentParams.text, filters);
            }
        }
        else {
            // Add project filter if in project context
            this.actionCreator.showLandingPage(this.getFilters());
        }

        document.body.dispatchEvent(new CustomEvent("searchTabLoaded", { detail: { providerId } }));
    }

    private getFilters(): string {
        return this.isProjectContext ? serializeFilters({ [Constants.FilterKeys.ProjectFiltersKey]: [this.getProject()] }) : undefined;
    }

    private initializeFlux(onFullScreen?: (isFullScreen: boolean) => void): void {
        const actionsHub = new ActionsHub();
        const repositorySource = new RepositorySource();
        const filter = new Filter(
            {
                defaultState: {},
                useApplyMode: false
            });

        this.storesHub = new StoresHub(actionsHub, filter, this.isProjectContext, this.getProject());
        this.telemetrySpy = new TelemetrySpy(this.telemetryWriter, actionsHub, this.storesHub);
        this.countSpy = new CountSpy(actionsHub, this.storesHub);
        this.pivotStateServiceSpy = new PivotStateServiceSpy(actionsHub, this.storesHub, this.providerContributionId);
        this.actionCreator = new ActionCreator(
            actionsHub,
            filter,
            {
                searchSource: new CodeSearchSource(),
                repositorySource: repositorySource,
                fileContentSource: new FileContentSource(),
                filePathsSource: new FilePathsSource(),
                pageSource: new PageSource(),
                tenantSource: new TenantSource(),
                contentRendererSource: new ContentRendererSource(),
                orgInfoDataProviderSource: new OrgInfoDataProviderSource(),
            },
            this.pageContext,
            this.storesHub.getAggregatedState,
            this.telemetryWriter,
            onFullScreen);

        this.storesHub
            .getCompositeStore([
                "searchStore",
                "itemContentStore",
                "pivotTabsStore"
            ])
            .addChangedListener(this.onUrlCompositeStoreChanged);
        this.storesHub
            .getCompositeStore(["searchStore"])
            .addChangedListener(this.onSearchStoreChanged);

        // Bind the keyboard shortcuts to the document for hit navigation.
        document.addEventListener("keydown", this.actionCreator.applyDocumentKeyDown);
    }

    private onUrlCompositeStoreChanged = (): void => {
        updateUrl(this.storesHub.getAggregatedState());
    }

    private onSearchStoreChanged = (): void => {
        const { searchStoreState } = this.storesHub.getAggregatedState();
        const windowTitle = getWindowTitle(Resources.SearchCodeLabel, searchStoreState.query.searchText);

        document.title = windowTitle;
    }

    private getProject(): string {
        return TfsContext.getDefault().navigation.project;
    }

    private setUserPermissions(): void {
        const permissionData: ISearchUserPermissions = getSearchUserPermissions();
        this.isMember = permissionData.isMember;

        if (!permissionData.isPermissionIncluded) {
            this.telemetryWriter.publish(SearchSecurityConstants.SearchSecurityPermissionTelemetry,
                                         { isPermissionIncluded: permissionData.isPermissionIncluded });
        }
    }
}

const NotificationContainerAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/Code/Components/NotificationBanner"],
    (notificationContainer: typeof _NotificationBannerContainer) => notificationContainer.NotificationBannerContainer,
    null);

const CommandsContainerAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/Code/Components/Commands"],
    (commandsContainer: typeof _CommandsContainer) => commandsContainer.CommandsContainer,
    null);

SDK_Shim.VSS.register("ms.vss-search-platform.code-search-provider", (context) => {
    const { isProjectContext, tabSwitch, onFullScreen, pageContext, providerContributionId } = context;
    return new CodeSearchProvider(tabSwitch || false, isProjectContext, pageContext, providerContributionId, onFullScreen);
});
