// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />

import { ITabItemProps } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerControllerView";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as React from "react";

export class Component extends Base.Component<ITabItemProps, Base.IStateless> {

    // TODO: Placeholder for post release trigger
    public render(): JSX.Element {
        return (
            <div className="cd-environment-post-release-trigger">
            </div>
        );
    }
}
