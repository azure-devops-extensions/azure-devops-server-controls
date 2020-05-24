import * as React from "react";
import { IOrganizationInfoAndCollectionsPickerSectionProps } from "MyExperiences/Scenarios/Shared/Models";
import { OrgCollectionsPickerComponent } from "MyExperiences/Scenarios/Shared/Components/OrgCollectionsPickerComponent";
import { OrganizationInfoComponent } from "MyExperiences/Scenarios/Shared/Components/OrganizationInfoComponent";

import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/Shared/Components/OrganizationInfoAndCollectionsPickerSection";

export function OrganizationInfoAndCollectionsPickerSection(props: IOrganizationInfoAndCollectionsPickerSectionProps): JSX.Element {
    const separator = "/";
    const { organizationCollectionsPickerProps, organizationInfoProps } = props;

    return !!organizationCollectionsPickerProps && !!organizationInfoProps ?
        (
            <div className={"org-info-collection-picker-container"}>
                <OrganizationInfoComponent {...organizationInfoProps} />
                <div className={"org-info-collection-picker-separator"}>
                    {separator}
                </div>
                <OrgCollectionsPickerComponent {...organizationCollectionsPickerProps} />
            </div>
        ) :
        (
            <div className="org-info-collection-picker-placeholder" />
        );
}
