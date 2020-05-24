import { autobind } from "OfficeFabric/Utilities";

import {
    ActionAdapter,
    CompactMode,
    TreeStore,
} from "Presentation/Scripts/TFS/Stores/TreeStore";
import { WikiPage } from "TFS/Wiki/Contracts";

import { treeNodeSortOrderDecider } from "Wiki/Scripts/WikiTreeHelper";
import { ActionsHub, AllPagesRetrievalSucceededPayload, SubPagesAddedPayload } from "Wiki/Scenarios/Integration/PagePicker/ActionsHub";
import { WikiPagesState, WikiPagesStore } from "Wiki/Scenarios/Overview/Stores/WikiPagesStore";
import { WikiTreeAdapter } from "Wiki/Scenarios/Overview/Stores/WikiTreeAdapter";

export interface AggregateState {
    wikiPagesState: WikiPagesState;
}

export class StoresHub implements IDisposable {
    public treeStore: TreeStore;
    public wikiPagesStore: WikiPagesStore;

    private _wikiTreeAdapter: WikiTreeAdapter;

    constructor(private _actionsHub: ActionsHub) {
        this.wikiPagesStore = this._createWikiPagesStore();
        this.treeStore = this._createTreeStore();
    }

    public dispose(): void {
        this._disposeTreeStore();
        this._disposeWikiPagesStore();
    }

    public getState = (): AggregateState => {
        return {
            wikiPagesState: this.wikiPagesStore.state
        }
    }

    private _createWikiPagesStore(): WikiPagesStore {
        const wikiPagesStore = new WikiPagesStore();

        this._actionsHub.allPagesRetrievalSucceeded.addListener(wikiPagesStore.loadAllPages);
        
        return wikiPagesStore;
    }

    private _disposeWikiPagesStore(): void {
        if (!this.wikiPagesStore) {
            return;
        }

        this._actionsHub.allPagesRetrievalSucceeded.removeListener(this.wikiPagesStore.loadAllPages);
        
        this.wikiPagesStore = null;
    }

    private _createTreeStore(): TreeStore {
        this._wikiTreeAdapter = new WikiTreeAdapter();

        this._actionsHub.pageChanged.addListener(this._onPageChanged);
		this._actionsHub.allPagesRetrievalSucceeded.addListener(this._onAllPagesRetrievalSucceeded);
		this._actionsHub.subPagesAdded.addListener(this._onSubPagesAdded);
        this._actionsHub.pageExpanding.addListener(this._onTreeItemExpanding);
        this._actionsHub.pageExpanded.addListener(this._onTreeItemExpanded);
        this._actionsHub.pageCollapsed.addListener(this._onTreeItemCollapsed);
        
        return new TreeStore({
            adapter: this._wikiTreeAdapter,
            isDeferEmitChangedMode: true,
            keepEmptyFolders: true,
            canCompactNodeIntoChild: CompactMode.none,
            compareChildren: (parentPath, page1, page2) => {
                return treeNodeSortOrderDecider(parentPath, page1, page2, this.wikiPagesStore.state.wikiPages);
            },
        });
    }

    private _disposeTreeStore(): void {
        if (this._wikiTreeAdapter) {
            this._actionsHub.pageChanged.removeListener(this._onPageChanged);
			this._actionsHub.allPagesRetrievalSucceeded.removeListener(this._onAllPagesRetrievalSucceeded);
			this._actionsHub.subPagesAdded.removeListener(this._onSubPagesAdded);
            this._actionsHub.pageExpanding.removeListener(this._onTreeItemExpanding);
            this._actionsHub.pageExpanded.removeListener(this._onTreeItemExpanded);
            this._actionsHub.pageCollapsed.removeListener(this._onTreeItemCollapsed);
            
            this._wikiTreeAdapter.dispose();
            this._wikiTreeAdapter = null;
        }

        if (this.treeStore) {
            this.treeStore.dispose();
            this.treeStore = null;
        }
    }

	@autobind
    private _onPageChanged(path: string): void {
        this._wikiTreeAdapter.selectPage(path, null);
    }

	@autobind
    private _onAllPagesRetrievalSucceeded(payload: AllPagesRetrievalSucceededPayload): void {
		this._wikiTreeAdapter.addSubPagesAndExpand(this._getConformantPages(payload.allPages), "/");
    }

	@autobind
	private _onSubPagesAdded(payload: SubPagesAddedPayload): void {
		this._wikiTreeAdapter.addSubPagesAndExpand(this._getConformantPages(payload.subPages), payload.parentPath);
    }

	@autobind
    private _onTreeItemExpanding(pagePath: string): void {
        this._wikiTreeAdapter.startExpand(pagePath);
    }

	@autobind
	private _onTreeItemExpanded(payload: SubPagesAddedPayload): void {
		this._wikiTreeAdapter.addSubPagesAndExpand(this._getConformantPages(payload.subPages), payload.parentPath);
    }

	@autobind
    private _onTreeItemCollapsed(pagePath: string): void {
        this._wikiTreeAdapter.collapse(pagePath);
    }

    private _getConformantPages(pages: WikiPage[]): WikiPage[] {
        return pages.filter(page => !this.wikiPagesStore.state.wikiPages[page.path].isNonConformant);
    }
}
