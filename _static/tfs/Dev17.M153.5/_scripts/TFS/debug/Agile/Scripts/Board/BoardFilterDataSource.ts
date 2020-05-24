import { BoardMember, BoardNode, ItemSource } from "Agile/Scripts/TFS.Agile.Boards";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { Debug } from "VSS/Diag";
import { uniqueSort } from "VSS/Utils/Array";
import { equals, localeIgnoreCaseComparer } from "VSS/Utils/String";
import { handleError } from "VSS/VSS";
import { IWorkItemFilterItem } from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { IFilterDataSource } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { TagUtils } from "WorkItemTracking/Scripts/Utils/TagUtils";

export interface IBoardFilterDataSource extends IFilterDataSource {
    /** Get a list of parent workItems */
    getParentItems(): IPromise<IWorkItemFilterItem[]>;
}

/**
 * Filter data source for a complete board
 */
export class BoardFilterDataSource implements IBoardFilterDataSource {
    private _getItemSource: () => ItemSource;
    private _getBoardsRootNode: () => BoardNode;

    constructor(getItemSource: () => ItemSource, getBoardsRootNode: () => BoardNode) {
        Debug.assertIsFunction(getItemSource, "getItemSource");
        Debug.assertIsFunction(getBoardsRootNode, "getBoardsRootNode");
        this._getItemSource = getItemSource;
        this._getBoardsRootNode = getBoardsRootNode;
    }

    public getDataSourceName = () => "Kanban";

    public getItemCount(): number {
        return this._itemSource ? this._itemSource.getItemCount() : 0;
    }

    public getIds(): number[] {
        const ids: number[] = [];
        const members = this.getFilterableMembers();
        for (const member of members) {
            const items = member.items();

            for (const item of items) {
                ids.push(item.id());
            }
        }

        return ids;
    }

    public getValue(id: number, fieldName: string): any {
        const item = this._itemSource ? this._itemSource.getCachedItem(id) : null;
        if (item && fieldName) {
            return item.fieldValue(fieldName);
        }

        return null;
    }

    public getUniqueValues(fieldName: string): string[] | IPromise<string[]> {
        const fieldValues = this._itemSource ? this._itemSource.getFieldValuesOfAllBoardItems(fieldName) : [];
        if (equals(fieldName, CoreFieldRefNames.Tags, true)) {
            // We need to expand and dedupe tags
            const tagFieldValues: IDictionaryStringTo<boolean> = {};

            for (const fieldValue of fieldValues) {
                const tags = TagUtils.splitAndTrimTags(fieldValue);
                for (const tag of tags) {
                    tagFieldValues[tag] = true;
                }
            }

            return uniqueSort(Object.keys(tagFieldValues), localeIgnoreCaseComparer);
        }

        return fieldValues;
    }

    public getVisibleColumns(): string[] {
        const boardFields = this._itemSource ? this._itemSource.getFieldDefinitions() : null;

        return boardFields ? Object.keys(boardFields) : [];
    }

    public getParentItems(): IPromise<IWorkItemFilterItem[]> {
        if (!this._itemSource) {
            return Promise.resolve([]);
        }

        const childIds = this._itemSource.getFieldValuesOfAllBoardItems(CoreFieldRefNames.Id).map(id => +id);
        return this._itemSource.beginGetParents(childIds, handleError).then(
            parentChildMap => {
                const fieldValues: IWorkItemFilterItem[] = [];

                if (parentChildMap) {
                    for (const pair of parentChildMap) {
                        const parentId = pair.id;

                        fieldValues.push({
                            key: parentId.toString(10),
                            display: pair.title,
                            value: parentId
                        });
                    }
                }

                return fieldValues;
            }
        ).then<IWorkItemFilterItem[]>(null, handleError as any);
    }

    public getFilterableMembers(): BoardMember[] {
        return this._rootNode ? this._rootNode.allFilterableMembers(true) : [];
    }

    private get _itemSource(): ItemSource {
        const itemSource = this._getItemSource();
        return itemSource;
    }

    private get _rootNode(): BoardNode {
        const rootNode = this._getBoardsRootNode();
        return rootNode;
    }
}