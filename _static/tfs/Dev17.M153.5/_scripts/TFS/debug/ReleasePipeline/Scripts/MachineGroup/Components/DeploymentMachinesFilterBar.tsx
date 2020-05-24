import * as React from "react";
import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { Filter, IFilter, IFilterState, IFilterItemState, FILTER_CHANGE_EVENT  } from "VSSUI/Utilities/Filter";
import { PickListFilterBarItem, IPickListItem } from "VSSUI/PickList";
import Utils_String = require("VSS/Utils/String");

import { autobind } from "OfficeFabric/Utilities";
import { SelectionMode } from "OfficeFabric/Selection";

import MachineGroup_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupActions");
import MGUtils = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Utils");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/MachineGroup/Components/DeploymentMachinesFilterBar";

export interface IFilterProps extends React.Props<void> 
{
    filter: IFilter,
    allTags: string[];
    onFilter: (filters: MachineGroup_Actions.IMachinesFilter) => void;
    filters?: MachineGroup_Actions.IMachinesFilter;
}

export class MachinesFilter extends React.Component<IFilterProps, any> {

  constructor(props: IFilterProps) {
    super(props);
    props.filter.subscribe(this._onFilterApplied, FILTER_CHANGE_EVENT );
  }

  public render() {
    return (
      <div className = "deployment-machines-filter">
        <FilterBar
          filter={this.props.filter}>

          <KeywordFilterBarItem
            filterItemKey={this.nameFilterKey}
          />

          <PickListFilterBarItem
            placeholder= {Resources.StatusTitle}
            filterItemKey={this.statusFilterKey}
            selectionMode={SelectionMode.multiple}
            getPickListItems={() => { return this._getStatusPickListItems() }}
            getListItem={(item) => this._getStatusPickListItem(item)}
          />

          <PickListFilterBarItem
              placeholder={Resources.Tags}
              filterItemKey={this.tagFilterKey}
              selectionMode={SelectionMode.multiple}
              getPickListItems={() => { return this.props.allTags }}
              getListItem={(item) => this._getTagPickListItem(item)}
          />

        </FilterBar>
      </div>
    );
  }

  @autobind
  private _onFilterApplied(currentState: IFilterState) {
      if(!!this.props.onFilter){
            this.props.onFilter(this._mapToFilterState(this.props.filter.getState()));
      }
  }

  private _getTagPickListItem(tag: string): IPickListItem {
        return {
            name: tag,
            key: tag
        } as IPickListItem;
  }

  private _getStatusPickListItem(status: string): IPickListItem {
    let displayStatus = "";
    if(Utils_String.equals(status, MGUtils.MachineGroupsConstants.healthyStatus, true)){
      displayStatus = Resources.HealthyStatus;
    }
    else if(Utils_String.equals(status, MGUtils.MachineGroupsConstants.offlineStatus, true)){
      displayStatus = Resources.OfflineStatus;
    }
    else{
      displayStatus = Resources.FailingStatus;
    }
        return {
            name: displayStatus,
            key: status
        } as IPickListItem;
  }

  private _getStatusPickListItems(): string[]{
    return [MGUtils.MachineGroupsConstants.healthyStatus, MGUtils.MachineGroupsConstants.offlineStatus, MGUtils.MachineGroupsConstants.failingStatus];
  }

  private _mapToFilterState(filterState: IFilterState): MachineGroup_Actions.IMachinesFilter {
      let filters: MachineGroup_Actions.IMachinesFilter = {name: "", tagList: [], statusList:[]};

      if (filterState.hasOwnProperty(this.nameFilterKey)) {
          const filterItemState = filterState[this.nameFilterKey];
          filters.name = filterItemState.value as string;
      }

      if (filterState.hasOwnProperty(this.tagFilterKey)) {
          const filterItemState = filterState[this.tagFilterKey];
          filters.tagList = filterItemState.value as string[];
      }

      if (filterState.hasOwnProperty(this.statusFilterKey)) {
          const filterItemState = filterState[this.statusFilterKey];
          filters.statusList = filterItemState.value as string[];
      }

      return filters;
  }

  private readonly nameFilterKey = "nameFilterKey";
  private readonly tagFilterKey = "tagFilterKey";
  private readonly statusFilterKey = "statusFilterKey";
}

