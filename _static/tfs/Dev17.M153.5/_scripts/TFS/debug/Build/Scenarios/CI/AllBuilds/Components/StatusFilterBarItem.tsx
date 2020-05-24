import * as React from "react";

import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import { PickListFilterBarItem } from "VSSUI/PickList";
import { FilterBarItem, IFilterBarItemState, IFilterBarItemProps } from 'VSSUI/FilterBarItem';

import { SelectionMode } from "OfficeFabric/Selection";
import { BuildStatus } from "TFS/Build/Contracts";

export interface StatusPickListItem {
    status: BuildStatus;
    name: string;
}

export class StatusFilterBarItem extends FilterBarItem<any[], IFilterBarItemProps, IFilterBarItemState<any>> {
    private _pickList: PickListFilterBarItem;

    constructor(props: IFilterBarItemProps) {
        super(props);
    }

    public focus(): void {
        this._pickList.focus();
    }

    public render(): JSX.Element {

        const options: StatusPickListItem[] = [
            {
                status: BuildStatus.NotStarted,
                name: BuildResources.BuildStatusPickerNotStartedOptionText
            },
            {
                status: BuildStatus.InProgress,
                name: BuildResources.BuildStatusPickerInProgressOptionText
            },
            {
                status: BuildStatus.Completed,
                name: BuildResources.BuildStatusPickerCompletedOptionText
        }];
        return <PickListFilterBarItem
                    ref={(pickList) => this._pickList = pickList}
                    filter={this.props.filter}
                    key={this.props.filterItemKey}
                    filterItemKey={this.props.filterItemKey}
                    selectionMode={SelectionMode.single}
                    getPickListItems={() =>  {return options}}
                    getListItem={(item: StatusPickListItem) => {
                        return {
                        name: item.name,
                        key: item.status.toString()
                        }
                    }}
                    selectedItems={[]}
                    placeholder={BuildResources.BuildStatus}
        />
    }
}