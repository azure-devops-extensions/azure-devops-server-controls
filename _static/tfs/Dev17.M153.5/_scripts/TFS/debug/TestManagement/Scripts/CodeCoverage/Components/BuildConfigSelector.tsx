import * as React from "react";
import * as TestManagementResources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as ComponentBase from "VSS/Flux/Component";
import { IPickListSelection, PickListDropdown } from "VSSUI/PickList";

export interface IBuildConfigItem {
    name: string;
    index: number;
}

export interface IBuildConfigSelectorState extends ComponentBase.State {
    buildConfigurationList: IBuildConfigItem[];
    selectedConfiguration: IBuildConfigItem;
}

export interface IBuildConfigSelectorProps extends ComponentBase.Props {
    configurations: TCMContracts.BuildConfiguration[];
    onSelectionChanged: (index: number) => void;
}

export class BuildConfigSelector extends ComponentBase.Component<IBuildConfigSelectorProps, IBuildConfigSelectorState> {

    constructor(props: IBuildConfigSelectorProps) {
        super(props);

        const pickListItems = this._generatePickListItems();

        this.state = {
            buildConfigurationList: pickListItems,
            selectedConfiguration: pickListItems[0]
        } as IBuildConfigSelectorState;
    }

    private _generatePickListItems(): IBuildConfigItem[] {
        return this.props.configurations.map((config, index) => {
            const buildFlavor = `${TestManagementResources.BuildConfigurationText}:  ${ config.flavor || TestManagementResources.EmptyLiteralText }`;
            const buildPlatform = `${TestManagementResources.BuildPlatformText}:  ${ config.platform || TestManagementResources.EmptyLiteralText }`;
            const selectorText = `${buildFlavor} | ${buildPlatform}`;

            return {
                index: index,
                name: selectorText
            } as IBuildConfigItem;
        });
    }

    public render(): JSX.Element {
        return (
            <div className="build-config-selector">
                <PickListDropdown
                    className="build-config-picklist"
                    getListItem={(item: IBuildConfigItem) => {
                        return {
                            key: item.index.toString(),
                            name: item.name
                        };
                    }}
                    initiallySelectedItems={[this.state.selectedConfiguration]}
                    getPickListItems={() => this.state.buildConfigurationList}
                    onSelectionChanged={ (selection: IPickListSelection) => this.props.onSelectionChanged(selection.selectedItems[0].index) }
                />
            </div>
        );
    } 
}