import * as React from "react";
import "VSS/LoaderPlugins/Css!Controls/WorkItemForm/AttachmentsControl/AttachmentContextMenu";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { AttachmentsControlCIEvents, AttachmentsControlUIActionSource } from "WorkItemTracking/Scripts/Utils/WorkItemTrackingCIEventHelper";
import { DefaultButton, IButton } from "OfficeFabric/Button";
import { Attachment } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { EditComment, PreviewAttachment, DownloadAttachment, DeleteAttachment } from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { AttachmentsControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/AttachmentsControl/AttachmentsControl";
import { css } from "OfficeFabric/Utilities";

export interface IContextualMenuIconProps {
    linkedAttachment: Attachment;
    attachmentsControl: AttachmentsControl;
}

export interface IContextualMenuIconState {
    forceButtonVisible: boolean;
}

export class AttachmentContextualMenuIcon extends React.Component<IContextualMenuIconProps, IContextualMenuIconState> {
    private _button: IButton;

    constructor(props: IContextualMenuIconProps) {
        super(props);
        this.state = { forceButtonVisible: false };
    }

    private _editAttachment = (): void => {
        const attachmentsList = [this.props.linkedAttachment];
        this.props.attachmentsControl.showEditCommentDialog(attachmentsList);

        AttachmentsControlCIEvents.publishEvent(
            AttachmentsControlCIEvents.UI_EDIT_COMMENT,
            {
                source: AttachmentsControlUIActionSource.UI_THUMBNAIL_CONTEXT_MENU
            }
        );
    }

    private _previewAttachment = (): void => {
        this.props.attachmentsControl.tryPreviewAttachment(this.props.linkedAttachment);

        AttachmentsControlCIEvents.publishEvent(
            AttachmentsControlCIEvents.UI_PREVIEW_MODE,
            {
                source: AttachmentsControlUIActionSource.UI_THUMBNAIL_CONTEXT_MENU
            }
        );
    }

    private _downloadAttachment = (): void => {
        this.props.attachmentsControl.downloadAttachment(this.props.linkedAttachment);

        AttachmentsControlCIEvents.publishEvent(
            AttachmentsControlCIEvents.UI_DOWNLOAD,
            {
                source: AttachmentsControlUIActionSource.UI_THUMBNAIL_CONTEXT_MENU
            }
        );
    }

    private _deleteAttachment = (): void => {
        const attachmentsList = [this.props.linkedAttachment];
        this.props.attachmentsControl.deleteAttachments(attachmentsList);

        AttachmentsControlCIEvents.publishEvent(
            AttachmentsControlCIEvents.UI_DELETE,
            {
                source: AttachmentsControlUIActionSource.UI_THUMBNAIL_CONTEXT_MENU
            }
        );
    }

    private _createMenuItem(key: string, name: string, iconClassName: string, onClick: () => void): IContextualMenuItem {
        return {
            key,
            name,
            iconProps: { className: iconClassName },
            onClick,
        };
    }

    private getMenuItems(): IContextualMenuItem[] {
        const menuItems: IContextualMenuItem[] = [];
        menuItems.push(this._createMenuItem("edit-attachment", EditComment, "bowtie-icon bowtie-edit-outline", this._editAttachment));
        menuItems.push(this._createMenuItem("preview-attachment", PreviewAttachment, "bowtie-icon bowtie-file-preview", this._previewAttachment));
        menuItems.push(this._createMenuItem("download-attachment", DownloadAttachment, "bowtie-icon bowtie-transfer-download", this._downloadAttachment));
        menuItems.push(this._createMenuItem("delete-attachment", DeleteAttachment, "bowtie-icon bowtie-edit-delete", this._deleteAttachment));
        return menuItems;
    }

    public showMenu = () => {
        this._button.openMenu();
    }

    private _onMenuOpened = (): void => {
        this.setState({ forceButtonVisible: true });
    }

    private _onMenuDismissed = (): void => {
        this.setState({ forceButtonVisible: false });
    }

    public render(): JSX.Element {
        return (
            <DefaultButton
                componentRef={(button) => { this._button = button; }}
                text=""
                styles={{
                    menuIcon: {
                        display: "none"
                    }
                }}
                className={css(this.state.forceButtonVisible && "button-visible", "context-menu")}
                menuProps={{
                    shouldFocusOnMount: true,
                    items: this.getMenuItems(),
                    onMenuOpened: this._onMenuOpened,
                    onMenuDismissed: this._onMenuDismissed
                }}>
                <span className="grid-context-menu-icon bowtie-icon bowtie-ellipsis"></span>
            </DefaultButton>
        );
    }
}
