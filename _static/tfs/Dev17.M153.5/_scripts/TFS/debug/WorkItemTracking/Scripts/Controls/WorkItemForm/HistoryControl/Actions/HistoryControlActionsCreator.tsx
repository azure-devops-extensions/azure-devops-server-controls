import HistoryControlActions = require("WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryControlActions");

import { IHistoryItem, IResolvedLink } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Interfaces";
import { ILinkedArtifactsCache, IHostArtifact, IColumn } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { LinkMapper, IMappedLink } from "WorkItemTracking/Scripts/Controls/Links/LinkMapper";
import { ArtifactResolver } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Logic/ArtifactResolver";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { HistoryUtils } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/HistoryUtils";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { EditActionSet } from "WorkItemTracking/Scripts/OM/History/EditActionSet";

/**
 * Actions associated with history control 
 */
export class HistoryControlActionsCreator {
    private _actionSet: HistoryControlActions.HistoryControlActionSet;
    private _cache: ILinkedArtifactsCache;
    private _artifactResolver: ArtifactResolver;
    private _tfsContext: TfsContext;

    private static DEFAULT_COLUMNS: IColumn[] = [
        { name: 'Id', refName: CoreFieldRefNames.Id },
        { name: 'Title', refName: CoreFieldRefNames.Title }
    ];

    constructor(actionSet: HistoryControlActions.HistoryControlActionSet, tfsContext: TfsContext, cache?: ILinkedArtifactsCache) {
        this._actionSet = actionSet;
        this._cache = cache;
        this._tfsContext = tfsContext;
        this._artifactResolver = ArtifactResolver.getInstance();
    }

    public toggleGroup(groupIndex: number, isCollapsed: boolean) {
        this._actionSet.toggleGroup().invoke({
            groupIndex: groupIndex,
            isCollapsed: isCollapsed
        });
    }

    public selectHistoryItem(itemId: number) {
        this._actionSet.historyItemSelected().invoke(itemId);
    }

    public selectPreviousItem(offset?: number) {
        this._actionSet.selectPreviousItem().invoke(offset);
    }

    public selectNextItem(offset?: number) {
        this._actionSet.selectNextItem().invoke(offset);
    }

    public selectFirstItem(offset?: number) {
        this._actionSet.selectFirstItem().invoke({});
    }

    public selectLastItem(offset?: number) {
        this._actionSet.selectLastItem().invoke({});
    }

    public forceFocusSelectedItem() {
        this._actionSet.forceFocusSelectedItem().invoke({});
    }

    public resolveLinks(item: IHistoryItem, actionSet: EditActionSet) {
        var workItem: WorkItem = item.workItem;
        let linkMapper = new LinkMapper(workItem.store);

        var linkChanges = actionSet.getLinkChanges();
        if (!linkChanges) {
            return;
        }

        var links = actionSet.getLinkChanges().map((linkChange) => item.workItem.allLinks[linkChange.index]);

        var mappedLinks: IMappedLink[] = linkMapper.mapLinks(links, false);
        let artifactLinks = mappedLinks.map(mL => mL.mappedLink);

        let hostArtifact: IHostArtifact = HistoryUtils.getHostArtifact(workItem);
        this._artifactResolver.resolveArtifacts(artifactLinks, HistoryControlActionsCreator.DEFAULT_COLUMNS, hostArtifact, this._tfsContext, null, this._cache)
            .then((result) => {
                let resolvedLinks: IResolvedLink[] = [];
                for (let i = 0; i < links.length; ++i) {
                    let link = links[i];
                    let artifactLink = artifactLinks[i];
                    let resolvedArtifact = result.resolvedArtifacts.filter((artifact) => {
                        return (artifactLink.tool == artifact.tool
                            && artifactLink.id === artifact.id
                            && artifactLink.type === artifact.type
                            && artifactLink.linkTypeDisplayName === artifact.linkTypeDisplayName);
                    });

                    // its possible that we could not resolve the artifact
                    let resolvedLink: IResolvedLink = {
                        editAction: linkChanges[i],
                        link: link,
                        resolvedArtifact: resolvedArtifact && resolvedArtifact[0],
                        artifactLink: artifactLink
                    };

                    resolvedLinks.push(resolvedLink);
                }

                this._actionSet.resolveLinks().invoke({
                    item: item,
                    resolvedLinks: resolvedLinks
                });
            },
            (reason) => {
                let resolvedLinks: IResolvedLink[] = links.map((link, i) => {
                    return {
                        editAction: linkChanges[i],
                        link: link,
                        resolvedArtifact: null,
                        artifactLink: artifactLinks[i]
                    }
                });

                this._actionSet.resolveLinks().invoke({
                    item: item,
                    resolvedLinks: resolvedLinks
                });
            });
    }
}
