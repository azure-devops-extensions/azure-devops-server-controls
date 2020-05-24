/**
 * Contains common code for TabBase store
 */

import { DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { AggregatorViewStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";

export abstract class ContainerTabStoreBase extends AggregatorViewStoreBase {

    public isValid(): boolean {
        let returnValue: boolean = true;

        this.getStores().forEach((store: DataStoreBase) => {
            if (!store.isValid()) {
                returnValue = false;
                return;
            }
        });

        return returnValue;
    }
}