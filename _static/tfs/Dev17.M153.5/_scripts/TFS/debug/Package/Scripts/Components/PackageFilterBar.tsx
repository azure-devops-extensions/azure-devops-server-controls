import * as React from "react";

import { autobind } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { IPickListItem, PickListFilterBarItem } from "VSSUI/PickList";
import { FILTER_CHANGE_EVENT, IFilterState } from "VSSUI/Utilities/Filter";
import { IHubViewState } from "VSSUI/Utilities/HubViewState";

import * as Actions from "Package/Scripts/Actions/Actions";
import { PackageFilterBarConstants } from "Feed/Common/Constants/Constants";
import { PackageFilterBarHelper } from "Package/Scripts/Helpers/PackageFilterBarHelper";
import { upstreamSourceToPickListItem } from "Package/Scripts/Helpers/UpstreamHelper";
import * as PackageResources from "Feed/Common/Resources";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedView, UpstreamSource } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export interface IPackageFilterBarProps extends Props {
    selectedFeed: Feed;
    feedViews: FeedView[];
    hubState: IHubViewState;
}

export class PackageFilterBar extends Component<IPackageFilterBarProps, State> {
    public componentWillMount(): void {
        this.props.hubState.filter.subscribe(this._handleFilterChanged, FILTER_CHANGE_EVENT);

        this._setViewFilter();
    }

    public componentWillUnmount(): void {
        this.props.hubState.filter.unsubscribe(this._handleFilterChanged, FILTER_CHANGE_EVENT);
    }

    public componentWillUpdate(): void {
        this._setViewFilter();
    }

    public render(): JSX.Element {
        return (
            <FilterBar {...this.props} filter={this.props.hubState.filter}>
                <KeywordFilterBarItem filterItemKey={PackageFilterBarConstants.KeywordFilterKey} />
                <PickListFilterBarItem
                    className={"view-dropdown"}
                    filterItemKey={PackageFilterBarConstants.ViewFilterKey}
                    getPickListItems={() => this.props.feedViews}
                    placeholder={PackageResources.FeedViewDropdown_Title}
                    getListItem={(item: FeedView) => PackageFilterBarHelper.getFeedViewPickListItem(item)}
                />
                {this.props.selectedFeed.upstreamEnabled && (
                    <PickListFilterBarItem
                        className={"upstream-sources-dropdown"}
                        filterItemKey={PackageFilterBarConstants.SourceFilterKey}
                        getPickListItems={() => this._getSourcesPickListItems()}
                        placeholder={PackageResources.FeedUpstreamDropdown_Title}
                        getListItem={(item: IPickListItem) => item}
                    />
                )}
            </FilterBar>
        );
    }

    private _setViewFilter() {
        if (this.props.selectedFeed.view) {
            const filterState: IFilterState = PackageFilterBarHelper.setFeedViewToFilterState(
                this.props.hubState.filter.getState(),
                this.props.selectedFeed.view
            );

            this.props.hubState.filter.setState(filterState, true /*suppressChangeEvent*/);
        }
    }

    private _getSourcesPickListItems(): IPickListItem[] {
        let pickListItems: IPickListItem[] = [];
        this.props.selectedFeed.upstreamSources.forEach((upstream: UpstreamSource) => {
            const pickListItem = upstreamSourceToPickListItem(upstream);
            pickListItems.push(pickListItem);
        });
        pickListItems = pickListItems.sort((a: IPickListItem, b: IPickListItem) =>
            Utils_String.localeComparer(a.name, b.name)
        );
        pickListItems.unshift(PackageFilterBarHelper.localItem);
        return pickListItems;
    }

    @autobind
    private _handleFilterChanged(): void {
        const filterState = this.props.hubState.filter.getState();
        Actions.PackagesFilterBarChanged.invoke(filterState);
    }
}
