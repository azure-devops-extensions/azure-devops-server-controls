import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { QueryExpand, QueryHierarchyItem } from "TFS/WorkItemTracking/Contracts";
import { WorkItemTrackingHttpClient3 } from "TFS/WorkItemTracking/RestClient";
import { ExtendedQueryHierarchyItem, QueryTreeItem } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import { IQueryHierarchyItemDataProvider } from "WorkItemTracking/Scripts/Queries/Stores/QueryHierarchyItemStore";

const tfsContext = TfsContext.getDefault();

export class QueryFolderPickerActionsCreator {

    public workItemTrackingClient: WorkItemTrackingHttpClient3;
    private _projectId: string;

    constructor(private _queryHierarchyItemDataProvider: IQueryHierarchyItemDataProvider) {
        const connection = ProjectCollection.getConnection(tfsContext);
        this.workItemTrackingClient = connection.getHttpClient(WorkItemTrackingHttpClient3);
        this._projectId = connection.getWebContext().project.id;
    }

    public async loadQueryFolderChildren(queryItem: ExtendedQueryHierarchyItem, onLoaded?: (queryFolder: QueryHierarchyItem) => void, onError?: (error: any) => void): Promise<ExtendedQueryHierarchyItem> {
        try {
            return await this.workItemTrackingClient.getQuery(this._projectId, queryItem.id, QueryExpand.Wiql, 2).then((queryFolder) => {
                if (onLoaded) {
                    onLoaded(queryFolder);
                }

                return queryFolder as ExtendedQueryHierarchyItem;
            });
        } catch (error) {
            if (onError) {
                onError(error);
            }
        }
    }

    public constructQueryTreeItems(node: ExtendedQueryHierarchyItem, idToTreeItemMap: { [id: string]: QueryTreeItem }, depth: number): QueryTreeItem {
        if (!node) {
            return null;
        }

        let treeItem = idToTreeItemMap[node.id];
        if (!treeItem) {
            treeItem = {
                isExpandable: node.isFolder,
                id: node.id,
                defaultIsExpanded: depth == 0,
                item: node,
                depth: depth
            } as QueryTreeItem;

            idToTreeItemMap[node.id] = treeItem;
        }

        const childrenItems: QueryTreeItem[] = [];
        if (node.children) {
            node.children.forEach(child => {
                if (child.isFolder) {
                    let childItem = this.constructQueryTreeItems(this._queryHierarchyItemDataProvider.getItem(child.id), idToTreeItemMap, depth + 1);
                    if (childItem) {
                        idToTreeItemMap[child.id] = childItem;
                        childrenItems.push(childItem);
                    }
                }
            });
        }

        if (childrenItems.length == 0) {
            const noSubFolderItem = QueryUtilities.getNoSubfolderContentItem(node);
            let noSubFolderTreeItem = idToTreeItemMap[noSubFolderItem.id];
            if (!noSubFolderTreeItem) {
                noSubFolderTreeItem = {
                    isExpandable: false,
                    id: noSubFolderItem.id,
                    defaultIsExpanded: false,
                    item: noSubFolderItem,
                    children: [],
                    depth: treeItem.depth + 1
                } as QueryTreeItem;

                idToTreeItemMap[noSubFolderItem.id] = noSubFolderTreeItem;
            }
            childrenItems.push(noSubFolderTreeItem);
        }

        QueryUtilities.sortFolderItems(childrenItems, (item) => item.item.name, (item) => item.item.isFolder);
        treeItem.children = childrenItems;

        return treeItem;
    }
}
