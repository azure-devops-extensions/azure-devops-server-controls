/// <reference types="react" />
import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/AttachmentsGridView/ControllerViews/AttachmentsGridView";

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { DetailsList, DetailsListLayoutMode, IColumn } from "OfficeFabric/DetailsList";
import { Fabric } from "OfficeFabric/Fabric";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { TooltipHost } from "VSSUI/Tooltip";
import { autobind } from "OfficeFabric/Utilities";
import { IPopupContextualMenuProps, PopupContextualMenu } from "Presentation/Scripts/TFS/Components/PopupContextualMenu";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import {
    AttachmentsGridViewActionsCreator,
} from "TestManagement/Scripts/Scenarios/AttachmentsGridView/Actions/AttachmentsGridViewActionsCreator";
import {
    IAttachmentDetails,
} from "TestManagement/Scripts/Scenarios/AttachmentsGridView/Actions/AttachmentsGridViewActionsHub";
import {
    AttachmentsGridViewStore,
    IAttachmentsGridViewState,
} from "TestManagement/Scripts/Scenarios/AttachmentsGridView/Stores/AttachmentsGridViewStore";
import * as ConfirmationDialog from "TestManagement/Scripts/Scenarios/Common/Components/ConfirmationDialog";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as ComponentBase from "VSS/Flux/Component";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";

export interface IAttachmentsGridViewProps extends ComponentBase.Props {
    actionsCreator: AttachmentsGridViewActionsCreator;
    store: AttachmentsGridViewStore;
    attachmentSource: string;
    testRunId: number;
    testResultId: number;
    subResultId: number;
}

export function renderGrid(element: HTMLElement, AttachmentsGridViewProps: IAttachmentsGridViewProps): void {
    ReactDOM.render(<AttachmentsGridView { ...AttachmentsGridViewProps } />, element);
}

export function unmountGrid(element: HTMLElement): void {
    ReactDOM.unmountComponentAtNode(element);
}

export class AttachmentsGridView extends ComponentBase.Component<IAttachmentsGridViewProps, IAttachmentsGridViewState> {

    private _columns: IColumn[] = [
        {
            key: "attachmentName",
            name: Resources.Name,
            fieldName: "name",
            minWidth: 210,
            maxWidth: 350,
            isRowHeader: true,
            isResizable: true,
            isSorted: true,
            isSortedDescending: false,
            onColumnClick: this._onColumnHeaderClick,
            data: "string",
            isPadded: false,
            onRender: (item: IAttachmentDetails, index: number) => {
                return (
                    <div>
                        <div className="attachment-name">
                            <TooltipHost content={item.name}>
                                <span>
                                    <a role="link"
                                        onKeyDown={(ev) => this._onItemInvoked(item, ev)}
                                        onClick={() => this._onItemInvoked(item)}>
                                        {item.name}
                                    </a>
                                </span>
                            </TooltipHost>
                        </div>
                        {this._createContextMenu(item, index)}
                    </div>
                );
            }
        },
        {
            key: "attachmentSize",
            name: Resources.AttachmentSize,
            fieldName: "size",
            minWidth: 70,
            maxWidth: 90,
            isResizable: true,
            data: "number",
            onColumnClick: this._onColumnHeaderClick,
            onRender: (item: IAttachmentDetails) => {
                return (
                    <span>
                        {Utils_String.format(Resources.AttachmentSizeValueInKB, Math.ceil(item.size / 1024))}
                    </span>
                );
            }
        },
        {
            key: "createdDate",
            name: Resources.DateCreated,
            fieldName: "creationDate",
            minWidth: 150,
            maxWidth: 200,
            isResizable: true,
            data: "string",
            onColumnClick: this._onColumnHeaderClick,
            onRender: (item: IAttachmentDetails) => {
                return (
                    <TooltipHost content={item.creationDate.toString()}>
                        <span>
                            {Utils_Date.friendly(item.creationDate)}
                        </span>
                    </TooltipHost>
                );
            }
        },
        {
            key: "comment",
            name: Resources.Comment,
            fieldName: "comment",
            minWidth: 210,
            maxWidth: 350,
            isResizable: true,
            data: "string",
            onColumnClick: this._onColumnHeaderClick,
            onRender: (item: IAttachmentDetails) => {
                return (
                    <span>
                        {item.comment}
                    </span>
                );
            }
        }
    ];

    constructor(props: any) {
        super(props);
    }

    public componentWillMount(): void {
        this.props.actionsCreator.clearState();
        this._handleStoreChange();
        this.props.store.addChangedListener(this._handleStoreChange);
        this.props.actionsCreator.getAttachments(this.props.testRunId, this.props.testResultId, this.props.attachmentSource, this.props.subResultId);
    }

