import React = require("react");

import { LinkWithKeyBinding } from "Build/Scripts/Components/LinkWithKeyBinding";
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import Constants = require("Build/Scripts/Constants");
import { getPathData } from "Build/Scripts/Folders";
import { getDefinitionLink } from "Build/Scripts/Linking";

import { BuildLinks } from "Build.Common/Scripts/Linking";

import TFS_React = require("Presentation/Scripts/TFS/TFS.React");

import BuildContracts = require("TFS/Build/Contracts");

import Navigation_Services = require("VSS/Navigation/Services");
import Utils_String = require("VSS/Utils/String");
import VSS_Events = require("VSS/Events/Services");

var rootPath = "\\";

export interface DefinitionSummaryLinkProps extends TFS_React.IProps {
    definition: BuildContracts.BuildDefinitionReference;
    isFavDefinition: boolean;
    cssClass?: string;
    showFolderContext?: boolean;
}

export class DefinitionSummaryLink extends TFS_React.TfsComponent<DefinitionSummaryLinkProps, TFS_React.IState> {
    public render(): JSX.Element {
        let className = this.props.cssClass || "build-definition-entry-details-name";
        let path = this.props.definition.path || rootPath;
        let toolTipName = this.props.definition.name;
        let folderContextElement: JSX.Element = null;

        // strip off "\\" in the beginning
        let toolTipPath = path.slice(1, path.length);

        if (toolTipPath) {
            toolTipName = toolTipPath + rootPath + toolTipName;
        }

        if (this.props.showFolderContext && path != rootPath) {
            let data = getPathData(path);
            folderContextElement = <span className={className + " folder-link-container"}>
                <span
                    title={data.upLevelPath}
                    className={className + " folder-link"}>
                    {"../ "}
                </span>
                <span
                    title={path}
                    className={className + " folder-link"}>
                    {data.currentFolder + " / "}
                </span>
            </span>;
        }

        return <span>
            {folderContextElement}
            <LinkWithKeyBinding
                title={Utils_String.format(BuildResources.ViewDefinitionSummaryText, toolTipName)}
                className={className}
                href={getDefinitionLink(this.props.definition, this.props.isFavDefinition)}
                text={this.props.definition.name}/>
        </span>;
    }
}


