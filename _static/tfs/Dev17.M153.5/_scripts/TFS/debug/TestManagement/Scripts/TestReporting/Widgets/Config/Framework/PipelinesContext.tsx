import * as React from 'react';

import { IConfigProps, withConfigContext } from "VSSPreview/Config/Framework/ConfigContext";

import { PipelinesActionCreator } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Framework/PipelinesActionCreator';
import { PipelinesSelector } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Framework/PipelinesSelector';

export interface IPipelinesContext {
    actionCreator: PipelinesActionCreator;
    selector: PipelinesSelector;
}

export const PipelinesContext = React.createContext({} as IPipelinesContext);

export interface IPipelinesConfigProps extends IConfigProps {
    pipelinesContext: IPipelinesContext;
}

/**
 * Components built on the Pipelines Config Framework will need an instance of `IPipelinesContext`, and
 * `IConfigContext`.
 *
 * The framework provides these contexts to all components within a `<PipelinesConfig>` via React's context API.
 * The native syntax to do this is a bit cumbersome (see implementation below). React recommends using a higher-order
 * component (HOC) to help with this (https://reactjs.org/docs/context.html#consuming-context-with-a-hoc).
 *
 * This method is the HOC for easily gaining access to these contexts from a component within a `PipelinesConfig`.
 *
 * To use this:
 *
 * 1) Ensure that your component's props intersects with `IPipelinesConfigProps`
 *
 * 2) Wrap your class with this method. For example:
 *
 *         export const MyComponent = withPipelinesConfigContext(
 *             class MyComponentInternal extends React.Component<MyProps & IPipelinesConfigProps> {
 *             }
 *         );
 */
export const withPipelinesConfigContext = <P extends object>(WrappedComponent: React.ComponentType<P & IPipelinesConfigProps>) =>
    withConfigContext(
        class extends React.Component<P & IConfigProps> {
            public render() {
                return (
                    <PipelinesContext.Consumer>{pipelinesContext => (
                        <WrappedComponent
                            configContext={this.props.configContext}
                            pipelinesContext={pipelinesContext}
                            {...this.props}
                        >
                            {this.props.children}
                        </WrappedComponent>
                    )}</PipelinesContext.Consumer>
                );
            }
        }
    );

