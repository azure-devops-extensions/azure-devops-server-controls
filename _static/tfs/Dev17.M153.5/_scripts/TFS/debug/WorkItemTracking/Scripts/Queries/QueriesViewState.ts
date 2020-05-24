import { IVssHubViewStateOptions } from "VSSPreview/Utilities/VssHubViewState";
import { ActionParameters } from "WorkItemTracking/Scripts/ActionUrls";
import { HistoryBehavior } from "VSSPreview/Utilities/ViewStateNavigation";

import { ContributionHubViewState } from "Presentation/Scripts/TFS/Router/ContributionHubViewState";

export class QueriesViewState extends ContributionHubViewState {
    constructor(options: IVssHubViewStateOptions = null) {
        if (!options) {
            const viewStateOption: IVssHubViewStateOptions = {
                // Deserializer for the pivot navigation parameter "view"
                pivotNavigationParamDeserializer: (value: string) => value.toLowerCase(),

                viewOptionNavigationParameters: [
                    {
                        key: ActionParameters.ACTION,
                        rawString: true,
                        // Deserializer for legacy action parameter "_a"
                        deserialize: (value: string) => value.toLowerCase(),
                        behavior: HistoryBehavior.newEntry
                    },
                    {
                        key: ActionParameters.ID,
                        rawString: true,
                        behavior: HistoryBehavior.newEntry
                    },
                    {
                        key: ActionParameters.CONTEXT,
                        rawString: true,
                        behavior: HistoryBehavior.newEntry
                    },
                    {
                        key: ActionParameters.FULLSCREEN,
                        rawString: false,
                        behavior: HistoryBehavior.newEntry
                    },
                    {
                        key: ActionParameters.ISVSOPEN,
                        rawString: true,
                        behavior: HistoryBehavior.newEntry
                    },
                    {
                        key: ActionParameters.NEW_QUERY,
                        rawString: false,
                        behavior: HistoryBehavior.newEntry
                    },
                    {
                        key: ActionParameters.PARENTID,
                        rawString: true,
                        behavior: HistoryBehavior.newEntry
                    },
                    {
                        key: ActionParameters.PATH,
                        rawString: true,
                        behavior: HistoryBehavior.newEntry
                    },
                    {
                        key: ActionParameters.QUERYID,
                        rawString: true,
                        behavior: HistoryBehavior.newEntry
                    },
                    {
                        key: ActionParameters.SEARCHTEXT,
                        rawString: true,
                        behavior: HistoryBehavior.replace
                    },
                    {
                        key: ActionParameters.TEMPLATEID,
                        rawString: true,
                        behavior: HistoryBehavior.newEntry
                    },
                    {
                        key: ActionParameters.TEMPQUERYID,
                        rawString: true,
                        behavior: HistoryBehavior.newEntry
                    },
                    {
                        key: ActionParameters.TRIAGE,
                        rawString: true,
                        behavior: HistoryBehavior.newEntry
                    },
                    {
                        key: ActionParameters.WIQL,
                        rawString: true,
                        behavior: HistoryBehavior.newEntry
                    },
                    {
                        key: ActionParameters.WITD,
                        rawString: true,
                        behavior: HistoryBehavior.newEntry
                    },
                    {
                        key: ActionParameters.WORKITEMID,
                        rawString: true,
                        behavior: HistoryBehavior.newEntry
                    },
                    {
                        key: ActionParameters.NAME,
                        rawString: true,
                        behavior: HistoryBehavior.newEntry
                    }
                ]
            };

            options = viewStateOption;
        }

        super(options);
    }
}