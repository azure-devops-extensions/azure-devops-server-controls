import { SearchableObject, IndexedSearchStrategy } from "VSS/Search";
import { QueryFavorite } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { IQueryHierarchyItemDataProvider } from "WorkItemTracking/Scripts/Queries/Stores/QueryHierarchyItemStore";
import { QueriesFilterProvider } from "WorkItemTracking/Scripts/Queries/QueriesFilterProvider";

export class FavoriteQueriesFilterProvider extends QueriesFilterProvider {
    constructor(private queryHierarchyItemDataProvider: IQueryHierarchyItemDataProvider) {
        super();
    }

    protected createSearchableObjects(favorites: QueryFavorite[]): SearchableObject<string>[] {
        const searchableObjects: SearchableObject<string>[] = [];

        // Map of processed artifacts so we don't add the same one twice
        let processedArtifactIds: IDictionaryStringTo<boolean> = {};

        for (const favorite of favorites) {
            if (!favorite.artifactName || favorite.isRemoved || favorite.artifactIsDeleted || processedArtifactIds[favorite.artifactId.toLowerCase()]) {
                continue;
            }

            let hierarchyItem = this.queryHierarchyItemDataProvider.getItem(favorite.artifactId);

            if (hierarchyItem) {
                processedArtifactIds[favorite.artifactId.toLowerCase()] = true;

                const searchableObject = new SearchableObject(favorite.artifactId, []);
                searchableObject.addTerm(hierarchyItem.name);

                searchableObjects.push(searchableObject);
            }
        }

        return searchableObjects;
    }
}
