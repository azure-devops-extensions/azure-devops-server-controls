import * as React from "react";
import { requireModules } from "VSS/VSS";

const components: { [key: string]: React.ComponentClass<any> } = {};

export const component = (key: string) => <TProps>(target: React.ComponentClass<TProps>): void => {
    registerComponent(key, target);
};

/**
 *
 * @param key Key to register component under
 * @param component Component to register
 */
export function registerComponent<TProps>(key: string, component: React.ComponentClass<TProps>): void {
    components[key] = component;
}

/**
 * Get registered component
 * @param key Key to find component
 */
export function getComponent<TProps extends {}>(key: string): React.ComponentClass<TProps> {
    return components[key];
}

export interface IComponentWrapperProps {
    /** Modules to load, one of the modules should register the component reference in `componentKey` */
    modules: string[];

    /** Key to retrieve component from registry */
    componentKey: string;

    /** Props to pass to component */
    componentProps: any;
}

/**
 * Render a placeholder while loading modules and then rendering a registered component
 */
export class ComponentWrapper extends React.Component<IComponentWrapperProps> {
    private _unmounted = false;

    constructor(props: IComponentWrapperProps) {
        super(props);

        const component = getComponent(props.componentKey);
        if (!component) {
            // Start loading modules as soon as component instance is created
            requireModules(props.modules).then(() => {
                if (!this._unmounted) {
                    this.forceUpdate();
                }
            }, () => {
                // Swallow error and try to re-render anyway
                if (!this._unmounted) {
                    this.forceUpdate();
                }
            });
        }
    }

    public render() {
        const { componentKey, componentProps } = this.props;
        const component = getComponent(componentKey);
        if (component) {
            return React.createElement(component, componentProps);
        }

        return null;
    }

    public componentWillUnmount() {
        this._unmounted = true;
    }
}