import * as React from "react";
import * as FabricOverlay from "OfficeFabric/Overlay";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { ISearchOverlayProps } from "Search/Scenarios/Shared/Components/SearchOverlay/SearchOverlay.Props";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Shared/Components/SearchOverlay/SearchOverlay";

export const SearchOverlay: React.StatelessComponent<ISearchOverlayProps> = (props: ISearchOverlayProps) => {
    return (
        <FabricOverlay.Overlay
            className={`search-InProgress--overlay ${props.className}`} >
            <Spinner
                className="spinner"
                size={props.spinnerSize ? props.spinnerSize : SpinnerSize.medium}
                label={props.spinnerText ? props.spinnerText : Resources.LoadingMessage} />
        </FabricOverlay.Overlay >
    );
}
