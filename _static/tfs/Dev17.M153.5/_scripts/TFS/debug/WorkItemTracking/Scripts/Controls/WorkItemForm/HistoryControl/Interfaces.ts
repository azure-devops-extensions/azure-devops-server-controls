import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { IInternalLinkedArtifactDisplayData } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { ILinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";
import { EditActionSet, IEditAction } from "WorkItemTracking/Scripts/OM/History/EditActionSet";
import { IdentityRef } from "VSS/WebApi/Contracts";

export enum HistoryGroupId {
    Today,
    Yesterday,
    LastSevenDays,
    LastThirtyDays,
    Older
}

export enum ItemType {
    HistoryItem,
    Group
}

export interface ILinkChanges {
    resourceLinkAdds: LinkChange[];
    resourceLinkDeletes: LinkChange[];
    relationLinkAdds: LinkChange[];
    relationLinkDeletes: LinkChange[]
}

export enum ItemFocusState {
    Set,
    Unset,
    ForceSet
}

export interface LinkChange {
    resolvedLink: IResolvedLink;
    linkTypeName: string;
    changeType: LinkChangeType;
    category: LinkCategory;
}

export enum LinkCategory {
    Resource,
    Relation,
    Unknown
}

export enum LinkChangeType {
    Unknown,
    Create,
    Delete
}

export interface IResolvedLink {
    link: WITOM.Link;
    artifactLink: ILinkedArtifact;
    editAction: IEditAction;
    resolvedArtifact: IInternalLinkedArtifactDisplayData ;
}

export interface IFieldChange {
    referenceName: string;
    name: string;
    order?: number;
    oldValue: any;
    newValue: any;
    rawOldValue: any;
    rawNewValue: any;
}

export interface IFieldChanges {
    coreAndCustomFieldChanges: IFieldChange[];
    htmlFieldChanges: IFieldChange[];
    plainTextFieldChanges: IFieldChange[];
}

export interface IHistoryChanges {
    order: number;
    highlight?: boolean;
    message: string;
    formattedMessage: string;
}

export interface IHistoryItemSummary {
    changedByIdentity: IdentityRef;
    changedBy: string;
    changes: IHistoryChanges[];
    changedDate: Date;
    comment: string;
    userSubjectLine: string;
}

export interface IAttachmentChanges {
    attachmentAdds: any;
    attachmentDeletes: any;
}

export interface ISelectableHistoryItem {
    isSelected: boolean;
    focusState: ItemFocusState;
    itemId: number;
    groupId: HistoryGroupId;
    itemType: ItemType;
    isCollapsed: boolean;
}

export interface IHistoryItem extends ISelectableHistoryItem {
    workItem: WITOM.WorkItem;
    editActionSet: EditActionSet;
    resolvedLinkChanges?: ILinkChanges;
    fieldChangesCache?: IFieldChanges;
    summaryCache?: IHistoryItemSummary;
    attachmentChangesCache?: IAttachmentChanges;
}


export interface IHistoryItemGroup extends ISelectableHistoryItem {
    groupName: string;
    groupId: HistoryGroupId;
}

export interface SelectedItem {
    item: IHistoryItem;
    itemId: number;
}
