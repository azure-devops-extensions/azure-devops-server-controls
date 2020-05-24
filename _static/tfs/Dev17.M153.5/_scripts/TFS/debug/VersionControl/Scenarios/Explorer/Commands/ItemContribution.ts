import { ContributableMenuItemProvider } from "VSSPreview/Providers/ContributableMenuItemProvider";

import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export namespace ContributionNames {
    export const item = "ms.vss-code-web.source-item-menu";
    export const treeItem = "ms.vss-code-web.source-tree-item-menu";
    export const gridItem = "ms.vss-code-web.source-grid-item-menu";
}

export function getFilesItemProvider(
    item: ItemModel,
    versionSpec: VersionSpec,
    repositoryContext: RepositoryContext,
    extraContributionName?: string,
): ContributableMenuItemProvider<any> {
    const isGit = repositoryContext.getRepositoryType() === RepositoryType.Git;

    const actionContext = {
        gitRepository: isGit ? repositoryContext.getRepository() : null,
        item: {
            sourceProvider: isGit ? "Git" : "Tfvc",
            path: item.serverItem,
            url: item.url,
            isFolder: item.isFolder,
            isSymLink: item.isSymLink,
            item,
            _links: null,
            content: null,
            contentMetadata: null,
        },
        version: versionSpec.toDisplayText(),
    };

    return new ContributableMenuItemProvider(
        [ContributionNames.item, extraContributionName],
        {
            // COMPAT In the old explorer, Tree provided a getSourceItemContext method,
            // while Grid provided directly the object with properties (preferred way).
            // We're keeping both approaches here for backwards compatibility with existing extensions.
            getSourceItemContext: () => actionContext,
            ...actionContext,
        });
}
