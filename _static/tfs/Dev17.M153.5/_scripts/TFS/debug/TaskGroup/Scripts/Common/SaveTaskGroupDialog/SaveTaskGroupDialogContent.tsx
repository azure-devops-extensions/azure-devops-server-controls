import * as React from "react";
import * as ReactDOM from "react-dom";

import { css } from "OfficeFabric/Utilities";

import { format, localeFormat, empty as emptyString } from "VSS/Utils/String";

import { Component, IProps, IStateless } from "DistributedTaskControls/Common/Components/Base";
import { MultiLineInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/MultilineInputComponent";
import { Component as InformationBar } from "DistributedTaskControls/Components/InformationBar";

import { MessageBarKeys } from "TaskGroup/Scripts/Common/Constants";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export interface ISaveTaskGroupDialogContentProps extends IProps {
    taskGroupName: string;
}

export class SaveTaskGroupDialogContent extends Component<ISaveTaskGroupDialogContentProps, IStateless>{

    public render() {
        return (
            <div>
                <InformationBar
                    parentKey={MessageBarKeys.SavePublishPreviewTaskGroupDialog} />

                <div>
                    {localeFormat(Resources.SaveTaskGroupDialogText, this.props.taskGroupName)}
                </div>

                <div className="sure-to-proceed-text">
                    {Resources.SureToProceedQuestionText}
                </div>
            </div>
        );
    }
}