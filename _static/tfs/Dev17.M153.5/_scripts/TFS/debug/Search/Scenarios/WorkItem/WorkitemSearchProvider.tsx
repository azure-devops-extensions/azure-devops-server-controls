import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as React from "react";
import * as _NavigationHandler from "Search/Scenarios/Hub/NavigationHandler";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { ContributedSearchTab, ISearchUserPermissions, getSearchUserPermissions } from "Search/Scenarios/Shared/Base/ContributedSearchTab";
import { SearchSecurityConstants } from "Search/Scenarios/Shared/Constants";
import { serializeFilters, getWindowTitle, serializeSortOptions } from "Search/Scenarios/Shared/Utils";
import * as _CommandsContainer from "Search/Scenarios/WorkItem/Components/Commands";
import * as _NotificationBannerContainer from "Search/Scenarios/WorkItem/Components/NotificationBanner";
import { ResultsContainer } from "Search/Scenarios/WorkItem/Components/Results";
import { SearchInputContainer } from "Search/Scenarios/WorkItem/Components/SearchInput";
import * as Constants from "Search/Scenarios/WorkItem/Constants";
import { ActionCreator } from "Search/Scenarios/WorkItem/Flux/ActionCreator";
import { ActionsHub } from "Search/Scenarios/WorkItem/Flux/ActionsHub";
import { AreaNodesSource } from "Search/Scenarios/WorkItem/Flux/Sources/AreaNodesSource";
import { ColorsDataSource } from "Search/Scenarios/WorkItem/Flux/Sources/ColorsDataSource";
import { CountSpy } from "Search/Scenarios/WorkItem/Flux/Sources/CountSpy";
import { PivotStateServiceSpy } from "Search/Scenarios/WorkItem/Flux/Sources/PivotStateServiceSpy";
import { PageSource } from "Search/Scenarios/WorkItem/Flux/Sources/PageSource";
import { TelemetrySpy } from "Search/Scenarios/WorkItem/Flux/Sources/TelemetrySpy";
import { TelemetryWriter } from "Search/Scenarios/WorkItem/Flux/Sources/TelemetryWriter";
import { WorkItemFieldsSource } from "Search/Scenarios/WorkItem/Flux/Sources/WorkItemFieldsSource";
import { WorkItemSearchSource } from "Search/Scenarios/WorkItem/Flux/Sources/WorkItemSearchSource";
import { OrgInfoDataProviderSource } from "Search/Scenarios/Shared/Base/Sources/OrgInfoDataProviderSource";
import { StoresHub } from "Search/Scenarios/WorkItem/Flux/StoresHub";
import { applyNavigatedUrl, updateUrl } from "Search/Scenarios/WorkItem/NavigationHandler";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { getHistoryService } from "VSS/Navigation/Services";
import * as SDK_Shim from "VSS/SDK/Shim";
import { Filter } from "SearchUI/Utilities/Filter";

export class WorkitemSearchProvider extends ContributedSearchTab {
    private actionCreator: ActionCreator;
    private storesHub: StoresHub;
    private telemetrySpy: TelemetrySpy;
    private countSpy: CountSpy;
    private pivotStateServiceSpy: PivotStateServiceSpy;
    private telemetryWriter: TelemetryWriter;

    constructor(
        initializedOnTabSwitch: boolean,
        private isProjectContext: boolean,
        pageContext: Object,
        providerContributionId: string) {
        super(Constants.EntityTypeUrlParam, initializedOnTabSwitch, pageContext, providerContributionId);
        this.telemetryWriter = new TelemetryWriter(!this.initializedOnTabSwitch);
        this.setUserPermissions();
        this.initializeFlux();
    }

    protected onRenderNotificationBanner(): JSX.Element {
        return <NotificationContainerAsync actionCreator={this.actionCreator} storesHub={this.storesHub} />;
    }

    protected onRenderInput(): JSX.Element {
        return <SearchInputContainer actionCreator={this.actionCreator} storesHub={this.storesHub} isMember={this.isMember} />;
    }

    protected onRenderResults(): JSX.Element {
        return <ResultsContainer actionCreator={this.actionCreator} storesHub={this.storesHub} />;
    }

    protected onRenderCommands(): JSX.Element {
        return <CommandsContainerAsync
            actionCreator={this.actionCreator}
            storesHub={this.storesHub}
            isMember={this.isMember} />;
    }

