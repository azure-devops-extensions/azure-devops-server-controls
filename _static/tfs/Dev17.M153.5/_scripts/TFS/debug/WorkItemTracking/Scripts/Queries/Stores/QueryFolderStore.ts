import { QueryHierarchyItem } from "TFS/WorkItemTracking/Contracts";
import { ActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/ActionsHub";
import { ExtendedQueryHierarchyItem } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import { FolderQueriesFilterProvider } from "WorkItemTracking/Scripts/Queries/FolderQueriesFilterProvider"
import { QueryHierarchyItemStore } from "WorkItemTracking/Scripts/Queries/Stores/QueryHierarchyItemStore"
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as StoreBase from "VSS/Flux/Store";

export class QueryFolderStore extends StoreBase.Store {
    private _folderIdOrPath: string;

    constructor(actions: ActionsHub, private filterProvider: FolderQueriesFilterProvider) {
        super();

        actions.QueryFolderItemLoaded.addListener((item: QueryHierarchyItem) => {
            if (this._folderIdOrPath && item && item.children && (item.path === this._folderIdOrPath || item.id === this._folderIdOrPath)) {
                this.filterProvider.clearDataProvider();
                this.filterProvider.setItems(item.children);
                this.filterProvider.search();
            }
        });

        actions.SetFolderPath.addListener((value: string) => {
            this.setFolderPath(value);
        });

        actions.SearchTextChanged.addListener((searchText) => {
            this.filterProvider.setFilterText(searchText);
            this.emitChanged();
        });

        actions.QueryItemCreated.addListener((item) => {
            // Update search provider
            this.filterProvider.setItems([item]);
            this.filterProvider.search();
            this.emitChanged();
        });

        actions.QueryItemRenamed.addListener((item) => {
            this.filterProvider.clearDataProvider();
            this.filterProvider.setItems([item]);
            this.filterProvider.search();
            this.emitChanged();
        });
    }

    public getFilteredIds(): string[] {
        return this.filterProvider.getMatchedItemIds();
    }

    public isFiltering(): boolean {
        return this.filterProvider.isFiltering();
    }

    public setFolderPath(value: string): void {
        this._folderIdOrPath = value;
    }
}