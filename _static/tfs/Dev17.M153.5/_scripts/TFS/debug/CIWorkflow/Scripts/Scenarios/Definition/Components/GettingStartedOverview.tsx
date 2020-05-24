/// <reference types="react" />

import * as React from "react";

import { ContributionConstants } from "CIWorkflow/Scripts/Common/Constants";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { CreateDefinitionPages } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildDefinitionStore";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Telemetry, Feature } from "DistributedTaskControls/Common/Telemetry";

import * as NavigationService from "VSS/Navigation/Services";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/GettingStartedOverview";

export interface IGettingStartedOverviewProps extends Base.IProps {
    currentPage: CreateDefinitionPages;
}

export class GettingStartedOverview extends Base.Component<IGettingStartedOverviewProps, Base.IStateless> {

    constructor(props: IGettingStartedOverviewProps) {
        super(props);
    }

    public render(): JSX.Element {
        let header = Resources.CIGettingStartedHeader;
        let firstLineDescription = Resources.CIGettingStartedDescriptionLineOne;
        let secondLineDescription = Resources.CIGettingStartedDescriptionLineSecond;
        let thirdLineDescription = Resources.CIGettingStartedDescriptionLineThird;

        if (this.props.currentPage === CreateDefinitionPages.GetSources)
        {
            header = Resources.CIGettingStartedGetSourcesHeader;
            firstLineDescription = Resources.CIGettingStartedGetSourcesDescriptionLineOne;
            secondLineDescription = "";
            thirdLineDescription = Resources.CIGettingStartedGetSourcesDescriptionLineThird;
        }

        return (
            <div className="ci-getting-started-overview">
                <div className="ci-getting-started-icon">
                    <span className="icon bowtie-icon bowtie-navigate-forward-circle" />
                </div>
                <div className="ci-getting-started-header">
                    { header }
                </div>
                <div className="ci-getting-started-description">
                    <div>{ firstLineDescription }</div>
                    <div>{ secondLineDescription }</div>
                    <div>{ thirdLineDescription }</div>
                </div>
            </div>
        );
    }
}