    protected onNavigate(rawState: any): void {
        applyNavigatedUrl(this.actionCreator, rawState, this.storesHub.getAggregatedState());
    }

    protected onDispose(): void {
        this.storesHub.dispose();
        this.telemetrySpy.dispose();
        this.countSpy.dispose();
        this.pivotStateServiceSpy.dispose();
        this.actionCreator.dispose();
    }

    protected onInitialize(): void {
        const historyService = getHistoryService(),
            providerId: string = this.isProjectContext ? "ms.vss-work-web.workitem-project-search-provider" : "ms.vss-work-web.workitem-collection-search-provider";

        const currentParams: _NavigationHandler.UrlParams = historyService.getCurrentState();
        if (currentParams.text && currentParams.text.trim()) {
            if (!this.initializedOnTabSwitch) {
                this.actionCreator.loadInitialState(
                    currentParams.text,
                    currentParams.filters,
                    currentParams.sortOptions,
                    currentParams.lp);
            }
            else {
                // Add project filter if in project context
                // just use search text.
                const storedState = this.tabStateProviderService.getState(this.providerContributionId);
                const filters = (storedState && storedState.filtersString) ? storedState.filtersString : this.getFilters();
                const sortOptions = storedState ? storedState.sortOptions : undefined;

                this.actionCreator.loadInitialState(currentParams.text, filters, sortOptions);
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

    private initializeFlux(): void {
        const actionsHub = new ActionsHub();
        const filter = new Filter(
            {
                defaultState: {},
                useApplyMode: false
            });

        this.storesHub = new StoresHub(actionsHub, filter, this.isProjectContext, this.getProject(), this.isMember);
        this.telemetrySpy = new TelemetrySpy(this.telemetryWriter, actionsHub, this.storesHub);
        this.countSpy = new CountSpy(actionsHub, this.storesHub);
        this.pivotStateServiceSpy = new PivotStateServiceSpy(actionsHub, this.storesHub, this.providerContributionId);

        this.actionCreator = new ActionCreator(
            actionsHub,
            filter,
            {
                searchSource: new WorkItemSearchSource(),
                areaNodesSource: new AreaNodesSource(),
                colorsDataSource: new ColorsDataSource(),
                workItemFieldsSource: new WorkItemFieldsSource(),
                pageSource: new PageSource(),
                orgInfoDataProviderSource: new OrgInfoDataProviderSource(),
            },
            this.storesHub.getAggregatedState,
            this.getProject(),
            this.telemetryWriter);

        this.storesHub
            .getCompositeStore([
                "searchStore",
                "sortOptionsStore"])
            .addChangedListener(this.onUrlCompositeStoreChanged);
        this.storesHub
            .getCompositeStore(["searchStore"])
            .addChangedListener(this.onSearchStoreChanged);
    }

    private onUrlCompositeStoreChanged = (): void => {
        updateUrl(this.storesHub.getAggregatedState());
    }

    private onSearchStoreChanged = (): void => {
        const { searchStoreState } = this.storesHub.getAggregatedState();
        const windowTitle = getWindowTitle(Resources.SearchWorkItemLabel, searchStoreState.query.searchText);

        document.title = windowTitle;
    }

    private getProject(): string {
        return TfsContext.getDefault().navigation.project;
    }

    private setUserPermissions(): void {
        const permissionData: ISearchUserPermissions = getSearchUserPermissions();
        // setting user permission
        this.isMember = permissionData.isMember;

        // Logging incase we did not find permissions in shared data.
        if (!permissionData.isPermissionIncluded) {
            this.telemetryWriter.publish(
                SearchSecurityConstants.SearchSecurityPermissionTelemetry,
                {
                    isPermissionIncluded: permissionData.isPermissionIncluded
                });
        }
    }
}

const CommandsContainerAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/WorkItem/Components/Commands"],
    (commandsContainer: typeof _CommandsContainer) => commandsContainer.CommandsContainer,
    null);

const NotificationContainerAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/WorkItem/Components/NotificationBanner"],
    (notificationContainer: typeof _NotificationBannerContainer) => notificationContainer.NotificationBannerContainer,
    null);

SDK_Shim.VSS.register("ms.vss-search-platform.workitem-search-provider", (context) => {
    const { tabSwitch, isProjectContext, pageContext, providerContributionId } = context;
    return new WorkitemSearchProvider(tabSwitch || false, isProjectContext, pageContext, providerContributionId);
});
