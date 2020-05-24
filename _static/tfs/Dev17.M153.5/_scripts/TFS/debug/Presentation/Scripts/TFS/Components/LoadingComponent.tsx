import "VSS/LoaderPlugins/Css!Presentation/Components/LoadingComponent";

import * as React from "react";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";

// Resources
import Resources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");

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