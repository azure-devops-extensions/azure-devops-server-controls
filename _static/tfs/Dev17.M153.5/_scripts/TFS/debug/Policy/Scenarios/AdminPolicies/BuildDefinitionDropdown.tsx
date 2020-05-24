// libs
import * as React from "react";
import { format } from "VSS/Utils/String";
import { autobind } from "OfficeFabric/Utilities";
// controls
import { IVssComponentContext, VssComponent } from "VSS/Platform/Layout";
import { PickListDropdown, IPickListItem, IPickListGroup, IPickListSelection, IPickListDropdown } from "VSSUI/PickList";
import { SelectionMode } from 'OfficeFabric/Selection';
// scenario
import { IBuildDefinitionMap } from "Policy/Scenarios/AdminPolicies/Stores/BuildDefinitionStore";

import { Build } from "Policy/Scripts/PolicyTypes";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";
import { BuildDefinition } from "Policy/Scripts/Resources/TFS.Resources.Policy";

export interface IBuildDefinitionDropdownProps {
    buildDefinitionsSorted: Build.IBuildDefinitionSummary[];
    allDefinitionsLoaded: boolean;
    initialSelection?: Build.IBuildDefinitionSummary;
    onChanged?: (buildDefinitionId: number) => void;
}

export class BuildDefinitionDropdown extends React.Component<IBuildDefinitionDropdownProps, {}> {

    public render(): JSX.Element | null {
        const { allDefinitionsLoaded, initialSelection } = this.props;

        let initiallySelectedItems: Build.IBuildDefinitionSummary[] = [];

        if (initialSelection != null) {
            initiallySelectedItems.push(initialSelection);
        }

        return (
            <PickListDropdown
                getPickListItems={this.getPickListItems}
                getListItem={BuildDefinitionDropdown.getListItem}
                noItemsText={Resources.NoBuildDefinitions}

                initiallySelectedItems={initiallySelectedItems}
                selectionMode={SelectionMode.single}
                onSelectionChanged={this.onSelectedItemChanged}

                isSearchable={true}
                searchTextPlaceholder={Resources.FilterBuildDefinitions}
                searchNoResultsText={Resources.NoMatches}

                pickListClassName="build-definition-dropdown-pickList"

                groups={this.createStillLoadingGroup(allDefinitionsLoaded)}
            />
        );
    }

    @autobind
    public createStillLoadingGroup(allDefinitionsLoaded: boolean): IPickListGroup[] {
        if (allDefinitionsLoaded) {
            return [];
        }

        return [{
            key: "stillLoadingGroup",
            isLoading: true,
            loadingMessage: format(Resources.BuildDefinitionsLoading, this.props.buildDefinitionsSorted.length),
        }];
    }

    @autobind
    public getPickListItems(): Build.IBuildDefinitionSummary[] {
        return [...this.props.buildDefinitionsSorted];
    }

    public static readonly getListItem = (buildDef: Build.IBuildDefinitionSummary): IPickListItem => {

        // Trim initial \ from path and replace remaining \'s with /'s
        let path = buildDef.path.substr(1).replace("\\", "/");

        let name = buildDef.name;

        if (path != "") {
            name += " (" + path + ")"
        }

        return {
            name,
            key: buildDef.id.toString(),
        };
    };

    @autobind
    public onSelectedItemChanged(selection: IPickListSelection): void | boolean {
        if (this.props.onChanged) {
            this.props.onChanged(selection.selectedItems[0].id)
        }

        return true;
    }
}
