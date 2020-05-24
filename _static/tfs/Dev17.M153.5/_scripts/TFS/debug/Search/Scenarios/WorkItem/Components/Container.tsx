import * as React from "react";
import { ActionCreator } from "Search/Scenarios/WorkItem/Flux/ActionCreator";
import { StoresHub, AggregatedState, StoreName } from "Search/Scenarios/WorkItem/Flux/StoresHub";

export interface ContainerProps {
    actionCreator: ActionCreator;

    storesHub: StoresHub;

    isMember?: boolean;
}

export function create<TProps extends ContainerProps>(
    stores: StoreName[],
    render: (state: AggregatedState, props: TProps) => JSX.Element,
): React.ComponentClass<TProps> {
    return class Container extends React.PureComponent<TProps, {}> {
        public componentDidMount(): void {
            this.props.storesHub.getCompositeStore(stores).addChangedListener(this.onStoreChanged);
        }

        public componentWillUnmount(): void {
            this.props.storesHub.getCompositeStore(stores).removeChangedListener(this.onStoreChanged);
        }

        public render(): JSX.Element {
            return render(this.props.storesHub.getAggregatedState(), this.props);
        }

        private onStoreChanged = (): void => {
            this.forceUpdate();
        }
    };
}
