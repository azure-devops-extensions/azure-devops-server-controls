import { MessageBarType } from "OfficeFabric/MessageBar";

import { Folder } from "TFS/Build/Contracts";

import { Action } from "VSS/Flux/Action";

export interface FolderRename {
    oldName: string;
    newName: string;
}

export interface FoldersUpdatedPayload {
    folders: Folder[];
    folderRenames?: FolderRename[];
    replace?: boolean;
}

export interface IFolderActionPayload {
    successCallBack?: (path) => void;
    errorCallBack?: (error: Error) => void;
}

export interface FolderCreateRequestedPayload extends IFolderActionPayload {
    folder: Folder;
}

export interface FolderDeleteRequestedPayload extends IFolderActionPayload {
    path: string;
}

export interface FolderUpdateRequestedPayload extends IFolderActionPayload {
    folder: Folder;
    path: string;
}

export interface IMessage {
    type: MessageBarType;
    content: string;
}

export interface IFolderActionCompletedPayload {
    message: IMessage;
    defaultPath?: string;
}

export var folderActionCompleted = new Action<IFolderActionCompletedPayload>();

export var foldersUpdated = new Action<FoldersUpdatedPayload>();
export var folderUpdateRequested = new Action<FolderUpdateRequestedPayload>();

export var createFolderRequested = new Action<FolderCreateRequestedPayload>();

export var deleteFolderRequested = new Action<FolderDeleteRequestedPayload>();
export var folderDeleted = new Action<string>();