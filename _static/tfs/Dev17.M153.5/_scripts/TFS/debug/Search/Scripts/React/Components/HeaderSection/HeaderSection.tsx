import * as React from "react";
import * as ReactDOM from "react-dom";

import { CommandButton } from "OfficeFabric/Button";
import { CommandBar } from "OfficeFabric/CommandBar";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { IContextualMenuItem, ContextualMenuItemType } from "OfficeFabric/ContextualMenu";
import { TooltipHost } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";
import { autobind } from "OfficeFabric/Utilities";

import * as VSSContext from "VSS/Context";
import { format } from "VSS/Utils/String";
import { Uri } from "VSS/Utils/Url";

import { Utils } from "Search/Scripts/Common/TFS.Search.Helpers";
import { ActionCreator } from "Search/Scripts/React/ActionCreator";
import { FilterToggleButtonMenuItem } from "Search/Scripts/React/Components/HeaderSection/CommandBar/FilterToggleButton";
import { SettingsPivotMenuItem } from "Search/Scripts/React/Components/HeaderSection/CommandBar/SettingsPivot";
import { SortByDropdownMenuItem } from "Search/Scripts/React/Components/HeaderSection/CommandBar/SortByDropdown";
import { PivotTabs } from "Search/Scripts/React/Components/HeaderSection/PivotTabs";
import * as Models from "Search/Scripts/React/Models";
import { SearchProvidersStore } from "Search/Scripts/React/Stores/SearchProvidersStore";
import { StoresHub } from "Search/Scripts/React/StoresHub";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search";
import { TelemetryHelper } from "Search/Scripts/Common/TFS.Search.TelemetryHelper";

import "VSS/LoaderPlugins/Css!Search/React/Components/HeaderSection";

export interface IHeaderSectionState {
    providerTabs: Models.SearchPivotTabItem[];
    currentProviderTab: Models.SearchPivotTabItem;
    urlState: {};
}

const SEARCH_PAGE_TITLE_WITH_SEARCHTEXT_FORMAT = "{0} - {1} - {2}";
const SEARCH_PAGE_TITLE_WITHOUT_SEARCHTEXT_FORMAT = "{0} - {1}";

export interface HeaderSectionProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
}

export class HeaderSection extends React.Component<HeaderSectionProps, IHeaderSectionState> {
    private viewState: IHeaderSectionState;

    constructor(props: HeaderSectionProps) {
        super(props);
        this.viewState = {
            providerTabs: [],
            currentProviderTab: {
                tabKey: "",
                title: ""
            }
        } as IHeaderSectionState;

        this.state = this.viewState;
    }

    public render(): JSX.Element {
        const title = HeaderSection._computeTitle(this.state);
        const tabsCount = this.state.providerTabs.length;

        // set page title.
        document.title = title;

        const items: IContextualMenuItem[] = [];

        items.push(SortByDropdownMenuItem(this.props.actionCreator, this.props.storesHub));
        items.push(SettingsPivotMenuItem(this.props.actionCreator, this.props.storesHub));
        items.push(FilterToggleButtonMenuItem(this.props.actionCreator, this.props.storesHub));

        return (
            <div
                className={
                    css("header-section", {
                        "no-border": tabsCount <= 0
                    })}
                role="navigation"
                aria-label={Resources.HeaderSectionAriaLabel}>
                <div className="header-section-container">
                    <PivotTabs
                        visibleTabs={this.state.providerTabs}
                        currentTab={this.state.currentProviderTab.tabKey}
                        onClick={this._onClick} />
                    <CommandBar items={[]} farItems={items} className="header-commandBar" />
                </div>
            </div>
        );
    }

    public componentDidMount(): void {
        this.props.storesHub.searchProvidersStore.addChangedListener(this.onProvidersUpdated);
        this.props.storesHub.requestUrlStore.addChangedListener(this.onSearchTextChanged);
    }

    @autobind
    public onProvidersUpdated(): void {
        this.viewState.providerTabs = this.props.storesHub.searchProvidersStore.ProviderTabs;
        this.viewState.currentProviderTab = this.props.storesHub.searchProvidersStore.CurrentProviderTab;
        this.viewState.urlState = this.props.storesHub.requestUrlStore.getUrlState;

        this.setState(this.viewState);
    }

    @autobind
    public onSearchTextChanged(): void {
        this.viewState.urlState = this.props.storesHub.requestUrlStore.getUrlState;
        this.setState(this.viewState);
    }

    private static _computeTitle(state: IHeaderSectionState): string {
        // if search text is present
        if (state.currentProviderTab) {
            const uri = Uri.parse(window.location.href);
            const searchText: string = uri.getQueryParam("text");
            const pageTitle = VSSContext.getPageContext().webAccessConfiguration.isHosted
                ? Resources.HostedPageTitle
                : Resources.OnPremPageTitle;

            return searchText
                ? format(
                    SEARCH_PAGE_TITLE_WITH_SEARCHTEXT_FORMAT,
                    searchText,
                    format(Resources.SearchEntityTextFormat, state.currentProviderTab.title),
                    pageTitle)
                : format(
                    SEARCH_PAGE_TITLE_WITHOUT_SEARCHTEXT_FORMAT,
                    format(Resources.SearchEntityTextFormat, state.currentProviderTab.title),
                    pageTitle);
        }

        return null;
    }

    @autobind
    private _onClick(tab: string): void {
        if (this.state.currentProviderTab.tabKey !== tab) {
            const uri = Uri.parse(window.location.href);
            const searchText: string = uri.getQueryParam("text");
            const entityId: string = this.state.providerTabs.filter((value, index) => {
                return value.tabKey === tab;
            })[0].entityId;

            TelemetryHelper.traceLog({
                "EntityTypeChangedToInNewLayout": entityId
            });

            Utils.createNewSearchRequestState(searchText, entityId);
        }
    }
}
