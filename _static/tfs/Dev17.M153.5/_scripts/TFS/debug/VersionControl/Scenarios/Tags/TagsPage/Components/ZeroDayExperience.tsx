/// <reference types="react" />

import * as React from "react";

import { PrimaryButton } from "OfficeFabric/Button";
import { TooltipHost } from 'VSSUI/Tooltip';

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { Utils } from "VersionControl/Scenarios/Shared/Utils";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/ZeroDayExperience";

export interface ZeroDayTagsPageProps {
    onCreateTag(): void;
    canCreateTag?: boolean;
}
export const ZeroDayTagsPage = (props: ZeroDayTagsPageProps): JSX.Element => {
    return (
        <div className="zero-tags">
            <img
                alt=""
                className="zero-tags-image"
                src={TfsContext.getDefault().configuration.getResourcesFile("zeroDayTag.svg")} />
            <div className="zero-tags-top-message">{VCResources.TagsPage_ZeroDayExperience_Title}</div>
            <div className="zero-detailed-message">{VCResources.TagsPage_ZeroDayExperience_Description1}</div>
            {props.canCreateTag
                && <PrimaryButton
                    className="create-tags-button"
                    autoFocus
                    onClick={props.onCreateTag}>
                    {VCResources.CreateTagButton_TagsPage}
                </PrimaryButton>
            }
        </div>
    );
};
