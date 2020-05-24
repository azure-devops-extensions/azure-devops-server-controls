import { SearchableObject, IndexedSearchStrategy } from "VSS/Search";
import { QueryHierarchyItem } from "TFS/WorkItemTracking/Contracts";
import { RenamedQueryItem } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { QueriesFilterProvider } from "WorkItemTracking/Scripts/Queries/QueriesFilterProvider";
export class FolderQueriesFilterProvider extends QueriesFilterProvider {
    protected createSearchableObjects(items: QueryHierarchyItem[] | RenamedQueryItem[]): SearchableObject<string>[] {
        const searchableObjects: SearchableObject<string>[] = [];

        for (const item of items) {
            const searchableObject = new SearchableObject(item.id, []);
            searchableObject.addTerm(item.name);
            searchableObjects.push(searchableObject);
        }

        return searchableObjects;
    }
}
