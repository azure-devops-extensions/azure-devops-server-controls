import * as Utils_String from "VSS/Utils/String";

import { Filter } from "VSSUI/Utilities/Filter";

import { IUpstreamSettingsRowData } from "Package/Scripts/Components/Settings/UpstreamSettingsList";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";

export class UpstreamSettingsListFilterKeys {
    public static protocol = "protocol";
}

export function filterUpstreamSettingsList(
    filter: Filter,
    upstreamSourceRows: IUpstreamSettingsRowData[]
): IUpstreamSettingsRowData[] {
    const protocolFilter = filter.getFilterItemValue<IPackageProtocol[]>(UpstreamSettingsListFilterKeys.protocol);

    const filteredResults = upstreamSourceRows.filter(dataRow => {
        if (
            protocolFilter &&
            protocolFilter.length &&
            !protocolFilter.some(protocol => protocol.name === dataRow.protocolName)
        ) {
            return false;
        }

        return true;
    });

    return filteredResults;
}
