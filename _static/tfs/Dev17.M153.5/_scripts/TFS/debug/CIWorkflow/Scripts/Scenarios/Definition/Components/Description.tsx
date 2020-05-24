/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/Description";

export interface IProps extends Base.IProps {
    label: string;
    value?: string;
    placeHolder?: string;
    onDescriptionChange?: (value: string) => void;
}

export class Component extends Base.Component<IProps, Base.IStateless> {

    public render(): JSX.Element {
        let placeHolder = this.props.placeHolder || Utils_String.empty;
        let value = this.props.value || Utils_String.empty;
        
        let header = (
            <div className="ci-description-label">
                { this.props.label }
            </div>);

        let body = (
            <div className="ci-description-body">
                <textarea className="textarea"
                    placeholder={ placeHolder }
                    value={ value }
                    onChange = {this._handleChange.bind(this)} >
                </textarea>
            </div>);

        return (
            <div className="ci-description">
                { header }
                { body }
            </div>);
    }

    private _handleChange(event: any) {
        this.props.onDescriptionChange(event.target.value);
    }
}
