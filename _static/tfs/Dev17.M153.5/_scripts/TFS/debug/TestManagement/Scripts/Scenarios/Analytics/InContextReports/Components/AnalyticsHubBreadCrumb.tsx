/// <reference types="react" />

import { autobind } from "OfficeFabric/Utilities";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as ComponentBase from "VSS/Flux/Component";
import { IHubBreadcrumbItem } from "VSSUI/Components/HubHeader/HubBreadcrumb.Props";
import { HubHeader } from "VSSUI/Components/HubHeader/HubHeader";
import * as React from "react";

export interface IAnalyticsBreadcrumbProps extends ComponentBase.Props {
    definitionName: string;
    onDefinitionClick: (ev?, item?) => void;
    onAnalyticsClick: (ev?, item?) => void;
}

export class AnalyticsBreadcrumb extends ComponentBase.Component<IAnalyticsBreadcrumbProps, ComponentBase.State> {

    public render(): JSX.Element {
        return (
            <HubHeader
                breadcrumbItems={this._getBreadcrumb()}
                title={Resources.TestFailuresTrendHeader}
                maxBreadcrumbItemWidth="600px"
                hubBreadcrumbAriaLabel={Resources.AnalyticsBreadcrumb}
            />
        );
    }

    @autobind
    private _getBreadcrumb(): IHubBreadcrumbItem[] {
        return [{
            key: "definition-breadcrumb",
            text: this.props.definitionName,
            onClick: this.props.onDefinitionClick,
            ariaLabel: this.props.definitionName
        },
        {
            key: "definition-analytics-breadcrumb",
            text: Resources.AnalyticsText,
            onClick: this.props.onAnalyticsClick,
            ariaLabel: Resources.AnalyticsText
        }];
    }

}