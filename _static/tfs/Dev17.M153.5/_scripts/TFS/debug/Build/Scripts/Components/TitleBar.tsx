/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";

import "VSS/LoaderPlugins/Css!Build/TitleBar";

import { Fabric } from "OfficeFabric/components/Fabric/Fabric";

export const TitleBar = (props: any): JSX.Element => {
    // to handle specificity issue
    const titleBarStyles: React.CSSProperties = {
        fontWeight: 200,
        fontSize: 18
    };

    return <Fabric
        className="build-title-bar bowtie"
        style={titleBarStyles}>
        {props.children}
    </Fabric>;
}