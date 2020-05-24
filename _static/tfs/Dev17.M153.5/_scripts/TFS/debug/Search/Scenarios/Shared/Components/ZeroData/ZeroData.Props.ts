export enum ScenarioType {
    ServiceError = 1,
    IndexingScenario = 2,
    ZeroResults = 3,
    PrefixWildCardNotSupported = 4,
    NoPermission = 5,
    NoPermissionWithShowMore = 6,
    NoPermissionAfterShowMore = 7,
    LandingPage = 8,
    None = 9,
    EmptyQueryNotSupported = 10,
    OnlyWildcardQueryNotSupported =11,
    ZeroResultsWithWildcard = 12,
    ZeroResultsWithFilter = 13,
    ZeroResultsWithWildcardAndFilter = 14,
    ZeroResultsWithNoWildcardNoFilter = 15,
    PhraseQueriesWithCEFacetsNotSupported = 16,
    WildcardQueriesWithCEFacetsNotSupported = 17
}

export interface IZeroDataProps {
    scenario: ScenarioType;

    message: string | JSX.Element;

    help: string | JSX.Element;

    onDidMount?: () => void;
}