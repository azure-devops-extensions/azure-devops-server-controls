/// <reference types="react" />

import React = require("react");

import { injectSourceProvider } from "Build/Scripts/Components/InjectSourceProvider";
import { LinkWithKeyBinding } from "Build/Scripts/Components/LinkWithKeyBinding";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { QueryResult } from "Build/Scripts/QueryResult";
import { SourceProviderManager } from "Build/Scripts/SourceProviderManager";

import { Build, Change } from "TFS/Build/Contracts";

import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

interface Props extends SourceVersionLinkProps {
    sourceProviderManager: QueryResult<SourceProviderManager>;
}

class Component extends React.Component<Props, any> {
    public render(): JSX.Element {
        // ensure sourceprovidermanager is not in pending state and there is change
        // for some cases, source version might be null (and hence change would have no id)
        if (!this.props.sourceProviderManager.pending && this.props.change && this.props.change.id) {
            let sourceProviderManager = this.props.sourceProviderManager.result;

            let text = sourceProviderManager.getChangeText(this.props.change);
            let changeIconClass = sourceProviderManager.getChangeIconClass(this.props.change);

            let changeIcon: JSX.Element = null;
            if (changeIconClass) {
                changeIcon = <div className={"icon bowtie-icon " + changeIconClass}></div>
            }

            return <LinkWithKeyBinding
                title={BuildResources.ViewCommitDetailsText}
                href={sourceProviderManager.getSourceVersionLink(TFS_Host_TfsContext.TfsContext.getDefault(), this.props.build)}
                icon={changeIcon}
                text={text}
                />;
        }
        else {
            return <span />;
        }
    }

    public shouldComponentUpdate(nextProps: Props, nextState: any): boolean {
        return this.props.sourceProviderManager.pending !== nextProps.sourceProviderManager.pending
            || this.props.sourceProviderManager.result !== nextProps.sourceProviderManager.result
            || this.props.sourceProviderManager.result.getChangeText(this.props.change) !== nextProps.sourceProviderManager.result.getChangeText(nextProps.change)
            || this.props.sourceProviderManager.result.getChangeIconClass(this.props.change) !== nextProps.sourceProviderManager.result.getChangeIconClass(nextProps.change);
    }
}

export interface SourceVersionLinkProps {
    build: Build;
    change: Change;
}

export const SourceVersionLink = (props: SourceVersionLinkProps) => {
    return injectSourceProvider((sourceProviderManager) => {
        return <Component {...props} sourceProviderManager={sourceProviderManager} />
    });
}
