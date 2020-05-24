import * as React from "react";

import { DefinitionMetrics } from "Build.Common/Scripts/Generated/TFS.Build2.Common"

export interface ActivityProps {
    queuedBuilds: number;
    runningBuilds: number;
}

export class Activity extends React.Component<ActivityProps, {}> {

    public render(): JSX.Element {
        const queuedBuilds = this.props.queuedBuilds;
        const runningBuilds = this.props.runningBuilds
        let runningElement: JSX.Element = null;
        let queuedElement: JSX.Element = null;
        if (runningBuilds > 0) {
            runningElement = (<div aria-label={DefinitionMetrics.CurrentBuildsInProgress + runningBuilds}>
                <span className="metric-number">{runningBuilds}</span>
                <span className="metric-icon bowtie-icon bowtie-play-fill"></span>
                </div>);
        }
        if (queuedBuilds > 0) {
            queuedElement = (<div aria-label={DefinitionMetrics.CurrentBuildsInQueue + queuedBuilds}>
                <span className="metric-icon bowtie-icon icon build-muted-icon-color bowtie-build-queue"></span>
                <span className="metric-number">{queuedBuilds}</span>
            </div>);
        }
        if(queuedBuilds > 0 || runningBuilds > 0) {
            return (<div className="metricsContainer">
                <span className="runningContainer">
                {runningElement}
                </span>|<span className="queuedContainer">
                {queuedElement}
                 </span>
            </div>);
        }
        return (<div></div>);
    }
}