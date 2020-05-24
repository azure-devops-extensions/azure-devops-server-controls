import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";

import * as BuildContracts from "TFS/Build/Contracts";

export abstract class Store extends StoreCommonBase.StoreBase {

    public abstract updateVisitor(buildDefinition: BuildContracts.BuildDefinition): BuildContracts.BuildDefinition;
    public abstract isDirty(): boolean;
    public abstract isValid(): boolean;

}
