import * as BaseActionsHub from "Search/Scenarios/Shared/Base/ActionsHubV2";
import { WikiSearchRequest, WikiSearchResponse, WikiResult } from 'Search/Scripts/Generated/Search.Shared.Contracts';

export class ActionsHub extends BaseActionsHub.ActionsHub<WikiSearchRequest, WikiSearchResponse, WikiResult> {
}
