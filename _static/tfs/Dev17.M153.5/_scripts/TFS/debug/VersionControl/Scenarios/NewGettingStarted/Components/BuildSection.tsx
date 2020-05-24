import * as React from "react"
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { DefaultButton } from "OfficeFabric/Button";
import "VSS/LoaderPlugins/Css!VersionControl/BuildSection"

export interface BuildSectionProps {
    buildUrl: string;
}

export const BuildSection = (props: BuildSectionProps): JSX.Element => {
    return (
        <div className="build-section" >
            <DefaultButton
                className="bowtie build-button"
                href={props.buildUrl}>
                {VCResources.GettingStarted_BuildButtonText}
            </DefaultButton>
        </div>
    );
}
