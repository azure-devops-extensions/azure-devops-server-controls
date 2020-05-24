/// <reference types="react" />

import React = require("react");

import {Icon} from "Build/Scripts/Components/Icon";
import {injectSourceProvider} from "Build/Scripts/Components/InjectSourceProvider";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import { BuildRepository } from "TFS/Build/Contracts";

import { format } from "VSS/Utils/String";

interface RepositoryLinkPureProps {
    iconClassName: string;
    repositoryName: string;
    link: string;
}

const RepositoryLinkComponentPure = (props: RepositoryLinkPureProps): JSX.Element => {
    let repositoryNameElement = null;
    if (props.link) {
        repositoryNameElement = <a className="summary-item-detail" aria-label={format(BuildResources.RepositoryLinkText, props.repositoryName)} href={ props.link }>{ props.repositoryName }</a>;
    }
    else {
        repositoryNameElement = <span className="summary-item-detail">{ props.repositoryName }</span>;
    }

    return <span>
        <Icon iconClassName={ props.iconClassName } />
        { repositoryNameElement }
    </span>;
};

export interface Props {
    repository: BuildRepository;
}

export const RepositoryLink = (props: Props) => {
    return injectSourceProvider((sourceProviderManager) => {
        let iconClassName: string = "";
        let manager = sourceProviderManager.result;
        let link = "";
        if (manager) {
            let iconClass = manager.getRepoIconClass(props.repository.type);
            if (iconClass) {
                iconClassName = "detail-icon icon bowtie-icon " + iconClass;
            }

            link = manager.getRepositoryLink(null, props.repository.id, props.repository.type, props.repository.name);
        }

        return <RepositoryLinkComponentPure iconClassName={ iconClassName } repositoryName={ props.repository.name } link={ link } />;
    });
}
