import * as React from "react";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import { getService } from "VSS/Service";

import { ContributableCommandBar } from "VersionControl/Scenarios/Shared/Commands/ContributableCommandBar";

import "VSS/LoaderPlugins/Css!VersionControl/CodeHubActions";

const isVerticalNavigation = getService(FeatureManagementService).isFeatureEnabled("ms.vss-tfs-web.vertical-navigation");

export const CodeHubActionsContainer = () =>
    isVerticalNavigation
    ? <ContributableCommandBar
        className="vc-code-hub-actions-commandBar"
        items={[]}
        contributionData={{
            contributionIds: ["ms.vss-code-web.code-hub-group"],
            extensionContext: undefined,
        }}
    />
    : null;
