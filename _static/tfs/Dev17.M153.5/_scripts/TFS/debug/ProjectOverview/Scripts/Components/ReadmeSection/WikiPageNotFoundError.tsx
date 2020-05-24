import * as React from "react";
import { RepoConstants } from "Wiki/Scripts/CommonConstants";
import { getExternalWikiHubPageViewUrl } from "Wiki/Scripts/WikiUrls";
import { FormattedMessage, IFormattedMessageLink } from "Presentation/Scripts/TFS/Components/FormattedMessage";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";

export const WikiPageNotFoundError = (): JSX.Element => {
    // TODO: Task 1147410: Handle Search and Project overview links for old/new format
    const links: IFormattedMessageLink[] = [
        {
            text: ProjectOverviewResources.ChangeReadmeDialog_ClickHere,
            href: getExternalWikiHubPageViewUrl(null, { pagePath: RepoConstants.RootPath })
        },
    ];

    return (
        <div id={"wiki-page-error"}>
            <FormattedMessage
                message={ProjectOverviewResources.ChangeReadmeDialog_WikiHomePageErrorMessage}
                links={links}
            />
        </div>
    );
}
