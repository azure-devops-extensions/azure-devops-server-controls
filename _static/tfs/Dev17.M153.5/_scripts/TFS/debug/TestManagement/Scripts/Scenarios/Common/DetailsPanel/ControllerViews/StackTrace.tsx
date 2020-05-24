/// <reference types="react" />
import { Link } from "OfficeFabric/Link";
import * as React from "react";
import { StackTraceLinkCreator } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Helpers/StackTraceLinkCreator";
import { StackTraceParser } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Helpers/StackTraceParser";
import {
    ILinkedStackTraceInfo,
    IParsedStackTraceInfo,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/SourceInfoProviders/common";
import {
    SourceInfoProviderFactory,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/SourceInfoProviders/SourceInfoProviderFactory";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";
import { IViewContextData } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import { Component, Props } from "VSS/Flux/Component";

export interface IStackTraceProps extends Props {
    stackTrace: string;
    linkedStackTrace: boolean;
    viewContext: IViewContextData;
}

export interface IStackTraceState {
    isParsing: boolean;
    linkedStackTraceInfo: ILinkedStackTraceInfo[];
}

export class StackTrace extends Component<IStackTraceProps, IStackTraceState> {

    constructor() {
        super();
        this.state = {
            isParsing: true,
            linkedStackTraceInfo: []
        };
    }

    public componentDidMount(): void {
        if (this.props.linkedStackTrace && !!this.props.stackTrace) {
            let sourceProvider = this._getSourceInfoProvider(this.props.viewContext);
            if (sourceProvider) {
                let stackTraceParser = new StackTraceParser();
                let parsedStackTraceInfo: IParsedStackTraceInfo[] = stackTraceParser.parseStackTrace(this.props.stackTrace);
                let stackTraceLinkCreator = new StackTraceLinkCreator(sourceProvider);
                stackTraceLinkCreator.createLinks(parsedStackTraceInfo).then((linkedStackTraceInfo: ILinkedStackTraceInfo[]) => {
                    this.setState({
                        isParsing: false,
                        linkedStackTraceInfo: linkedStackTraceInfo
                    });
                });
            }
        }
    }

    public render(): JSX.Element {
        if (!this.props.linkedStackTrace || this.state.isParsing || !this.props.stackTrace) {
            return (<div>{this.props.stackTrace}</div>);
        }
        else {
            return (<div>{this._enhanceStackTraceWithLinks(this.state.linkedStackTraceInfo)}</div>);
        }
    }

    private _enhanceStackTraceWithLinks(linkInfo: ILinkedStackTraceInfo[]): JSX.Element[] {

        let stackTraceLink: JSX.Element[] = linkInfo.map((singleLinkInfo, index) => {
            if (!!singleLinkInfo.url) {
                return (
                    <div key={singleLinkInfo.stackTrace + index} >
                        <Link href={singleLinkInfo.url}
                            target={"_blank"}
                            className={"file-url"}
                            rel={"nofollow noopener noreferrer"}
                            onClick={() => {
                                TestTabTelemetryService.getInstance().publishDetailsPaneEvents(TestTabTelemetryService.featureTestTab_StackTraceClicked, {});
                            }} >
                            {singleLinkInfo.stackTrace}
                        </Link>
                    </div>);
            } else {
                return (
                    <div key={singleLinkInfo.stackTrace + index} >
                        {singleLinkInfo.stackTrace}
                    </div>);
            }
        });

        return stackTraceLink;
    }

    private _getSourceInfoProvider(viewContext: IViewContextData) {
        if (viewContext) {
            let sourceBranch = viewContext.data.mainData.sourceBranch;
            let project = viewContext.data.mainData.project.name;
            let repository = viewContext.data.mainData.repository.id;
            let repositoryType = viewContext.data.mainData.repository.type;

            return SourceInfoProviderFactory.instance().getSourceInfoProvider(repositoryType, repository, project, sourceBranch);
        }

        return null;
    }
}

