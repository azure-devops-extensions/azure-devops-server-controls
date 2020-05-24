// FolderDetailsList and FolderPickerComponent takes list of IFolderItem and list of IChildItem as inputs.
// For example, in case of RM IFolderItem maps to RM folder and IChildItem maps to release definition.
// in case of Build IFolderItem maps to Build folder and IChildItem maps to build definition.

// IFolderNode and IDetailsRowItem are internal contracts in FolderDetailsList and FolderPickerComponent.

export enum RowType {
    ChildItem = 0,
    Folder = 1,
    ShowMore = 2
}

export interface IFolderItem {
    id: number;
    path: string;
    hasMoreChildItems: boolean; // this is for indicating there are some more child items to be be queried from server
}

export interface IChildItem {
    id: number;
    name: string;
    parentFolderId: number;
    folderId: number; // Remove this in M130 sprint
    url: string;
    navigationHubId?: string;
}

export interface IFolderNode {
    item: IFolderItem;
    name: string;
    childFolders: IFolderNode[];
    childItems: IChildItem[];
}

export interface IDetailsRowItem {
    item: any; // this will be either IFolderItem or IChildItem
    id: number;
    name: string;
    depth: number;
    rowType: RowType;
    isExpanded: boolean;
    hasChildren: boolean;
    url: string;
    navigationHubId?: string;
}

export namespace FolderConstants {
    export const NameColumnHeaderKey: string = "name";

    export const PathSeparator: string = "\\";
}