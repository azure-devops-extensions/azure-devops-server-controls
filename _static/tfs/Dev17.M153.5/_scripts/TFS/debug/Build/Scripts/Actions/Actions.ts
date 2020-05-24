/// <reference path='../Interfaces.d.ts' />

import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import BuildContracts = require("TFS/Build/Contracts");
import DTContracts = require("TFS/DistributedTask/Contracts");

import { Action } from "VSS/Flux/Action";
import { PermissionEvaluation } from "VSS/Security/Contracts";

export interface AgentsForPoolUpdatedPayload {
    agents: DTContracts.TaskAgent[];
    poolId?: number;
}

export interface ChangesRetrievedPayload {
    buildId: number;
    changes: BuildContracts.Change[];
}

export interface FavoriteStoresUpdatedPayload {
    stores: TFS_OM_Common.FavoriteStore[];
}

export interface InitializeMyDefinitionsStorePayload {
    hasMyBuilds: boolean;
    buildIds: number[];
}

export interface MoreAllDefinitionsRequestedPayload {
    count: number;
    continuationToken: string;
    path: string;
    queryOrder: BuildContracts.DefinitionQueryOrder;
    filterText?: string;
    minMetricsTime?: string;
}

export interface QueuesRetrievedPayload {
    filter: DTContracts.TaskAgentQueueActionFilter;
    queues: DTContracts.TaskAgentQueue[];
}

export interface IDefinitionRawNavigationState {
    definitionId?: string;
}

// initialize actions
export var initializeDefinitionTitleBarStore = new Action<void>();
export var initializeMyDefinitionsStore = new Action<InitializeMyDefinitionsStorePayload>();

// Update actions
export var agentsUpdated = new Action<AgentsForPoolUpdatedPayload>();
export var favoriteStoresUpdated = new Action<FavoriteStoresUpdatedPayload>();
export var jobRequestsUpdated = new Action<DTContracts.TaskAgentJobRequest[]>();
export var poolsUpdated = new Action<DTContracts.TaskAgentPool[]>();
export var queuesRetrieved = new Action<QueuesRetrievedPayload>();

// Actions that say something is initialized
export var sourceProviderInitialized = new Action<void>();

// Actions used to get more data
export var moreMyFavoritesRequested = new Action<void>();
export var moreTeamFavoritesRequested = new Action<void>();

// Delete actions
export var agentDeleted = new Action<number>();
export var buildDeleted = new Action<BuildContracts.Build>();

// permissions
export var permissionsRetrieved = new Action<PermissionEvaluation[]>();

// Other actions
export var changesRetrieved = new Action<ChangesRetrievedPayload>();