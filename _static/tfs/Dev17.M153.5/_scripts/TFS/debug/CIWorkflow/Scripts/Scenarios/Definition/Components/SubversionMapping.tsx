/// <reference types="react" />

import * as React from "react";

import { ISubversionMappingItem } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SubversionStore";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { KeyCodes } from "DistributedTaskControls/Common/ShortKeys";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { CommandButton, IButton } from "OfficeFabric/Button";
import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";
import { css } from "OfficeFabric/Utilities";

import { SvnMappingDetails } from "TFS/Build/Contracts";

import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/SubversionAdvancedSettings";

export interface ISubversionMappingProps extends Base.IProps {
    mappingItems: ISubversionMappingItem[];
    onChange?: (mapping: ISubversionMappingItem) => void;
    onAddNewMapping?: () => void;
    validateServerPath: (mappingItem: SvnMappingDetails) => string;
    validateLocalPath: (mappingItem: SvnMappingDetails) => string;
    validateRevision: (mappingItem: SvnMappingDetails) => string;
    showNoMappingsInfo?: boolean;
    isReadOnly?: boolean;
}

export interface ISvnMappingDetailRowProps extends Base.IProps {
    focusOnRow: boolean;
    mappingItem: ISubversionMappingItem;
    onChange?: (mapping: ISubversionMappingItem) => void;
    validateServerPath: (mappingItem: SvnMappingDetails) => string;
    validateLocalPath: (mappingItem: SvnMappingDetails) => string;
    validateRevision: (mappingItem: SvnMappingDetails) => string;
    isReadOnly?: boolean;
}

export class SubversionMappingDetailRow extends Base.Component<ISvnMappingDetailRowProps, Base.IStateless> {
    private _serverPathComponent: StringInputComponent;

