/**
 * @brief View for environment tab panel
 */

/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { Pivot, PivotItem, PivotLinkFormat, PivotLinkSize } from "OfficeFabric/Pivot";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTabPanel";

export interface IEnvironmentTabPanelProps extends Base.IProps {
    selectedEnvironmentInstanceId: string;
    onSelectedEnvironmentChange: (environment: PivotItem) => void;
}

export class EnvironmentTabPanel extends Base.Component<IEnvironmentTabPanelProps, Base.IStateless> {

    /**
     * @brief Renders an Environment tab view
     */
    public render(): JSX.Element {

        return (
            <div className="environment-tab-panel">
                <Pivot linkSize={PivotLinkSize.normal}
                    linkFormat={PivotLinkFormat.tabs}
                    selectedKey={this.props.selectedEnvironmentInstanceId}
                    onLinkClick={this.props.onSelectedEnvironmentChange}>

                    {this.props.children}

                </Pivot>
                <div className="environment-tab-panel-border bottom-border" />
            </div>
        );
    }

}





