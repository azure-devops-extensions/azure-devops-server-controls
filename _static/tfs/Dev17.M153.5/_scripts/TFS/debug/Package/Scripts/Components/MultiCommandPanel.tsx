import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Panel } from "OfficeFabric/components/Panel/Panel";
import { PanelType } from "OfficeFabric/components/Panel/Panel.types";
import { DetailsList, IColumn, SelectionMode } from "OfficeFabric/DetailsList";
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { css, findIndex } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import { VssIcon } from "VSSUI/VssIcon";

import * as Actions from "Package/Scripts/Actions/Actions";
import { IMultiCommandPackageDetails } from "Package/Scripts/Common/ActionPayloads";
import { IPromotePackageVersionsMap } from "Package/Scripts/Components/MultiPromotePanel";
import { PackageMessagePanel } from "Package/Scripts/Components/PackageMessagePanel";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import * as PackageResources from "Feed/Common/Resources";
import { MinimalPackageVersion, Package } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/MultiCommandPanel";

export interface IMultiCommandPanelProps extends Props {
    className: string;
    detailsListItems: IPromotePackageVersionsMap[];
    headerText: string;
    isOpen: boolean;
    onPanelClosedCallback: () => void;
    onPanelSavedCallback: (packageDetails: IMultiCommandPackageDetails[]) => void;
    onVersionChangedCallback: (option: IDropdownOption) => void;
    selectedPackages: Package[];
    panelInstructionsParagraph?: string;
    protocolMap: IDictionaryStringTo<IPackageProtocol>;
    saveButtonText: string;
    tooManyPackagesToDisplayMessage: string;
    additionalFooterContent?: JSX.Element;
    additionalPanelContent?: JSX.Element;
    messageBarMessage?: string;
    saveButtonDisabled?: boolean;
    useLatestTag?: boolean;
    getInfoBubble?: (item: IPackageVersionsMap) => JSX.Element;

    /**
     * Disable the versions dropdown and save button, and add a spinner to save button
     */
    isSaving?: boolean;

    /**
     * Don't display deleted versions in the version dropdown
     */
    hideDeletedVersions?: boolean;
}

export interface IPackageVersionsMap {
    allVersionsFetched: boolean;
    packageSummary: Package;
    selectedVersionName: string;
}

export class MultiCommandPanel extends Component<IMultiCommandPanelProps, State> {
    private static _maxPackagesPerPanel: number = 50;

    public render(): JSX.Element {
        return (
            <Panel
                className={css("multi-command-panel", this.props.className)}
                isOpen={this.props.isOpen}
                onDismiss={() => this.props.onPanelClosedCallback()}
                onRenderFooterContent={() => this._getFooterContent()}
                type={PanelType.medium}
                closeButtonAriaLabel={PackageResources.AriaLabel_MultiCommandPanel_CloseButton}
                headerText={this.props.headerText}
            >
                <div className={"panel-content-container"}>
                    {this.props.messageBarMessage && <PackageMessagePanel message={this.props.messageBarMessage} />}
                    {this.props.panelInstructionsParagraph && <p>{this.props.panelInstructionsParagraph}</p>}
                    {this.props.detailsListItems.length <= MultiCommandPanel._maxPackagesPerPanel ? (
                        <DetailsList
                            className={"multi-command-package-list"}
                            items={this.props.detailsListItems}
                            columns={this._getColumns()}
                            selectionMode={SelectionMode.none}
                        />
                    ) : (
                        <p>{this.props.tooManyPackagesToDisplayMessage}</p>
                    )}
                </div>
                {this.props.additionalPanelContent}
            </Panel>
        );
    }

