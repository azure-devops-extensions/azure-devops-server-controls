// This is a seed of a future StoresHub on the Branches scenario.

import { GitRef } from "TFS/VersionControl/Contracts";
import { BranchPermissions } from "VersionControl/Scenarios/Branches/Stores/BranchPermissionsStore";
import { BranchStoreFactory, StoreIds } from "VersionControl/Scenarios/Branches/Stores/BranchStoreFactory";
import { CompareBranch } from "VersionControl/Scenarios/Branches/Stores/CompareBranchStore";
import { DefaultBranchStore } from "VersionControl/Scenarios/Branches/Stores/DefaultBranchesStore";
import { ValueStore } from "VersionControl/Scenarios/Branches/Stores/ValueStore";

export interface AggregateState {
    defaultBranch: GitRef;
    compareBranch: CompareBranch;
    permissions: BranchPermissions;
}
