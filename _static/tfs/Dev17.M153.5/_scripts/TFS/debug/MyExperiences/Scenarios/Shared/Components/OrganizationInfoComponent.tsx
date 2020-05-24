import * as React from "react";
import { Link } from "OfficeFabric/Link";
import { css } from "OfficeFabric/Utilities";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import { IOrganizationInfo } from "MyExperiences/Scenarios/Shared/Models";

import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/Shared/Components/OrganizationInfoComponent";

export function OrganizationInfoComponent(props: IOrganizationInfo): JSX.Element {
    const { organizationName, organizationUrl } = props;

    return (
        <div className="org-info-container">
            <VssIcon className={"org-icon"} iconName={"CityNext"} iconType={VssIconType.fabric} />
            <Link className={"org-link"} href={organizationUrl}>
                {organizationName}
            </Link>
        </div>
    );
}