    public componentDidMount(): void {
        this.props.actionsCreator.initializeColums(this._columns);
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._handleStoreChange);
    }



    public render(): JSX.Element {
        let { columns, attachments } = this.state;
        return (
            <Fabric
                className="test-attachments-grid-view"
            >
                <h2 className="attachments-header">
                    {Utils_String.format(Resources.AttachmentsLabel, (attachments) ? attachments.length : 0)}
                </h2>
                {
                    this.state.errorMessage ?
                        <TooltipHost content={this.state.errorMessage}>
                            <MessageBar
                                messageBarType={MessageBarType.error}
                                dismissButtonAriaLabel={Resources.ClearErrorMessage}
                                className="preview-attachment-error-bar"
                                isMultiline={false}
                                onDismiss={this._onErrorMessageDismiss}>
                                {this.state.errorMessage}
                            </MessageBar>
                        </TooltipHost>
                        :
                        Utils_String.empty
                }
                {
                    this.state.attachments && this.state.attachments.length > 0 ?
                        <DetailsList
                            className="attachments-grid"
                            items={attachments}
                            ariaLabelForGrid={Resources.AttachmentsHeaderText}
                            ariaLabelForSelectionColumn={Resources.SelectAll}
                            getRowAriaLabel={(item) => item.name}
                            checkButtonAriaLabel={Resources.SelectRow}
                            compact={true}
                            columns={columns}
                            setKey="set"
                            layoutMode={DetailsListLayoutMode.justified}
                            isHeaderVisible={true}
                            selection={this.state.selection}
                            selectionPreservedOnEmptyClick={false}
                            onItemContextMenu={this._onItemContextMenu}
                            onItemInvoked={(item) => this._onItemInvoked(item)}
                        />
                        :
                        null
                }
            </Fabric>
        );
    }

    @autobind
    private _onColumnHeaderClick(ev: any, column: IColumn) {
        const { columns, attachments } = this.state;
        let newItems: IAttachmentDetails[] = attachments.slice();
        let newColumns: IColumn[] = columns.slice();
        let currentColumn: IColumn = newColumns.filter((currCol: IColumn, idx: number) => {
            return column.key === currCol.key;
        })[0];
        newColumns.forEach((newColumn: IColumn) => {
            if (newColumn === currentColumn) {
                currentColumn.isSortedDescending = !currentColumn.isSortedDescending;
                currentColumn.isSorted = true;
            } else {
                newColumn.isSorted = false;
                newColumn.isSortedDescending = true;
            }
        });
        newItems = this._sortItems(newItems, currentColumn.fieldName, currentColumn.isSortedDescending);
        this.setState({
            columns: newColumns
        });
        this.props.actionsCreator.afterSortAttachments(newItems);
        if (currentColumn.isSortedDescending) {
            announce(Utils_String.format(Resources.AnnounceSortedDesc, currentColumn.fieldName));
        } else {
            announce(Utils_String.format(Resources.AnnounceSortedAsc, currentColumn.fieldName));
        }
    }

    @autobind
    private _sortItems(items: IAttachmentDetails[], sortBy: string, descending = false): IAttachmentDetails[] {
        if (descending) {
            return items.sort((a: IAttachmentDetails, b: IAttachmentDetails) => {
                if (a[sortBy] < b[sortBy]) {
                    return 1;
                }
                if (a[sortBy] > b[sortBy]) {
                    return -1;
                }
                return 0;
            });
        } else {
            return items.sort((a: IAttachmentDetails, b: IAttachmentDetails) => {
                if (a[sortBy] < b[sortBy]) {
                    return -1;
                }
                if (a[sortBy] > b[sortBy]) {
                    return 1;
                }
                return 0;
            });
        }
    }

    private _createContextMenu(attachment: IAttachmentDetails, index: number): JSX.Element {
        let items: IContextualMenuItem[] = [];

        let isDeleteDisabled = false;
        if (this.props.attachmentSource === TMUtils.AttachmentSource.testRun) {
            isDeleteDisabled = true;
        }

        let isPreviewDisabled = false;
        if (!TMUtils.getTestResultManager().isAttachmentPreviewable(attachment.name)) {
            isPreviewDisabled = true;
        }

        items =
            [
                {
                    key: "previewAttachment",
                    onClick: () => {
                        this._previewItem(this.state.selectionDetails[0]);
                    },
                    disabled: isPreviewDisabled,
                    iconProps: {
                        iconName: "DocumentSearch"
                    },
                    name: Resources.PreviewText
                },
                {
                    key: "saveAttachment",
                    onClick: () => {
                        this.props.actionsCreator.downloadSelectedAttachments(this.state.selectionDetails, this.props.attachmentSource);
                    },
                    iconProps: {
                        iconName: "Download"
                    },
                    name: Resources.Download
                },
                {
                    key: "deleteAttachment",
                    onClick: () => {
                        this._confirmDeletion();
                    },
                    disabled: isDeleteDisabled,
                    iconProps: {
                        iconName: "ChromeClose",
                    },
                    name: Resources.DeleteText
                },
            ];

        let showContextMenu = false;
        if (this.state.contextMenuOpenIndex === index) {
            showContextMenu = true;
            this.props.actionsCreator.updateContextMenuOpenIndex(-1);
        }

        let contextMenuProps: IPopupContextualMenuProps = {
            className: "context-menu grid-context-menu",
            iconClassName: "bowtie-ellipsis",
            items: items,
            menuClassName: "processes-popup-menu",
            showContextMenu: showContextMenu,
            onClick: (event) => { this._onContextMenuClick(attachment, index, event); },
            onDismiss: this._onDismissContextMenu
        };
        return <PopupContextualMenu {...contextMenuProps} />;
    }

    private _onItemInvoked = (item: IAttachmentDetails, ev?: any): void => {
        if (ev && ev.keyCode === Utils_UI.KeyCode.ENTER || !ev) {
            if (TMUtils.getTestResultManager().isAttachmentPreviewable(item.name)) {
                this.props.actionsCreator.openPreviewDialog(this.props.testRunId, this.props.testResultId, this.props.subResultId, this.props.attachmentSource, item);

                let fileNameExtension: string = this.props.actionsCreator.getFilenameExtension(item.name);

                TelemetryService.publishEvents(TelemetryService.featureAttachmentsGridView_PreviewAttachment,
                    {
                        "AttachmentSource": this.props.attachmentSource,
                        "PreviewAction": "DoubleClickAndPreview",
                        "AttachmentType": fileNameExtension,
                        "SizeInKB": Math.ceil(item.size / 1024)
                    });
            } else {
                this.props.actionsCreator.downloadSelectedAttachments([item], this.props.attachmentSource);
            }
        }
    }

    private _previewItem = (item: IAttachmentDetails): void => {
        let fileNameExtension: string = this.props.actionsCreator.getFilenameExtension(item.name);

        TelemetryService.publishEvents(TelemetryService.featureAttachmentsGridView_PreviewAttachment,
            {
                "AttachmentSource": this.props.attachmentSource,
                "PreviewAction": "ContextMenuAndPreview",
                "AttachmentType": fileNameExtension,
                "SizeInKB": Math.ceil(item.size / 1024)
            });
        this.props.actionsCreator.openPreviewDialog(this.props.testRunId, this.props.testResultId, this.props.subResultId, this.props.attachmentSource, item);
    }

    private _deleteAttachments(): void {
        this.props.actionsCreator.deleteResultAttachments(this.props.testRunId, this.props.testResultId, this.props.attachmentSource, this.state.selectionDetails);
    }

    private _confirmDeletion(): void {
        let attachmentsNameList: string = " ";
        this.state.selectionDetails.forEach((attachment) => {
            attachmentsNameList = attachmentsNameList + attachment.name + " ";
        });
        ConfirmationDialog.openConfirmationDialog(Utils_String.format(Resources.ConfirmAttachmentDeletion, attachmentsNameList), () => { this._deleteAttachments(); });
    }

    private _handleStoreChange = (): void => {
        this.setState(this.props.store.getState());
    }

    @autobind
    private _onContextMenuClick(item?: any, index?: number, ev?: any): void {
        let isIndexInSelected: boolean = false;
        if (this.state.selectionDetails != null) {
            this.state.selectionDetails.forEach((attachment) => {
                if (item.id === attachment.id) {
                    isIndexInSelected = true;
                }
            });
            if (this.state.selectionDetails.length > 1 && isIndexInSelected) {
                ev.preventDefault();
                ev.stopPropagation();
            }
        }
        this.props.actionsCreator.updateContextMenuOpenIndex(index);
        this.forceUpdate();
    }

    @autobind
    private _onItemContextMenu(item?: any, index?: number, ev?: any): void {
        $(".context-menu").eq(index).find(".popup-menu-trigger").click();
    }

    @autobind
    private _onDismissContextMenu(): void {
        this.props.actionsCreator.updateContextMenuOpenIndex(-1);
        this.forceUpdate();
    }

    private _onErrorMessageDismiss = () => {
        this.props.actionsCreator.closeErrorMessage();
    }
}