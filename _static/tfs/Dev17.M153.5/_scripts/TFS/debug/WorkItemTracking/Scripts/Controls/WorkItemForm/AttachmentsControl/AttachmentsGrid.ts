/// <amd-dependency path="jQueryUI/button"/>
/// <amd-dependency path="jQueryUI/dialog"/>
/// <amd-dependency path="jQueryUI/tabs"/>

/// <reference types="jquery" />

// CSS
import "VSS/LoaderPlugins/Css!Controls/WorkItemForm/AttachmentsControl/AttachmentsGrid";

// VSS modules
import VSS_Controls_Grids = require("VSS/Controls/Grids");
import VSS_Utils_Date = require("VSS/Utils/Date");
import VSS_Utils_String = require("VSS/Utils/String");
import VSS_Utils_UI = require("VSS/Utils/UI");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { AttachmentsControlCIEvents, AttachmentsControlUIActionSource } from "WorkItemTracking/Scripts/Utils/WorkItemTrackingCIEventHelper";

// WorkItemTracking modules
import { WITFileHelper } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers";
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");

import { AttachmentsControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/AttachmentsControl/AttachmentsControl";

export interface IAttachmentGridOptions extends VSS_Controls_Grids.IGridOptions {
    hideActions: boolean;
    clickCellToOpen: boolean;
    showNameColumnOnly: boolean;
    onChange: () => void;
    attachmentsControl: AttachmentsControl;
}

export class AttachmentsGrid extends VSS_Controls_Grids.GridO<IAttachmentGridOptions> {
    // Initialize with an empty array to ensure that _selectRowCallback is handling an array when Grid.layout.complete is trigged
    private _selectedRowIndices: number[] = [];
    private _workItem: WITOM.WorkItem;

    private static ContextMenuCommands = {
        DELETE_ATTACHMENT: "delete-attachment",
        PREVIEW_ATTACHMENT: "preview-attachment",
        EDIT_COMMENT: "edit-comment",
        OPEN_ATTACHMENT: "open-attachment",
        DOWNLOAD_ATTACHMENT: "download-attachment",

        DELETE_ATTACHMENTS: "delete-attachments",
        EDIT_COMMENTS: "edit-comments"
    };

    constructor(options?: IAttachmentGridOptions) {
        super(options);
    }

    public initializeOptions(options?: IAttachmentGridOptions) {

        let contextMenu;
        if (!options.hideActions) {
            contextMenu = {
                executeAction: (eventArgs?) => this._onContextMenuItemClick(eventArgs),
                items: () => this._getContextMenuItems()
            };
        }

        super.initializeOptions($.extend({
            contextMenu: contextMenu,
            lastCellFillsRemainingContent: true
        }, options));
    }

    public initialize() {

        // Setting the comparer on each column
        // On sorting each column, the base Grid looks for any column comparer exist, if it exist it uses that derived class comparer
        // otherwise it uses its comparer.
        const attachmentGridComparer = (column, sortOrder, a1, a2) => {
            let result = 0;
            switch (column.index) {
                case 0: // Name
                    result = VSS_Utils_String.localeIgnoreCaseComparer(a1.getName(), a2.getName());
                    break;
                case 1: // Size
                    result = (a1.getLength() - a2.getLength());
                    break;
                case 2: // Date attached
                    result = (VSS_Utils_Date.defaultComparer(a1.getAddedDate(), a2.getAddedDate()));
                    break;
                case 3: // Comment
                    result = VSS_Utils_String.localeIgnoreCaseComparer(a1.getComment(), a2.getComment());
                    break;
            }

            if (result !== 0) {
                return result;
            }
            return 0;
        };

        const createCellContents = (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number, columnText: string) => {

            const $cell: JQuery = this._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);

            if (this._dataSource && this._dataSource.length > dataIndex) {

                let icon: string;
                const attachment = <WITOM.Attachment>this._dataSource[dataIndex];

                if (columnText === WorkItemTrackingResources.AttachmentsGridNameColumn) {
                    // if the attachment is a placeholder, getPlaceholderStatus returns true
                    if (attachment.getPlaceholderStatus()) {
                        icon = "upload-indicator";
                        $cell.prepend(WorkItemTrackingResources.AttachmentsGrid_PlaceholderPrefixText);
                        $cell.addClass("placeholder-name");

                        // add gray background effect for whole row
                        const _row: JQuery = rowInfo.row;
                        _row.addClass("placeholder");

                        $cell.prepend($(VSS_Utils_UI.domElem("span", `attachment-icon ${icon}`)));
                    } else {
                        const cellText = $cell.text();
                        $cell.empty()
                            .append($("<a>").text(cellText))
                            .addClass("attachments-grid-file-name");

                        const $clickable = this._options.clickCellToOpen ? $cell : $cell.find("a");
                        $clickable.click(() => {
                            this._options.attachmentsControl.tryPreviewAttachment(attachment);

                            AttachmentsControlCIEvents.publishEvent(
                                AttachmentsControlCIEvents.UI_PREVIEW_MODE,
                                {
                                    source: AttachmentsControlUIActionSource.UI_GRID_TITLE
                                }
                            );
                        });

                        icon = WITFileHelper.getMatchingIcon(attachment.getName());
                        $cell.prepend($(VSS_Utils_UI.domElem("span", `attachment-icon ${icon}`)));
                    }

                } else if (columnText === WorkItemTrackingResources.AttachmentsGridDateAttachedColumn) {
                    // Adding long-form date as a tooltip for the date attached column
                    const link: WITOM.Attachment = this._dataSource[dataIndex];
                    // Do not show tooltip if link is new (Date Attached column is empty)
                    if (!link.isNew()) {
                        const tooltipDateString: string = VSS_Utils_Date.localeFormat(link.getAddedDate(), "F");
                        RichContentTooltip.add(tooltipDateString, $cell); // always add tooltip which is full datetime
                    }
                } else {
                    if (attachment.getPlaceholderStatus()) {
                        $cell.text("");
                    }
                }
            }

            return $cell;
        };

        this._options.columns = [
            {
                text: WorkItemTrackingResources.AttachmentsGridNameColumn,
                width: 300,
                comparer: attachmentGridComparer,
                getCellContents: (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) => {
                    return createCellContents(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder, WorkItemTrackingResources.AttachmentsGridNameColumn);
                }
            }];

        if (!this._options.showNameColumnOnly) {
            this._options.columns.push(
                {
                    text: WorkItemTrackingResources.AttachmentsGridSizeColumn,
                    width: 80,
                    comparer: attachmentGridComparer,
                    getCellContents: (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) => {
                        return createCellContents(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder, WorkItemTrackingResources.AttachmentsGridSizeColumn);
                    }
                },
                {
                    text: WorkItemTrackingResources.AttachmentsGridDateAttachedColumn,
                    width: 150,
                    comparer: attachmentGridComparer,
                    getCellContents: (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) => {
                        return createCellContents(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder, WorkItemTrackingResources.AttachmentsGridDateAttachedColumn);
                    }
                },
                {
                    text: WorkItemTrackingResources.AttachmentsGridCommentsColumn,
                    width: 300,
                    comparer: attachmentGridComparer,
                    getCellContents: (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) => {
                        return createCellContents(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder, WorkItemTrackingResources.AttachmentsGridCommentsColumn);
                    }
                }
            );
        }
        this._options.source = [];
        this._options.sortOrder = [{ index: 0 }];

        super.initialize();

        this._element.addClass("attachment-grid");

        this._element.bind("Grid.layout.complete", () => this._selectRowCallback());
        this._element.bind("openRowDetail", () => {
            this._options.attachmentsControl.tryPreviewAttachment(this._getSelectedAttachments()[0]);

            AttachmentsControlCIEvents.publishEvent(
                AttachmentsControlCIEvents.UI_PREVIEW_MODE,
                {
                    source: AttachmentsControlUIActionSource.UI_GRID_ROW
                }
            );
        });
        this._element.bind("deletekey", () => this._options.attachmentsControl.deleteAttachments(this._getSelectedAttachments()));
    }

    private _isHidden(): boolean {
        return (this._workItem && this._workItem.isReadOnly());
    }

    private _getContextMenuItems(): any[] {
        const attachments = this._getSelectedAttachments();

        const isHidden = this._isHidden();

        if (!attachments || attachments.length == 0 || (attachments.length > 1 && isHidden)) {
            return [];
        }

        if (attachments.length > 1) {
            return <any[]>[
                {
                    rank: 1,
                    id: AttachmentsGrid.ContextMenuCommands.EDIT_COMMENTS,
                    text: WorkItemTrackingResources.EditComments,
                    title: WorkItemTrackingResources.EditComments,
                    showText: true,
                    icon: "bowtie-icon bowtie-edit-outline",
                },
                {
                    rank: 2,
                    id: AttachmentsGrid.ContextMenuCommands.DELETE_ATTACHMENTS,
                    text: WorkItemTrackingResources.DeleteAttachments,
                    title: WorkItemTrackingResources.DeleteAttachments,
                    showText: true,
                    icon: "bowtie-icon bowtie-edit-delete",
                }
            ];
        } else {
            return <any[]>[
                {
                    rank: 1,
                    id: AttachmentsGrid.ContextMenuCommands.EDIT_COMMENT,
                    text: WorkItemTrackingResources.EditComment,
                    title: WorkItemTrackingResources.EditComment,
                    showText: true,
                    icon: "bowtie-icon bowtie-edit-outline",
                    hidden: isHidden
                },
                {
                    rank: 2, id: AttachmentsGrid.ContextMenuCommands.PREVIEW_ATTACHMENT,
                    text: WorkItemTrackingResources.PreviewAttachment,
                    title: WorkItemTrackingResources.PreviewAttachment,
                    showText: true,
                    hidden: !this._options.attachmentsControl.isAttachmentPreviewable(attachments[0]) && !(WITFileHelper.getExtensionName(attachments[0].getName()).toLowerCase() === "txt"),
                    icon: "bowtie-icon bowtie-file-preview"
                },
                {
                    rank: 3,
                    id: AttachmentsGrid.ContextMenuCommands.DOWNLOAD_ATTACHMENT,
                    text: WorkItemTrackingResources.DownloadAttachment,
                    title: WorkItemTrackingResources.DownloadAttachment,
                    showText: true,
                    icon: "bowtie-icon bowtie-transfer-download"
                },
                {
                    rank: 4,
                    id: AttachmentsGrid.ContextMenuCommands.DELETE_ATTACHMENT,
                    text: WorkItemTrackingResources.DeleteAttachment,
                    title: WorkItemTrackingResources.DeleteAttachment,
                    showText: true,
                    icon: "bowtie-icon bowtie-edit-delete",
                    hidden: isHidden
                }
            ];
        }
    }

    private _getSelectedAttachments(): WITOM.Attachment[] {
        const attachments = [];
        let rowIndex: string;

        for (rowIndex in this._selectedRows) {
            if (this._selectedRows.hasOwnProperty(rowIndex)) {
                const attachment = <WITOM.Attachment>this._dataSource[this._selectedRows[rowIndex]];
                // Do not include placeholder row
                if (!attachment.getPlaceholderStatus()) {
                    attachments.push(attachment);
                }
            }
        }

        return attachments;
    }

    /**
     * Gets the adjacent attachment of the current attachment.
     * @param attachment the current attachment
     * @param isNext = true if the action is to traverse to the next attachment, false to go to the previous attachment
     * @param shouldTraverse = true if the action is actually traverse to an attachment rather than check for one
     */
    public getAdjacentAttachment(attachment: WITOM.Attachment, isNext: boolean, shouldTraverse?: boolean): WITOM.Attachment {
        const currentIndex = this._dataSource.indexOf(attachment);
        const indexDiff = isNext ? 1 : -1;

        if (currentIndex + indexDiff < 0 || currentIndex + indexDiff >= this._dataSource.length) {
            // No more attachments in that direction
            return null;
        }
        if (shouldTraverse) {
            this.setSelectedRowIndex(currentIndex + indexDiff);
            this.getSelectedRowIntoView();
            // The grid loses its focus when navigating to next/prev items. So focusing back to the grid.
            this.focus();
        }
        return this._dataSource[currentIndex + indexDiff];
    }

    private _onContextMenuItemClick(eventArgs?: any): void {

        const attachments: WITOM.Attachment[] = this._getSelectedAttachments();

        if (!attachments || attachments.length == 0) {
            // Do nothing if no attachment actually selected
            return;
        }

        const command = eventArgs.get_commandName();

        switch (command) {
            case AttachmentsGrid.ContextMenuCommands.DELETE_ATTACHMENT:
            case AttachmentsGrid.ContextMenuCommands.DELETE_ATTACHMENTS:
                this._options.attachmentsControl.deleteAttachments(attachments);

                AttachmentsControlCIEvents.publishEvent(
                    AttachmentsControlCIEvents.UI_DELETE,
                    {
                        source: AttachmentsControlUIActionSource.UI_GRID_CONTEXT_MENU
                    }
                );
                break;
            case AttachmentsGrid.ContextMenuCommands.PREVIEW_ATTACHMENT:
                this._options.attachmentsControl.tryPreviewAttachment(attachments[0]);

                AttachmentsControlCIEvents.publishEvent(
                    AttachmentsControlCIEvents.UI_PREVIEW_MODE,
                    {
                        source: AttachmentsControlUIActionSource.UI_GRID_CONTEXT_MENU
                    }
                );
                break;
            case AttachmentsGrid.ContextMenuCommands.EDIT_COMMENT:
            case AttachmentsGrid.ContextMenuCommands.EDIT_COMMENTS:
                this._options.attachmentsControl.showEditCommentDialog(attachments);

                AttachmentsControlCIEvents.publishEvent(
                    AttachmentsControlCIEvents.UI_EDIT_COMMENT,
                    {
                        source: AttachmentsControlUIActionSource.UI_GRID_CONTEXT_MENU
                    }
                );
                break;
            case AttachmentsGrid.ContextMenuCommands.DOWNLOAD_ATTACHMENT:
                this._options.attachmentsControl.downloadAttachment(attachments[0]);

                AttachmentsControlCIEvents.publishEvent(
                    AttachmentsControlCIEvents.UI_DOWNLOAD,
                    {
                        source: AttachmentsControlUIActionSource.UI_GRID_CONTEXT_MENU
                    }
                );
                break;
            default: break;
        }

    }

    private _selectRowCallback() {
        // set the current row to the first selected index; if we have no selected row indices (e.g. on load), get the "selected row" of -1
        let currentRow = this._selectedRowIndices[0] ? this._selectedRowIndices[0] : this.getSelectedRowIndex();
        if (currentRow != null) {
            // selectedRowIndex starts at 0, but lastRowDataIndex counts starting at 1, so we normalize
            const lastRow = this.getLastRowDataIndex() - 1;

            // if the item at "currentRow" no longer exists, move our selection to the new last item
            if (currentRow > lastRow) {
                currentRow = lastRow;
            }

            // if our current selected row is -1 (happens when we add items for the first time)
            if (currentRow < 0) {
                // select the first attachment
                // _selectRow will select nothing if no attachments exist
                this._selectRow(0);
            } else { // if currentRow exists in the grid (currentRow >= 0)
                // if we've selected multiple attachments for bulk actions, keep all of them selected
                if (this._selectedRowIndices.length > 1) {
                    for (const index of this._selectedRowIndices) {
                        this._addSelection(index);
                    }
                } else {
                    // if we've only selected one row, select it
                    this._selectRow(currentRow);
                }

            }
        }
    }

    /** @override */
    public onContextMenu(eventArgs?: any): void {

        const attachments = this._getSelectedAttachments();
        if (attachments && attachments.length > 0) {
            this._showContextMenu(eventArgs);
        }
    }

    /** @override */
    public getColumnValue(dataIndex: number, columnIndex: number, columnOrder?: number): any {
        /// <param name="dataIndex" type="int">The index for the row data in the data source</param>
        /// <param name="columnIndex" type="int">The index of the column's data in the row's data array</param>
        /// <param name="columnOrder" type="int" optional="true">The index of the column in the grid's column array. This is the current visible order of the column</param>
        /// <returns type="any" />

        const link = this._dataSource[dataIndex];
        let length: number;

        switch (columnIndex) {
            case 0: // Name
                return link.getName();
            case 1: // Size
                length = +link.getLength();
                return VSS_Utils_String.format("{0}K", Math.ceil(length / 1024));
            case 2: // Date Attached
                if (!link.isNew()) {
                    return VSS_Utils_Date.localeFormat(link.getAddedDate(), "g");
                } else {
                    return "";
                }
            case 3: // Comments
                return link.getComment() || "";
            default:
                return "";
        }
    }

    public invalidate(workItem: WITOM.WorkItem) {

        this._workItem = workItem;

        const previousDataSourceLength = this._dataSource && this._dataSource.length;
        const dataSource = [];
        const links = workItem ? workItem.getLinks() : [];

        for (const link of links) {
            if (link instanceof WITOM.Attachment) {
                dataSource.push($.extend(link, { noContextMenu: link.getPlaceholderStatus() }));
            }
        }

        // if any links were removed we should reset the selected row indices
        if (dataSource.length < previousDataSourceLength) {
            this._selectedRowIndices = [];
        } else {
            this._selectedRowIndices = this.getSelectedDataIndices();
        }

        this.setDataSource(dataSource);

    }

    public clear(): void {
        this.setDataSource([]);
    }
}