    private _getColumns(): IColumn[] {
        let columns: IColumn[] = [];
        columns = [
            {
                key: "protocol",
                name: "protocol",
                fieldName: "protocol",
                iconClassName: "bowtie-icon bowtie-file-stack",
                isIconOnly: true,
                minWidth: 30,
                isResizable: false,
                isMultiline: false,
                headerClassName: "protocol-header multi-command-header",
                className: "protocol-cell multi-command-cell",
                onRender: (item: IPackageVersionsMap) => {
                    const protocolType = item.packageSummary.protocolType;
                    const ariaLabel = Utils_String.format(
                        PackageResources.AriaLabel_MultiPromotePanel_ProtocolIcon,
                        protocolType
                    );
                    const protocolProvider = this.props.protocolMap[protocolType];
                    return <VssIcon {...protocolProvider.vssIconProps} className="cell-item" aria-label={ariaLabel} />;
                }
            } as IColumn,
            {
                key: "package",
                name: PackageResources.MultiPromote_ListHeader_Package,
                fieldName: "package",
                minWidth: 220,
                maxWidth: 220,
                isResizable: true,
                isMultiline: false,
                headerClassName: "package-header multi-command-header",
                className: "package-cell multi-command-cell",
                onRender: (item: IPackageVersionsMap, index: number, column: IColumn) => {
                    return (
                        <div className={"cell-item"} aria-label={item.packageSummary.name}>
                            <TooltipHost content={item.packageSummary.name} overflowMode={TooltipOverflowMode.Parent}>
                                {item.packageSummary.name}
                            </TooltipHost>
                        </div>
                    );
                }
            } as IColumn,
            {
                key: "version",
                name: PackageResources.MultiPromote_ListHeader_Version,
                fieldName: "version",
                minWidth: 220,
                maxWidth: 220,
                isResizable: true,
                isMultiline: false,
                headerClassName: "version-header multi-command-header",
                className: "version-cell multi-command-cell",
                onRender: (item: IPackageVersionsMap, index: number, column: IColumn) => {
                    const selectedItem: MinimalPackageVersion = this._getSelectedVersion(item);
                    const optionClassName: string = css(
                        "version-dropdown",
                        "cell-item",
                        selectedItem.isListed !== true ? "strike-through" : ""
                    );
                    return (
                        <div className={"version-cell-container"}>
                            <div className={"version-dropdown-container"}>
                                <Dropdown
                                    ariaLabel={PackageResources.AriaLabel_VersionPicker}
                                    selectedKey={selectedItem.id}
                                    onRenderOption={option => this._onRenderOption(option, item)}
                                    className={optionClassName}
                                    options={this._getVersionOptions(item)}
                                    onChanged={this.props.onVersionChangedCallback}
                                    disabled={this.props.isSaving}
                                />
                            </div>
                            {this.props.getInfoBubble(item)}
                        </div>
                    );
                }
            } as IColumn
        ];

        return columns;
    }

    private _getFooterContent(): JSX.Element {
        return (
            <div className={"multi-command-panel-footer"}>
                {this.props.additionalFooterContent ? this.props.additionalFooterContent : null}
                <PrimaryButton
                    disabled={
                        (this.props.saveButtonDisabled ? this.props.saveButtonDisabled : false) ||
                        this.props.isSaving === true
                    }
                    className={"multi-command-panel-button"}
                    onClick={() => this._onSaveClick()}
                >
                    {this.props.isSaving === true ? <Spinner size={SpinnerSize.xSmall} /> : this.props.saveButtonText}
                </PrimaryButton>
                <DefaultButton
                    className={"multi-command-panel-button"}
                    onClick={() => this.props.onPanelClosedCallback()}
                >
                    {PackageResources.Dialog_CancelButtonText}
                </DefaultButton>
            </div>
        );
    }

    private _onSaveClick(): void {
        const packageDetails: IMultiCommandPackageDetails[] = [];

        this.props.detailsListItems.map(item => {
            packageDetails.push({
                id: item.packageSummary.name,
                version: item.selectedVersionName,
                protocolType: item.packageSummary.protocolType
            });
        });

        this.props.onPanelSavedCallback(packageDetails);
    }

    private _onRenderOption(versionOption: IDropdownOption, item: IPackageVersionsMap): JSX.Element {
        if (!item.allVersionsFetched) {
            Actions.MultiCommandVersionDropdownClicked.invoke(item.packageSummary.id);
        }

        const selectedIndex = findIndex(item.packageSummary.versions, version => version.id === versionOption.key);
        const showStrikeThrough = item.packageSummary.versions[selectedIndex].isListed !== true;

        return (
            <div className={showStrikeThrough ? "package-version-option-strike-through" : ""}>{versionOption.text}</div>
        );
    }

    private _getVersionOptions(item: IPackageVersionsMap): IDropdownOption[] {
        const versions = JSON.parse(JSON.stringify(item.packageSummary.versions));
        const versionOptions: IDropdownOption[] = [];
        versions.forEach((version: MinimalPackageVersion) => {
            if (this.props.hideDeletedVersions === true && version.isDeleted) {
                return;
            }

            versionOptions.push({
                key: version.id,
                text: version.version,
                data: item.packageSummary.id
            });
        });

        if (this.props.useLatestTag) {
            versionOptions[0].text = Utils_String.format(
                PackageResources.MultiPromote_LatestVersion,
                versionOptions[0].text
            );
        }

        return versionOptions;
    }

    private _getSelectedVersion(item: IPackageVersionsMap): MinimalPackageVersion {
        const selectedIndex = findIndex(
            item.packageSummary.versions,
            (version: MinimalPackageVersion) => version.version === item.selectedVersionName
        );
        return item.packageSummary.versions[selectedIndex];
    }
}
