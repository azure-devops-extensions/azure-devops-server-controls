import * as VSSStore from "VSS/Flux/Store";

import * as VCContracts from "TFS/VersionControl/Contracts";
import { PullRequestListSectionInfo } from "VersionControl/Scenarios/PullRequestList/PullRequestListDataModel";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { PullRequestFilterSearchCriteria } from "VersionControl/Scenarios/PullRequestList/PullRequestListFilter";
import { PullRequestListQueryCriteria } from "VersionControl/Scenarios/PullRequestList/PullRequestListQueryCriteria";
import * as FeatureAvailability_Services from "VSS/FeatureAvailability/Services";
import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as VCPullRequestsControls from "VersionControl/Scripts/Controls/PullRequest";

export interface TabInfo {
    tabId: string;
    sections: PullRequestListSectionInfo[];
    isDefault?: boolean;
}

export class TabsInfoStore extends VSSStore.Store {
    private _tabInfos: IDictionaryStringTo<TabInfo> = {};
    private _tfsContext: TfsContext;
    private _currentListFilterCriteria: PullRequestFilterSearchCriteria = {} as PullRequestFilterSearchCriteria;

    constructor(tfsContext: TfsContext) {
        super();
        this._tfsContext = tfsContext;
    }

    public onTabInfoUpdated(tabs: TabInfo[]) {
        tabs.forEach(tab => {
            this._tabInfos[tab.tabId] = tab;
        });

        this.emitChanged();
    }

    public onFilterCriteriaChanged(criteria: PullRequestFilterSearchCriteria) {
        if (this._currentListFilterCriteria !== criteria) {
            this._currentListFilterCriteria = criteria;
            this.emitChanged();
        }
    }

    public getSections(tabId: string): PullRequestListSectionInfo[] {
        const tabInfo = this._tabInfos[tabId];

        if (!tabInfo) {
            return [];
        }

        const query = new PullRequestListQueryCriteria(null, this._currentListFilterCriteria.creatorId || null, this._currentListFilterCriteria.reviewerId || null, null);
        if (this._queryCriteriaIsNotEmpty(query)) {
            // Apply the current query criteria to each section
            return tabInfo.sections.reduce(
                (filteredSections, section) => {
                    const criteria = this._mergeListQueryCriteria(tabId, section.criteria, query);
                    if (criteria) {
                        filteredSections.push({
                            criteria: criteria,
                            cssClass: section.cssClass
                        });
                    }
                    return filteredSections;
                },
                []);
        }

        return tabInfo.sections;
    }

    public getFilterCriteria(): PullRequestFilterSearchCriteria {
        return this._currentListFilterCriteria;
    }

    // Apply the user's selected search criteria on top of any pre-set values, such as on the 'MINE' tab, where the currently logged in user
    // is already being used as a search dimension
    private _mergeListQueryCriteria(tabId: string, originalCriteria: PullRequestListQueryCriteria, newCriteria: PullRequestListQueryCriteria): PullRequestListQueryCriteria {
        if ((originalCriteria.authorId && newCriteria.authorId && (originalCriteria.authorId !== newCriteria.authorId))
            || (originalCriteria.reviewerId && newCriteria.reviewerId) && (originalCriteria.reviewerId !== newCriteria.reviewerId)) {
            // If the filter is trying to search on the same dimension that this section is filtered on, and with a different value, then we want to simply omit it
            return null;
        }

        // Apply the user's selections, but don't overwrite the section's pre-set value (if any)
        const authorId = originalCriteria.authorId || newCriteria.authorId;
        const reviewerId = originalCriteria.reviewerId || newCriteria.reviewerId;

        return new PullRequestListQueryCriteria(originalCriteria.status, authorId, reviewerId, originalCriteria.criteriaTitle, originalCriteria.clientFilter, "CustomFilter");
    }

    private _queryCriteriaIsNotEmpty(criteria: PullRequestListQueryCriteria) {
        return criteria && (criteria.authorId || criteria.reviewerId);
    }

    public isTabSupported(tabId: string): boolean {
        return !!this._tabInfos[tabId];
    }

    public isDefaultTab(tabId: string): boolean {
        const tabInfo = this._tabInfos[tabId];
        return Boolean(tabInfo && tabInfo.isDefault);
    }
}
