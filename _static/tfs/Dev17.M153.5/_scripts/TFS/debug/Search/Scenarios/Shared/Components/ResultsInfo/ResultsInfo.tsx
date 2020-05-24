import * as React from "react";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { Link } from "OfficeFabric/Link"
import { IResultsInfoProps } from "Search/Scenarios/Shared/Components/ResultsInfo/ResultsInfo.Props";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Shared/Components/ResultsInfo/ResultsInfo";

export const ResultsInfo: React.StatelessComponent<IResultsInfoProps> = (props: IResultsInfoProps) => {
    return (
        <div className="resultsInfo--container">
            <span className="info-message" aria-live="assertive">{props.infoMessage}</span>
            {
                props.isHosted && <span className="feedback-link">
                    <Link href={props.mailToLink} onClick={props.onFeedbackLinkInvoked}>
                        {Resources.ProvideFeedbackLabel}
                    </Link>
                </span>
            }
        </div>);
}