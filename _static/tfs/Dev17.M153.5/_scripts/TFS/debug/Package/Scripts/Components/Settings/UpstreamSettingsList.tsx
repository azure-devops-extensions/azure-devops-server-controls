import * as React from "react";

import { IconButton } from "OfficeFabric/Button";
import {
    CheckboxVisibility,
    ColumnActionsMode,
    ConstrainMode,
    DetailsListLayoutMode,
    DetailsRow,
    IDetailsRowProps
} from "OfficeFabric/DetailsList";
import { IObjectWithKey, Selection, SelectionMode } from "OfficeFabric/Selection";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { VssDetailsList } from "VSSUI/VssDetailsList";
import { IVssIconProps, VssIcon } from "VSSUI/VssIcon";

import { FeedSettingsActionCreator } from "Package/Scripts/Actions/FeedSettingsActionCreator";
import { UpstreamSource } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import * as PackageResources from "Feed/Common/Resources";
import { BowtieIconProps } from "Feed/Common/Utils/Icons";

export interface IUpstreamSettingsListProps extends Props {
    /**
     * The rows to display
     */
    upstreamSourceRows: IUpstreamSettingsRowData[];

    /**
     * True if the current user can make changes to the feed settings
     */
    isUserAdmin: boolean;

    /**
     * Tracks if views are getting saved to server
     */
    isSavingChanges: boolean;
}

export interface IUpstreamSettingsRowData {
    /**
     * The UpstreamSource associated with the current row
     */
    upstreamSource: UpstreamSource;

    /**
     * The localized type of upstreamSource
     */
    upstreamSourceType: string;

    /**
     * True if upstreamSource is invalid (e.g. protocol disabled/bad protocol)
     */
    isInvalid: boolean;

    /**
     * The icon props associated with upstreamSource's protocol
     */
    iconProps: IVssIconProps;

    /**
     * The standardised name of the upstreamSource's protocol
     */
    protocolName: string;
}

export class UpstreamSettingsList extends Component<IUpstreamSettingsListProps, State> {
    private selection: Selection;
    private warningIcon = VssIcon.getIconProps(new BowtieIconProps("Warning"));

    constructor(props: IUpstreamSettingsListProps) {
        super(props);

        this.selection = new Selection({
            canSelectItem: (item: IObjectWithKey): boolean => {
                if (this.props.isUserAdmin === false) {
                    return false;
                }

                if (this.props.isSavingChanges === true) {
                    return false;
                }

                return true;
            },
            getKey: (item: IObjectWithKey): string => {
                const upstreamSettingsRowData: IUpstreamSettingsRowData = item as IUpstreamSettingsRowData;
                return upstreamSettingsRowData.upstreamSource.id;
            },
            onSelectionChanged: (): void => {
                const upstreamSettingsRowData = this.selection.getSelection() as IUpstreamSettingsRowData[];
                const sources: UpstreamSource[] = upstreamSettingsRowData.map(
                    (rowData: IUpstreamSettingsRowData) => rowData.upstreamSource
                );
                FeedSettingsActionCreator.onUpstreamSourcesSelectionChanged.invoke(sources);
            }
        });
    }

    public render(): JSX.Element {
        return (
            <VssDetailsList
                setKey="upstreamsources-grid"
                className="upstream-settings-list"
                constrainMode={ConstrainMode.unconstrained}
                layoutMode={DetailsListLayoutMode.justified}
                items={this.props.upstreamSourceRows}
                selectionMode={SelectionMode.multiple}
                selectionPreservedOnEmptyClick={true}
                selection={this.selection}
                checkboxVisibility={CheckboxVisibility.onHover}
                ariaLabel={PackageResources.FeedSettings_Upstreams_Grid_AriaLabel}
                ariaLabelForGrid={PackageResources.FeedSettings_Upstreams_Grid_AriaLabelForGrid}
                ariaLabelForListHeader={PackageResources.FeedSettings_Upstreams_Grid_AriaLabelForHeader}
                ariaLabelForSelectionColumn={PackageResources.DetailsList_SelectionColumn_AriaLabel}
                ariaLabelForSelectAllCheckbox={PackageResources.DetailsList_SelectAll_AriaLabel}
                allocateSpaceForActionsButtonWhileHidden={false}
                onRenderRow={this.onRenderRow}
                columns={[
                    {
                        key: "protocol",
                        fieldName: "protocol",
                        name: PackageResources.UpstreamSettingsList_ProtocolColumnName,
                        iconName: "Page",
                        isIconOnly: true,
                        columnActionsMode: ColumnActionsMode.disabled,
                        onRender: (item: IUpstreamSettingsRowData) => {
                            const { protocolName, iconProps } = item;
                            return (
                                <label className="settings-grid-cell" aria-label={protocolName}>
                                    <TooltipHost content={protocolName}>
                                        <VssIcon {...iconProps} />
                                    </TooltipHost>
                                </label>
                            );
                        },
                        minWidth: 16,
                        maxWidth: 16,
                        isResizable: false
                    },
                    {
                        key: "source",
                        fieldName: "source",
                        name: PackageResources.UpstreamSourceColumn,
                        className: "string-column",
                        columnActionsMode: ColumnActionsMode.disabled,
                        onRender: (item: IUpstreamSettingsRowData) => {
                            return (
                                <TooltipHost
                                    content={item.upstreamSource.name}
                                    overflowMode={TooltipOverflowMode.Parent}
                                >
                                    <label className="settings-grid-cell">{item.upstreamSource.name}</label>
                                </TooltipHost>
                            );
                        },
                        minWidth: 100,
                        maxWidth: 200,
                        isResizable: true
                    },
                    {
                        key: "location",
                        fieldName: "location",
                        name: PackageResources.UpstreamSettingsList_LocationColumnName,
                        className: "string-column",
                        columnActionsMode: ColumnActionsMode.disabled,
                        onRender: (item: IUpstreamSettingsRowData) => {
                            return (
                                <TooltipHost
                                    content={item.upstreamSource.location}
                                    overflowMode={TooltipOverflowMode.Parent}
                                >
                                    <label className="settings-grid-cell">{item.upstreamSource.location}</label>
                                </TooltipHost>
                            );
                        },
                        minWidth: 200,
                        maxWidth: 350,
                        isResizable: true
                    },
                    {
                        key: "sourceType",
                        fieldName: "sourceType",
                        name: PackageResources.UpstreamSettingsList_SourceTypeColumnName,
                        className: "string-column",
                        columnActionsMode: ColumnActionsMode.disabled,
                        onRender: (item: IUpstreamSettingsRowData) => {
                            const warningMessage: string = Utils_String.format(
                                PackageResources.UpstreamSettingsList_DisabledTooltip,
                                item.protocolName
                            );

                            return (
                                <label className="settings-grid-cell">
                                    {item.upstreamSourceType}
                                    {item.isInvalid ? (
                                        <TooltipHost content={warningMessage}>
                                            <IconButton
                                                className={"edit-warning"}
                                                iconProps={this.warningIcon}
                                                ariaLabel={warningMessage}
                                            />
                                        </TooltipHost>
                                    ) : null}
                                </label>
                            );
                        },
                        minWidth: 100,
                        maxWidth: 120
                    }
                ]}
            />
        );
    }

    private onRenderRow(props: IDetailsRowProps): JSX.Element {
        const rowClassName = "upstream-source-row" + (props.item.isInvalid ? " is-disabled" : "");

        return <DetailsRow className={rowClassName} {...props} />;
    }
}
