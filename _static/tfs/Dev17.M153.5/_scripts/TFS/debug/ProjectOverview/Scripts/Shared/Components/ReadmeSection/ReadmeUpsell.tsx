import * as React from "react";

import { Upsell } from "ProjectOverview/Scripts/Components/Upsell";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";

export const ReadmeUpsell = (props: {
    isCreateReadmeEnabled: boolean;
    description: string;
    headingLevel: number;
    onCreateReadmeClick: () => void;
}) => {
    return (
        <Upsell
            imageCssClass={"bowtie-file-content"}
            heading={ProjectOverviewResources.ReadmeCTA_Heading}
            description={props.description}
            onButtonClick={props.onCreateReadmeClick}
            buttonText={ProjectOverviewResources.ReadmeCTA_Create}
            learnMoreText={ProjectOverviewResources.ReadmeCTA_LearnMore}
            learnMoreURL={ProjectOverviewResources.Readme_LearnMoreLink}
            isCTAEnabled={props.isCreateReadmeEnabled}
            headingLevel={props.headingLevel} />
    );
};
