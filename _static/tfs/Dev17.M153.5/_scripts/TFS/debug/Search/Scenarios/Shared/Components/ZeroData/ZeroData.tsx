import * as React from "react";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IZeroDataProps, ScenarioType } from "Search/Scenarios/Shared/Components/ZeroData/ZeroData.Props"
import "VSS/LoaderPlugins/Css!Search/Scenarios/Shared/Components/ZeroData/ZeroData";

export class ZeroData extends React.Component<IZeroDataProps, {}> {
    public render(): JSX.Element {
        const imgSrcUrl = getImgSrcUrl(this.props.scenario);
        return (
            <div className="search-ZeroData--container">
                <div className="zero-data">
                    {
                        imgSrcUrl &&
                        <img className="icon" src={imgSrcUrl} alt="" />
                    }
                    <div className="message">{this.props.message}</div>
                    <div className="suggestion">{this.props.help}</div>
                </div>
            </div>
        );
    }

    public componentDidMount(): void {
        if (this.props.onDidMount) {
            this.props.onDidMount();
        }
    }
}

function getImgSrcUrl(scenario: ScenarioType): string {
    if (scenario === ScenarioType.ZeroResults ||
        scenario === ScenarioType.PrefixWildCardNotSupported ||
        scenario === ScenarioType.EmptyQueryNotSupported ||
        scenario === ScenarioType.OnlyWildcardQueryNotSupported ||
        scenario === ScenarioType.ZeroResultsWithWildcard ||
        scenario === ScenarioType.ZeroResultsWithFilter ||
        scenario === ScenarioType.ZeroResultsWithWildcardAndFilter ||
        scenario === ScenarioType.ZeroResultsWithNoWildcardNoFilter ||
        scenario === ScenarioType.WildcardQueriesWithCEFacetsNotSupported ||
        scenario === ScenarioType.PhraseQueriesWithCEFacetsNotSupported
        ) {
        return TfsContext.getDefault().configuration.getResourcesFile("NoResults.svg");
    }

    if (scenario === ScenarioType.NoPermission ||
        scenario === ScenarioType.NoPermissionAfterShowMore ||
        scenario === ScenarioType.NoPermissionWithShowMore) {
        return TfsContext.getDefault().configuration.getResourcesFile("NoPermission.svg");
    }

    if (scenario === ScenarioType.ServiceError ||
        scenario === ScenarioType.IndexingScenario) {
        return TfsContext.getDefault().configuration.getResourcesFile("ServiceError.svg");
    }
}