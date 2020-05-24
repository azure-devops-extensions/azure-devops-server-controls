import * as React from "react";
import Resources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";

export var TabLoading: React.StatelessComponent<any> = (): JSX.Element => {
    return <div className="tab-loading">
        <Spinner className="queries-loading-spinner" type={SpinnerType.large} label={Resources.Loading} />
    </div>;
};
