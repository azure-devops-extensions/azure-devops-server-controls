import * as React from "react";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { Link } from "OfficeFabric/Link";
import { ShowMoreRowProps } from "Search/Scenarios/Shared/Components/ShowMoreRow/ShowMoreRow.Props";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Shared/Components/ShowMoreRow/ShowMoreRow";

export const ShowMoreRow: React.StatelessComponent<ShowMoreRowProps> = (props: ShowMoreRowProps) => {
    return (
        <div className={`show-more ${ props.className }`}>
            <div className="cell-content">
                <div className="center-align">
                    <Link className="show-more-results"
                        onClick={props.onClick} >
                        {Resources.ShowMoreResultsLabel}
                    </Link>
                </div>
            </div>
        </div>);
}