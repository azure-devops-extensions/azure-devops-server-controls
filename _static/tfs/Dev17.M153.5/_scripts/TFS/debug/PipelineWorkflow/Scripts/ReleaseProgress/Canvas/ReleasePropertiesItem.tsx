import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";
import { ReleaseDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseDetailsView";

export class ReleasePropertiesItem implements Item {

    public getOverview(instanceId?: string): JSX.Element {
        return null;
    }

    public getDetails(): JSX.Element {
        return (
            <ReleaseDetailsView />
        );
    }

    public getKey(): string {
        return "cd-release-properties";
    }
}
