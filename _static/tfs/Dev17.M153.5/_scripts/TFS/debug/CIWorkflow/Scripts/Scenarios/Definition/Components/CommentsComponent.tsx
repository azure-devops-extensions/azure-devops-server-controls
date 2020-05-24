/// <reference types="react" />
import * as React from "react";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/CommentsComponent";

export interface ICommentsProps {
    value: boolean;
    disabled?: boolean;
    onValueChanged: (isChecked: boolean) => void;
}

export class CommentsComponent extends React.Component<ICommentsProps, Base.IStateless> {
    public render(): JSX.Element {
        return (
            <div className="comments-component">
                <div className="comments-title">
                    {Resources.CommentsText}
                </div>
                <div className="comments-description">
                    {Resources.CommentsDescriptionText}
                </div>
                <div className="comments-enable-checkbox">
                    <BooleanInputComponent
                        value={this.props.value}
                        onValueChanged={this.props.onValueChanged}
                        disabled={this.props.disabled}
                        label={Resources.CommentsCheckBoxText} />
                </div>
            </div>
        );
    }
}
