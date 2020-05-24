import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");

import { ILinkedArtifactsCache, IInternalLinkedArtifactDisplayData  } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";

export class SimpleWorkItemArtifactCache implements ILinkedArtifactsCache {
    private static WORKITEM_RELATED_KEY: string = "linked-artifacts";

    private _workItem: WITOM.WorkItem;

    public setWorkItem(workItem: WITOM.WorkItem) {
        this._workItem = workItem;
    }

    public clear() {
        this._setMapToWorkItem(null);
    }

    public set(key: string, value: IInternalLinkedArtifactDisplayData ) {
        let map = this._getMapFromWorkItem();
        if (!map) {
            map = {};
            this._setMapToWorkItem(map);
        }

        map[key] = value;
    }

    public get(key: string): IInternalLinkedArtifactDisplayData  {
        let map = this._getMapFromWorkItem();
        return map && map[key];
    }

    public invalidate(key: string) {
        let map = this._getMapFromWorkItem();
        if (map) {
            delete map[key];
        }
    }

    private _getMapFromWorkItem(): IDictionaryStringTo<IInternalLinkedArtifactDisplayData > {
        return this._workItem
            && this._workItem.relatedData[SimpleWorkItemArtifactCache.WORKITEM_RELATED_KEY] as IDictionaryStringTo<IInternalLinkedArtifactDisplayData >;
    }

    private _setMapToWorkItem(map: IDictionaryStringTo<IInternalLinkedArtifactDisplayData >) {
        if (this._workItem) {
            this._workItem.relatedData[SimpleWorkItemArtifactCache.WORKITEM_RELATED_KEY] = map;
        }
    }
}