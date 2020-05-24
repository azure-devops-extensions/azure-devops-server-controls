/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { ReleasePropertiesNode } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleasePropertiesNode";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleasePropertiesCanvas";

export interface IReleasePropertiesCanvasProps extends Base.IProps {
    isEditMode?: boolean;
}

export class ReleasePropertiesCanvas extends Base.Component<IReleasePropertiesCanvasProps, Base.IStateless> {

    public render(): JSX.Element {
        return (
            <div role="region" aria-label={Resources.ReleaseText} className={css("release-properties-canvas", this.props.cssClass)} >
                 <h2 className="release-properties-canvas-heading">{Resources.ReleasePropertiesNodeLabel}</h2>
                <ReleasePropertiesNode cssClass="release-properties-canvas-content" isEditMode={this.props.isEditMode} />
            </div>
        );
    }
}
