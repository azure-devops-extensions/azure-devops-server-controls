import * as React from "react";

import { autobind, css } from "OfficeFabric/Utilities";
import { SelectionMode } from "OfficeFabric/Selection";
import { IComboBoxOption } from "OfficeFabric/ComboBox";

import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";
import { removeWhere as removeFromArrayWhere } from "VSS/Utils/Array";
import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { PickListFilterBarItem, IPickListItem } from "VSSUI/PickList";
import { Filter, IFilter, IFilterOptions, IFilterState, FILTER_CHANGE_EVENT, IFilterItemState } from "VSSUI/Utilities/Filter";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ComboBoxType } from "DistributedTaskControls/Components/ComboBox";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";

import { ReleaseStatus } from "ReleaseManagement/Core/Contracts";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ComboBoxFilterBarItem } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ComboBoxFilterBarItem";
import { IdentityPickerFilterBarItem } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/IdentityPickerFilterBarItem";
import { ActiveReleasesFilterStore, IActiveReleasesFilterState, ReleaseFilterPickListItemsStatus } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesFilterStore";
import { ActiveReleasesActionCreator } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesActionCreator";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesFilterBar";
import { DefinitionsHubStore } from "PipelineWorkflow/Scripts/Definitions/Stores/DefinitionsHubStore";
import { IActiveDefinitionReference } from "PipelineWorkflow/Scripts/Definitions/ReleasesHubServiceData";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";

export interface IActiveReleasesFilterBar extends Base.IProps {
    isVisible: boolean;
}

export class ActiveReleasesFilterBar extends React.Component<IActiveReleasesFilterBar, Base.IStateless> {

    constructor(props) {
        super(props);

        this._activeReleasesActionCreator = ActionCreatorManager.GetActionCreator<ActiveReleasesActionCreator>(ActiveReleasesActionCreator);
        this._definitionsHubStore = StoreManager.GetStore<DefinitionsHubStore>(DefinitionsHubStore);
        this._filterStore = StoreManager.GetStore<ActiveReleasesFilterStore>(ActiveReleasesFilterStore);

        this._filter = new Filter();

        let filterState: IFilterState = this._filter.getState();
        filterState[this._nameFilterKey] = { value: Utils_String.empty };
        filterState[this._statusFilterKey] = { value: this._getDefaultPickListItems() };
        filterState[this._branchFilterKey] = { value: null };
        filterState[this._tagFilterKey] = { value: Utils_String.empty };
        filterState[this._createdByFilterKey] = { value: Utils_String.empty };

        this._filter.setState(filterState, true);
        this._prevFilterState = this._mapToFilterState(filterState);
    }

    public componentDidMount() {
        this._filter.subscribe(this._onFilterUpdated, FILTER_CHANGE_EVENT);
        this._filterStore.addListener(ActiveReleasesFilterStore.BranchesUpdatedEvent, this._branchesUpdated);
    }

    public componentWillUnmount() {
        this._filter.unsubscribe(this._onFilterUpdated, FILTER_CHANGE_EVENT);
        this._filterStore.removeListener(ActiveReleasesFilterStore.BranchesUpdatedEvent, this._branchesUpdated);
    }

