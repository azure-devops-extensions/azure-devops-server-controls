import * as React from "react";
import { Attachment, WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WITFileHelper } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers";
import { equals, getNowInUserTimeZone } from "VSS/Utils/Date";
import { WorkItemStore } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { AttachmentDocumentCard } from "WorkItemTracking/Scripts/Controls/WorkItemForm/AttachmentsControl/AttachmentDocumentCard";
import { getAvatarUrl } from "WorkItemTracking/Scripts/Utils/WorkItemIdentityHelper";
import { localeFormat } from "VSS/Utils/Date";
import { EditActionSet, EditActionType } from "WorkItemTracking/Scripts/OM/History/EditActionSet";
import { IAttachmentChanges } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Interfaces";
import { AttachmentsControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/AttachmentsControl/AttachmentsControl";
import { FocusZone } from "OfficeFabric/FocusZone";

const MAXIMUM_LOAD_IMAGE_BYTES: number = 500000;

export interface IAttachmentDocumentCardContainerProps {
    cardWorkItem: WorkItem;
    attachments: Attachment[];
    attachmentsHistory: EditActionSet[];
    attachmentsControl: AttachmentsControl;
}

export class AttachmentDocumentCardContainer extends React.Component<IAttachmentDocumentCardContainerProps> {
    private _tfsContext = TfsContext.getDefault();
    private _currentUser = this._tfsContext.currentIdentity;

    private _attachmentAuthorHistory = this._getAttachmentAuthors(this.props.attachmentsHistory);

    render() {
        const {
            attachments
        } = this.props;
        const attachmentDivs = attachments.map((attachment: Attachment) => this._renderAttachmentItem(attachment));

        return (
            <div className="document-card-attachment-container" tabIndex={-1}>
                <FocusZone>
                    {attachmentDivs}
                </FocusZone>
            </div>
        );
    }

    /**
     * Gets the adjacent attachment of the current attachment.
     * @param attachment the current attachment
     * @param isNext = true if the action is to traverse to the next attachment, false to go to the previous attachment
     * @param shouldTraverse = true if the action is actually traverse to an attachment rather than check for one
     */
    public getAdjacentAttachment(attachment: Attachment, isNext: boolean, shouldTraverse?: boolean): Attachment {
        const currentIndex = this.props.attachments.indexOf(attachment);
        const indexDiff = isNext ? 1 : -1;

        if (currentIndex + indexDiff < 0 || currentIndex + indexDiff >= this.props.attachments.length) {
            // No more attachments in that direction
            return null;
        }
        return this.props.attachments[currentIndex + indexDiff];
    }

    private _renderAttachmentItem(attachment: Attachment): JSX.Element {
        let userInformationName: string;
        let userInformationAvatar: string;
        const fileID = attachment.linkData.ExtID;
        const attachmentKey = attachment.getUri(true);
        let foundUser: boolean = false;
        let placeholder = 0;
        for (const attachmentChange of this._attachmentAuthorHistory) {
            for (const addedAttachment of attachmentChange.attachmentAdds) {
                if (fileID === addedAttachment.linkData.ExtID) {
                    userInformationName = (this.props.attachmentsHistory[placeholder].changedByIdentity.identityRef.displayName);
                    userInformationAvatar = (getAvatarUrl(this.props.attachmentsHistory[placeholder].changedByIdentity));
                    foundUser = true;
                }
            }
            placeholder++;
        }
        // foundUser will be undefined only when a user has added an attachment but not saved the update
        if (!foundUser) {
            userInformationName = (this._currentUser.displayName);
            userInformationAvatar = (getAvatarUrl(this._currentUser));
        }

        return (
            <div key={attachmentKey}>
                <AttachmentDocumentCard
                    linkedAttachment={attachment}
                    name={attachment.linkData.OriginalName}
                    date={this._getDate(attachment)}
                    userName={userInformationName}
                    url={attachmentKey}
                    previewImageSrc={this._getAttachmentView(attachment)}
                    iconSrc={userInformationAvatar}
                    width={210}
                    height={124}
                    attachmentsControl={this.props.attachmentsControl}
                />
            </div>
        );
    }

    private _getAttachmentAuthors(actionSetsChanges: EditActionSet[]): IAttachmentChanges[] {
        const trackingChanges: IAttachmentChanges[] = [];
        for (const changes of actionSetsChanges) {
            trackingChanges.push(this._getAttachmentChanges(this.props.cardWorkItem, changes));
        }
        return trackingChanges;
    }

    private _getAttachmentChanges(workItem: WorkItem, actionSet: EditActionSet): IAttachmentChanges {
        if (workItem && actionSet) {
            let attachmentInfo: Attachment;
            const attachmentChanges: IAttachmentChanges = {
                attachmentAdds: [],
                attachmentDeletes: []
            };
            const workItemAttachmentChanges = actionSet.getAttachmentChanges();
            if (workItemAttachmentChanges) {
                for (const change of workItemAttachmentChanges) {
                    attachmentInfo = workItem.allLinks[change.index] as Attachment;
                    if (change.type === EditActionType.AddAttachment) {
                        attachmentChanges.attachmentAdds.push(attachmentInfo);
                    }
                }
            }
            return attachmentChanges;
        }
    }

    private _getDate(attachment: Attachment): string {
        let date: string = localeFormat(attachment.getAddedDate(), "F");
        if (equals(WorkItemStore.FutureDate, attachment.getAddedDate())) {
            date = localeFormat(getNowInUserTimeZone(), "F");
        }
        return date;
    }

    private _getAttachmentView(attachment: Attachment): string {
        const attachmentIcon = WITFileHelper.getMatchingIcon(attachment.getName());
        if (attachmentIcon === "bowtie-icon bowtie-image") {
            if (attachment.linkData.Length < MAXIMUM_LOAD_IMAGE_BYTES
                && attachment.linkData.FilePath) {
                return attachment.getUri(true);
            }
        }
        return;
    }
}
