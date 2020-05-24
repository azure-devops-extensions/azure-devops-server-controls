import { AllBuildsActionHub, AllBuildsUpdatedPayload, getAllBuildsActionHub } from "Build/Scenarios/CI/AllBuilds/Actions/AllBuilds";
import { AllBuildsEventManager, getAllBuildsEventManager, AllBuildsEvents } from "Build/Scenarios/CI/AllBuilds/Events/AllBuildsEventManager";
import {
    IFilterData,
    isAscendingOrder,
    updateNavigationStateHistory,
    isBuildMatch
} from "Build/Scenarios/CI/AllBuilds/Common";
import * as AgentExistenceStore_NO_REQUIRE from "Build/Scripts/Stores/AgentExistence";

import {
    IAllBuildsStoreOptions,
    IAllBuildsProviderData
} from "./AllBuilds.types";

import { getSortedBuildsByTime, getBuildDateFunctionType } from "Build.Common/Scripts/BuildReference";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { Build, BuildStatus, BuildReference, BuildUpdatedEvent, TypeInfo, BuildDefinition, BuildDefinitionReference } from "TFS/Build/Contracts";

import { Store as BaseStore } from "VSS/Flux/Store";
import { arrayEquals, unique, subtract } from "VSS/Utils/Array";
import { using } from "VSS/VSS";
import { CINavigationService, getCINavigationService } from "../../../../Scripts/CI/Navigation";
import { ContributionActionHub, ContributionActionCreator, DataParser } from "../../../../Scripts/CI/Actions/Contribution";
import { RealtimeEvents } from "../../SignalRConstants";
import { ContributionKeys } from "../../Constants";
import { getCurrentBuildStatus, getBuildQueryOrder, BuildOrder, getCurrentDefinitionId } from "../Common";
import { ContractSerializer } from "VSS/Serialization";
import { CIDataProviderKeys } from "../../../../Scripts/Generated/TFS.Build.Plugins";
import { DefinitionPickerStore } from "./Filters/DefinitionPicker";

// We explictly mention the stores that this store is dependent on in the constructor so that all listeners for dependent stores are initialized first
export class AllBuildsStore extends BaseStore {
    private _contributionActionCreator: ContributionActionCreator<IAllBuildsProviderData>;
    private _contributionActionHub: ContributionActionHub<IAllBuildsProviderData>;

    private _navigationService: CINavigationService;

    private _tfsContext: TfsContext;

    private _builds: Build[] = [];
    private _definitionIds: number[] = [];
    private _favoriteDefintionIds: number[] = [];
    private _definitionById: IDictionaryNumberTo<BuildDefinitionReference> = {};

    //need to update to use store that is not shared
    private _agentExistenceStore: AgentExistenceStore_NO_REQUIRE.AgentExistenceStore;

    private _actionsHub: AllBuildsActionHub;

    private _eventManager: AllBuildsEventManager;

    private _agentInitialized: boolean = false;
    private _initializing: boolean = true;
    private _hasDefinitions: boolean = false;

    private _appliedFilter: IFilterData = {} as IFilterData;

    private _definitionPickerStore: DefinitionPickerStore;

    constructor(options: IAllBuildsStoreOptions) {
        super();

        this._contributionActionHub = options.contributionHub || new ContributionActionHub();
        this._contributionActionCreator = new ContributionActionCreator({
            actionHub: this._contributionActionHub,
            dataParser: this._dataParser
        });

        this._contributionActionHub.contributionDataAvailable.addListener(this._contributionDataAvailable);

        this._navigationService = options.navigationService || getCINavigationService();

        this._tfsContext = TfsContext.getDefault();

        this._actionsHub = getAllBuildsActionHub();

        this._eventManager = getAllBuildsEventManager();
        this._definitionPickerStore = options.definitionPickerStore;

        this._actionsHub.allBuildsUpdated.addListener((payload: AllBuildsUpdatedPayload) => {
            this._initializing = false;
            if (payload.filter) {
                this._appliedFilter = payload.filter;
                updateNavigationStateHistory(this._appliedFilter);
            }
            this._updateBuilds(payload.builds, payload.append)
        });

        this._eventManager.addNavigationStateChangedListener(() => {
            this.emitChanged();
        });

        options.signalRActionCreator.subscribeToEvents(this._navigationService.getProjectId(), [RealtimeEvents.BuildUpdate]);

        options.signalRActionHub.getEventPayloadAvailableAction<BuildUpdatedEvent>(RealtimeEvents.BuildUpdate).addListener(this._onBuildUpdateEvent);
    }

