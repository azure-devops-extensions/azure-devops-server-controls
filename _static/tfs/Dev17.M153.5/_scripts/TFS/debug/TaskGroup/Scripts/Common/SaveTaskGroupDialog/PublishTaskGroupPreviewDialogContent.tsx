import * as React from "react";
import * as ReactDOM from "react-dom";

import { css } from "OfficeFabric/Utilities";

import { Component, IProps, IStateless } from "DistributedTaskControls/Common/Components/Base";
import { Component as InformationBar } from "DistributedTaskControls/Components/InformationBar";

import { MessageBarKeys } from "TaskGroup/Scripts/Common/Constants";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export class PublishTaskGroupPreviewDialogContent extends Component<IProps, IStateless>{

    public render() {
        return (
            <div>
                <InformationBar
                    parentKey={MessageBarKeys.SavePublishPreviewTaskGroupDialog} />

                <div>
                    {Resources.PublishTaskGroupPreviewDialogText}
                </div>

                <div className="sure-to-proceed-text">
                    {Resources.SureToProceedQuestionText}
                </div>
            </div>
        );
    }
}