    public render() {
        return (
            <div className={css("active-releases-filter-bar", this.props.isVisible ? "" : "hidden")}>
                {
                    this.props.isVisible &&
                    <FilterBar
                        filter={this._filter}>

                        <KeywordFilterBarItem
                            filterItemKey={this._nameFilterKey}
                            placeholder={Resources.ActiveReleasesSearchPlaceholderText}
                            throttleWait={500}
                        />

                        <PickListFilterBarItem
                            className={"releases-filter"}
                            placeholder={Resources.ReleaseStatus}
                            filterItemKey={this._statusFilterKey}
                            selectionMode={SelectionMode.multiple}
                            getPickListItems={() => { return this._getStatusPickListItems(); }}
                            getListItem={(item) => this._getStatusPickListItem(item)}
                            groups={this._filterStore.getState().groups}
                            showSelectAll={false}
                            hideClearButton={false}
                        />

                        <ComboBoxFilterBarItem
                            className={"releases-filter branch-picker-combobox"}
                            filterItemKey={this._branchFilterKey}
                            options={this._filterStore.getBranches()}
                            allowFreeform={false}
                            autoComplete={"on"}
                            useComboBoxAsMenuWidth={true}
                            required={false}
                            defaultSelectedKey={ActiveReleasesFilterStore.AnyBranchOptionKey} />

                        <PickListFilterBarItem
                            className={"releases-filter"}
                            placeholder={Resources.ReleaseTags}
                            filterItemKey={this._tagFilterKey}
                            selectionMode={SelectionMode.multiple}
                            getPickListItems={() => { return this._getTagsPickListItems(); }}
                            getListItem={(item) => this._getTagsPickListItem(item)}
                            showSelectAll={false}
                            hideClearButton={false}
                            isSearchable={true}
                            searchTextPlaceholder={Resources.ActiveDefinitionsFilterBarItemPlaceholderText}
                        />

                        <IdentityPickerFilterBarItem
                            placeholderText={Resources.ReleaseCreatedBy}
                            filterItemKey={this._createdByFilterKey}
                            identityPickerSearchControlClass={"releases-filter active-releases-created-by-filter"}
                            identityPickerSearchControlId={"active-releases-created-by-filter-item"}
                            consumerId={this._identityPickerConsumerId}
                            ariaLabel={Resources.IdentityPickerFilterBarItemAriaLabel}
                        />

                    </FilterBar>}
            </div>
        );
    }

    private _getStatusPickListItems(): ReleaseFilterPickListItemsStatus[] {
        let statusPickListItems: ReleaseFilterPickListItemsStatus[] = [
            ReleaseFilterPickListItemsStatus.Active,
            ReleaseFilterPickListItemsStatus.Draft,
            ReleaseFilterPickListItemsStatus.Abandoned,
            ReleaseFilterPickListItemsStatus.Deleted
        ];

        return statusPickListItems;
    }

    private _getTagsPickListItems(): string[] {
        return this._filterStore.getTagsPickListItems();
    }

    private _getDefaultPickListItems(): ReleaseFilterPickListItemsStatus[] {
        let items: ReleaseFilterPickListItemsStatus[] = [];
        const selectedStatus = this._filterStore.getDefaultStatus();
        Object.keys(ReleaseFilterPickListItemsStatus).forEach((key) => {
            if ((ReleaseFilterPickListItemsStatus[key] & selectedStatus) !== 0) {
                items.push(ReleaseFilterPickListItemsStatus[key]);
            }
        });

        return items;
    }

    private _getStatusPickListItem(status: ReleaseFilterPickListItemsStatus): IPickListItem {
        const groupKey = this._filterStore.getGroupKey(status);
        let picklistItem: IPickListItem = {
            name: ReleaseFilterPickListItemsStatus[status],
            key: ReleaseFilterPickListItemsStatus[status],
            groupKey: groupKey,
        };

        return picklistItem;
    }

    private _getTagsPickListItem(tag: string): IPickListItem {
        return {
            name: tag,
            key: Utils_String.format("{0}-{1}", "active-releases-tag", tag),
        } as IPickListItem;
    }

    @autobind
    private _onFilterUpdated(filterState: IFilterState): void {
        let modifiedFilterState: IFilterState = { ...this._filter.getAppliedState() };
        if (filterState.hasOwnProperty(this._statusFilterKey) && !!filterState[this._statusFilterKey]) {

            const actualReleaseStatuses = [
                ReleaseFilterPickListItemsStatus.Active,
                ReleaseFilterPickListItemsStatus.Abandoned,
                ReleaseFilterPickListItemsStatus.Draft
            ];

            // If deleted was not selected previously, but is selected now, deselect everything else
            const selectedStatus: ReleaseFilterPickListItemsStatus[] = filterState[this._statusFilterKey].value;
            if (selectedStatus.some((status) => status === ReleaseFilterPickListItemsStatus.Deleted) && !this._prevFilterState.isDeleted) {
                modifiedFilterState[this._statusFilterKey].value = [ReleaseFilterPickListItemsStatus.Deleted];
            }
            // If no release status was selected previously, but is selected now, deselect everything else
            else if (selectedStatus.some((status) => actualReleaseStatuses.some((status2) => status2 === status))
                && this._prevFilterState.status === ReleaseStatus.Undefined) {
                removeFromArrayWhere(
                    (modifiedFilterState[this._statusFilterKey].value as ReleaseFilterPickListItemsStatus[]),
                    (status) => !actualReleaseStatuses.some((status2) => status2 === status));
            }

            this._filter.setState(modifiedFilterState, true);
        }

        let activeReleasesFilterState: IActiveReleasesFilterState = this._mapToFilterState(modifiedFilterState);
        this._prevFilterState = activeReleasesFilterState;

        // Here we cannot directly call into _activeReleasesActionCreator.searchReleases
        // as we need to set isLoading state for ActiveDefinitionDetails via ActiveReleasesFilterStore update
        this._activeReleasesActionCreator.filterUpdated(activeReleasesFilterState);
    }

