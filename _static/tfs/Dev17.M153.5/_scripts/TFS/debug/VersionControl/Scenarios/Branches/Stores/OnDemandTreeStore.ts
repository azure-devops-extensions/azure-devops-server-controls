import * as Branch from "VersionControl/Scenarios/Branches/Actions/Branch";
import * as SmartTree from "Presentation/Scripts/TFS/Stores/TreeStore";
import {Callback} from "Presentation/Scripts/TFS/Stores/Callback";
import * as Utils_String from "VSS/Utils/String";
import { HasMore } from "VersionControl/Scenarios/Branches/Components/BranchesUtils";

/**
 * Add an event for handling ondemand loading calls
 */
export interface IActionAdapterOnDemand extends SmartTree.IActionAdapter {
    /** Invoke when we want to change the type of loading */
    ondemandLoading: Callback<boolean>;
    addRootHasMore: Callback<boolean>;
}

export class OnDemandActionAdapter extends SmartTree.ActionAdapter implements IActionAdapterOnDemand {
    public ondemandLoading = new Callback<boolean>();
    public addRootHasMore = new Callback<boolean>();

    public dispose() {
        this.ondemandLoading.unregister();
        this.addRootHasMore.unregister();
        super.dispose();
    }
}

const HAS_MORE_PLACEHOLDER_BRANCH = "zzzz.._HAS_MORE";
const HAS_MORE_PLACEHOLDER_BRANCH_LOADING = "zzzz.._HAS_MORE_LOADING";

export interface IOnDemandStoreOptions extends SmartTree.ITreeStoreOptions {
    /**
     * The action adapter to wire the store up to.
     */
    adapter: IActionAdapterOnDemand;
    onFolderExpandedCallback(folderName: string, folderPage: number): IPromise<boolean>;
}

enum State {
    Loaded,
    Loading,
    MoreAvailable
}

export class OnDemandStore extends SmartTree.TreeStore {
    private _ondemandLoading: boolean;
    private _folderStateMap: { [key: string]: State; } = {};
    private _requestCountForFolderMap: { [key: string]: number; } = {};
    private _extendedOptions: IOnDemandStoreOptions;
    private _extendedAdapter: any;
    private _extendedSource: any;

    constructor(options: IOnDemandStoreOptions) {
        super(options);
        this._ondemandLoading = false;
        this._extendedOptions = options;

        // Wire up the adapter to the event processors.
        this._extendedAdapter = this._extendedOptions.adapter;
        this._extendedSource = this._extendedOptions.onFolderExpandedCallback;
        this._extendedAdapter.ondemandLoading.register(this._setOnDemandLoading, this);
        this._extendedAdapter.addRootHasMore.register(this._addRootHasMore, this);
    }

    public dispose() {
        if (this._extendedAdapter) {
            if (this._extendedAdapter.dispose) {
                this._extendedAdapter.dispose();
            }
        }
        this._extendedAdapter = null;
        this._extendedOptions = null;
        super.dispose();
    }
    /**
     * Sets Loading Status
     */
    private _setOnDemandLoading(setting: boolean) {
        this._ondemandLoading = setting;
    }

    /**
     * Adds "Has More" button placeholder at Root Level
     * @param setting
     */
    private _addRootHasMore(setting: boolean) {
        if (setting) {
            this._addItem(HAS_MORE_PLACEHOLDER_BRANCH);
        }
    }

    public static getHasMore(branchName: string): HasMore {
        return {
            isHasMore: Utils_String.endsWith(branchName, HAS_MORE_PLACEHOLDER_BRANCH) || Utils_String.endsWith(branchName, HAS_MORE_PLACEHOLDER_BRANCH_LOADING),
            expanding: Utils_String.endsWith(branchName, HAS_MORE_PLACEHOLDER_BRANCH_LOADING)
        } as HasMore;
    }

    public static getHasMoreFolderRef(ref: SmartTree.IItem): SmartTree.IItem {
        const refFullName: string = ref.fullName;
        const folderName: string = (Utils_String.localeComparer(refFullName, HAS_MORE_PLACEHOLDER_BRANCH) === 0) ? "" : refFullName.substring(0, refFullName.length - (HAS_MORE_PLACEHOLDER_BRANCH.length + 1));
        return {
            name: ref.name,
            fullName: folderName,
            isFolder: ref.isFolder,
            depth: ref.depth,
            expanded: ref.expanded,
            expanding: ref.expanding
        } as SmartTree.Item;
    }

    /**
    * Sets Loading Status
    * 
    *  Handles multiple conditions:
    *
    *  _ondemandLoading 
    *       Client only downloaded enough information to show folders 
    *       Perform an async request per folder
    *  this._folderStateMap[folderName] == State.MoreAvailable : 
    *       Client downloaded partial information for a  folder and shows a "Has More" Button
    *       Perform an async request to get more data for a specific folder
    */
    protected _onFolderExpanded(folderName: string) {
        if (this._ondemandLoading) {

            //Make a request for more branches
            if (!this._folderStateMap[folderName] || this._folderStateMap[folderName] === State.MoreAvailable) {

                this._folderStateMap[folderName] = State.Loading;

                const buttonPlaceholder: string = folderName ? folderName + "/" + HAS_MORE_PLACEHOLDER_BRANCH : HAS_MORE_PLACEHOLDER_BRANCH;
                const inProgressPlaceholder: string = folderName ? folderName + "/" + HAS_MORE_PLACEHOLDER_BRANCH_LOADING : HAS_MORE_PLACEHOLDER_BRANCH_LOADING;
                super._removeItem(buttonPlaceholder);
                super._addItem(inProgressPlaceholder);

                //update the count for requesting "Has More" data
                this._requestCountForFolderMap[folderName] = this._requestCountForFolderMap[folderName] ? ++this._requestCountForFolderMap[folderName] : 1;
                if (!folderName && this._requestCountForFolderMap[folderName] === 1) {
                    ++this._requestCountForFolderMap[folderName];
                }

                this._extendedSource(folderName, this._requestCountForFolderMap[folderName]).then((result) => {
                    super._removeItem(inProgressPlaceholder);

                    //If result is true we have more branches availbile
                    if (result) {
                        super._addItem(buttonPlaceholder);
                        this._folderStateMap[folderName] = State.MoreAvailable;
                    }
                    else {
                        super._removeItem(buttonPlaceholder);
                        this._folderStateMap[folderName] = State.Loaded;
                    }

                    //Expand and emit changes
                    if (folderName) {
                        super._onFolderExpanded(folderName);
                    }

                    this.emitIfPending();
                });
            }
            //If the data is already loaded just expand the node
            else if (this._folderStateMap[folderName] === State.Loaded) {
                super._onFolderExpanded(folderName);
            }
        }
        else {
            super._onFolderExpanded(folderName);
        }

        this.emitIfPending();
    }
}
