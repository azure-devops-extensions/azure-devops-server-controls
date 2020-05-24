import * as React from "react";

import { autobind, BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import { IPivotBarAction } from "VSSUI/PivotBar";
import { IObservableArray } from "VSS/Core/Observable";
import { VssIconType } from 'VSSUI/VssIcon';

export interface ISimpleProviderComponentProps extends IBaseProps {
    /**
     * A viewAction ObservableArray that our parent PivotItem uses to get view actions.
     */
    viewActions: IObservableArray<IPivotBarAction>;
    defaultValue: number;
    min: number;
    max: number;
}

export interface ISimpleProviderComponentState {
    value: number;
}

/**
 * Demonstrates use of SimplePivotBarActionProvider to provide ViewActions to a Pivot.
 *
 * This component has a number that varies between its min and max. Press the up and down arrows in
 * the view actions to change the number. Note how the correct arrow is disabled when the number is
 * at the min or max.
 */
export class SimpleProviderComponent extends BaseComponent<ISimpleProviderComponentProps, ISimpleProviderComponentState> {
    private _downMenuItem: IPivotBarAction = {
        key: "down",
        important: true,
        disabled: false,
        iconProps: {
            iconName: "ChevronDown",
            iconType: VssIconType.fabric,
        },
        onClick: this.downHandler.bind(this),
    };
    private _upMenuItem: IPivotBarAction = {
        key: "up",
        important: true,
        disabled: true,
        iconProps: {
            iconName: "ChevronUp",
            iconType: VssIconType.fabric,
        },
        onClick: this.upHandler.bind(this),
    };

    public constructor(props: ISimpleProviderComponentProps) {
        super(props);

        this.state = {
            value: props.defaultValue,
        };
    }

    public componentWillMount(): void {
        this._updateMenuItems(this.state.value, true);
    }

    public render(): JSX.Element {
        return <dl>
            <dt>Min</dt><dd>{this.props.min}</dd>
            <dt>Value</dt><dd>{this.state.value}</dd>
            <dt>Max</dt><dd>{this.props.max}</dd>
        </dl>;
    }

    @autobind
    private downHandler(): void {
        let value = this.state.value;
        if (value > this.props.min) {
            value--;
            this.setState({ value: value });
            this._updateMenuItems(value);
        }
    }

    @autobind
    private upHandler(): void {
        let value = this.state.value;
        if (value < this.props.max) {
            value++;
            this.setState({ value: value });
            this._updateMenuItems(value);
        }
    }

    private _updateMenuItems(value: number, force = false): void {
        let update = force;
        const upDisabled = value >= this.props.max;
        const downDisabled = value <= this.props.min;
        if (this._upMenuItem.disabled !== upDisabled) {
            this._upMenuItem.disabled = upDisabled;
            update = true;
        }
        if (this._downMenuItem.disabled !== downDisabled) {
            this._downMenuItem.disabled = downDisabled;
            update = true;
        }
        if (update) {
            this.props.viewActions.value = [this._downMenuItem, this._upMenuItem];
        }
    }
}
