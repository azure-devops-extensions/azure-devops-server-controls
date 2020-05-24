import * as React from 'react';

import { IConfigProps, withConfigContext } from "VSSPreview/Config/Framework/ConfigContext";

import { WorkActionCreator } from 'Widgets/Scripts/Work/Framework/WorkActionCreator';
import { WorkSelector } from 'Widgets/Scripts/Work/Framework/WorkSelector';

export interface IWorkContext {
    actionCreator: WorkActionCreator;
    selector: WorkSelector;
}

export const WorkContext = React.createContext({} as IWorkContext);

export interface IWorkConfigProps extends IConfigProps {
    workContext: IWorkContext;
}

/**
 * Components built on the Work Config Framework will need an instance of `IWorkContext`, and
 * `IConfigContext`.
 *
 * The framework provides these contexts to all components within a `<WorkConfig>` via React's context API.
 * The native syntax to do this is a bit cumbersome (see implementation below). React recommends using a higher-order
 * component (HOC) to help with this (https://reactjs.org/docs/context.html#consuming-context-with-a-hoc).
 *
 * This method is the HOC for easily gaining access to these contexts from a component within a `WorkConfig`.
 *
 * To use this:
 *
 * 1) Ensure that your component's props intersects with `IWorkConfigProps`
 *
 * 2) Wrap your class with this method. For example:
 *
 *         export const MyComponent = withWorkConfigContext(
 *             class MyComponentInternal extends React.Component<MyProps & IWorkConfigProps> {
 *             }
 *         );
 */
export const withWorkConfigContext = <P extends object>(WrappedComponent: React.ComponentType<P & IWorkConfigProps>) =>
    withConfigContext(
        class extends React.Component<P & IConfigProps> {
            public render() {
                return (
                    <WorkContext.Consumer>{workContext => (
                        <WrappedComponent
                            configContext={this.props.configContext}
                            workContext={workContext}
                            {...this.props}
                        >
                            {this.props.children}
                        </WrappedComponent>
                    )}</WorkContext.Consumer>
                );
            }
        }
    );

