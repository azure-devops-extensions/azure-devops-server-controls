import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { IFolderItem, IChildItem, IFolderNode, IDetailsRowItem, FolderConstants, RowType } from "DistributedTaskControls/SharedControls/Folders/Types";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export class FolderUtils {

    public static isRootFolder(folderPath: string): boolean {
        if (!folderPath) {
            return true;
        }

        if (Utils_String.equals(folderPath, FolderConstants.PathSeparator, true)) {
            return true;
        }

        return false;
    }

    public static getParentFolderPath(folderPathWithName: string): string {
        if (!!folderPathWithName) {
            let indexOfLastPathSeparator = folderPathWithName.lastIndexOf(FolderConstants.PathSeparator);
            if (indexOfLastPathSeparator >= 0) {
                let parentFolderPath = folderPathWithName.substring(0, indexOfLastPathSeparator);
                if (!!parentFolderPath) {
                    return parentFolderPath;
                }
            }
        }

        return FolderConstants.PathSeparator;
    }

    public static createFoldersStructure(rootFolderName: string, folders: IFolderItem[], childItems: IChildItem[]): IFolderNode {
        let rootFolder: IFolderNode;

        let folderIdToChildItemsMap: IDictionaryNumberTo<IChildItem[]> = {};
        let pathToFoldersMap: IDictionaryStringTo<IFolderNode> = {};

        Utils_Array.sortIfNotSorted(folders, (a: IFolderItem, b: IFolderItem) => { return Utils_String.localeIgnoreCaseComparer(a.path, b.path); });

        if (childItems) {
            childItems.forEach((childItem: IChildItem) => {
                // Replace folderId with parentFolderId in S130
                if (!folderIdToChildItemsMap.hasOwnProperty(childItem.folderId)) {
                    folderIdToChildItemsMap[childItem.folderId] = [];
                }

                folderIdToChildItemsMap[childItem.folderId].push(childItem);
            });
        }

        if (folders) {
            folders.forEach((folder: IFolderItem) => {
                if (!!folder.path && Utils_String.startsWith(folder.path, FolderConstants.PathSeparator)) {

                    if (FolderUtils.isRootFolder(folder.path)) {
                        rootFolder = {
                            name: rootFolderName,
                            id: folder.id,
                            childFolders: [],
                            childItems: folderIdToChildItemsMap[folder.id],
                            item: folder
                        };
                        pathToFoldersMap[FolderConstants.PathSeparator] = rootFolder;
                    }
                    else {
                        let pathParts = folder.path.split(FolderConstants.PathSeparator);
                        Utils_Array.removeWhere(pathParts, (part) => { return part === Utils_String.empty; });

                        let pathPartslength = pathParts.length;

                        if (pathPartslength === 1) {
                            let itemPath = folder.path;
                            if (!pathToFoldersMap.hasOwnProperty(itemPath)) {
                                let folderItem: IFolderNode = {
                                    name: pathParts[0],
                                    id: folder.id,
                                    childFolders: [],
                                    childItems: folderIdToChildItemsMap[folder.id],
                                    item: folder
                                };

                                pathToFoldersMap[FolderConstants.PathSeparator].childFolders.push(folderItem);
                                pathToFoldersMap[itemPath] = folderItem;
                            }
                        }
                        else if (pathPartslength > 1) {
                            let partsIndex: number = 1;
                            let childItemPath = FolderConstants.PathSeparator + pathParts[0];
                            let parentItemPath;
                            while (partsIndex < pathPartslength) {
                                parentItemPath = childItemPath;
                                childItemPath = childItemPath + FolderConstants.PathSeparator + pathParts[partsIndex];

                                if (!pathToFoldersMap.hasOwnProperty(childItemPath)) {
                                    let folderItem: IFolderNode = {
                                        name: pathParts[partsIndex],
                                        id: folder.id,
                                        childFolders: [],
                                        childItems: folderIdToChildItemsMap[folder.id],
                                        item: folder
                                    };
                                    pathToFoldersMap[parentItemPath].childFolders.push(folderItem);
                                    pathToFoldersMap[childItemPath] = folderItem;
                                }
                                partsIndex++;
                            }
                        }
                    }
                }
            });
        }

        return rootFolder;
    }

    public static createDetailsRows(expandedFolderIds: number[], folders: IFolderNode[], childItems: IChildItem[], currentDepth: number, shouldShowMore?: boolean): IDetailsRowItem[] {
        let rows: IDetailsRowItem[] = [];
        let depth = currentDepth + 1;

        if (!!folders) {
            folders.forEach((folder: IFolderNode) => {
                let folderRow = FolderUtils._createFolderRow(expandedFolderIds, folder, depth);
                rows.push(folderRow);

                if (folderRow.isExpanded) {
                    if (folderRow.hasChildren) {
                        rows = rows.concat(FolderUtils.createDetailsRows(expandedFolderIds, folder.childFolders, folder.childItems, depth, !!shouldShowMore));
                        if (!!shouldShowMore && folder.childItems && folderRow.item.hasMoreChildItems && folderRow.id !== 1) {
                            rows.push(this._createShowMoreItem(folder, depth));
                        }
                    }
                    else {
                        rows = rows.concat(FolderUtils._createNoChildrenRowForFolder(folderRow.depth));
                    }
                }
            });
        }

        if (!!childItems) {
            childItems.forEach((childItem: IChildItem) => {
                rows.push(FolderUtils._createChildItemRow(childItem, depth));
            });
        }

        return rows;
    }

    public static createFlatListRows(childItems: IChildItem[]): IDetailsRowItem[] {
        let rows: IDetailsRowItem[] = [];

        childItems.forEach((childItem: IChildItem) => {
            rows.push(FolderUtils._createChildItemRow(childItem, 0));
        });

        return rows;
    }

    private static _createShowMoreItem(folder: IFolderNode, depth: number): IDetailsRowItem {
        return {
            name: Resources.ShowMore,
            depth: depth + 1,
            hasChildren: false,
            id: -2,
            rowType: RowType.ShowMore,
            isExpanded: false,
            url: Utils_String.empty,
            item: folder.item
        };
    }

    private static _createFolderRow(expandedFolderIds: number[], folder: IFolderNode, depth: number): IDetailsRowItem {
        return {
            name: folder.name,
            depth: depth,
            hasChildren: FolderUtils._hasChildren(folder),
            id: folder.item.id,
            rowType: RowType.Folder,
            isExpanded: FolderUtils._isExpanded(expandedFolderIds, folder),
            url: null,
            item: folder.item
        };
    }

    private static _createChildItemRow(childItem: IChildItem, depth: number): IDetailsRowItem {
        return {
            name: childItem.name,
            depth: depth,
            hasChildren: false,
            id: childItem.id,
            rowType: RowType.ChildItem,
            isExpanded: false,
            url: childItem.url,
            navigationHubId: childItem.navigationHubId,
            item: childItem
        };
    }

    private static _createNoChildrenRowForFolder(depth: number): IDetailsRowItem {
        return {
            name: Resources.EmptyFolderMessage,
            depth: depth + 2,
            hasChildren: false,
            id: -1,
            rowType: RowType.ChildItem,
            isExpanded: false,
            url: Utils_String.empty,
            item: null
        };
    }

    private static _hasChildren(folder: IFolderNode): boolean {
        if (folder.item.hasMoreChildItems) {
            return true;
        }

        if (folder.childFolders && folder.childFolders.length > 0) {
            return true;
        }

        if (folder.childItems && folder.childItems.length > 0) {
            return true;
        }

        return false;
    }

    private static _isExpanded(expandedFolderIds: number[], folder: IFolderNode): boolean {
        if (expandedFolderIds) {
            return Utils_Array.contains(expandedFolderIds, folder.item.id);
        }

        return false;
    }
}