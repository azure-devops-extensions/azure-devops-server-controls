/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { ISvnPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { CleanSourcesComponent } from "CIWorkflow/Scripts/Scenarios/Definition/Components/CleanSourcesComponent";
import { ISubversionMappingItem } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SubversionStore";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { IInfoProps } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";

import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";

import { RepositoryCleanOptions } from "TFS/Build/Contracts";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/InfoButton";
import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/SubversionAdvancedSettings";

export interface IProps extends Base.IProps {
    id: string;
    showAdvancedSettings: boolean;
    cleanRepository?: string;
    isCleanRepositoryEnabled?: boolean;
    cleanOption?: number;
    onCleanRepositoryChanged?: (newValue: string) => void;
    onCleanOptionsChanged?: (option: ISvnPayload) => void;
    onChange?: (mapping: ISubversionMappingItem) => void;
    isReadOnly?: boolean;
}

export interface ISvnMappingDetailRowProps extends Base.IProps {
    mappingItem: ISubversionMappingItem;
    onChange?: (mapping: ISubversionMappingItem) => void;
}

export class SubversionAdvancedSettings extends Base.Component<IProps, Base.IStateless> {

    public render(): JSX.Element {
        let svnCleanCalloutContentProps = {
            calloutDescription: Resources.SvnCleanHelpMarkdown
        };
        let svnCleanOptionsInfoProps: IInfoProps = {
            calloutContentProps: svnCleanCalloutContentProps,
        };

        return (
            <div>
                {
                    <div className="ci-sources-advanced-settings">
                        <CleanSourcesComponent
                            onCleanRepositoryChanged={this.props.onCleanRepositoryChanged}
                            cleanRepository={this.props.cleanRepository}
                            infoProps={svnCleanOptionsInfoProps}
                            onCleanOptionsChanged={(val: IDropDownItem) => { this._handleCleanOptionsChange(val.option, val.index); } }
                            cleanOption={this.props.cleanOption}
                            possibleCleanOptions={this._getCleanOptionsDropdown()}
                            isCleanRepositoryEnabled={this.props.isCleanRepositoryEnabled}
                            isReadOnly={!!this.props.isReadOnly} />
                        <div>
                            {this.props.showAdvancedSettings && this.props.children}
                        </div>
                    </div>
                }
            </div>
        );
    }

    private _getCleanOptionsDropdown(): IDropdownOption[] {
        let options: IDropdownOption[] = [];
        options.push({ key: RepositoryCleanOptions.Source + 1, text: Resources.BuildRepositoryCleanOptionsSourcesLabel });
        options.push({ key: RepositoryCleanOptions.SourceAndOutputDir + 1, text: Resources.BuildRepositoryCleanOptionsSourcesAndOutputDirLabel });
        options.push({ key: RepositoryCleanOptions.AllBuildDir + 1, text: Resources.BuildRepositoryCleanOptionsAllBuildDirLabel });

        return options;
    }

    private _handleCleanOptionsChange = (options: IDropdownOption, index: number): void => {
        let selectedCleanOption: number = parseInt(options.key.toString()) - 1;

        let option: ISvnPayload = {
            type: this.props.id,
            cleanOption: selectedCleanOption.toString()
        };
        this.props.onCleanOptionsChanged(option);
    }
}