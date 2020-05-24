/// <reference types="react" />

import * as React from "react";
import * as Controls from "VSS/Controls";
import * as Combos from "VSS/Controls/Combos";

import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/CreateProject/Components/SimpleComboBox";

export interface ISimpleComboBoxProps extends React.Props<any> {
    /**
     * Class name for the react container over the Combo box web access control
     */
    className: string;
    /**
     * Options for the web access combo control
     */
    options: Combos.IComboOptions;
    /**
     * Enhancement options for the web access combo control
     */
    enhancementOptions?: Controls.EnhancementOptions
}

export class SimpleComboBox extends React.Component<ISimpleComboBoxProps, {}> {
    private _control: Combos.Combo;
    private _onInputFocusInProgress: boolean;

    /**
     * Reference to the web access combo control's DOM
     */
    public refs: {
        [key: string]: (Element);
        container: (HTMLElement);
    };

    /**
     * Render the container with the given classname which wrap's the web access combo control
     */
    public render(): JSX.Element {
        return <div ref="container" className={ this.props.className || "" }></div>;
    }

    /**
     * Create the web access combo control during this react control mount
     */
    public componentDidMount(): void {
        this._control = this._createControl(this.refs.container, this.props);
    }

    /**
     * Remove the web access control during this react control unmount
     */
    public componentWillUnmount(): void {
        this._dispose();
    }

    /**
     * Set enabled state for this combo control when react control is updated
     */
    public componentDidUpdate(): void {
        this._control.setEnabled(this.props.options.enabled);
    }

    /**
     * Gets the text of the current selected item in the combo control
     */
    public getText(): string {
        return this._control.getText();
    }

    /**
     * Gets the selected item index in the combo control
     */
    public getSelectedIndex(): number {
        return this._control.getSelectedIndex();
    }

    /**
     * Dispose and delete the reference of the web access control
     */
    private _dispose(): void {
        if (this._control) {
            // Web access controls have dispose
            this._control.dispose();
            this._control = null;
        }
    }

    /**
     * Creates the web access combo control
     */
    private _createControl(element: HTMLElement, props: ISimpleComboBoxProps): Combos.Combo {
        let control = Controls.Control.create(Combos.Combo, $(element), props.options, props.enhancementOptions);

        // Disabled style is associated with the child but border is set for the parent
        // and due to limitation of styling parent based on child class, we are adding our own class here
        if (props.options.enabled) {
            control._element.addClass("enabled-border");
        } else {
            control._element.addClass("disabled-border");
        }

        return control;
    }
}
