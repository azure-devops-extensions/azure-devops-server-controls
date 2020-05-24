import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import * as _ErrorComponent from "Search/Scenarios/Hub/Components/ErrorComponent";
import * as _KeyboardShortcuts from "VSS/Controls/KeyboardShortcuts";
import * as VSS from "VSS/VSS";
import { SearchOverlay } from "Search/Scenarios/Shared/Components/SearchOverlay";
import { Fabric } from "OfficeFabric/Fabric";
import { PivotContainer, PivotTab, CountFormat } from "Search/Scenarios/Shared/Components/PivotContainer";
import { ActionCreator } from "Search/Scenarios/Hub/Flux/ActionCreator";
import { StoresHub } from "Search/Scenarios/Hub/Flux/StoresHub";
import { ContributedSearchTab } from "Search/Scenarios/Shared/Base/ContributedSearchTab";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { LoadingState } from "Search/Scenarios/Hub/Flux/Stores/SearchProviderImplementationStore";
import { PivotTabInfo } from "Search/Scenarios/Hub/Flux/Stores/ContributedSearchTabsStore";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Hub/Components/Page";

const contributedTabDisplayNameProp = "displayName";
const KEY_S = "s";
const KEY_SLASH = "/";

export interface PageProps {
    actionCreator: ActionCreator;

    storesHub: StoresHub;
}

export interface PageState {
    availableProviders: PivotTabInfo[];

    provider: ContributedSearchTab;

    selectedTabId: string;

    providerLoadingState: LoadingState;

    error?: any;
}

export function renderInto(container: HTMLElement, props: PageProps): void {
    ReactDOM.render(<Page {...props} />, container);
}

export class Page extends React.Component<PageProps, PageState>{
    constructor(props: PageProps) {
        super(props);
        this.state = this.getState(props);
    }

    public render(): JSX.Element {
        const { availableProviders, selectedTabId, provider, providerLoadingState, error } = this.state,
            isProviderAvailable = !!provider,
            demandedProviderLoadInProgress = providerLoadingState === LoadingState.Loading,
            demandedProviderLoadFailed = providerLoadingState === LoadingState.Failed;

        return (
            <Fabric className="absolute-full" >
                {
                    demandedProviderLoadFailed
                        ? <ErrorComponentAsync message={Resources.ProviderLoadFailed.replace("{0}", error.toString())} />
                        : (!isProviderAvailable
                            // If no provider is present to cater the search page then show spinner.
                            // Otherwise, let's keep rendering the Input box and notification banner from older provider(while the new provider is in the process of loading)
                            // with Pivot tabs showing the latest state.
                            ? <SearchOverlay />
                            : (<div className="search-Page absolute-full" role="main">
                                <div className="search-NotificationBanner">
                                    {
                                        provider.renderNotificationBanner()
                                    }
                                </div>
                                <div className="search-InputPane">
                                    {
                                        provider.renderInput()
                                    }
                                </div>
                                <div className="search-ProvidersPane">
                                    <PivotContainer
                                        className="provider-Tabs"
                                        pivotTabs={this.getPivotTabs(availableProviders)}
                                        onTabClick={this.props.actionCreator.changeSearchProvider}
                                        selectedTabId={selectedTabId} />
                                    <div className="provider-Commands" role="menubar">
                                        {
                                            provider.renderCommands()
                                        }
                                    </div>
                                </div>
                                <div className="search-ResultsPane">
                                    {
                                        demandedProviderLoadInProgress
                                            ? <SearchOverlay />
                                            : provider.renderResults()
                                    }
                                </div>
                            </div>))
                }
            </Fabric>);
    }

    public componentDidMount(): void {
        this.props
            .storesHub
            .getCompositeStore([
                "searchProviderImplementationStore",
                "contributedSearchTabsStore"
            ])
            .addChangedListener(this.onStoreChanged);

        this._registerShortcuts();
    }

    public componentWillUnmount(): void {
        this.props
            .storesHub
            .getCompositeStore([
                "searchProviderImplementationStore",
                "contributedSearchTabsStore"
            ])
            .removeChangedListener(this.onStoreChanged);

        this._unregisterShortcuts();
    }

    private onStoreChanged = (): void => {
        this.setState(this.getState(this.props));
    }

    private getState(props: PageProps): PageState {
        const { availableTabs, selectedTabId, provider, fetchStatus, providerLoadError } = props.storesHub.getAggregatedState();
        return {
            availableProviders: availableTabs,
            selectedTabId,
            provider,
            providerLoadingState: fetchStatus,
            error: providerLoadError
        };
    }

    private getPivotTabs(pivotTabs: PivotTabInfo[]): PivotTab[] {
        return (pivotTabs || []).map<PivotTab>(pivotTab => {
            const { contributionInfo, count, countFormat } = pivotTab,
                title = contributionInfo.properties[contributedTabDisplayNameProp],
                tabKey = contributionInfo.id,
                ariaLabel = typeof count !== "undefined" ? getTabAriaLabel(count, title) : undefined;

            return { tabKey, title, ariaLabel, count, countFormat };
        });
    }



    private _registerShortcuts() {
        VSS.using(["VSS/Controls/KeyboardShortcuts"], (KeyboardShortcutsModule: typeof _KeyboardShortcuts) => {
            const keyboardShortcutManager = KeyboardShortcutsModule.ShortcutManager.getInstance()

            keyboardShortcutManager.registerShortcut(
                Resources.KeyboardShortcutGroup_Global,
                KEY_S,
                {
                    description: Resources.KeyboardShortcutDescription_Search,
                    action: () => $(".input-box").focus(),
                    hideFromHelpDialog: true
                });

            keyboardShortcutManager.registerShortcut(
                Resources.KeyboardShortcutGroup_Global,
                KEY_SLASH,
                {
                    description: Resources.KeyboardShortcutDescription_Search,
                    action: () => $(".input-box").focus()
                });
        });
    }

    private _unregisterShortcuts() {
        VSS.using(["VSS/Controls/KeyboardShortcuts"], (KeyboardShortcutsModule: typeof _KeyboardShortcuts) => {
            const keyboardShortcutManager = KeyboardShortcutsModule.ShortcutManager.getInstance()
            keyboardShortcutManager.unRegisterShortcut(Resources.KeyboardShortcutGroup_Global, KEY_S);
            keyboardShortcutManager.unRegisterShortcut(Resources.KeyboardShortcutGroup_Global, KEY_SLASH);
        });
    }
}

function getTabAriaLabel(count: number, tabTitle: string): string {
    return count === 1
        ? Resources.TabAriaLabelTextSingular.replace("{0}", tabTitle)
        : Resources.TabAriaLabelTextPlural.replace("{0}", count.toString()).replace("{1}", tabTitle);
}

const ErrorComponentAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/Hub/Components/ErrorComponent"],
    (ErrorComponent: typeof _ErrorComponent) => ErrorComponent.ErrorComponent);
