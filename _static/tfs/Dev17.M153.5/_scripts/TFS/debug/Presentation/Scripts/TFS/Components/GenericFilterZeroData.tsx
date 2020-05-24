import * as React from "react";
import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import * as Locations from "VSS/Locations";
import Utils_String = require("VSS/Utils/String");
import { ZeroData } from "VSSUI/Components/ZeroData/ZeroData";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

export interface IZeroDataFilterProps extends IBaseProps {
    artifactName: string;
}

/**
 * Component for displaying helpful information when there is no data to show.
 */
export class GenericFilterZeroData extends BaseComponent<IZeroDataFilterProps, {}> {
    public render(): JSX.Element {
        return <ZeroData
            imagePath={Locations.urlHelper.getVersionedContentUrl("Illustrations/general-no-results-found.svg")}
            imageAltText={""}
            primaryText={Utils_String.format(PresentationResources.GenericFilterZeroData_Message, this.props.artifactName)}
        />;
    }
}
