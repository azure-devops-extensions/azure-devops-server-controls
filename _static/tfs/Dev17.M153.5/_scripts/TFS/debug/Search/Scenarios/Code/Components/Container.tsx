import * as React from "react";
import { ActionCreator } from "Search/Scenarios/Code/Flux/ActionCreator";
import { StoresHub, AggregatedState, StoreName } from "Search/Scenarios/Code/Flux/StoresHub";

export interface ContainerProps {
    actionCreator: ActionCreator;

    storesHub: StoresHub;

    isMember?: boolean;
}

export function create<TProps extends ContainerProps>(
    stores: StoreName[],
    render: (state: AggregatedState, props: TProps) => JSX.Element,
    onDidUpdate?: (state: AggregatedState, props: TProps) => void
): React.ComponentClass<TProps> {
    return class Container extends React.PureComponent<TProps, {}> {
        public componentDidMount(): void {
            this.props.storesHub.getCompositeStore(stores).addChangedListener(this.onStoreChanged);
        }

        public componentWillUnmount(): void {
            this.props.storesHub.getCompositeStore(stores).removeChangedListener(this.onStoreChanged);
        }

        public componentDidUpdate(): void {
            if (onDidUpdate) {
                onDidUpdate(this.props.storesHub.getAggregatedState(), this.props);
            }
        }

        public render(): JSX.Element {
            return render(this.props.storesHub.getAggregatedState(), this.props);
        }

        private onStoreChanged = (): void => {
            this.forceUpdate();
        }
    };
}
