import * as React from "react";
import { ActionCreator } from "VersionControl/Scenarios/Explorer/ActionCreator";
import { StoresHub, AggregateState, StoreName } from "VersionControl/Scenarios/Explorer/Stores/StoresHub";

export interface ContainerProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
}

export interface ContainerState {
    hasError: boolean;
}

export function create<TProps extends ContainerProps>(
    stores: StoreName[],
    render: (state: AggregateState, props: TProps) => JSX.Element,
): React.ComponentClass<TProps> {
    return class Container extends React.PureComponent<TProps, ContainerState> {
        public state: ContainerState = { hasError: false };

        public componentDidMount(): void {
            this.props.storesHub.getCompositeStore(stores).addChangedListener(this.onStoreChanged);
        }

        public componentWillUnmount(): void {
            this.props.storesHub.getCompositeStore(stores).removeChangedListener(this.onStoreChanged);
        }

        public componentDidCatch() {
            this.setState({ hasError: true });
        }

        public render(): JSX.Element {
            if (this.state.hasError) {
                return <h3>Error! See console</h3>;
            } else {
                return render(this.props.storesHub.getAggregateState(), this.props);
            }
        }

        private onStoreChanged = (): void => {
            this.forceUpdate();
        }
    };
}
