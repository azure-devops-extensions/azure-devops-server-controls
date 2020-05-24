/// <reference types="react" />
import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Common/DetailsPanel/ControllerViews/AttachmentsView";

import { PrimaryButton } from "OfficeFabric/Button";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { CheckboxVisibility, ConstrainMode, IColumn, SelectionMode } from "OfficeFabric/DetailsList";
import { Icon } from "OfficeFabric/Icon";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";
import { IPopupContextualMenuProps, PopupContextualMenu } from "Presentation/Scripts/TFS/Components/PopupContextualMenu";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { UIUtils } from "TestManagement/Scripts/Scenarios/Common/CommonUtils";
import * as ConfirmationDialog from "TestManagement/Scripts/Scenarios/Common/Components/ConfirmationDialog";
import {
    AttachmentsViewActionsCreator,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/AttachmentsViewActionsCreator";
import {
    AttachmentsViewStore,
    IAttachmentsViewState,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Stores/AttachmentsViewStore";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as VCBuiltInExtensions from "VersionControl/Scripts/BuiltInExtensions";
import { BaseControl } from "VSS/Controls";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_File from "VSS/Utils/File";
import * as Utils_String from "VSS/Utils/String";
import { TooltipHost } from "VSSUI/Tooltip";
import { VssDetailsList } from "VSSUI/VssDetailsList";
import { Splitter } from "VSSPreview/Flux/Components/Splitter";

export interface IAttachmentsViewProps extends ComponentBase.Props {
    testRunId: number;
    testResultId: number;
    subResultId: number;
    attachmentSource: string;
    store: AttachmentsViewStore;
    actionsCreator: AttachmentsViewActionsCreator;
}

enum AttachmentType {
    previewableText = 1,
    previewableImage = 2,
    notPreviewable = 3
}

export class AttachmentsView extends ComponentBase.Component<IAttachmentsViewProps, IAttachmentsViewState> {
    private _lastActiveItem: TCMContracts.TestAttachment;
    private _attachmentTypeExtension = Utils_String.empty;

    constructor(props: any) {
        super(props);
        this._lastActiveItem = null;
    }

    public componentWillMount(): void {
        this._handleStoreChange();
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._handleStoreChange);
    }

    public componentDidMount(): void {
        this.props.store.addChangedListener(this._handleStoreChange);
        this.props.actionsCreator.getAttachments(this.props.testRunId, this.props.testResultId, this.props.subResultId, this.props.attachmentSource);
        this._createExtensionHost();
    }

    public render(): JSX.Element {
        let left: JSX.Element = this._renderleftPanel();
        let right: JSX.Element = this._renderRightpanel();

        let isAttachmentsLoading = this.state.isAttachmentsListLoading || this.state.isLogStoreAttachmentsListLoading;
        let noAttachments: boolean = !this.state.attachments || (this.state.attachments &&
            !((this.state.attachments.getLegacyAttachments() && this.state.attachments.getLegacyAttachments().length > 0) ||
            (this.state.attachments.getLogStoreAttachments() && this.state.attachments.getLogStoreAttachments().length > 0)));
            
        let hideSplitter: boolean = !!this.state.errorMessage || isAttachmentsLoading || noAttachments;

        return (
            <div className="attachment-view-container">
                {
                    this.state.errorMessage &&
                    <div className="attachment-view-error-message">
                        <MessageBar
                            messageBarType={MessageBarType.error}
                            dismissButtonAriaLabel={Resources.ClearErrorMessage}
                            className="attachment-view-error-message-bar"
                            isMultiline={false}
                            onDismiss={this._onErrorMessageDismiss}>
                            {this.state.errorMessage.toString()}
                        </MessageBar>
                    </div>
                }
                {
                    isAttachmentsLoading &&
                    this._getLoadingAttachmentsView()
                }
                {
                    !this.state.errorMessage && !isAttachmentsLoading && noAttachments &&
                    this._getNoAttachmentsView()
                }

                <div className="attachment-view-attachments-area" hidden={hideSplitter}>
                    <div className="attachment-view-body">
                        <Splitter
                            left={left}
                            right={right}
                            fixedSide="left"
                            initialSize={300}
                            minWidth={300}
                            isFixedPaneVisible={true}
                            className="horizontal test-Attachment-overlay-panel-component">
                        </Splitter>
                    </div>
                </div>

            </div>
        );
    }

    private _renderleftPanel() {
        return (
            <div className="attachment-view-left-pane">
                <div className="attachment-view-details-list" data-is-scrollable={true}>
                    {
                        this.state.attachments && this.state.attachments.getLegacyAttachments() && this.state.attachments.getLegacyAttachments().length > 0 &&
                        <VssDetailsList
                            className="attachments-details-list"
                            items={this.state.attachments.getLegacyAttachments()}
                            setKey={this.state.setKey}
                            ariaLabelForGrid={Resources.AttachmentsHeaderText}
                            columns={this._getColumnsForDetailsList()}
                            selectionMode={SelectionMode.multiple}
                            constrainMode={ConstrainMode.unconstrained}
                            isHeaderVisible={false}
                            initialFocusedIndex={0}
                            checkboxVisibility={CheckboxVisibility.onHover}
                            selectionPreservedOnEmptyClick={true}
                            selection={this.state.selection}
                            onActiveItemChanged={(item) => this._onItemInvoked(item)}
                        />
                    }
                    {
                        this.state.attachments && this.state.attachments.getLogStoreAttachments() && this.state.attachments.getLogStoreAttachments().length > 0 &&
                        <VssDetailsList
                            className="attachments-details-list"
                            items={this.state.attachments.getLogStoreAttachments()}
                            setKey={this.state.setKey}
                            ariaLabelForGrid={Resources.AttachmentsHeaderText}
                            columns={this._getColumnsForDetailsListForLogStore()}
                            selectionMode={SelectionMode.multiple}
                            constrainMode={ConstrainMode.unconstrained}
                            isHeaderVisible={false}
                            initialFocusedIndex={0}
                            checkboxVisibility={CheckboxVisibility.onHover}
                            selectionPreservedOnEmptyClick={true}
                            selection={this.state.logStoreSelection}
                        />
                    }
                </div>
            </div>
        );
    }

    private _renderRightpanel() {
        let attachmentType = AttachmentType.notPreviewable;
        if (!!this.state && !!this.state.lastSelectedAttachment) {
            attachmentType = this._getAttachmentType(this.state.lastSelectedAttachment.fileName);
        }

        return (
            <div className="attachment-view-right-pane"
                hidden={this.state.attachments === null ||
                    (this.state.isAttachmentsListLoading || !this.state.attachments.getLegacyAttachments() || this.state.attachments.getLegacyAttachments().length <= 0)
                    // || (this.state.isLogStoreAttachmentsListLoading || !this.state.attachments.getLogStoreAttachments() || this.state.attachments.getLogStoreAttachments().length <= 0) - todo nipunja
                }>
                {
                    attachmentType === AttachmentType.notPreviewable &&
                    this._getAttachmentUnpreviewableView()
                }
                {
                    this.state.isAttachmentPreviewLoading &&
                    this._getAttachmentPreviewLoadingView()
                }
                <div className="attachment-preview-area" ref="file-viewer-holder"
                    hidden={this.state.isAttachmentPreviewLoading || attachmentType !== AttachmentType.previewableText}
                />
                {
                    (this.state.isAttachmentPreviewLoading === false && attachmentType === AttachmentType.previewableImage) &&
                    this._previewAttachmentOfTypeImage(this.state.lastSelectedAttachment.url, this.state.lastSelectedAttachment.fileName)
                }
            </div>
        );
    }

    private _getNoAttachmentsView(): JSX.Element {
        return (
            <div className="no-attachments-area">
                <div className="no-attachments-icon">
                    <Icon
                        iconName="Attach"
                    />
                </div>
                <div className="no-attachments-message">
                    {Resources.NoAttachmentsMessage}
                </div>
            </div>
        );
    }

    private _getAttachmentUnpreviewableView(): JSX.Element {
        return (
            (this.state.attachments && this.state.attachments.getLegacyAttachments() && this.state.attachments.getLegacyAttachments().length > 0) &&
            // (this.state.attachments && this.state.attachments.getLogStoreAttachments() && this.state.attachments.getLogStoreAttachments().length > 0) && - todo-nipunja
            <div className="not-previewable-attachment-area">
                <div className="attachment-unpreviewable-icon">
                    <Icon
                        iconName="Preview"
                    />
                </div>
                <div className="attachment-unpreviewable-message">
                    {Resources.AttachmentUnpreviewableMessage}
                </div>
                <div className="attachment-unpreviewable-suggestion-message">
                    {this.state.lastSelectedAttachment && this._getDownloadButton()}
                </div>
            </div>
        );
    }

    private _getDownloadButton(): JSX.Element {
        return (
            <PrimaryButton
                className={"attachment-download-button"}
                href={this.state.lastSelectedAttachment.url}
                target="_self"
                rel="nofollow noopener noreferrer"
            >
                {Resources.Download}
            </PrimaryButton>
        );
    }

    private _getLoadingAttachmentsView(): JSX.Element {
        return (
            <div className="attachment-view-pane-loading">
                <Spinner
                    ariaLabel={Resources.LoadingAttachmentsMessage}
                    className="attachments-view-loading-spinner test-result-loading-spinner-separator"
                    size={SpinnerSize.large}
                    label={Resources.LoadingAttachmentsMessage}
                />
            </div>
        );
    }

    private _getAttachmentPreviewLoadingView(): JSX.Element {
        return (
            <div className="attachment-preview-loading">
                <Spinner
                    ariaLabel={Resources.LoadingAttachmentMessage}
                    className="attachment-preview-loading-spinner"
                    size={SpinnerSize.large}
                    label={Resources.LoadingAttachmentMessage}
                />
            </div>
        );
    }

    private _onErrorMessageDismiss = () => {
        this.props.actionsCreator.closeErrorMessage();
    }

    private _onItemInvoked = (item: TCMContracts.TestAttachment, ev?: any): void => {
        const isInvokedItemInSelection: boolean = this._isInvokedItemInSelection(item);

        // We need this check to handle active item change events on click of context menu. When the context menu is clicked, the active item changed event is again raised
        // which re-renders the component.
        if (this.state.shouldInvokeFirstItem || (item !== this._lastActiveItem && isInvokedItemInSelection)) {
            this._lastActiveItem = item;
            const attachmentType = this._getAttachmentType(item.fileName);
            this.props.actionsCreator.setLastSelectedAttachment(item);

            // Add telemetry to get attachment type extension and to see if the attachment is previewable or not.
            TestTabTelemetryService.getInstance().publishDetailsPaneEvents(TestTabTelemetryService.featureTestTab_PreviewTestAttachment, {
                "RunId": this.props.testRunId,
                "ResultId": this.props.testResultId,
                "SubResultId": this.props.subResultId,
                "previewable": (attachmentType !== AttachmentType.notPreviewable),
                "AttachmentTypeExtension": this._attachmentTypeExtension
            });

            if (attachmentType === AttachmentType.previewableText) {
                this.props.actionsCreator.setAttachmentContentLoading(true);
                this.props.actionsCreator.showAttachmentPreview(
                    item.id,
                    this.props.testRunId,
                    this.props.testResultId,
                    this.props.subResultId,
                    this.props.attachmentSource
                );
            }
        }
    }

    private _previewAttachmentOfTypeImage(url: string, fileName: string): JSX.Element {
        return (
            <div className="attachment-image-container">
                <img
                    className="attachment-image"
                    src={url}
                    alt={fileName}>
                </img>
            </div>
        );
    }

    @autobind
    private _isInvokedItemInSelection(item: TCMContracts.TestAttachment): boolean {
        const selection: TCMContracts.TestAttachment[] = this.state.selection.getSelection() as TCMContracts.TestAttachment[];
        for (let i = 0; i < selection.length; i++) {
            if (item.id === selection[i].id) {
                return true;
            }
        }

        return false;
    }

    @autobind
    private _createExtensionHost(): void {
        let extHost: VCBuiltInExtensions.BuiltInExtensionHost;
        const options = {
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            end_point: "tfs.source-control.file-viewer",
            cssClass: "attachment-viewer-host",
            integration: {
                end_point: "tfs.source-control.file-viewer"
            }
        };
        extHost = BaseControl.enhance(
            VCBuiltInExtensions.BuiltInExtensionHost,
            this.refs["file-viewer-holder"] as HTMLElement,
            options
        ) as VCBuiltInExtensions.BuiltInExtensionHost;

        this.props.actionsCreator.setExtensionHost(extHost);
    }

    @autobind
    private _getAttachmentType(fileName: string): AttachmentType {
        const _allowedPreviewableFileExtensions = [".txt", ".log"];
        const _allowedPreviewableImageExtensions = [".jpg", ".jpeg", ".png", ".bmp", ".gif"];

        this._attachmentTypeExtension = Utils_String.empty;
        if (fileName.indexOf(".") !== -1) {
            this._attachmentTypeExtension = fileName.substring(fileName.lastIndexOf("."));
        }

        if (_allowedPreviewableFileExtensions.indexOf(this._attachmentTypeExtension.toLowerCase()) > -1) {
            return AttachmentType.previewableText;
        }
        else if (_allowedPreviewableImageExtensions.indexOf(this._attachmentTypeExtension.toLowerCase()) > -1) {
            return AttachmentType.previewableImage;
        }
        else {
            return AttachmentType.notPreviewable;
        }
    }

    @autobind
    private _getColumnsForDetailsList(): IColumn[] {
        const columns: IColumn[] = [
            {
                key: "attachments",
                name: Resources.AttachmentsHeaderText,
                fieldName: "name",
                minWidth: 210,
                maxWidth: 350,
                isRowHeader: true,
                data: "string",
                onRender: (item: TCMContracts.TestAttachment, index: number) => {
                    return (
                        <div className="attachment-row">
                            <div className="attachment-cell">
                                <span className="attachment-name">
                                    <TooltipHost content={item.fileName}>
                                        {item.fileName}
                                    </TooltipHost>
                                </span>
                                <div className="attachment-info">
                                    <span className="attachment-size">
                                        {this._getAttachmentSizeTextInKB(item.size ? item.size : 0)}
                                    </span>
                                    <span className="attachment-time-added-ago">
                                        {this._getAttachmentTimeAddedAgo(item.createdDate)}
                                    </span>
                                </div>
                            </div>
                            <span className="attachment-context-menu">
                                {this._createContextMenu(item, index)}
                            </span>
                        </div>
                    );
                }
            }
        ];
        return columns;
    }

    @autobind
    private _getColumnsForDetailsListForLogStore(): IColumn[] {
        const columns: IColumn[] = [
            {
                key: "attachments",
                name: Resources.AttachmentsHeaderText,
                fieldName: "name",
                minWidth: 210,
                maxWidth: 350,
                isRowHeader: true,
                data: "string",
                onRender: (item: TCMContracts.TestLog, index: number) => {
                    return (
                        <div className="attachment-row">
                            <div className="attachment-cell">
                                <span className="attachment-name">
                                    <TooltipHost content={Utils_File.getFileName(item.logReference.filePath)}>
                                        {Utils_File.getFileName(item.logReference.filePath)}
                                    </TooltipHost>
                                </span>
                                <div className="attachment-info">
                                    <span className="attachment-size">
                                        {this._getAttachmentSizeTextInKB(item.size ? item.size : 0)}
                                    </span>
                                    <span className="attachment-time-added-ago">
                                        {this._getAttachmentTimeAddedAgo(item.modifiedOn)}
                                    </span>
                                </div>
                            </div>
                            <span className="attachment-context-menu">
                                {this._createContextMenuForLogStore
                                    (item, index)}
                            </span>
                        </div>
                    );
                }
            }
        ];
        return columns;
    }

    @autobind
    private _createContextMenu(attachment: TCMContracts.TestAttachment, index: number): JSX.Element {
        const items: IContextualMenuItem[] = [];
        items.push({
            key: "download-attachment",
            onClick: () => {
                this.props.actionsCreator.downloadSelectedAttachments(
                    this.state.selection.getSelection() as TCMContracts.TestAttachment[],
                    this.props.attachmentSource
                );
            },
            iconProps: {
                iconName: "Download"
            },
            name: Resources.Download
        });
        if (this.state.hasPublishTestResultsPermission && (this.props.attachmentSource !== TMUtils.AttachmentSource.testRun)) {
            items.push({
                key: "delete-attachment",
                onClick: () => {
                    this._confirmBeforeDeletion();
                },
                iconProps: {
                    iconName: "ChromeClose",
                },
                name: Resources.DeleteText,
                title: UIUtils.getAccessDeniedTooltipText(!this.state.hasPublishTestResultsPermission, Resources.DeleteText)
            });
        }

        let showContextMenu = false;
        if (this.state.contextMenuOpenIndex === index) {
            showContextMenu = true;
            this.props.actionsCreator.updateContextMenuOpenIndex(-1);
        }

        const contextMenuProps: IPopupContextualMenuProps = {
            className: "context-menu grid-context-menu",
            iconClassName: "bowtie-ellipsis",
            items: items,
            menuClassName: "attachment-popup-menu",
            showContextMenu: showContextMenu,
            onClick: (event) => {
                if (this.state.selection.getSelectedCount() > 1) {
                    // this is multi-selection, we don't want to propagate the click which would deselect all items since grid considers it as a row click
                    event.preventDefault();
                    event.stopPropagation();
                }
                this.props.actionsCreator.updateContextMenuOpenIndex(index);
            },
            onDismiss: () => {
                this.props.actionsCreator.updateContextMenuOpenIndex(-1);
            }
        };
        return <PopupContextualMenu {...contextMenuProps} />;
    }

    @autobind
    private _createContextMenuForLogStore(attachment: TCMContracts.TestLog, index: number): JSX.Element {
        const items: IContextualMenuItem[] = [];
        items.push({
            key: "download-attachment",
            onClick: () => {
                this.props.actionsCreator.downloadSelectedLogStoreAttachments(
                    this.state.logStoreSelection.getSelection() as TCMContracts.TestLog[],
                    this.props.attachmentSource
                );
            },
            iconProps: {
                iconName: "Download"
            },
            name: Resources.Download
        });

        let showContextMenu = false;
        if (this.state.contextMenuOpenIndex === index) {
            showContextMenu = true;
            this.props.actionsCreator.updateContextMenuOpenIndex(-1);
        }

        const contextMenuProps: IPopupContextualMenuProps = {
            className: "context-menu grid-context-menu",
            iconClassName: "bowtie-ellipsis",
            items: items,
            menuClassName: "attachment-popup-menu",
            showContextMenu: showContextMenu,
            onClick: (event) => {
                if (this.state.selection.getSelectedCount() > 1) {
                    // this is multi-selection, we don't want to propagate the click which would deselect all items since grid considers it as a row click
                    event.preventDefault();
                    event.stopPropagation();
                }
                this.props.actionsCreator.updateContextMenuOpenIndex(index);
            },
            onDismiss: () => {
                this.props.actionsCreator.updateContextMenuOpenIndex(-1);
            }
        };
        return <PopupContextualMenu {...contextMenuProps} />;
    }

    @autobind
    private _confirmBeforeDeletion(): void {
        let attachmentsNameList: string = " ";
        const selectedAttachments = this.state.selection.getSelection() as TCMContracts.TestAttachment[];
        selectedAttachments.forEach((attachment: TCMContracts.TestAttachment) => {
            attachmentsNameList = attachmentsNameList + attachment.fileName + " ";
        });
        ConfirmationDialog.openConfirmationDialog(Utils_String.format(Resources.ConfirmAttachmentDeletion, attachmentsNameList), () => { this._deleteAttachments(); });
    }

    private _deleteAttachments(): void {
        this.props.actionsCreator.deleteAttachments(
            this.props.testRunId,
            this.props.testResultId,
            this.props.subResultId,
            this.props.attachmentSource,
            this.state.selection.getSelection() as TCMContracts.TestAttachment[]
        );
    }

    @autobind
    private _getAttachmentSizeTextInKB(attachmentSize: number): string {
        return Utils_String.format(Resources.AttachmentSizeValueInKB, Math.ceil(attachmentSize / 1024));
    }

    @autobind
    private _getAttachmentTimeAddedAgo(createdDate: Date): string {
        return Utils_String.format(Resources.AttachmentAddedAgo, Utils_Date.ago(createdDate));
    }

    private _handleStoreChange = (): void => {
        this.setState(this.props.store.getState());
    }
}
