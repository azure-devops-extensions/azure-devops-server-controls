/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { Checkbox } from "OfficeFabric/Checkbox";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/FlatViewCheckBox";

export interface IFlatViewCheckBoxProps extends Base.IProps {
    value: boolean;
    rowSelected: boolean;
    onValueChanged: (newValue: boolean) => void;
    isDisabled?: boolean;
    ariaLabel?: string;
}

export class FlatViewCheckBox extends Base.Component<IFlatViewCheckBoxProps, Base.IStateless> {
    public render(): JSX.Element {
        let className: string = "flat-view-checkbox";
        className += (!this.props.rowSelected && (!this.props.value)) ? " " + "hide" : "";

        return (
            <div className="flat-view-checkbox-container"
                ref={(element) => { this._element = $(element); }} >
                <Checkbox
                    className={className}
                    checked={!!this.props.value}
                    onChange={this._onChange}
                    onFocus={this._onFocus}
                    onBlur={this._onBlur}
                    ariaLabel={this.props.ariaLabel}
                    disabled={!!(this.props.isDisabled)} />
            </div>
        );
    }

    private _onChange = (ev?: React.FormEvent<HTMLInputElement>, checked?: boolean) => {
        this.props.onValueChanged(checked);
    }

    private _onFocus = () => {
        if (this._element) {
            this._element.find("label").addClass("focus");
        }
    }

    private _onBlur = () => {
        if (this._element) {
            this._element.find("label").removeClass("focus");
        }
    }

    private _element: JQuery;
}