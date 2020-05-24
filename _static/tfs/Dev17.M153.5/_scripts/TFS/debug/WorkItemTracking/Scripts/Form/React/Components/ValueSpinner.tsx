import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/React/Components/ValueSpinner";

import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";
import { KeyCode } from "VSS/Utils/UI";

export class NumericValueRange implements IValueRange<number> {
    constructor(private _min: number,
        private _max: number,
        private _valueFormatter: (n: number) => string = (n: number) => n.toString(),
        private _increment: number = 1) {
    }

    public getPreviousValue(value: number): number {
        value -= this._increment;
        if (value < this._min) {
            value = this._max;
        }

        return value
    }

    public getNextValue(value: number): number {
        value += this._increment;
        if (value > this._max) {
            value = this._min;
        }

        return value;
    }

    public toString(value: number): string {
        return this._valueFormatter(value);
    }
}

export class CategoryRange implements IValueRange<string> {
    constructor(private _values: string[]) {
    }

    public getPreviousValue(value: string): string {
        let index = this._values.indexOf(value);
        index--;

        if (index < 0) {
            index = this._values.length - 1;
        }

        return this._values[index];
    }

    public getNextValue(value: string): string {
        let index = this._values.indexOf(value);
        index++;

        if (index >= this._values.length) {
            index = 0;
        }

        return this._values[index];
    }

    public toString(value: string): string {
        return value;
    }
}

export interface IValueRange<T> {
    /**
     * Get a next value based on the given value
     */
    getNextValue(value: T): T;

    /**
     * Get a previous value based on the given value
     */
    getPreviousValue(value: T): T;

    /**
     * String representation of the given value
     */
    toString(value: T): string;
}

export interface IValueSpinnerProp<T> {
    /**
     * Initial value
     */
    value: T;
    /**
     * Value range for the spinner
     */
    valueRange: IValueRange<T>;

    /**
     * Invoked when value changed
     */
    onValueChange?: (value: T) => void;

    /**
     * aria-label value for up button
     */
    ariaLabelUpButton?: string;

    /**
     * aria-label value for down button
     */
    ariaLabelDownButton?: string;
}

export interface IValueSpinnerState<T> {
    /**
     * current value
     */
    value: T;
}

export class ValueSpinner<T> extends React.Component<IValueSpinnerProp<T>, IValueSpinnerState<T>> {
    constructor(props: IValueSpinnerProp<T>) {
        super(props);

        this.state = {
            value: props.value
        };
    }

    public componentWillReceiveProps(props: IValueSpinnerProp<T>) {
        if (this.props && (this.props.value !== props.value)) {
            this.setState({
                value: props.value
            });
        }
    }

    public render(): JSX.Element {
        return <div className="value-spinner">
            <button
                className="icon bowtie-icon bowtie-chevron-up-light spinner-up"
                {...this.props.ariaLabelUpButton ? {"aria-label": this.props.ariaLabelUpButton} : {}}
                onClick={this._setNextValue} />
            <div className="spinner-value">{this.props.valueRange.toString(this.state.value)}</div>
            <button
                className="icon bowtie-icon bowtie-chevron-down-light spinner-down"
                {...this.props.ariaLabelDownButton ? {"aria-label": this.props.ariaLabelDownButton} : {}}
                onClick={this._setPreviousValue} />
        </div>;
    }

    @autobind
    private _setPreviousValue() {
        this._onValueChange(this.props.valueRange.getPreviousValue(this.state.value));
    }

    @autobind
    private _setNextValue() {
        this._onValueChange(this.props.valueRange.getNextValue(this.state.value));
    }

    private _onValueChange(value: T) {
        this.setState({ value });

        if (this.props.onValueChange) {
            this.props.onValueChange(value);
        }
    }
}
