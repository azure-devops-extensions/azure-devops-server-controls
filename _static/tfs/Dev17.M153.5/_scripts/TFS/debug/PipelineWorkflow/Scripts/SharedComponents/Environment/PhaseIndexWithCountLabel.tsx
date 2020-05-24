import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { localeFormat } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/SharedComponents/Environment/PhaseIndexWithCountLabel";

export interface IPhaseIndexWithCountLabelProps extends Base.IProps {
    phaseIndex: number;
    phaseCount: number;
}

export class PhaseIndexWithCountLabel extends Base.Component<IPhaseIndexWithCountLabelProps, Base.IStateless> {
    public render(): JSX.Element {
        return (
            <div className="cd-environment-phase-header-with-index-count">
                <div className="cd-environment-phase-name">
                    {localeFormat(Resources.PhaseHeaderDisplayText, this.props.phaseIndex, this.props.phaseCount)}
                </div>
                <hr className="cd-environment-phase-hr" />
            </div>
        );
    }
}