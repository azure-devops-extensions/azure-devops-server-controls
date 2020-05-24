import * as React from "react";
import Resources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";

export var TabLoadingSpinner: React.StatelessComponent<any> = (): JSX.Element => {
    return <div className="tab-loading">
        <Spinner className="dashboards-loading-spinner" type={SpinnerType.large} label={Resources.Loading} />
    </div>
};