import * as Utils_String from "VSS/Utils/String";
import {
    ActionAdapter,
    CompactMode,
    IItem,
    Node,
    TreeStore,
} from "Presentation/Scripts/TFS/Stores/TreeStore";
import {WikiPage} from "TFS/Wiki/Contracts";
import {combinePaths} from "VersionControl/Scripts/VersionControlPath";

export function treeNodeSortOrderDecider(parentPath: string, page1: Node | string, page2: Node | string, allPages: IDictionaryStringTo<WikiPage>): number {
    const page1Title = page1 instanceof Node ? page1.name : page1;
    const page2Title = page2 instanceof Node ? page2.name : page2;
    let page1FullPath: string = "";
    let page2FullPath: string = "";

    if (parentPath || page1Title) {
        page1FullPath = combinePaths(parentPath, page1Title);
    }

    if (parentPath || page2Title) {
        page2FullPath = combinePaths(parentPath, page2Title);
    }

    const wikiPage1: WikiPage = allPages[page1FullPath];
    const wikiPage2: WikiPage = allPages[page2FullPath];

    if (!wikiPage1 || !wikiPage2) {
        return Utils_String.localeIgnoreCaseComparer(page1Title, page2Title);
    }

    return (wikiPage1.order || 0) - (wikiPage2.order || 0);
}

export function filteredTreeNodeCompactModeDecider(node: Node, depth: number, filterText: string): boolean {
    if (depth == 0) {
        return false;
    }

    if (!node) {
        return true;
    }
    
    // don't compact the node if it contains the matching text.
    if (node.name && Utils_String.caseInsensitiveContains(node.name, filterText)) {
        return false;
    }

    // don't compact the node, if it has items
    if (node.itemCount() > 0) {
        return false;
    }

    // don't compact the node if its sub folders contains the matching text
    if (node.folderCount() > 0) {
		return node.folders.every(subNode => !Utils_String.caseInsensitiveContains(subNode.name, filterText));
    }

    return true;
}
