/// <reference types="react" />

import Component_Base = require("VSS/Flux/Component");
import Controls = require("VSS/Controls");
import React = require("react");

export interface Props<TOptions extends Controls.EnhancementOptions> extends Component_Base.Props {
    /**
     * Platform control options.
     */
    options?: TOptions;

    /**
     *  Tag name of the component.
     */
    tagName?: string;
     
    /**
     * Specifies whether the component should trigger render when the component is updated.
     * @defaultvalue false
     */
    shouldUpdate?: boolean;
}

export interface State extends Component_Base.State {
}

/**
 * This a base component which wraps an existing legacy platform control like grid, treeview, splitter.
 */
export class Component<TControl extends Controls.BaseControl, TProps extends Props<any>, TState extends State> extends Component_Base.Component<TProps, TState> {
    protected _control: TControl;

    public render(): JSX.Element {
        var props: any = {
            ref: (element: HTMLElement) => {
                // "ref" is a special attribute for react which is executed right after 
                // the component is mounted (if a callback specified).
                this.onRef(element);
            }
        };

        if (this.props.cssClass) {
            props.className = this.props.cssClass;        
        }

        return React.createElement(this.getTagName(), props, this.props.children);
    }

    protected onRef(element: HTMLElement): void {
        if (element) {
            // Let the platform control generated
            this._control = this.createControl($(element));
        }
    }

    /**
     * Gets the name of the tag for the React element.
     *
     * @returns Tag name.
     */
    protected getTagName(): string {
        return "div";
    }

    /**
     * Determines whether render method should be executed or not.
     * @param nextProps New properties.
     * @param nextState New state.
     */
    public shouldComponentUpdate(nextProps: TProps, nextState: TState): boolean {
        return nextProps.shouldUpdate === true;
    }

    /**
     * Called before the component is unloaded.
     */
    public componentWillUnmount() {
        super.componentWillUnmount();

        if (this._control) {
            this._control.dispose();
            this._control = null;
        }
    }

    /**
     * Components will override this method, generate the platform control and return it. 
     *
     * @param element JQuery element.
     * @returns TControl
     */
    protected createControl(element: JQuery): TControl {
        return null;
    }
}
