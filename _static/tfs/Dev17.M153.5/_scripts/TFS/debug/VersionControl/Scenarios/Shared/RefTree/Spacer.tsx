import * as React from "react";

import "VSS/LoaderPlugins/Css!VersionControl/Shared/RefTree/Spacer";

export interface SpacerProps {
    depth: number;
}

export const Spacer = (props: SpacerProps): JSX.Element => {
    const spacers: JSX.Element[] = [];
    if (props.depth) {
        for (let i = 0; i < props.depth; ++i) {
            spacers.push(<span className="bowtie-icon bowtie-chevron-right vc-transparent-icon" key={i} />);
        }
    }
    return (
        <div className="vc-ref-tree-spacer-container" >
            {spacers}
        </div>
    );
}