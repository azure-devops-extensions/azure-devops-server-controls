import { SearchOrgButtonEnabledSource } from "Search/Scenarios/Shared/Base/Sources/SearchOrgButtonEnabledSource";
import * as VSSContext from "VSS/Context";

export function isSearchOrgButtonEnabled(): boolean {
    const searchOrgLinkEnabledSource = new SearchOrgButtonEnabledSource();

    return VSSContext.getPageContext().webAccessConfiguration.isHosted &&
        searchOrgLinkEnabledSource.isSearchOrgButtonEnabled();
}
