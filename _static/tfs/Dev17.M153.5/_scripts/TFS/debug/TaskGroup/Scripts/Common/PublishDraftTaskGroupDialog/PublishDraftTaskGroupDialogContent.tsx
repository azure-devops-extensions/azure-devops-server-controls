import * as React from "react";
import * as ReactDOM from "react-dom";

import { css } from "OfficeFabric/Utilities";

import { format, localeFormat, empty as emptyString } from "VSS/Utils/String";

import { Component, IProps, IStateless } from "DistributedTaskControls/Common/Components/Base";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { Component as InformationBar } from "DistributedTaskControls/Components/InformationBar";

import { MessageBarKeys } from "TaskGroup/Scripts/Common/Constants";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export interface IPublishDraftTaskGroupDialogContentProps extends IProps {
    isPreview: boolean;
    taskGroupName: string;
    onPreviewValueChanged: (value: boolean) => void;
}

export class PublishDraftTaskGroupDialogContent extends Component<IPublishDraftTaskGroupDialogContentProps, IStateless>{

    public render() {
        return (
            <div>
                <InformationBar
                    parentKey={MessageBarKeys.PublishDraftTaskGroupDialog} />

                <div>
                    {Resources.PublishDraftDialogText}
                </div>

                <div className="publish-as-preview-advice">
                    {Resources.PublishAsPreviewAdviceMessage}
                </div>

                <BooleanInputComponent
                    value={this.props.isPreview}
                    label={Resources.PublishAsPreviewCheckboxLabel}
                    onValueChanged={this.props.onPreviewValueChanged}
                />
            </div>
        );
    }
}