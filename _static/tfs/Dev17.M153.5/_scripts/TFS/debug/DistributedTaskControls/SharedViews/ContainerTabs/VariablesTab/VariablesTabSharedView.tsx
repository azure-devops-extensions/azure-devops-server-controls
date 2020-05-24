/// <reference types="react" />

import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { TwoPanelSelectorComponent } from "DistributedTaskControls/Components/TwoPanelSelectorComponent";
import { Component as ErrorMessageBar } from "DistributedTaskControls/Components/InformationBar";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedViews/ContainerTabs/VariablesTab/VariablesTabSharedView";

export interface IVariablesTabSharedViewProps extends Base.IProps {
    defaultItems: Item[];
    leftFooter: JSX.Element;
    onPublishTelemetry?: () => any;
}

export class VariablesTabSharedView extends Base.Component<IVariablesTabSharedViewProps, Base.IStateless> {

    public componentWillMount(): void {
        if (this.props.onPublishTelemetry) {
            // Publishes variables tab clicked telemetry
            this.props.onPublishTelemetry();
        }
    }

    public render(): JSX.Element {
        return (
            <div className="variables-tab-content">
                <ErrorMessageBar parentKey="Variables" cssClass="variables-error-message-bar" />
                <TwoPanelSelectorComponent
                    instanceId="variables-tab"
                    isRightPaneScrollable={true}
                    items={this.props.defaultItems}
                    defaultItemKey={(!!this.props.defaultItems[0]) ? this.props.defaultItems[0].getKey() : Utils_String.empty}
                    leftPaneARIARegionRoleLabel={Resources.ARIALabelVariablesLeftPane}
                    rightPaneARIARegionRoleLabel={Resources.ARIALabelVariablesRightPane}
                    leftPaneInitialWidth={this._leftPanelInitialWidth}
                    leftFooter={this.props.leftFooter}
                    setFocusOnLastSelectedItem={false} />
            </div>
        );
    }

    private _leftPanelInitialWidth: string = "320px";
}