    private _mapToFilterState(filterState: IFilterState): IActiveReleasesFilterState {
        let activeReleasesFilter: IActiveReleasesFilterState = {
            searchText: Utils_String.empty,
            currentlyDeployed: false,
            status: ReleaseStatus.Undefined,
            branch: Utils_String.empty,
            isDeleted: false,
            tags: Utils_String.empty,
            createdBy: Utils_String.empty
        };

        if (filterState.hasOwnProperty(this._nameFilterKey) && !!filterState[this._nameFilterKey]) {
            const filterItemState = filterState[this._nameFilterKey];
            activeReleasesFilter.searchText = filterItemState.value as string;
        }

        if (filterState.hasOwnProperty(this._statusFilterKey) && !!filterState[this._statusFilterKey]) {
            const selectedStatus: ReleaseFilterPickListItemsStatus[] = filterState[this._statusFilterKey].value;
            let status: ReleaseStatus = ReleaseStatus.Undefined;
            selectedStatus.forEach(ss => {
                if (ss === ReleaseFilterPickListItemsStatus.Deleted) {
                    activeReleasesFilter.isDeleted = true;
                }
                else {
                    status = ss | status;
                }
            });
            activeReleasesFilter.status = status;
        }

        if (filterState.hasOwnProperty(this._branchFilterKey) && !!filterState[this._branchFilterKey]) {
            const filterItemState: IFilterItemState = filterState[this._branchFilterKey];
            activeReleasesFilter.branch = (!!filterItemState.value) ? filterItemState.value.key as string : null;
            if (!activeReleasesFilter.branch || activeReleasesFilter.branch === ActiveReleasesFilterStore.AnyBranchOptionKey) {
                activeReleasesFilter.branch = Utils_String.empty;
            }
        }

        if (filterState.hasOwnProperty(this._tagFilterKey) && !!filterState[this._tagFilterKey]) {
            const filterItemState: IFilterItemState = filterState[this._tagFilterKey];
            activeReleasesFilter.tags = (filterItemState.value) ? filterItemState.value.join(",") : Utils_String.empty;
        }

        if (filterState.hasOwnProperty(this._createdByFilterKey) && !!filterState[this._createdByFilterKey]) {
            const filterItemState: IFilterItemState = filterState[this._createdByFilterKey];
            activeReleasesFilter.createdBy = filterItemState.value ? filterItemState.value.localId : Utils_String.empty;
        }

        return activeReleasesFilter;
    }

    @autobind
    private _branchesUpdated(): void {
        this.forceUpdate();
    }

    private _filter: Filter;
    private _activeReleasesActionCreator: ActiveReleasesActionCreator;
    private _filterStore: ActiveReleasesFilterStore;
    private _definitionsHubStore: DefinitionsHubStore;
    private _prevFilterState: IActiveReleasesFilterState;

    private readonly _instanceId: string = "active-releases-filter-bar";
    private readonly _nameFilterKey: string = "nameFilterKey";
    private readonly _branchFilterKey: string = "branchFilterKey";
    private readonly _statusFilterKey: string = "statusFilterKey";
    private readonly _tagFilterKey: string = "tagFilterKey";
    private readonly _createdByFilterKey: string = "createdByFilterKey";
    // ToDo: Add all consumer Ids to the Wiki page
    private _identityPickerConsumerId: string = "d37fb7c0-8968-48fd-b0ba-cc19ab606020";
}