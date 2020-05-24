import { SearchableObject, IndexedSearchStrategy } from "VSS/Search";
import { TabRowPlanData } from "ScaledAgile/Scripts/PlanHub/Models/TabRowPlanData";

export class PlanHubIndexedSearchStrategy {
    private _searchStrategy: IndexedSearchStrategy<string>;

    constructor() {
        this._searchStrategy = new IndexedSearchStrategy<string>(
            null,
            {
                specialCharacters: [],
                delimiter: /[\s\\/]/
            });

        this.setItems([]);
    }

    /**
     * Set the filter text, which will search.
     * @param {string} filterText the input search term
     */
    public setFilterText(filterText: string): string[] {
        return this._searchStrategy.search(filterText);
    }

    /**
     * Set the items to be indexed, searchable objects are created for name, description, and created by.
     * @param {TabRowPlanData[]} items the plans to be indexed
     */
    public setItems(items: TabRowPlanData[]) {
        this._searchStrategy.processItems(this._createSearchableObjects(items));
    }

    private _createSearchableObjects(plans: TabRowPlanData[]): SearchableObject<string>[] {
        const searchableObjects: SearchableObject<string>[] = [];

        for (var i = 0; i < plans.length; i++) {
            const plan = plans[i];
            const searchableObject = new SearchableObject(plan.id, []);

            searchableObject.addTerm(plan.name);
            if (plan.description) {
                searchableObject.addTerm(plan.description);
            }
            if (plan.createdByIdentity && plan.createdByIdentity.displayName) {
                searchableObject.addTerm(plan.createdByIdentity.displayName);
            }
            searchableObjects.push(searchableObject);
        }

        return searchableObjects;
    }
}
