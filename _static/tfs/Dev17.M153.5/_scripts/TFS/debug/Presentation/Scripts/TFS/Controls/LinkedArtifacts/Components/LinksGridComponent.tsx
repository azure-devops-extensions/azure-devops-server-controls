/// <reference types="react-dom" />

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import * as Diag from "VSS/Diag";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import { autobind } from "OfficeFabric/Utilities";

import * as TFS_OM_Identities from "Presentation/Scripts/TFS/TFS.OM.Identities";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Controls from "VSS/Controls";
import * as Grids from "VSS/Controls/Grids";
import { CommandEventArgs } from "VSS/Events/Handlers"

import { IArtifactData } from "VSS/Artifacts/Services";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { IMenuItemSpec } from "VSS/Controls/Menus";

import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

import {
    IInternalLinkedArtifactPrimaryData, ViewMode, IColumn,
    IInternalLinkedArtifactDisplayData, InternalKnownColumns, DefaultGridHeight, IHostArtifact,
    ISortColumn, SortDirection, LINKED_ARTIFACTS_CUSTOMER_INTELLIGENCE_AREA, Events
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { ILinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";
import { IDisplayOptions, ILinkedArtifactGroup } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Interfaces";
import { LinkedArtifactsStore } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Flux/Store";
import { ActionsHub } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Flux/Actions";
import { ActionsCreator } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Flux/ActionsCreator";
import { ColumnTruncation } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Logic/ColumnTruncation";

import { ArtifactGroup, PrimaryArtifact, AdditionalArtifact, ArtifactSubGroup } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Components/ArtifactRenderer";
import { ArtifactGridComponent } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Components/GridArtifactRenderer";
import { ErrorUtils, ComponentUtils } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Components/ComponentUtils";
import * as Utils_UI from "VSS/Utils/UI";
import * as VSS_Telemetry from "VSS/Telemetry/Services";

import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { LinkEditCommentDialog } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Dialogs/LinkEditCommentDialog";

/** @internal */
export interface IGridComponentProps {
    actionsCreator: ActionsCreator;
    displayOptions: IDisplayOptions;

    hostArtifact?: IArtifactData;

    columns: IColumn[];
    sortColumns: ISortColumn[];
    linkedArtifactGroups: ILinkedArtifactGroup[];

    onDeleteLink?: () => void;
}

/** @internal */
export interface IGridComponentState {
    currentCommentEditTarget: IInternalLinkedArtifactDisplayData;
}

interface ILinksGridRowInfo {
    /**
     * Flag indicating whether the given row is a group or an item
     */
    isGroupRow: boolean;

    /**
     * Group display name
     */
    displayName?: string;

    /**
     * Link Type of this Group
     */
    linkType?: string;

    /**
     * Number of linked artifacts under current group
     */
    descendantCount?: number;

    /**
     * Linked artifact display data
     */
    data?: IInternalLinkedArtifactDisplayData;

    /** Host artifact */
    hostArtifact?: IHostArtifact;

    /**
     * UI flag which the Grid component reads to determine menu behavior.
     * When truthy, the context menu is hidden.
     */
    noContextMenu: boolean;

    /**
     * Flag indicating whether the given row is a sub group row
     */
    isSubGroupRow?: boolean;

    /**
     * Flag indicating whether the given link is part of a subgroup
     */
    isSubGroupedItem?: boolean;
}

export class LinksGridComponent extends React.Component<IGridComponentProps, IGridComponentState> {
    private _containerElement: Element;
    private _grid: Grids.Grid;
    private _columnTruncation: ColumnTruncation;
    private _gridSourceItems: ILinksGridRowInfo[] = [];
    private _expandStates: number[];

    private static ContextMenuCommands = {
        DELETE_LINK: "delete-link",
        EDIT_COMMENT: "edit-comment"
    };

    constructor(props: IGridComponentProps, context?: any) {
        super(props);
        this.state = {
            currentCommentEditTarget: null
        }
    }

    public render(): JSX.Element {
        let editCommentDialog: JSX.Element;
        if (this.state.currentCommentEditTarget) {
            editCommentDialog = <LinkEditCommentDialog
                actionsCreator={this.props.actionsCreator}
                closeDialog={this._dismissDialog}
                targetLink={this.state.currentCommentEditTarget} />
        }

        return <div className="links-grid" ref={(d) => this._containerElement = d} onKeyPress={this._onKeyPress.bind(this)}>{editCommentDialog}</div>;
    }

    public componentDidMount() {
        if (!this._grid) {
            // We need cell spacing for accurate calculation of column widths. We can get the cell spacing from the grid, but at this point it is not
            // available. Grid cannot be created without passing columns, so initially we create display columns that are all hidden, with 0 widths.
            // after we have cell spacing measured we call the proper truncation logic and update display columns.
            this._columnTruncation = new ColumnTruncation(this.props.columns, this.props.displayOptions.gridViewOptions.minColumnsInGridView);
            var displayColumns: Grids.IGridColumn[] = this._columnTruncation.prepareDisplayColumns(
                this._linkColumnRendererPrimary.bind(this),
                this._linkColumnRendererAdditional.bind(this),
                this._linkColumnValue.bind(this));

            this._prepareGridSourceItemsAndExpansionStates(this.props.linkedArtifactGroups);

            const height = this._calculateGridHeight(this.props);

            this._grid = Controls.create(Grids.Grid, $(this._containerElement), {
                useBowtieStyle: true,
                coreCssClass: "grid bowtie-grid la-grid",
                width: "100%", // Default the grid to 100% width, explicit values are only used for calculating column sizes
                height: `${height}px`,
                columns: displayColumns,
                source: this._gridSourceItems,
                expandStates: this._expandStates,
                sortOrder: this._getSortOrderForGrid(this.props.sortColumns),
                autoSort: false,
                allowMultiSelect: false,
                allowTextSelection: false,
                gutter: false,
                initialSelection: false,
                asyncInit: false,
                enabledEvents: {
                    [Grids.GridO.EVENT_ROW_UPDATED]: true
                },
                ariaAttributes: {
                    label: PresentationResources.LinkedArtifacts_AriaLabel_LinksGrid
                },
                contextMenu: {
                    items: this._getContextMenuItems
                }
            } as Grids.IGridOptions);

            // cell spacing is now measured in the grid, we should use the measured value to recalculate the column widths and visibility
            let isFullGridMode = this.props.displayOptions.viewMode === ViewMode.FullGrid;
            this._calculateAndUpdateDisplayColumns(this.props, this._getAvailableWidth(this.props.displayOptions.availableSpace.width), isFullGridMode);

            // Ensure data that was just set is shown
            this._layoutGrid(this.props);

            // Detach grid's own resize handler, we are taking care of that ourselves
            Utils_UI.detachResize(this._grid.getElement());

            this._attachEvents();
        }
    }

    public componentWillUnmount() {
        if (this._grid) {
            this._detachEvents();

            // Move disposal of control to next tick to work around a race condition in the grid's resize manager usage
            Utils_Core.delay(null, 0, () => {
                this._grid.dispose();
                this._grid = null;

                this._columnTruncation = null;
            });
        }
    }

    public componentWillReceiveProps(nextProps: IGridComponentProps) {
        this._updateGridManualRendering(nextProps);
    }

    private _updateGridManualRendering(nextProps: IGridComponentProps) {
        // Only manually update and re-render when something has changed that affects the grid
        if (this.props.linkedArtifactGroups === nextProps.linkedArtifactGroups
            && this.props.sortColumns === nextProps.sortColumns
            && this.props.displayOptions.viewMode === nextProps.displayOptions.viewMode
            && this.props.displayOptions.availableSpace.width === nextProps.displayOptions.availableSpace.width
            && this.props.displayOptions.availableSpace.height === nextProps.displayOptions.availableSpace.height
            && this.props.displayOptions.gridViewOptions === nextProps.displayOptions.gridViewOptions
            && this.props.hostArtifact === nextProps.hostArtifact) {
            return;
        }

        this._grid._sortOrder = this._getSortOrderForGrid(nextProps.sortColumns);
        this._updateGridDataSource(nextProps.linkedArtifactGroups, nextProps.hostArtifact);

        this._resize(nextProps);
    }

    private _calculateAndUpdateDisplayColumns(props: IGridComponentProps, availableWidth: number, transitionToFullGrid: boolean) {
        this._columnTruncation.calculateColumnWidthsAndVisibility(availableWidth, props.displayOptions.viewMode, transitionToFullGrid, this._grid._cellOffset);
        var displayColumns: Grids.IGridColumn[] = this._columnTruncation.getUpdatedDisplayColumns(this._grid.getColumns());
        for (var displayColumn of displayColumns) {
            this._grid.setColumnOptions(displayColumn.name, displayColumn);
        }
    }

    @autobind
    private _getContextMenuItems(): IMenuItemSpec[] {
        const selectedItem = this._getSelectedItem();
        if (!selectedItem) {
            return [];
        }

        let menuItems = [
            {
                rank: 200,
                id: LinksGridComponent.ContextMenuCommands.DELETE_LINK,
                text: PresentationResources.LinkedArtifacts_RemoveLink,
                showText: true,
                icon: "bowtie-icon bowtie-edit-delete",
                disabled: this.props.displayOptions.readOnly,
                action: () => this._deleteItem(selectedItem)
            }
        ];

        const isEditEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessWorkItemTrackingEditLinkComments);
        if (isEditEnabled) {
            menuItems.splice(0, 0, {
                rank: 100,
                id: LinksGridComponent.ContextMenuCommands.EDIT_COMMENT,
                text: PresentationResources.LinkedArtifacts_EditComment,
                showText: true,
                icon: "bowtie-icon bowtie-edit-outline",
                disabled: this.props.displayOptions.readOnly,
                action: () => {
                    this.setState({
                        currentCommentEditTarget: selectedItem
                    });
                }
            });
        }

        return menuItems;
    }

    private _attachEvents() {
        this._grid.getElement().on(Events.ForceRerender, () => {
            this._layoutGrid(this.props);
        });

        this._grid.getElement().on("sort", (event, args: { sortColumns; sortOrder }) => {
            this.props.actionsCreator.sortLinkedArtifacts(args.sortOrder);
            VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
                LINKED_ARTIFACTS_CUSTOMER_INTELLIGENCE_AREA,
                "gridSort",
                {
                    tool: this.props.hostArtifact.tool,
                    type: this.props.hostArtifact.type,
                    viewMode: this.props.displayOptions.viewMode,
                    columns: args.sortOrder
                }
            ));
        });

        this._grid.getElement().on("columnmove", (event, source, dest) => {
            this._columnTruncation.columnMoved(source, dest);
            VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
                LINKED_ARTIFACTS_CUSTOMER_INTELLIGENCE_AREA,
                "gridColumnMove",
                {
                    tool: this.props.hostArtifact.tool,
                    type: this.props.hostArtifact.type,
                    viewMode: this.props.displayOptions.viewMode,
                    oldPosition: source,
                    newPosition: dest,
                    column: this._grid.getColumns()[dest].index
                }
            ));
        });

        this._grid.getElement().on("columnresize", (event, column: Grids.IGridColumn) => {
            var oldSize = this._columnTruncation.getColumnCurrentWidth(column.index);
            this._columnTruncation.columnResized(column);
            VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
                LINKED_ARTIFACTS_CUSTOMER_INTELLIGENCE_AREA,
                "gridColumnResize",
                {
                    tool: this.props.hostArtifact.tool,
                    type: this.props.hostArtifact.type,
                    viewMode: this.props.displayOptions.viewMode,
                    oldSize: oldSize,
                    newSize: column.width,
                    column: column.index
                }
            ));
        });

        this._grid.getElement().on("deletekey", (event, args: { rowIndex: number }) => {
            if (!this.props.displayOptions.readOnly) {
                let selectedItem = this._gridSourceItems[args.rowIndex].data;
                this._deleteItem(selectedItem);
            }
        });
    }

    private _detachEvents() {
        this._grid.getElement().off(Events.ForceRerender);
        this._grid.getElement().off("sort");
        this._grid.getElement().off("columnmove");
        this._grid.getElement().off("columnresize");
        this._grid.getElement().off("deletekey");

        this._grid.getElement().off(Grids.GridO.EVENT_ROW_UPDATED);
    }

    private _getSelectedItem(): IInternalLinkedArtifactDisplayData {
        if (!this._grid) {
            return null;
        }

        let selectedItemIdx = this._grid.getSelectedDataIndex();
        if (selectedItemIdx <= 0) {
            return null;
        }

        return this._gridSourceItems[selectedItemIdx].data;
    }

    private _onKeyPress(evt: KeyboardEvent): boolean {
        let selectedItem = this._getSelectedItem();
        if (selectedItem) {
            switch (evt.keyCode) {
                case KeyCode.DELETE:
                    this._deleteItem(selectedItem);

                    evt.preventDefault();
                    return false;

                case KeyCode.ENTER:
                    PrimaryArtifact.openArtifact(selectedItem.primaryData, this.props.hostArtifact, evt);
                    return false;
            }
        }

        return true;
    }

    @autobind
    private _dismissDialog() {
        this._grid.focus();
        this.setState({ currentCommentEditTarget: null });
    }

    private _getAvailableWidth(width: number): number {
        // Take (potential) vertical scrollbar here into account
        const assumedScrollbarWidthPixel = 25;

        return width - assumedScrollbarWidthPixel || null;
    }

    private _resize(props: IGridComponentProps): void {
        // If the new mode is full grid stretch the columns so that it consumes all available white space, but do not shrink.
        var transitionToFullGrid: boolean = props.displayOptions.viewMode === ViewMode.FullGrid && this.props.displayOptions.viewMode !== ViewMode.FullGrid;

        // Calculate visible columns
        var availableWidth: number = 0;
        if (props.displayOptions.viewMode !== ViewMode.FullGrid || transitionToFullGrid) {
            availableWidth = this._getAvailableWidth(props.displayOptions.availableSpace.width);
        }

        this._calculateAndUpdateDisplayColumns(props, availableWidth, transitionToFullGrid);

        this._layoutGrid(props);
    }

    /** Redraw grid including header */
    private _layoutGrid(props: IGridComponentProps) {
        let gridElement = this._grid.getElement();
        gridElement.height(this._calculateGridHeight(props));
        gridElement.width(props.displayOptions.availableSpace.width);

        // Note: For now always layout the grid, since the height might have changed. As an additional optimization we might determine
        // in the future whether a simple redraw (does not redraw header and columns) might be enough.
        this._grid.layout();
        this._ensureGridRowSelection();
    }

    private _ensureGridRowSelection() {
        let selectedItemIdx = this._grid.getSelectedDataIndex();

        if (selectedItemIdx >= this._gridSourceItems.length) {
            selectedItemIdx = this._gridSourceItems.length - 1;
        }

        if (selectedItemIdx <= 0) {
            //Find the first non group row
            selectedItemIdx = Utils_Array.findIndex(this._gridSourceItems, (gridRow) => !gridRow.isGroupRow && !gridRow.isSubGroupRow);
        }

        this._grid.setSelectedDataIndex(selectedItemIdx);
    }

    private _calculateGridHeight(props: IGridComponentProps): number {
        if (props.displayOptions.gridViewOptions.autoSizeGrid) {
            // Expand with content until max height is reached
            const maxHeight = this.props.displayOptions.gridViewOptions.maxGridHeight || DefaultGridHeight;
            const itemHeight = 30;

            // Space that is required by the grid independent of number of items shown
            const margin = itemHeight + 5;

            let numberOfItems = this._gridSourceItems.length;
            return Math.min(numberOfItems * itemHeight + margin, maxHeight);
        } else {
            // Fill available space
            return props.displayOptions.availableSpace.height || DefaultGridHeight;
        }
    }

    /** Map from ISortColumns to the format the grid needs */
    private _getSortOrderForGrid(sortColumns: ISortColumn[]): any[] {
        return (sortColumns || []).map(sc => ({
            index: sc.column.refName,
            order: sc.direction === SortDirection.Descending ? "desc" : "asc"
        }));
    }

    /** Render special column in grid view */
    private _linkColumnRendererPrimary(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
        if (!this._grid) {
            return;
        }

        let gridRowInfo = this._gridSourceItems[dataIndex];
        let $cell: JQuery = this._grid._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
        // Remove any tooltip added by the base class
        $cell.removeAttr("title");

        if (gridRowInfo.isGroupRow) {
            const $groupRowContainer = $("<span/>").addClass("la-grid-group-row").appendTo($cell);

            $groupRowContainer.append(ArtifactGroup.GridComponent({
                groupName: gridRowInfo.displayName,
                count: gridRowInfo.descendantCount
            }));
        } else if (gridRowInfo.isSubGroupRow) {
            const $subGroupRowContainer = $("<span/>").addClass("la-grid-sub-group-row").appendTo($cell);

            $subGroupRowContainer.append(ArtifactSubGroup.GridComponent({
                subGroupName: gridRowInfo.displayName
            }));
        } else {
            $cell.empty()
                .addClass("la-grid-primary-data");

            const data = gridRowInfo.data;

            let primaryData: IInternalLinkedArtifactPrimaryData = data && data.primaryData;
            if (data && data.error) {
                primaryData = ErrorUtils.getErrorPrimaryData(data);
            }

            if (!!primaryData) {
                $cell.append(ArtifactGridComponent({
                    displayOptions: this.props.displayOptions,
                    primaryData: primaryData,
                    hostArtifact: this.props.hostArtifact,
                    onDelete: this._onDelete.bind(this, data),
                    primaryArtifactGridClassName: gridRowInfo.isSubGroupedItem && "la-primary-sub-group-item"
                }));

                $cell.contextmenu((e) => {
                    if (e.target.tagName.toLowerCase() === "a" && $(e.target).attr('href')) {
                        // Allow browser's default right-click behavior on the link (otherwise Grid context menu takes over)
                        e.stopPropagation();
                    }
                });
            }
        }

        return $cell;
    }

    private _linkColumnRendererAdditional(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
        if (!this._grid) {
            return;
        }

        const data = this._gridSourceItems[dataIndex].data;
        const refName = column.index;

        // Use grid to render base cell with class denoting it contains additional data
        const $cell: JQuery = this._grid._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
        $cell.addClass("la-additional-data");
        // Remove any tooltip that the base class may have added
        $cell.removeAttr("title");

        // Render additional column data with component (if no error defined on artifact)
        if (data && data.additionalData && data.additionalData[refName] && !data.error) {
            if (data.additionalData[refName].title) {
                RichContentTooltip.addIfOverflow(data.additionalData[refName].title, $cell);
            }
            $cell.empty().append(AdditionalArtifact.GridComponent({
                data: data.additionalData[refName]
            }));
        }

        // Add tooltip for hidden columns
        const hiddenColumns = this._grid.getColumns().filter(c => c.hidden)
            .map(({ text, index }: Grids.IGridColumn) => ({ name: text, refName: index.toString() }) as IColumn);
        if (hiddenColumns.length > 0) {
            const tooltip = RichContentTooltip.add(ComponentUtils.getTooltip(data, hiddenColumns), rowInfo.row, { cssClass: "la-hidden-columns-tooltip" });
            tooltip.getElement().addClass("links-control");
        }

        return $cell;
    }

    /**
     * Returns the data to be rendered in a cell. This is used by the grid to determine width of a column.
     * @param dataIndex Index of row
     * @param columnIndex Index of column to get value for
     * @param columnOrder Display order of column
     */
    private _linkColumnValue(dataIndex: number, columnIndex: number | string, columnOrder?: number): any {
        const data = this._gridSourceItems[dataIndex].data;
        const refName = columnIndex;

        if (Utils_String.equals(columnIndex.toString(), InternalKnownColumns.Link.refName, true)) {
            // Return primary title for Link columns
            // adding some spaces at the end to account for the miscalculation of the width of the primary column
            // the framework grid measures only the text not the additional graphics that we have in this column
            // See 624983.
            return data && data.primaryData && data.primaryData.title + "   " || "";
        }

        if (data && data.additionalData && data.additionalData[columnIndex]) {
            // Add some more characters to account for icons being rendered in the cell
            const additionalSuffix = "  ";

            return data.additionalData[columnIndex].rawData || (data.additionalData[columnIndex].styledText.text + additionalSuffix) || "";
        }

        return "";
    }

    private _onDelete(linkedArtifact: ILinkedArtifact, evt: MouseEvent) {
        this._deleteItem(linkedArtifact);

        evt.preventDefault();
        return false;
    }

    private _deleteItem(linkedArtifact: ILinkedArtifact) {
        this.props.actionsCreator.removeLinkedArtifact(linkedArtifact);
        if (this.props.onDeleteLink) {
            this.props.onDeleteLink();
        }
    }

    private _updateGridDataSource(artifactGroups: ILinkedArtifactGroup[], hostArtifact?: IHostArtifact) {
        Diag.Debug.assertIsNotNull(this._grid, "updateGridSourceItemsAndRefresh - grid doesn't exist");

        this._prepareGridSourceItemsAndExpansionStates(artifactGroups, hostArtifact);

        // Update the grid data source and refresh the grid
        this._grid.setDataSource(this._gridSourceItems, this._expandStates, null, null, null, true);

        this._ensureGridRowSelection();
    }

    /** Computes grid source-items from artifactGroups and recalculates expansion-states */
    private _prepareGridSourceItemsAndExpansionStates(artifactGroups: ILinkedArtifactGroup[], hostArtifact?: IHostArtifact) {
        // Store the current Collapsed States for Groups (True = Collapsed)
        const groupCollapsedStateMap: IDictionaryStringTo<boolean> = {};
        this._gridSourceItems.forEach((item: ILinksGridRowInfo, index: number) => {
            if (item.isGroupRow) {
                // this._expandStates is shared between us and the grid so it is always in sync (Look at the Grid construction to see that we pass it in)
                groupCollapsedStateMap[item.linkType] = this._expandStates[index] && this._expandStates[index] < 0;
            }
        });

        this._gridSourceItems = [];
        this._expandStates = [];
        let groupIndex = 0;
        if (artifactGroups) {
            for (const artifactGroup of artifactGroups) {
                this._gridSourceItems.push({
                    isGroupRow: true,
                    noContextMenu: true,
                    displayName: artifactGroup.displayName,
                    linkType: artifactGroup.linkType,
                    descendantCount: artifactGroup.linkedArtifacts ? artifactGroup.linkedArtifacts.length : 0
                });

                const linkedArtifacts = artifactGroup.linkedArtifacts;
                const subGroupMap = {};
                if (linkedArtifacts && linkedArtifacts.length > 0) {
                    this._expandStates.push(groupCollapsedStateMap[artifactGroup.linkType] ? -linkedArtifacts.length : linkedArtifacts.length);
                    Utils_Array.sortIfNotSorted(linkedArtifacts, (x: IInternalLinkedArtifactDisplayData, y: IInternalLinkedArtifactDisplayData) => {
                        return Utils_String.ignoreCaseComparer(this._getSubGroupValue(x.miscData), this._getSubGroupValue(y.miscData));
                    });
                    for (const artifact of linkedArtifacts) {
                        const subGroupKey = this._getSubGroupValue(artifact.miscData);
                        if (subGroupKey) {
                            if (!subGroupMap[subGroupKey]) {
                                subGroupMap[subGroupKey] = this._expandStates.length;
                                this._gridSourceItems.push({
                                    isGroupRow: false,
                                    isSubGroupRow: true,
                                    noContextMenu: true,
                                    displayName: subGroupKey,
                                });
                                this._expandStates.push(1);
                                this._expandStates[groupIndex] += groupCollapsedStateMap[artifactGroup.linkType] ? -1 : 1;
                            } else {
                                const subGroupIndex = subGroupMap[subGroupKey];
                                this._expandStates[subGroupIndex] += 1;
                            }
                        }
                        this._expandStates.push(0);
                        this._gridSourceItems.push({
                            isGroupRow: false,
                            noContextMenu: this.props.displayOptions.readOnly,
                            data: artifact,
                            hostArtifact: hostArtifact,
                            isSubGroupedItem: !!subGroupKey
                        });
                    }
                } else {
                    this._expandStates.push(0);
                }

                groupIndex = this._expandStates.length;
            }
        }
    }

    /**
     * This is mainly used by remote linking, remote host name and project name are passed
     * @param miscData misc data
     */
    private _getSubGroupValue(miscData: any): string {
        if (miscData) {
            return miscData.SubGroup;
        }
    }
}
