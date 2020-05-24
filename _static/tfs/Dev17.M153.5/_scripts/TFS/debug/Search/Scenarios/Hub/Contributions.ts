export namespace ContributionIds {
    export const WikiContributionId = "ms.vss-wiki-search.wiki-entity-type";
    export const WikiOnPremContributionId = "ms.vss-wiki-searchonprem.wiki-entity-type";
	export const ExtensionStatusContributionId = "ms.vss-search-platform.code-search-extension-status-entity-type";
}

export const contributionIdToProviderContributionIdMap = {
    "ms.vss-code-search.code-entity-type": "ms.vss-search-platform.code-search-provider",
    "ms.vss-workitem-search.workitem-entity-type": "ms.vss-search-platform.workitem-search-provider",
    "ms.vss-workitem-searchonprem.workitem-entity-type": "ms.vss-search-platform.workitem-search-provider",
    "ms.vss-wiki-searchonprem.wiki-entity-type": "ms.vss-search-platform.wiki-search-provider",
    "ms.vss-wiki-search.wiki-entity-type": "ms.vss-search-platform.wiki-search-provider",
    "ms.vss-search-platform.code-search-extension-status-entity-type": "ms.vss-search-platform.code-search-extension-status-provider"
};