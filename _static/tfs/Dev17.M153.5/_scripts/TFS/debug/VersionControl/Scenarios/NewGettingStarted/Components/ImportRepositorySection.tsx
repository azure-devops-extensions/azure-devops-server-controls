import * as React from "react";
import { DefaultButton } from "OfficeFabric/Button"
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import "VSS/LoaderPlugins/Css!VersionControl/ImportRepositorySection";

export interface ImportRepositorySectionProps {
    onImportRepositoryClick(): void;
}

export const ImportRepositorySection = (props: ImportRepositorySectionProps): JSX.Element => {
    return (
        <div className="import-section" >
            <DefaultButton
                className="import-button"
                onClick={() => props.onImportRepositoryClick()}>
                {VCResources.ImportRepositoryText}
            </DefaultButton>
        </div>
    );
}
