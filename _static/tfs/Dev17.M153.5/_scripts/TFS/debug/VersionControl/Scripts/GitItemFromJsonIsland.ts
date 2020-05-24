import Contribution_Services = require("VSS/Contributions/Services");
import Serialization = require("VSS/Serialization");
import Service = require("VSS/Service");

import VCContracts = require("TFS/VersionControl/Contracts");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import Utils_Array = require("VSS/Utils/Array");

/**
 * New islands should be registered here by specifying the strings to the emitted page data keys
 */

interface GitItemJsonIslandKeys {
    pathToItemsKey: string;
    itemsDescriptorKey: string;
    itemsDetailsOptionsKey: string;
}

interface GitItemJsonIsland {
    pathToItems: { [index: string]: VCContracts.GitItem[] };
    itemsDescriptor: VCContracts.GitItemDescriptor;
    itemsDetailsOptions: VCLegacyContracts.ItemDetailsOptions;
}

/**
 * Allows registration of a JSON island that contains GitItem objects that are to be used on 
 * page load. This is NOT a caching mechanism, as GitItem instances can only be retrieved 
 * from this interface once and then will be unavailable. 
 */
export class GitItemFromJsonIsland {
    /**
     * The total number of items that were seeded onto the page, including all child items.
     */
    private static _seededItemCount = 0;

    public static get seededItemCount() {
        this.initializeSeededDataIfNecessary();
        return this._seededItemCount;
    }
    
    /**
     * For each given path on a given branch (version), fetch the corresponding GitItem[].
     * Maintains the same order as the order of the paths provided, and once retrieved, will 
     * no longer be available through this function.
     */
    public static getGitItems(
        itemsToGet: { path: string, version: string }[],
        detailsOptions: VCLegacyContracts.ItemDetailsOptions
    ): VCContracts.GitItem[][] {
        this.initializeSeededDataIfNecessary();
        
        // Check each island to see if it is seeding the data we want
        for (const island of this.islands) {
            const result = this.getGitItemsFromIsland(island, itemsToGet, detailsOptions);
            if (result) {
                return result;
            }
        }

        return null;
    }
    
    private static islands: GitItemJsonIsland[] = [];
    private static initialized = false;

    private static initializeSeededDataIfNecessary() {
        if (!this.initialized) {
            const contributionService = Service.getService(Contribution_Services.WebPageDataService);
            const result = contributionService.getPageData<any>("ms.vss-code-web.source-explorer-tree-file-listing-data-provider");
            if (result && result.items && result.items.items) {
                this.islands.push({
                    pathToItems: Serialization.ContractSerializer.deserialize(result.items.items, VCContracts.TypeInfo.GitPathToItemsCollection),
                    itemsDescriptor: Serialization.ContractSerializer.deserialize(result.descriptor, VCContracts.TypeInfo.GitItemDescriptor),
                    itemsDetailsOptions: Serialization.ContractSerializer.deserialize(result.detailsOptions, VCLegacyContracts.TypeInfo.ItemDetailsOptions)
                });
            }

            for (const island of this.islands) {
                for (const key in island.pathToItems) {
                    GitItemFromJsonIsland._seededItemCount += island.pathToItems[key].length;
                }
            }

            this.initialized = true;
        }
    }

    private static getGitItemsFromIsland(
        island: GitItemJsonIsland,
        itemsToGet: { path: string, version: string }[],
        detailsOptions: VCLegacyContracts.ItemDetailsOptions
    ): VCContracts.GitItem[][] {

        const result: VCContracts.GitItem[][] = [];

        const detailsOptionsMatch = (typeof detailsOptions.includeContentMetadata === "undefined" || island.itemsDetailsOptions.includeContentMetadata === detailsOptions.includeContentMetadata)
            && (typeof detailsOptions.recursionLevel === "undefined" || island.itemsDetailsOptions.recursionLevel === detailsOptions.recursionLevel);

        if (detailsOptionsMatch
            && island.itemsDescriptor.versionOptions === VCContracts.GitVersionOptions.None) {

            itemsToGet.forEach(item => {
                const version = item.version;
                const path = item.path || "/";

                if (island.pathToItems[path]) {
                    const versionSpec = VCSpecs.VersionSpec.parse(item.version);
                    if ((versionSpec instanceof VCSpecs.GitBranchVersionSpec && island.itemsDescriptor.version === versionSpec.branchName)
                            || (versionSpec instanceof VCSpecs.GitCommitVersionSpec && island.itemsDescriptor.version === versionSpec.commitId)
                            || (versionSpec instanceof VCSpecs.GitTagVersionSpec && island.itemsDescriptor.version === versionSpec.tagName)) {
                        const items = island.pathToItems[path];
                        result.push(items);
                    }
                }
            })
        }
        
        // Found everything we need... which is all or nothing for now.  Could be 
        // more efficient with more code but having a slimmer network call to fetch 
        // a subset of items isn't worth it
        if (result.length === itemsToGet.length) {
            // Remove paths that we're about to return from the island
            result.forEach(items => {
                items.forEach(item => {
                    delete island.pathToItems[item.path]
                })
            })
            
            // Remove islands that have no more paths
            if (Object.keys(island.pathToItems).length === 0) {
                Utils_Array.remove(this.islands, island);
            }

            return result;
        }
        else {
            return null;
        }
    }
}