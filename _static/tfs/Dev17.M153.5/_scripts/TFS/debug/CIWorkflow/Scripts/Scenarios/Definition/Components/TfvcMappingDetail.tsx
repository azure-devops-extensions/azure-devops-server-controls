/// <reference types="react" />

import * as React from "react";

import { TfvcConstants } from "CIWorkflow/Scripts/Common/Constants";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { ITfvcMappingItem } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TfvcMappingHelper";
import { TfvcMappingHelper } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TfvcMappingHelper";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";

import { CommandButton, IButton, IconButton } from "OfficeFabric/Button";
import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";
import { Label } from "OfficeFabric/Label";
import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/TfvcMappingDetail";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";

export interface IMappingDetailRowProps extends Base.IProps {
    mappingItem: ITfvcMappingItem;
    onChange: (mapping: ITfvcMappingItem) => void;
    onDeleteMapping?: () => void;
    showPathSelectorDialog: (callback: (selectedValue: ISelectedPathNode) => void) => void;
    validateServerPath: (newMapping: ITfvcMappingItem) => string;
    validateLocalPath: (newMapping: ITfvcMappingItem) => string;
    focus?: boolean;
    isReadOnly?: boolean;
}

export interface IMappingDetailsProps extends Base.IProps {
    mappingItems: ITfvcMappingItem[];
    onChange: (mapping: ITfvcMappingItem) => void;
    onAddNewMapping: () => void;
    onDeleteMapping?: () => void;
    showPathSelectorDialog: (callback: (selectedValue: ISelectedPathNode) => void) => void;
    validateServerPath: (newPath: ITfvcMappingItem) => string;
    validateLocalPath: (newPath: ITfvcMappingItem) => string;
    baseMappingIndex?: number;
    focusIndex?: number;
    isReadOnly?: boolean;
}

export class TfvcMappingDetailRow extends Base.Component<IMappingDetailRowProps, Base.IStateless> {
    private static _localPathPrefix: string = "\\";
    private _mappingTypeDropDown: DropDownInputControl;

    public render(): JSX.Element {
        return (
            <tr className="tfvc-mapping-row">
                <td className="fabric-style-overrides mapping-type-dropdown">
                    <DropDownInputControl
                        ref={this._resolveRef("_mappingTypeDropDown")}
                        label={Utils_String.empty}
                        options={
                            [
                                {
                                    key: TfvcConstants.MappingType_Map,
                                    text: Resources.MapText
                                },
                                {
                                    key: TfvcConstants.MappingType_Cloak,
                                    text: Resources.CloakText
                                },
                            ]
                        }
                        selectedKey={this.props.mappingItem.mapping && this.props.mappingItem.mapping.mappingType}
                        onValueChanged={(val: IDropDownItem) => { this._onMappingTypeChange(val.option, val.index); }}
                        ariaLabel={TfvcMappingHelper.GetMappingTypeColumnHeader()}
                        disabled={!!this.props.isReadOnly} />
                </td>

                <td className="path-selector-cell">
                    <StringInputComponent
                        errorMessage={this._getServerPathErrorMessage(this.props.mappingItem.mapping.serverPath)}
                        cssClass="server-path"
                        value={this.props.mappingItem.mapping.serverPath}
                        onValueChanged={(newValue: string) => { this._onServerPathChange(newValue); }}
                        ariaLabel={TfvcMappingHelper.GetServerPathColumnHeader()}
                        disabled={!!this.props.isReadOnly}
                    />
                </td>
                <td className="browse-server-path">
                    <IconButton
                        iconProps={{ iconName: "More" }}
                        className="fabric-style-overrides browse-button"
                        onClick={this._onSelectServerPathClick}
                        ariaLabel={DTCResources.Browse}
                        disabled={!!this.props.isReadOnly}>
                    </IconButton>
                </td>
                <td className="path-selector-cell">
                    {
                        (this.props.mappingItem.mapping.mappingType === TfvcConstants.MappingType_Map) &&
                        <StringInputComponent
                            errorMessage={this._getLocalPathErrorMessage(this.props.mappingItem.displayedLocalPath)}
                            cssClass="local-path"
                            value={this.props.mappingItem.displayedLocalPath}
                            onValueChanged={(newValue: string) => { this._onLocalPathChange(newValue); }}
                            ariaLabel={TfvcMappingHelper.GetLocalPathColumnHeader()}
                            disabled={!!this.props.isReadOnly}
                        />
                    }
                </td>
                <td className="delete-mapping">
                    <CommandButton
                        ariaLabel={Resources.DeleteRowButtonAreaLabel}
                        className={css("fabric-style-overrides", "delete-button", "bowtie-icon", "bowtie-trash", "filter-row-button")}
                        onClick={this._onMappingDelete}
                        disabled={!!this.props.isReadOnly}>
                    </CommandButton>
                </td>

            </tr>
        );
    }

    public componentDidMount(): void {
        if (this.props.focus)
        {
            if (this._mappingTypeDropDown) {
                this._mappingTypeDropDown.setFocus();
            }
        }
    }

