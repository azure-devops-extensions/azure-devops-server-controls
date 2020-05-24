/// <reference types="react" />

import * as React from "react";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";

import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/LoadingComponent";

// Resources
import * as Resources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

export class LoadingComponent extends React.Component<any, {}> {
    constructor(options?: any) {
        super(options);
    }

    public render(): JSX.Element {
        return <div className="loading-container">
            <Spinner type={SpinnerType.large} label={Resources.Loading} />
        </div>;
    }
}