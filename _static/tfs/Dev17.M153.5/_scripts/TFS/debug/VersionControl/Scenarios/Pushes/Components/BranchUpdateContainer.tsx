/// <reference types="react" />
import * as React from "react";
import * as VSSStore from "VSS/Flux/Store";

import { ActionCreator } from "VersionControl/Scenarios/Pushes/ActionCreator";
import { BranchUpdatesStore } from "VersionControl/Scenarios/Pushes/Stores/BranchUpdatesStore";
import { PushesPermissionStore } from "VersionControl/Scenarios/Pushes/Stores/PushesPermissionStore";
import { SearchCriteriaStore } from "VersionControl/Scenarios/Pushes/Stores/SearchCriteriaStore";
import { AggregateState, StoresHub } from "VersionControl/Scenarios/Pushes/Stores/StoresHub";
import { ContextStore } from "VersionControl/Scenarios/Shared/Stores/ContextStore";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";

export interface BranchUpdateContainerProps {
    actionCreator: ActionCreator;
    stores: (BranchUpdatesStore | SearchCriteriaStore | ContextStore | PushesPermissionStore)[];
    getState?: () => AggregateState;
    customerIntelligenceData?: CustomerIntelligenceData;
}

export function create<TProps extends BranchUpdateContainerProps>(
    render: (state: AggregateState, props: TProps) => JSX.Element,
): React.ComponentClass<TProps> {
    return class BranchUpdateContainer extends React.PureComponent<TProps, {}> {
        public componentDidMount(): void {
            const stores = this.props.stores;
            for (const key in stores) {
                stores[key].addChangedListener(this.onStoreChanged);
            }
        }

        public componentWillUnmount(): void {
            const stores = this.props.stores;
            for (const key in stores) {
                stores[key].removeChangedListener(this.onStoreChanged);
            }
        }

        public render(): JSX.Element {
            return render(this.props.getState(), this.props);
        }

        private onStoreChanged = (): void => {
            this.forceUpdate();
        }
    };
}