    private _onSelectServerPathClick = (): void => {
        this.props.showPathSelectorDialog(this._onSelectedPathChange);
    }

    private _onSelectedPathChange = (selectedValue: ISelectedPathNode, selectedFromPicker?: boolean): void => {
        let selectedPath: string = selectedValue ? selectedValue.path : Utils_String.empty;
        if (selectedPath) {
            this._onServerPathChange(selectedPath, selectedFromPicker);
        }
    }

    private _getLocalPathErrorMessage = (value: string): string => {
        value = TfvcMappingDetailRow._localPathPrefix + value;
        
        let mappingItem: ITfvcMappingItem = this.props.mappingItem;
        mappingItem.mapping.localPath = value;

        if (this.props.mappingItem.mapping.mappingType === TfvcConstants.MappingType_Map) {
            return this.props.validateLocalPath(mappingItem);
        }
        return Utils_String.empty;
    }

    private _getServerPathErrorMessage = (value: string): string => {
        this.props.mappingItem.mapping.serverPath = value;
        if (value === Utils_String.empty) {
            return Resources.SettingsRequired;
        }
        return this.props.validateServerPath(this.props.mappingItem);
    }

    private _onMappingTypeChange = (option: IDropdownOption, index: number): void => {
        this.props.mappingItem.mapping.mappingType = Utils_String.empty + option.key;
        this.props.onChange(this.props.mappingItem);
    }

    private _onServerPathChange = (serverPath: string, selectedFromPicker?: boolean): void => {
        this.props.mappingItem.mapping.serverPath = serverPath;
        this.props.mappingItem.selectedFromPicker = selectedFromPicker;
        this.props.onChange(this.props.mappingItem);
    }

    private _onLocalPathChange = (localPath: string): void => {
        this.props.mappingItem.displayedLocalPath = localPath;
        this.props.onChange(this.props.mappingItem);
    }

    private _onMappingDelete = (): void => {
        this.props.mappingItem.isDeleted = true;
        if (this.props.onDeleteMapping)
        {
            this.props.onDeleteMapping();
        }
        this.props.onChange(this.props.mappingItem);
    }
}

export class TfvcMappingDetails extends Base.Component<IMappingDetailsProps, Base.IStateless> {
    private _addButton: IButton;

    public render(): JSX.Element {
        return (
            <div>
                <Label>{Resources.WorkspaceMappings}</Label>

                {this._getMappings()}

                <CommandButton
                    iconProps={{ iconName: "Add" }}
                    componentRef={this._resolveRef("_addButton")}
                    ariaDescription={Resources.AddMapping}
                    className="fabric-style-overrides add-new-item-button"
                    onClick={this._onAddMappingClick}
                    ariaLabel={Resources.Add}
                    disabled={!!this.props.isReadOnly}>
                    {Resources.Add}
                </CommandButton>
            </div>
        );
    }

    public componentDidUpdate(): void {
        if (this.props.focusIndex < 0)
        {
            if (this._addButton) {
                this._addButton.focus();
            }
        }
    }

    private _getMappings(): JSX.Element {
        if (this.props.mappingItems && this.props.mappingItems.length > 0) {
            return (
                <table className="tfvc-mapping-table">
                    <thead>
                        <tr>
                            <th>{TfvcMappingHelper.GetMappingTypeColumnHeader()}</th>
                            <th>{TfvcMappingHelper.GetServerPathColumnHeader()}</th>
                            <th></th>
                            <th>{TfvcMappingHelper.GetLocalPathColumnHeader()}</th>
                            <th></th>
                        </tr>
                    </thead>
                    {this._getMappingDetailRows()}
                </table>);
        }
        else {
            return (
                <ErrorComponent
                    cssClass="tfvc-no-mapping-error"
                    errorMessage={Resources.NoTFVCMappingError} />);
        }
    }

    private _onAddMappingClick = (): void => {
        if (this.props.onAddNewMapping) {
            this.props.onAddNewMapping();
        }
    }

    private _getMappingDetailRows(): JSX.Element {
        return (
            <tbody >
                {
                    this.props.mappingItems.map((mappingItem: ITfvcMappingItem, index: number) => {
                        const focus = this.props.focusIndex === index ? true : false;
                        return <TfvcMappingDetailRow
                            focus={focus}
                            key={mappingItem.index + this.props.baseMappingIndex}
                            mappingItem={mappingItem}
                            onChange={this._onMappingChange}
                            onDeleteMapping={this.props.onDeleteMapping}
                            showPathSelectorDialog={this.props.showPathSelectorDialog}
                            validateServerPath={this.props.validateServerPath}
                            validateLocalPath={this.props.validateLocalPath}
                            isReadOnly={!!this.props.isReadOnly} />;
                    })
                }
            </tbody>
        );
    }

    private _onMappingChange = (mapping: ITfvcMappingItem): void => {
        this.props.onChange(mapping);
    }
}