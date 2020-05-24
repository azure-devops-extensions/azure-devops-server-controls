/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import Controls = require("VSS/Controls");

/**
 * Optional data like class can be added to the React html wrapper.
 */
export interface ILegacyComponentProps extends React.Props<any> {
    /**
     * Classname to be added to the React wrapper. This is not a class added to the Web Access control, but the parent container.
     * Multiple className can be added by separating them with space
     */
    className?: string;
    /**
     * Style to be applied to the container of the legacy component
     */
    containerStyle?: any;
    /**
     * Whether this legacy component should be focused after mounting
     */
    focusOnMount?: boolean;
}

/**
 * This will remain empty because we do not handle a real React component. Private states
 * will be directly into the legacy Web Access control,
 */
export interface ILegacyComponentState {
}

/**
 * Allow to wrap an existing WebAccess' control into React.
 * This class handle the creation and deletion of the WebAccess' control by handling the life cyce with mount and unmount.
 *
 * Note:
 * Update done to the React control will dispose and recreate the control. This can be expensive.
 */
export abstract class LegacyComponent<TControl extends Controls.BaseControl, TProps extends ILegacyComponentProps, TState extends ILegacyComponentState> extends React.Component<TProps, TState> {

    /**
     * Web access control. Public for unit testing
     */
    public _control: TControl;

    /**
     * Reference to the web access control's DOM
     */
    private _legacyContainer: HTMLDivElement;

    /**
     * Callback used by React to get a reference to the DOM element of the main div of this component.
     * Allow to have a single instance of this function created in the render (performance reason).
     */
    private _legacyContainerCallback = (container: HTMLDivElement) => { this._legacyContainer = container; };

    /**
     * Create a container that wrap the web access control
     */
    public render(): JSX.Element {
        return <div style={this.props.containerStyle} ref={this._legacyContainerCallback} className={this.props.className || ""}></div>;
    }

    /**
     * Create the control when mounting the React wrapper
     */
    public componentDidMount() {
        this._control = this.createControl(this._legacyContainer, this.props, this.state);
        if (this.props.focusOnMount) {
            this._control.focus();
        }
    }

    public componentDidUpdate() {
        if (this.props.focusOnMount) {
            this._control.focus();
        }
    }

    /**
     * Update the control when updating the React wrapper
     */
    public componentWillUpdate(nextProps: TProps, nextState: TState) {
        this.updateControl(this._legacyContainer, nextProps, nextState);
    }

    /**
     * Remove the control when unmounting the React wrapper
     */
    public componentWillUnmount() {
        this.dispose();
    }

    /**
     * Dispose and delete the reference of the control
     */
    protected dispose() {
        if (this._control) {
            this._control.dispose();
            this._control = null;
        }
    }

    /**
     * This method provides the default implementation for the LegacyComponent to respond to state changes.
     * This will simply dispose and recreate the control.
     * The controls can override this behavior and provide more specific implementation.
     * @param {HTMLElement} element - Passing down the Html reference to have the WebAccess control hook up
     * @param {TProps} props - Properties passed down to the Web access control. Come from the React component.
     * @param {TState} state - States passed down to the Web access control. Not used for Legacy Control.
     */
    protected updateControl(element: HTMLElement, props: TProps, state: TState) {
        if (this._control) {
            // Dispose and re-create
            this.dispose();
            this._control = this.createControl(element, props, state);
        }
    }

    /**
     * This method needs to be implemented by the concrete wrapper. It will contains the creation detail of the
     * Web Access control which contains usually the definition of the options, events definition, etc.
     * @param {HTMLElement} element - Passing down the Html reference to have the WebAccess control hook up
     * @param {TProps} props - Properties passed down to the Web access control. Come from the React component.
     * @param {TState} state - States passed down to the Web access control. Not used for Legacy Control.
     */
    abstract createControl(element: HTMLElement, props: TProps, state: TState): TControl;
}

