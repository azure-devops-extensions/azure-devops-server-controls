import * as React from "react";
import {
    DocumentCard,
    DocumentCardActivity,
    DocumentCardPreview,
    IDocumentCardPreviewProps,
    IDocumentCardPreviewImage
} from "OfficeFabric/DocumentCard";
import { ImageFit } from "OfficeFabric/Image";
import "VSS/LoaderPlugins/Css!Controls/WorkItemForm/AttachmentsControl/AttachmentDocumentCard";
import { WITFileHelper } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers";
import { Attachment } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { TooltipHost, DirectionalHint } from "VSSUI/Tooltip";
import { AttachmentContextualMenuIcon } from "WorkItemTracking/Scripts/Controls/WorkItemForm/AttachmentsControl/AttachmentContextMenu";
import { AttachmentsControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/AttachmentsControl/AttachmentsControl";
import { AttachmentsControlCIEvents, AttachmentsControlUIActionSource } from "WorkItemTracking/Scripts/Utils/WorkItemTrackingCIEventHelper";

import * as Utils_UI from "VSS/Utils/UI";

const MAXIMUM_LOAD_IMAGE_BYTES: number = 500000;

export interface IAttachmentDocumentCard {
    linkedAttachment: Attachment;
    name: string;
    date: string;
    userName: string;
    url: string;
    previewImageSrc: string;
    iconSrc: string;
    width: number;
    height: number;
    attachmentsControl: AttachmentsControl;
}

export class AttachmentDocumentCard extends React.Component<IAttachmentDocumentCard> {
    private _documentCardWrapperRef;
    constructor(props: IAttachmentDocumentCard) {
        super(props);
        this._documentCardWrapperRef = React.createRef();
        this.focusClickInput = this.focusClickInput.bind(this);
    }

    focusClickInput() {
        this._documentCardWrapperRef.current.focus();
    }

    private _contextMenu: React.RefObject<AttachmentContextualMenuIcon> = React.createRef();

    public _getAttachment(): Attachment {
        return this.props.linkedAttachment;
    }

    private _handleKeyUp = (event) => {
        // Only handle keyup if event originated from card
        if (event.target !== this._documentCardWrapperRef.current) {
            return;
        }

        if (event.keyCode === Utils_UI.KeyCode.ENTER || event.keyCode === Utils_UI.KeyCode.SPACE) {
            this.props.attachmentsControl.tryPreviewAttachment(this.props.linkedAttachment);
            return false;
        } else if (event.keyCode === Utils_UI.KeyCode.DELETE) {
            this.props.attachmentsControl.deleteAttachments([this.props.linkedAttachment]);
        }
    }

    private _handleDoubleClick = () => {
        this.props.attachmentsControl.tryPreviewAttachment(this.props.linkedAttachment);

        AttachmentsControlCIEvents.publishEvent(
            AttachmentsControlCIEvents.UI_PREVIEW,
            {
                source: AttachmentsControlUIActionSource.UI_THUMBNAIL_CARD
            }
        );
    }

    private showContextMenu = (e) => {
        e.preventDefault();
        this._contextMenu.current.showMenu();
        return false;
    }

    public render(): JSX.Element {
        return (
            <div className="attachments-thumbnail-view-list"
                ref={this._documentCardWrapperRef}
                tabIndex={-1}
                onKeyUp={this._handleKeyUp}
                onContextMenu={this.showContextMenu}
                onDoubleClick={this._handleDoubleClick}>
                <DocumentCard
                    // Fabric team working on building in customization for document cards. temporary-styling to be used until then.
                    className="temporary-styling">
                    <div className="document-card-wrapper" tabIndex={-1} onClick={this.focusClickInput}>
                        <DocumentCardPreview {...this._getDocumentCardPreviewProps(this.props.linkedAttachment)} />
                        <AttachmentContextualMenuIcon ref={this._contextMenu}
                            linkedAttachment={this.props.linkedAttachment}
                            attachmentsControl={this.props.attachmentsControl}
                        />
                    </div>
                    <TooltipHost content={this.props.name} directionalHint={DirectionalHint.bottomLeftEdge}>
                        <div className="document-card-title">
                            {this.props.attachmentsControl.truncateTitle(this.props.name, 22)}
                        </div>
                    </TooltipHost>
                    <TooltipHost content={this.props.date} directionalHint={DirectionalHint.bottomRightEdge}>
                        <DocumentCardActivity
                            activity={this.props.date}
                            people={[{ name: this.props.userName, profileImageSrc: this.props.iconSrc }]}
                        />
                    </TooltipHost>
                </DocumentCard>
            </div >
        );
    }

    private _getDocumentCardPreviewProps(attachment: Attachment): IDocumentCardPreviewProps {
        const extension = WITFileHelper.getExtensionName(attachment.getName());
        const { linkedAttachment, url, previewImageSrc, width, height } = this.props;

        let genericPreview: IDocumentCardPreviewImage = {
            name: "Attachment",
            width,
            height,
            url,
            imageFit: ImageFit.contain,
        };
        const attachmentPreviewProps: IDocumentCardPreviewImage = this._getPreviewIconProps(linkedAttachment);
        if ((this.props.attachmentsControl.supportedImageTypes.indexOf(extension) !== -1) && (attachment.linkData.Length < MAXIMUM_LOAD_IMAGE_BYTES) && (extension !== "gif")) {
            genericPreview.previewImageSrc = previewImageSrc;
        } else {
            genericPreview = attachmentPreviewProps;
        }
        return { previewImages: [genericPreview] };
    }

    private _getPreviewIconProps(attachment: Attachment): IDocumentCardPreviewImage {
        const ext = WITFileHelper.getExtensionName(attachment.getName());
        const iconAttachmentProps: IDocumentCardPreviewImage = {
            previewIconProps: {
                iconType: 0,
                iconName: "FileImage",
                styles: { root: { fontSize: 48 } }
            },
            previewIconContainerClass: "document-card-icon"
        };
        switch (ext) {
            // Images
            case "jpg":
            case "jpeg":
            case "jif":
            case "jfif":
            case "jpx":
            case "fpx":
            case "pcd":
            case "bmp":
            case "img":
            case "eps":
            case "psd":
            case "wmf":
            case "png":
                return iconAttachmentProps;
            // Access
            case "accdb":
                iconAttachmentProps.previewIconProps.iconName = "AccessLogo";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon Access-Logo";
                return iconAttachmentProps;
            // Excel
            case "xls":
            case "xlsx":
            case "xltx":
            case "ods":
                iconAttachmentProps.previewIconProps.iconName = "ExcelLogo";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon Excel-Logo";
                return iconAttachmentProps;
            // Onenote
            case "onepkg":
            case "onetoc":
            case "one":
                iconAttachmentProps.previewIconProps.iconName = "OneNoteLogo";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon OneNote-Logo";
                return iconAttachmentProps;
            // Email
            case "msg":
                iconAttachmentProps.previewIconProps.iconName = "Mail";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon Mail";
                return iconAttachmentProps;
            // PowerPoint
            case "potx":
            case "ppsx":
            case "pptx":
                iconAttachmentProps.previewIconProps.iconName = "PowerPointLogo";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon PowerPoint-Logo";
                return iconAttachmentProps;
            // Project
            case "mpp":
            case "mpt":
            case "pub":
                iconAttachmentProps.previewIconProps.iconName = "ProjectLogo32";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon Project-Logo";
                return iconAttachmentProps;
            // Visio
            case "vstx":
                iconAttachmentProps.previewIconProps.iconName = "VisioLogo";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon Visio-Logo";
                return iconAttachmentProps;
            // Word
            case "docx":
            case "dotx":
                iconAttachmentProps.previewIconProps.iconName = "WordLogo";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon Word-Logo";
                return iconAttachmentProps;
            // Text files
            case "rtf":
            case "txt":
                iconAttachmentProps.previewIconProps.iconName = "TextDocument";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon TextDocument";
                return iconAttachmentProps;
            // PDF
            case "pdf":
                iconAttachmentProps.previewIconProps.iconName = "PDF";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon PDF";
                return iconAttachmentProps;
            // Video Files
            case "mp4":
            case "mov":
            case "m4p":
            case "flv":
            case "gif":
            case "mpeg":
            case "mpg":
            case "qt":
            case "wmv":
            case "mpv":
            case "f4v":
            case "m4v":
            case "rm":
            case "svi":
            case "amv":
            case "avi":
            case "asf":
            case "wmv":
            case "webm":
                iconAttachmentProps.previewIconProps.iconName = "MyMoviesTV";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon MyMoviesTV";
                return iconAttachmentProps;
            // Audio Only Files
            case "m4p":
            case "m4a":
                iconAttachmentProps.previewIconProps.iconName = "MSNVideos";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon MSNVideos";
                return iconAttachmentProps;
            // Json
            case "json":
            case "jsonc":
                iconAttachmentProps.previewIconProps.iconName = "FileCode";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon FileCode";
                return iconAttachmentProps;
            // Zip
            case "zip":
                iconAttachmentProps.previewIconProps.iconName = "ZipFolder";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon ZipFolder";
                return iconAttachmentProps;
            case "css":
                iconAttachmentProps.previewIconProps.iconName = "FileCSS";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon FileCSS";
                return iconAttachmentProps;
            case "XML":
                iconAttachmentProps.previewIconProps.iconName = "Embed";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon Embed";
                return iconAttachmentProps;
            case "scss":
                iconAttachmentProps.previewIconProps.iconName = "FileSass";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon FileSass";
                return iconAttachmentProps;
            case "cs":
                iconAttachmentProps.previewIconProps.iconName = "CSharpLanguage";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon CSharpLanguage";
                return iconAttachmentProps;
            case "ts":
            case "tsx":
                iconAttachmentProps.previewIconProps.iconName = "TypeScriptLanguage";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon TypeScriptLanguage";
                return iconAttachmentProps;
            case "htm":
            case "html":
                iconAttachmentProps.previewIconProps.iconName = "FileHTML";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon FileHTML";
                return iconAttachmentProps;
            case "md":
                iconAttachmentProps.previewIconProps.iconName = "MarkDownLanguage";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon MarkDownLanguage";
                return iconAttachmentProps;
            case "java":
                iconAttachmentProps.previewIconProps.iconName = "FileJAVA";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon FileJAVA";
                return iconAttachmentProps;
            case "js":
                iconAttachmentProps.previewIconProps.iconName = "JavaScriptLanguage";
                iconAttachmentProps.previewIconContainerClass = "document-card-icon JavaScriptLanguage";
                return iconAttachmentProps;
        }
        iconAttachmentProps.previewIconProps.iconName = "Page";
        iconAttachmentProps.previewIconContainerClass = "document-card-icon Page";
        return iconAttachmentProps;
    }
}
