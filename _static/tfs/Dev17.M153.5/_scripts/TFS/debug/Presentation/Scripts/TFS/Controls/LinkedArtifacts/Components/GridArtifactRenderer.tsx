import * as React from 'react';

import { IArtifactData } from "VSS/Artifacts/Services";

import { IDisplayOptions } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Interfaces";
import { IInternalLinkedArtifactPrimaryData } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";

import { PrimaryArtifact } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Components/ArtifactRenderer";

export interface IArtifactGridComponentProps {
    displayOptions: IDisplayOptions;

    primaryData: IInternalLinkedArtifactPrimaryData;
    onDelete: React.EventHandler<React.MouseEvent<HTMLElement>>;

    hostArtifact: IArtifactData;
    primaryArtifactGridClassName?: string;
}

/** This component is used when an artifact is rendered in the legacy VSSF grid control. Since it's not REACT
    based, we cannot use React components for performance reasons. */
export var ArtifactGridComponent = (props: IArtifactGridComponentProps): Element => {    
    let wrapper = document.createElement("div");
    
    // Primary artifact data
    wrapper.appendChild(PrimaryArtifact.GridComponent({
        primaryData: props.primaryData,
        hostArtifact: props.hostArtifact,
        className: props.primaryArtifactGridClassName
    }));

    return wrapper;
}