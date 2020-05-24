/// <reference types="react" />

import * as React from "react";
import * as ComponentBase from "VSS/Flux/Component";

import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/OnDemandTestRun/Components/TestValidationBlock";

export enum ProgressType {
    NotStarted = 0,
    InProgress = 1,
    Passed = 2,
    Failed = 3
}

export interface IProps extends ComponentBase.Props {
    progressStatus: ProgressType;
    validationText: string;
    subStatus?: JSX.Element;
}

export class Component extends ComponentBase.Component<IProps, ComponentBase.State> {

    public render(): JSX.Element {
        return (
            <div className="automated-tests-validation-block">
                {
                    this._getElementBasedOnStatus(this.props.progressStatus)
                }
                <span>
                    {this.props.validationText}
                </span>
                {
                    this.props.subStatus &&
                    <span>
                        <span className="status-separator">
                                :
                        </span>
                        {this.props.subStatus}
                    </span>
                }
            </div>
        );
    }

    private _getElementBasedOnStatus(progressStatus: ProgressType): JSX.Element {
        switch (progressStatus) {
            case ProgressType.NotStarted:
                return <i className="validation-status-icon bowtie-icon bowtie-status-help-outline " aria-hidden="true" />;
            case ProgressType.InProgress:
                return <i className="validation-status-icon bowtie-icon bowtie-status-run " aria-hidden="true" />;
            case ProgressType.Passed:
                return <i className="validation-status-icon bowtie-icon bowtie-status-success " aria-hidden="true" />;
            case ProgressType.Failed:
                return <i className="validation-status-icon bowtie-icon bowtie-status-failure" aria-hidden="true" />;
        }
    }

}
