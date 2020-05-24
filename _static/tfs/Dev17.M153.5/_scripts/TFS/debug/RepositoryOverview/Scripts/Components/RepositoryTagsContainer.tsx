/// <reference types="react-dom" />
import * as React from "react";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { TooltipHost } from "VSSUI/Tooltip";
import { css } from 'OfficeFabric/Utilities';
import * as Utils_String from "VSS/Utils/String";

import * as RepositoryOverviewContracts from "RepositoryOverview/Scripts/Generated/Contracts";
import * as RepositoryOverviewResources from "RepositoryOverview/Scripts/Resources/TFS.Resources.RepositoryOverview";

export interface RepositoryTagsContainerProps {
    className: string;
    languagesInfo: RepositoryOverviewContracts.RepositoryLanguageInfo[];
}

export const RepositoryTagsContainer = (props: RepositoryTagsContainerProps): JSX.Element => {
    return props.languagesInfo && props.languagesInfo.length > 0 &&
        <div className={props.className}>
            <RepositoryLanguages languagesInfo={props.languagesInfo} />
        </div>;
}

const RepositoryLanguages = (props: { languagesInfo: RepositoryOverviewContracts.RepositoryLanguageInfo[] }): JSX.Element => {
    return (
        <span className="ro-languages" aria-label={RepositoryOverviewResources.RepoLanguages_AriaLabel}>
            {props.languagesInfo.map(
                ((value: RepositoryOverviewContracts.RepositoryLanguageInfo) => {
                    return (
                        <TagItem
                            key={value.name}
                            text={value.name}
                            toolTip={`${value.percentage} %`}
                            ariaLabel={Utils_String.format(RepositoryOverviewResources.Language_ItemNameAriaLabel, value.name, value.percentage)}/>
                    );
                }))
            }
        </span>
    );
}

interface TagItemProps {
    toolTip: string;
    text: string; 
    ariaLabel: string;
    className?: string
}

const TagItem = (props: TagItemProps): JSX.Element => {
    return (
        <TooltipHost
            content={props.toolTip}
            directionalHint={DirectionalHint.bottomCenter}>
            <span
                aria-label={props.ariaLabel}
                className={css("ro-tag-item", props.className)}>
                {props.text}
            </span>
        </TooltipHost>
    );
}