    public fetchData(refresh?: boolean) {
        this._contributionActionCreator.fetchContributionData(ContributionKeys.CIHubDataProviderId, undefined, refresh);
    }

    public dispose() {
        this._contributionActionHub.contributionDataAvailable.removeListener(this._contributionDataAvailable);
    }

    public getBuilds(): Build[] {
        return this._getSortedBuilds(this._builds);
    }

    public getAppliedFilter() {
        return this._appliedFilter;
    }

    
    public hasDefinitions(): boolean {
        return this._hasDefinitions;
    }
    

    public isInitializing(): boolean {
        return this._initializing;
    }

    public agents(): AgentExistenceStore_NO_REQUIRE.IAgents {
        if (this._agentExistenceStore) {
            return this._agentExistenceStore.agents();
        }

        if (!this._tfsContext.isHosted && !this._tfsContext.isDevfabric) {
            // initialize only for onprem
            this._initializeAgentStore();
        }
        else {
            this._agentInitialized = true;
        }

        return {
            exists: true,
            initialized: this._agentInitialized
        };
    }

    private _dataParser: DataParser<IAllBuildsProviderData> = (data) => {
        let providerData: IAllBuildsProviderData = {
            favorites: [],
            builds: [],
            definitions: [],
            continuationToken: ""
        };

        if (data) {
            providerData.favorites = (data.favorites || []) as BuildDefinitionReference[];
            providerData.definitions = (data.definitions || []) as BuildDefinitionReference[];
            providerData.builds = (data.builds || []) as Build[];
            providerData.continuationToken = (data.continuationToken || "");
        }

        return providerData;
    }

    private _onBuildUpdateEvent = (event: BuildUpdatedEvent) => {
        this._updateBuilds([event.build], true);
    }

    private _contributionDataAvailable = (data: IAllBuildsProviderData) => {
        if (data) {
            const buildStatus = getCurrentBuildStatus();
            const filter: IFilterData = {
                status: buildStatus,
                continuationToken: data.continuationToken,
                order: getBuildQueryOrder(buildStatus, BuildOrder.Descending),
                definitionId: getCurrentDefinitionId()
            }
            const builds: Build[] = ContractSerializer.deserialize(data.builds, TypeInfo.Build) || [];
            const definitions: BuildDefinition[] = ContractSerializer.deserialize(data.definitions, TypeInfo.BuildDefinitionReference) || [];
            
            this._builds = builds;
            this._initializing = false;
            this._appliedFilter = filter;
            updateNavigationStateHistory(this._appliedFilter);
            //this._definitions = definitions

            this._initializing = false;
            this._hasDefinitions = (definitions.length > 0);
            
            this._definitionPickerStore.initializeDefinitions({favorites: [], definitions: definitions})
            this.emitChanged();
            this.emit(AllBuildsEvents.ResultsAvailable, this);
        }
    }

    private _updateBuilds(builds: Build[], append: boolean) {
        if (append) {
            builds.forEach((build: Build) => {
                let foundMatch: boolean = false;
                for(let i = 0; i < this._builds.length; i++) {
                    let existingBuild = this._builds[i];
                    if (existingBuild.id === build.id) {
                        this._builds[i] = build;
                        foundMatch = true;
                        return;
                    }
                }
                if(!foundMatch) {
                    this._builds.push(build);
                }
            });
        }
        else {
            this._builds = builds;
        }
        this.emitChanged();
        this.emit(AllBuildsEvents.ResultsAvailable, this);
    }

    private _initializeAgentStore() {
        using(["Build/Scripts/Stores/AgentExistence"], (_AgentExistenceStore: typeof AgentExistenceStore_NO_REQUIRE) => {
            if (!this._agentExistenceStore) {
                this._agentExistenceStore = _AgentExistenceStore.getStore();
                this._agentExistenceStore.addChangedListener(() => {
                    this.emitChanged();
                });

                this._agentInitialized = true;
                this.emitChanged(); // trigger change since agentstore is available now for use
            }
        });
    }

    private _getSortedBuilds(builds: Build[]): Build[] {
        let getBuildDateFunction: getBuildDateFunctionType = null;
        switch (this._appliedFilter.status) {
            case BuildStatus.Completed:
                getBuildDateFunction = (build: BuildReference) => { return build.finishTime };
                break;
            case BuildStatus.InProgress:
                getBuildDateFunction = (build: BuildReference) => { return build.startTime };
                break;
            default:
                getBuildDateFunction = (build: BuildReference) => { return build.queueTime };
                break;
        }

        return getSortedBuildsByTime(builds, getBuildDateFunction, isAscendingOrder(this._appliedFilter.order)) as Build[];
    }
}

var _store: AllBuildsStore = null;