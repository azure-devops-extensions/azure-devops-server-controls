import React = require("react");

import * as Controls from "VSS/Controls";
import * as Diag from "VSS/Diag";
import {
    IInputControlPropsBase,
    IInputControlStateBase,
    InputControlType
} from "DistributedTaskControls/SharedControls/InputControls/Common";
import { InputBase } from "DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";
import { Component as RequiredIndicator } from "DistributedTaskControls/SharedControls/InputControls/Components/RequiredIndicator";
import { ContributionComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/ContributionComponent";
import * as QueryControl from "TFS/WorkItemTracking/Controls";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/QueryControlInputComponent";

export interface IQueryControlProps extends IInputControlPropsBase<string> {
    value: string;
    onSelectedQueryChanged(value: string): void;
}

export class QueryControlInputComponent extends InputBase<string, IQueryControlProps, IInputControlStateBase<string>> {
    public getType(): string {
        return InputControlType.INPUT_TYPE_QUERY_CONTROL;
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[QueryControlInputComponent.getControl]: Method called.");
        let options: QueryControl.IQuerySelectorComponentProps = {
            value: this.props.value,
            onValueChanged: this.props.onSelectedQueryChanged,
            label: Resources.QueryText
        } as QueryControl.IQuerySelectorComponentProps;


        return (
            <div className="query-control-input-component">
                <RequiredIndicator
                    value={this.props.value}
                    onGetErrorMessage={this._getErrorMessage} >
                    <ContributionComponent
                        contribution={QueryControl.QuerySelectorControl.contributionId}
                        initialConfig={options}
                        disabled={this.props.disabled} />
                </RequiredIndicator>
            </div>
        );
    }

    private _getErrorMessage = () => {
        if (!!this.props.getErrorMessage) {
            return this.props.getErrorMessage(this.props.value);
        }
    }
}