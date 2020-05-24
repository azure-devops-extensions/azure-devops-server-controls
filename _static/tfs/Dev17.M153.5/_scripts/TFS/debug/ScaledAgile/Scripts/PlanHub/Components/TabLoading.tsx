/// <reference types="react" />

import * as React from "react";

import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";

import { Spinner, SpinnerType } from "OfficeFabric/Spinner";

export var TabLoading: React.StatelessComponent<any> = (): JSX.Element => {
    return <div style={{ marginTop: 60, marginLeft: "auto", marginRight: "auto", width: "10%" }}>
        <Spinner className="plans-loading-spinner" aria-busy={true} type={SpinnerType.large} label={ScaledAgileResources.LoadingSpinner} />
    </div>;
};
