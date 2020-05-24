// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import Component_Base = require("VSS/Flux/Component");
import { VssIconType } from "VSSUI/VssIcon";
import { PickList, IPickListSelection } from "VSSUI/PickList";
import { SelectionMode } from "OfficeFabric/Selection";

import { Component } from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

export interface IProps extends Component_Base.Props {
    items: string[];
    noItemsText?: string;
    selectedProjectList?: string[];
    onSelectionChanged: (selectedItem: IPickListSelection) => void;
}

export interface IState extends Component_Base.State {
}

export class TeamProjectPickList extends Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);
    }

    public render(): JSX.Element {
        return (
            <PickList
                getListItem={(item: string) => {
                    return {
                        name: item,
                        key: item,
                        iconProps: {
                            iconType: VssIconType.bowtie,
                            iconName: "bowtie-briefcase"
                        }
                    };
                }}
                items={this.props.items}
                noItemsText={this.props.noItemsText}
                selectedItems={this.props.selectedProjectList ? this.props.selectedProjectList : []}
                onSelectionChanged={this.props.onSelectionChanged}
                selectionMode={SelectionMode.multiple}
                isSearchable={true}
                searchTextPlaceholder={Resources.SearchForProjectsText}
                onSearch={(searchText: string, items: string[]) => {
                    return undefined;
                }}
            />
        );
    }
}