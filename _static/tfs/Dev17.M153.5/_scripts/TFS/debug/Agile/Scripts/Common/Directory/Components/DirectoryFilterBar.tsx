import * as React from "react";

import { getFilterState, IDirectoryFilterState } from "Agile/Scripts/Common/Directory/Selectors/FilterSelector";
import { IDirectoryStore } from "Agile/Scripts/Common/Directory/Store/DirectoryStore";
import { DirectoryPivotType } from "Agile/Scripts/Common/DirectoryPivot";
import { DirectoryConstants } from "Agile/Scripts/Generated/HubConstants";
import * as AgileResources from "Agile/Scripts/Resources/TFS.Resources.Agile";
import { SelectionMode } from "OfficeFabric/Selection";
import { FilterBar, IFilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { IPickListItem, PickListFilterBarItem } from "VSSUI/PickList";
import { IFilter } from "VSSUI/Utilities/Filter";

export interface IDirectoryFilterBarProps {
    /** The currently active pivot */
    activePivot: DirectoryPivotType;
    /** The directory store driving this bar */
    directoryStore: IDirectoryStore;
    /** The hub view filter */
    filter: IFilter;
    /** Class name for the bar */
    className?: string;
    /** Callback called when filter dismiss is clicked */
    onDismissClicked?: () => void;
}

/**
 * Component which renders a filter bar for use on directory pages
 */
export class DirectoryFilterBar extends React.Component<IDirectoryFilterBarProps, IDirectoryFilterState> {

    private _filterBar: IFilterBar;

    constructor(props: IDirectoryFilterBarProps) {
        super(props);
        this.state = getFilterState(props.directoryStore, props.activePivot);
    }

    public componentDidMount(): void {
        const {
            directoryStore
        } = this.props;

        directoryStore.addChangedListener(this._onStoreChanged);

        // Focus on mount
        this.focus();
    }

    public componentWillUnmount(): void {
        const {
            directoryStore
        } = this.props;

        directoryStore.removeChangedListener(this._onStoreChanged);
    }

    public componentWillReceiveProps(nextProps: IDirectoryFilterBarProps) {
        if (this.props.activePivot !== nextProps.activePivot) {
            this.setState(getFilterState(nextProps.directoryStore, nextProps.activePivot));
        }
    }

    public render() {
        const {
            filter,
            onDismissClicked
        } = this.props;

        const {
            isLoading
        } = this.state;

        if (!isLoading) {
            return (
                <div className={this.props.className}>
                    <FilterBar
                        filter={filter}
                        componentRef={this._setFilterBar}
                        onDismissClicked={onDismissClicked}
                    >

                        <KeywordFilterBarItem
                            filter={filter}
                            filterItemKey={DirectoryConstants.KeywordFilterItemKey}
                            placeholder={AgileResources.KeywordFilter_PlaceholderText}
                        />

                        <PickListFilterBarItem
                            filter={filter}
                            filterItemKey={DirectoryConstants.TeamFilterItemKey}
                            selectionMode={SelectionMode.multiple}
                            getPickListItems={this._getTeams}
                            getListItem={this._getListItem}
                            showSelectAll={false}
                            isSearchable={true}
                            placeholder={AgileResources.TeamFilter_PlaceholderText}
                        />

                    </FilterBar>
                </div>
            );
        }

        return null;
    }

    /**
     *  Sets focus on the first filter item on the filter bar.
     */
    public focus() {
        if (this._filterBar) {
            this._filterBar.focus();
        }
    }

    private _getTeams = (): IPickListItem[] => {
        return this.state.teams ? this.state.teams.map(team => {
            return {
                key: team.id.toLowerCase(),
                name: team.name
            }
        }) : [];
    }

    private _getListItem = (item: IPickListItem): IPickListItem => {
        return item;
    }

    private _setFilterBar = (item: IFilterBar): void => {
        this._filterBar = item;
    }

    private _onStoreChanged = (): void => {
        this.setState(getFilterState(this.props.directoryStore, this.props.activePivot));
    }
}