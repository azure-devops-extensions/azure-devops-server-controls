/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");

import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import { Build } from "TFS/Build/Contracts";

import { ago } from "VSS/Utils/Date";

export interface RequestedForPureProps {
    displayName: string;
    agoString: string;
}

export const RequestedForPure = (props: RequestedForPureProps): JSX.Element => {
    return <span><span className="bold">{props.displayName}</span> {BuildResources.RequestedLabel} {props.agoString}</span>
};

export interface RequestedForProps {
    build: Build;
}

export const RequestedFor = (props: RequestedForProps): JSX.Element => {
    // if the build is being retrieved, displayName and queueTime may be null
    let displayName = "";
    let agoString = "";

    if (props && props.build) {
        if (props.build.requestedFor) {
            displayName = props.build.requestedFor.displayName;
        }

        if (props.build.queueTime) {
            agoString = ago(props.build.queueTime);
        }
    }

    return <RequestedForPure displayName={displayName} agoString={agoString} />;
};