    public render(): JSX.Element {
        return (
            <tr className="svn-mapping-row">
                <td className="path-selector-cell">
                    <StringInputComponent
                        ref={(element) => { this._serverPathComponent = element; }}
                        cssClass="server-path"
                        value={this.props.mappingItem.mapping.serverPath}
                        onValueChanged={(newValue: string) => { this._onServerPathChange(newValue); }}
                        ariaLabel={SubversionMappingDetailRow.GetServerPathColumnHeader()}
                        getErrorMessage={this._getServerPathErrorMessage}
                        disabled={!!this.props.isReadOnly}
                    />
                </td>
                <td className="path-selector-cell">
                    <StringInputComponent
                        cssClass="local-path"
                        value={this.props.mappingItem.mapping.localPath}
                        onValueChanged={(newValue: string) => { this._onLocalPathChange(newValue); }}
                        ariaLabel={SubversionMappingDetailRow.GetLocalPathLabelColumnHeader()}
                        getErrorMessage={this._getLocalPathErrorMessage}
                        disabled={!!this.props.isReadOnly}
                    />
                </td>
                <td className="path-selector-cell">
                    <StringInputComponent
                        cssClass="revision"
                        value={this.props.mappingItem.mapping.revision}
                        onValueChanged={(newValue: string) => { this._onRevisionChange(newValue); }}
                        ariaLabel={SubversionMappingDetailRow.GetRevisionColumnHeader()}
                        getErrorMessage={this._getRevisionErrorMessage}
                        disabled={!!this.props.isReadOnly}
                    />
                </td>
                <td className="fabric-style-overrides mapping-depth-dropdown">
                    <DropDownInputControl
                        label={Utils_String.empty}
                        options={
                            [
                                { key: 1, text: Resources.Empty },
                                { key: 2, text: Resources.Files },
                                { key: 3, text: Resources.Children },
                                { key: 4, text: Resources.Infinity },
                            ]
                        }
                        selectedKey={this.props.mappingItem.mapping.depth + 1}
                        onValueChanged={(val: IDropDownItem) => { this._onMappingDepthChange(val.option, val.index); }}
                        ariaLabel={SubversionMappingDetailRow.GetDepthColumnHeader()}
                        disabled={!!this.props.isReadOnly}
                    />
                </td>
                <td className="ignore-externals-enable-checkbox-container">
                    <BooleanInputComponent
                        cssClass="ignore-externals-enable-checkbox"
                        label={Utils_String.empty}
                        value={this.props.mappingItem.mapping.ignoreExternals}
                        onValueChanged={this._onIgnoreExternalsToggle}
                        ariaLabel={SubversionMappingDetailRow.GetIgnoreExternalsColumnHeader()}
                        disabled={!!this.props.isReadOnly} />
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

    public componentDidMount() {
        if (this.props.focusOnRow && this._serverPathComponent) {
            this._serverPathComponent.setFocus();
        }
    }

    public componentDidUpdate() {
        if (this.props.focusOnRow && this._serverPathComponent) {
            this._serverPathComponent.setFocus();
        }
    }

    public static GetServerPathColumnHeader(): string {
        return Resources.ServerPathText;
    }

    public static GetLocalPathLabelColumnHeader(): string {
        return Resources.LocalPathLabel;
    }

    public static GetRevisionColumnHeader(): string {
        return Resources.Revision;
    }

    public static GetDepthColumnHeader(): string {
        return Resources.Depth;
    }

    public static GetIgnoreExternalsColumnHeader(): string {
        return Resources.IgnoreExternals;
    }

    private _onServerPathChange = (serverPath: string): void => {
        this.props.mappingItem.mapping.serverPath = serverPath;
        this.props.onChange(this.props.mappingItem);
    }

    private _onLocalPathChange = (localPath: string): void => {
        this.props.mappingItem.mapping.localPath = localPath;
        this.props.onChange(this.props.mappingItem);
    }

    private _onRevisionChange = (revision: string): void => {
        this.props.mappingItem.mapping.revision = revision;
        this.props.onChange(this.props.mappingItem);
    }

    private _onMappingDepthChange = (option: IDropdownOption, index: number): void => {
        this.props.mappingItem.mapping.depth = parseInt(option.key.toString()) - 1;
        this.props.onChange(this.props.mappingItem);
    }

    private _onIgnoreExternalsToggle = (isChecked: boolean) => {
        this.props.mappingItem.mapping.ignoreExternals = isChecked;
        this.props.onChange(this.props.mappingItem);
    }

    private _onMappingDelete = (): void => {
        this.props.mappingItem.isDeleted = true;
        this.props.onChange(this.props.mappingItem);
    }

    private _getServerPathErrorMessage = (newValue: string): string => {
        let mappingItem: SvnMappingDetails = this.props.mappingItem.mapping;
        mappingItem.serverPath = newValue;
        return this.props.validateServerPath(mappingItem);
    }

    private _getLocalPathErrorMessage = (newValue: string): string => {
        let mappingItem: SvnMappingDetails = this.props.mappingItem.mapping;
        mappingItem.localPath = newValue;
        return this.props.validateLocalPath(mappingItem);
    }

    private _getRevisionErrorMessage = (newValue: string): string => {
        let mappingItem: SvnMappingDetails = this.props.mappingItem.mapping;
        mappingItem.revision = newValue;
        return this.props.validateRevision(mappingItem);
    }
}

export class SubversionMapping extends Base.Component<ISubversionMappingProps, Base.IStateless> {
    private _focusedRow: number = -1;
    private _focusOnAdd: boolean = false;
    private _addButton: IButton;
    private _mappingInfoElement: InfoButton;

    public render(): JSX.Element {
        return (
            <div>
                <div className="svn-mapping-label"
                    aria-describedby="mapping-description"
                    onKeyDown={this._handleKeyDown}>
                    <div className="hidden" id="mapping-description">{Resources.SubversionMappingHelpText}</div>
                    {Resources.Mapping}
                    <InfoButton
                        ref={this._resolveRef("_mappingInfoElement")}
                        calloutContent={{
                            calloutDescription: Resources.SubversionMappingHelpText
                        } as ICalloutContentProps} />
                </div>
                {this._getMappings()}
                {this._getAddButton()}
            </div>
        );
    }

    private _getMappings(): JSX.Element {
        if (this.props.mappingItems.length > 0) {
            return (
                <table className="svn-mapping-table">
                    <thead>
                        <tr>
                            <th>{SubversionMappingDetailRow.GetServerPathColumnHeader()}</th>
                            <th>{SubversionMappingDetailRow.GetLocalPathLabelColumnHeader()}</th>
                            <th>{SubversionMappingDetailRow.GetRevisionColumnHeader()}</th>
                            <th>{SubversionMappingDetailRow.GetDepthColumnHeader()}</th>
                            <th>{SubversionMappingDetailRow.GetIgnoreExternalsColumnHeader()}</th>
                            <th></th>
                        </tr>
                    </thead>
                    {this._getMappingDetailRows()}
                </table>);
        }
        else {
            return (
                this.props.showNoMappingsInfo &&
                <div className={"svn-warning-message"}>
                    <i className="bowtie-icon bowtie-status-info-outline left" />
                    {Resources.SvnNoMappingInfo}
                </div>);
        }
    }

    private _onAddMappingClick = (): void => {
        if (this.props.onAddNewMapping) {
            this._focusedRow = this.props.mappingItems ? this.props.mappingItems.length : -1;
            this.props.onAddNewMapping();
        }
    }

    private _getMappingDetailRows(): JSX.Element {
        let mappingDetailsRow: JSX.Element =
            (
                <tbody >
                    {
                        this.props.mappingItems.map((mappingItem: ISubversionMappingItem, index: number) => {
                            return <SubversionMappingDetailRow
                                key={mappingItem.index}
                                focusOnRow={index === this._focusedRow}
                                mappingItem={mappingItem}
                                onChange={this._onMappingItemChange}
                                validateServerPath={this.props.validateServerPath}
                                validateLocalPath={this.props.validateLocalPath}
                                validateRevision={this.props.validateRevision}
                                isReadOnly={!!this.props.isReadOnly} />;
                        })
                    }
                </tbody>
            );
        this._focusedRow = -1;

        return mappingDetailsRow;
    }

    private _getAddButton(): JSX.Element {
        let addButton: JSX.Element =
            (<CommandButton
                componentRef={(element) => { this._addButton = element; }}
                iconProps={{ iconName: "Add" }}
                ariaDescription={Resources.AddMapping}
                className="fabric-style-overrides add-new-item-button"
                onClick={this._onAddMappingClick}
                ariaLabel={Resources.Add}
                disabled={!!this.props.isReadOnly}>
                {Resources.Add}
            </CommandButton>);

        if (this._focusOnAdd && this._addButton) {
            this._addButton.focus();
        }

        this._focusOnAdd = false;

        return addButton;
    }

    private _onMappingItemChange = (mappingItem: ISubversionMappingItem): void => {
        if (mappingItem.isDeleted) {
            if (mappingItem.index === this.props.mappingItems.length - 1) {
                this._focusOnAdd = true;
            }
            else {
                this._focusedRow = mappingItem.index;
            }
        }
        this.props.onChange(mappingItem);
    }

    private _handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e && e.ctrlKey && e.altKey && e.keyCode === KeyCodes.Help) {
            if (this._mappingInfoElement) {
                this._mappingInfoElement.toggleInfoCalloutState();
            }
        }
    }
}