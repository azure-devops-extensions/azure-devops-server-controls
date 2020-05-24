import * as React from "react";
import * as _NavigationHandler from "Search/Scenarios/Hub/NavigationHandler";
import * as _CommandsContainer from "Search/Scenarios/WikiV2/Components/Commands";
import * as _NotificationBannerContainer from "Search/Scenarios/WikiV2/Components/NotificationBanner";
import * as Constants from "Search/Scenarios/WikiV2/Constants";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Service from "VSS/Service";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ContributedSearchTab, ISearchUserPermissions, getSearchUserPermissions } from "Search/Scenarios/Shared/Base/ContributedSearchTab";
import { OrgInfoDataProviderSource } from "Search/Scenarios/Shared/Base/Sources/OrgInfoDataProviderSource";
import { SearchSecurityConstants } from "Search/Scenarios/Shared/Constants";
import { ResultsContainer } from "Search/Scenarios/WikiV2/Components/Results";
import { SearchInputContainer } from "Search/Scenarios/WikiV2/Components/SearchInput";
import { ActionCreator } from "Search/Scenarios/WikiV2/Flux/ActionCreator";
import { ActionsHub } from "Search/Scenarios/WikiV2/Flux/ActionsHub";
import { CountSpy } from "Search/Scenarios/WikiV2/Flux/Sources/CountSpy";
import { PageSource } from "Search/Scenarios/WikiV2/Flux/Sources/PageSource";
import { TelemetrySpy } from "Search/Scenarios/WikiV2/Flux/Sources/TelemetrySpy";
import { TelemetryWriter } from "Search/Scenarios/WikiV2/Flux/Sources/TelemetryWriter";
import { WikiSearchSource } from "Search/Scenarios/WikiV2/Flux/Sources/WikiSearchSource";
import { StoresHub } from "Search/Scenarios/WikiV2/Flux/StoresHub";
import { applyNavigatedUrl, updateUrl } from "Search/Scenarios/WikiV2/NavigationHandler";
import { getWindowTitle } from "Search/Scenarios/Shared/Utils";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { getHistoryService } from "VSS/Navigation/Services";
import { Filter } from "SearchUI/Utilities/Filter";
import { PivotStateServiceSpy } from "Search/Scenarios/WikiV2/Flux/Sources/PivotStateServiceSpy";

export class WikiSearchProvider extends ContributedSearchTab {
    private actionCreator: ActionCreator;
    private storesHub: StoresHub;
    private countSpy: CountSpy;
    private pivotStateServiceSpy: PivotStateServiceSpy;
    private telemetryWriter: TelemetryWriter;
    private telemetrySpy: TelemetrySpy;

    constructor(initializedOnTabSwitch: boolean, private isProjectContext: boolean, pageContext: Object, providerContributionId: string) {
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

    protected onInitialize(): void {
        const historyService = getHistoryService();
        const currentParams: _NavigationHandler.UrlParams = historyService.getCurrentState();
        const providerId: string = this.isProjectContext
            ? "ms.vss-tfs-web.wiki-project-search-provider"
            : "ms.vss-tfs-web.wiki-collection-search-provider";
        if (currentParams.text) {
            if (!this.initializedOnTabSwitch) {
                this.actionCreator.loadInitialState(currentParams.text, currentParams.filters);
            }
            else {
                // just use search text and filters if stored

                const storedState = this.tabStateProviderService.getState(this.providerContributionId);
                const filters = (storedState && storedState.filtersString) ? storedState.filtersString : undefined;

                this.actionCreator.loadInitialState(currentParams.text, filters);
            }
        }
        else {
            this.actionCreator.showLandingPage();
        }

        document.body.dispatchEvent(new CustomEvent("searchTabLoaded", { detail: { providerId } }));
    }

    protected onDispose(): void {
        this.storesHub.dispose();
        this.telemetrySpy.dispose();
        this.countSpy.dispose();
        this.pivotStateServiceSpy.dispose();
        this.actionCreator.dispose();
    }

    private initializeFlux(): void {
        const actionsHub = new ActionsHub();
        const filter = new Filter(
            {
                defaultState: {},
                useApplyMode: false
            });

        const isProjectContext = this.isProjectContext;
        const project = this.getProject();
        this.storesHub = new StoresHub(actionsHub, filter, isProjectContext, project);
        this.telemetrySpy = new TelemetrySpy(this.telemetryWriter, actionsHub, this.storesHub);
        this.countSpy = new CountSpy(actionsHub, this.storesHub, project);
        this.pivotStateServiceSpy = new PivotStateServiceSpy(actionsHub, this.storesHub, this.providerContributionId);

        this.actionCreator = new ActionCreator(
            actionsHub,
            filter,
            {
                searchSource: new WikiSearchSource(),
                pageSource: new PageSource(),
                orgInfoDataProviderSource: new OrgInfoDataProviderSource(),
            },
            this.storesHub.getAggregatedState,
            this.telemetryWriter);

        this.storesHub
            .getCompositeStore(["searchStore"])
            .addChangedListener(this.onSearchStoreChanged);

        this.storesHub
            .getCompositeStore(["searchStore"])
            .addChangedListener(this.onUrlCompositeStoreChanged);
    }

    private onUrlCompositeStoreChanged = (): void => {
        updateUrl(this.storesHub.getAggregatedState());
    }

    private onSearchStoreChanged = (): void => {
        const { searchStoreState } = this.storesHub.getAggregatedState();
        const windowTitle = getWindowTitle(Resources.SearchWikiPlaceholder, searchStoreState.request.searchText);

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

const CommandsContainerAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/WikiV2/Components/Commands"],
    (commandsContainer: typeof _CommandsContainer) => commandsContainer.CommandsContainer,
    null);

const NotificationContainerAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/WikiV2/Components/NotificationBanner"],
    (notificationContainer: typeof _NotificationBannerContainer) => notificationContainer.NotificationBannerContainer,
    null);

SDK_Shim.VSS.register("ms.vss-search-platform.wiki-search-provider", (context) => {
    const { tabSwitch, isProjectContext, pageContext, providerContributionId } = context;
    return new WikiSearchProvider(tabSwitch || false, isProjectContext, pageContext, providerContributionId);
});
