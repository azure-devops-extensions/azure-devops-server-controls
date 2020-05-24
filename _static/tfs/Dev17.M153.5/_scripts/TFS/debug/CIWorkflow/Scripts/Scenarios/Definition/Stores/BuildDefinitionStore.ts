import { PathSeparator, normalizeSeparators } from "CIWorkflow/Scripts/Common/PathUtils";
import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { BuildDefinitionStoreKeys, TabKeyConstants, RetentionInstanceId } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { Store } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";
import { BuildCompletionTriggerStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildCompletionTriggerStore";
import { BuildJobStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildJobStore";
import { BuildOptionsListStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildOptionsListStore";
import { CoreDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/CoreDefinitionStore";
import { DraftsStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/DraftsStore";
import { DtcAdapterStore, IDtcAdapterStoreArgs } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/DtcAdapterStore";
import { GatedCheckInStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/GatedCheckInStore";
import { ProcessResourcesStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/ProcessResourcesStore";
import { PullRequestTriggerStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/PullRequestTriggerStore";
import { RetentionPolicyListStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/RetentionPolicyListStore";
import { ScheduledTriggerStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/ScheduledTriggerStore";
import { SourceProvidersStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourceProvidersStore";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { TriggersStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TriggersStore";
import { VersionControlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStore";
import { YamlDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/YamlDefinitionStore";
import { TfGitStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TfGitStore";
import { TfvcStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TfvcStore";
import { SubversionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SubversionStore";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { HistoryStore } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { AgentPoolQueue, BuildDefinition } from "TFS/Build/Contracts";

import * as Utils_String from "VSS/Utils/String";
import { Constants } from "VSS/Utils/UI";

export interface IBuildStatusUrls {
    currentStatusBadgeUrl: string;
    statusBadgeUrl: string;
    latestBuildUrl: string;
}

/**
 * @brief Store for Build Definition work-flow
 */
export class BuildDefinitionStore extends Store {
    private _stores: Store[];
    private _dtcAdapterStore: DtcAdapterStore;
    private _tabToStoreMap: IDictionaryStringTo<Store[]>;
    private _actions: Actions.BuildDefinitionActions;
    private _buildDefinition: BuildDefinition;
    private _coreDefinitionStore: CoreDefinitionStore;

    constructor() {
        super();
        this._stores = [];
        this._tabToStoreMap = {};
    }

    /**
     * @returns Unique key to the store
     */
    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_BuildDefinitionStore;
    }

    /**
     * @brief Initializing the Store
     * - Creating and adding stores to store-list
     * - Initialize action listeners
     */
    public initialize(): void {
        this._coreDefinitionStore = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore);
        // Create the dtc adapter store with queueId = 0, the proper queueId will be updated through ActionCreators
        this._dtcAdapterStore = StoreManager.CreateStore<DtcAdapterStore, IDtcAdapterStoreArgs>(DtcAdapterStore, null, { defaultQueueId: 0 });
        const draftsStore = StoreManager.GetStore<DraftsStore>(DraftsStore);

        this._tabToStoreMap[TabKeyConstants.Tasks] = [
            this._coreDefinitionStore,
            StoreManager.GetStore<ProcessResourcesStore>(ProcessResourcesStore),
            StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore),
            StoreManager.GetStore<SourceProvidersStore>(SourceProvidersStore),
            StoreManager.GetStore<VersionControlStore>(VersionControlStore),
            StoreManager.GetStore<YamlDefinitionStore>(YamlDefinitionStore)
        ];
        this._tabToStoreMap[TabKeyConstants.Triggers] = [
            StoreManager.GetStore<TriggersStore>(TriggersStore),
            StoreManager.GetStore<ScheduledTriggerStore>(ScheduledTriggerStore),
            StoreManager.GetStore<BuildCompletionTriggerStore>(BuildCompletionTriggerStore),
            StoreManager.GetStore<GatedCheckInStore>(GatedCheckInStore),
            StoreManager.GetStore<PullRequestTriggerStore>(PullRequestTriggerStore)
        ];
        this._tabToStoreMap[TabKeyConstants.Options] = [
            StoreManager.GetStore<BuildJobStore>(BuildJobStore),
            StoreManager.GetStore<BuildOptionsListStore>(BuildOptionsListStore)
        ];
        this._tabToStoreMap[TabKeyConstants.Retention] = [
            StoreManager.GetStore<RetentionPolicyListStore>(RetentionPolicyListStore, RetentionInstanceId)
        ];
        this._stores = this._tabToStoreMap[TabKeyConstants.Tasks]
            .concat(this._tabToStoreMap[TabKeyConstants.Triggers])
            .concat(this._tabToStoreMap[TabKeyConstants.Options])
            .concat(this._tabToStoreMap[TabKeyConstants.Retention]);
        this._stores.push(this._dtcAdapterStore);
        this._stores.push(draftsStore);

        // Initialize history store
        StoreManager.GetStore<HistoryStore>(HistoryStore);

        // Initialize stores that rely on getting the build created action
        StoreManager.GetStore<TfGitStore>(TfGitStore);
        StoreManager.GetStore<TfvcStore>(TfvcStore);
        StoreManager.GetStore<SubversionStore>(SubversionStore);

        this._actions = ActionsHubManager.GetActionsHub<Actions.BuildDefinitionActions>(Actions.BuildDefinitionActions);
        this._initializeActionListeners();
    }

    public getTabIsValid(tabKey: string): boolean {
        if (tabKey in this._tabToStoreMap) {
            for (const store of this._tabToStoreMap[tabKey]) {
                if (!store.isValid()) {
                    return false;
                }
            }
        }

        return this._dtcAdapterStore.getTabIsValid(tabKey);
    }

    /**
     * @brief updates the visiting Build definition contract object
     * @param {BuildDefinition} buildDefinition
     * @returns BuildDefinition
     */
    public updateVisitor(buildDefinition: BuildDefinition): BuildDefinition {
        return buildDefinition;
    }

    public isDirty(): boolean {
        let isDirty = false;
        this._stores.forEach((store: Store) => {
            if (store.isDirty()) {
                isDirty = true;
                return;
            }
        });

        return isDirty;
    }

    public isProcessParameterStoreDirty(): boolean {
        return this._dtcAdapterStore.isProcessParameterStoreDirty();
    }

    public isValid(): boolean {
        let isValid = true;
        this._stores.forEach((store: Store) => {
            if (!store.isValid()) {
                isValid = false;
                return;
            }
        });

        return isValid;
    }

    public getDefaultTaskAgentQueue(): AgentPoolQueue {
        return this._buildDefinition.queue;
    }

    /**
     * @brief gets the build definition after getting extracted from all stores in the store-list
     * @returns BuildDefinition
     */
    public getBuildDefinition(): BuildDefinition {
        return this._extractDefinition();
    }

    /**
     * @brief gets the clone id
     * @returns cloneId
     */
    public getCloneId(): number {
        return this._coreDefinitionStore.getState().cloneId;
    }

    /**
     * @brief gets the clone revision
     * @returns cloneRevision
     */
    public getCloneRevision(): number {
        return this._coreDefinitionStore.getState().cloneRevision;
    }

    /**
     * @returns stores list
     */
    public getStoreList(): Store[] {
        return this._stores;
    }

    public getPhaseInstanceIds(): string[] {
        return this._dtcAdapterStore.getPhaseInstanceIds();
    }

    public getBuildStatusUrls(): IBuildStatusUrls {
        const coreDefinition = this._coreDefinitionStore.getState();
        const name = coreDefinition.name;
        const originalName = this._coreDefinitionStore.getPreviousName();

        let path = PathSeparator;
        if (coreDefinition.folderPath) {
            path = normalizeSeparators(coreDefinition.folderPath);

            const indexOfPathSeparator = path ? path.lastIndexOf(PathSeparator) : -1;

            // EndsWith not supported in IE11
            if (indexOfPathSeparator !== (path.length - PathSeparator.length)){
                path += PathSeparator;
            }
        }

        const tfsContext = TfsContext.getDefault();
        const hostUrl = tfsContext.getHostUrl();
        const collectionPath = tfsContext.getServiceHostUrl();
        const projectName = tfsContext.navigation.project;

        const root = hostUrl + collectionPath + projectName;
        const apiRoot = root + "/_apis/build";
        const buildRoot = root + "/_build";

        const currentStatusBadgeUrl = encodeURI(apiRoot + "/status" + path + (originalName !== Utils_String.empty ? originalName : name));
        const statusBadgeUrl = encodeURI(apiRoot + "/status" + path + name);
        const latestBuildUrl = encodeURI(buildRoot + "/latest?definitionId=" + coreDefinition.id);

        return {
            currentStatusBadgeUrl,
            statusBadgeUrl,
            latestBuildUrl
        };
    }

    protected disposeInternal(): void {
        this._actions.createBuildDefinition.removeListener(this._handleCreateAndUpdateBuildDefinition);
        this._actions.updateBuildDefinition.removeListener(this._handleCreateAndUpdateBuildDefinition);
        this._stores = [];
    }

    private _getCurrentStatusBadgeUrl(): string {
        if (this._buildDefinition && this._buildDefinition.id !== -1) {
            const links = this._buildDefinition._links;
            if (links && links.badge && links.badge.href) {
                return links.badge.href.toString();
            }
        }

        return Utils_String.empty;
    }

    /**
     * @brief Initializes Action Listeners for Build Definition work-flow
     */
    private _initializeActionListeners(): void {
        this._actions.createBuildDefinition.addListener(this._handleCreateAndUpdateBuildDefinition);
        this._actions.updateBuildDefinition.addListener(this._handleCreateAndUpdateBuildDefinition);
    }

    private _handleCreateAndUpdateBuildDefinition = (definition: BuildDefinition) => {
        this._buildDefinition = definition;
        this.emitChanged();
    }

    /**
     * @brief The method will loop through model-list and call updateBuildDefinition method of each.
     *        The model's updateBuildDefinition method will update the definition data-structure appropriately.
     * @returns BuildDefinition
     */
    private _extractDefinition(): BuildDefinition {
        this._buildDefinition = JQueryWrapper.extendDeep({}, this._buildDefinition);
        this._stores.forEach((store: Store) => {
            store.updateVisitor(this._buildDefinition);
        });

        return this._buildDefinition;
    }
}

export enum CreateDefinitionPages {
    GetSources = 1,
    SelectTemplate
}
