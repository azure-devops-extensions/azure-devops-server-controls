import * as _AgileCommon from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { SparseTreeStore, ITreeItem } from "Search/Scenarios/Shared/Base/Stores/SparseTreeStore";
import { ActionAdapter, CompactMode } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { AreaNodeRetrievedPayload } from "Search/Scenarios/WorkItem/Flux/ActionsHub";
import { AreaNodePathSeparator } from "Search/Scenarios/WorkItem/Constants";

export class AreaNodeTreeFilterStore extends SparseTreeStore {
    constructor(adapter: ActionAdapter) {
        super({
            adapter,
            separator: AreaNodePathSeparator,
            isDeferEmitChangedMode: true,
            keepEmptyFolders: false,
            getLookupName: name => name.toLowerCase(),
            canCompactNodeIntoChild: CompactMode.none
        });
    }

    public onAreaNodeRetrieved = (payload: AreaNodeRetrievedPayload): void => {        
        const { areaNode } = payload;
        if (areaNode) {
            const areaPaths = extractPaths(areaNode);
            this.init(areaPaths, true, this._state.defaultPath);
        }
    }
}

function extractPaths(node: _AgileCommon.INode, parentPath?: string): { [id: string]: ITreeItem } {
    const nodePath = parentPath ? `${parentPath}${AreaNodePathSeparator}${node.name}` : node.name;
    let paths = {};
    if (node.children) {
        for (const childItem of node.children) {
            paths = { ...paths, ...extractPaths(childItem, nodePath) };
        }
    }

    paths[nodePath] = { path: nodePath, isLeafNode: node.children.length <= 0, name: node.name };

    return paths;
}