/// <reference types="react" />
/// <reference types="react-dom" />
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Fabric } from "OfficeFabric/Fabric";
import { StatefulSplitter } from "Presentation/Scripts/TFS/Components/StatefulSplitter";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { StoresHub } from "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";

export interface PageProps {
    leftPaneContent: JSX.Element;
    rightPaneContent: JSX.Element;
    headerPaneContent: JSX.Element;
}

export function renderInto(container: HTMLElement, props: PageProps): void {
    ReactDOM.render(
        <Page {...props} />,
        container);
}

const Page = (props: PageProps) =>
    <div className="absolute-full">
        <Fabric className="vc-page absolute-full">
            <div className="vc-change-details-header-pane">
                {props.headerPaneContent}
            </div>
            <StatefulSplitter
                className="hub-splitter vc-splitter"
                statefulSettingsPath="VC.ChangeDetails.LeftHubSplitter"
                vertical={false}
                left={<LeftPane {...props} />}
                right={<RightPane {...props} />}
                enableToggleButton={true}
                collapsedLabel={VCResources.TfsChangeListTreeLabel} />
        </Fabric>
    </div>;

const LeftPane = ({leftPaneContent}: PageProps) =>
    <div className="leftPane hotkey-section hotkey-section-0" role="navigation" aria-label={VCResources.TfsChangeListTreeLabel}>
        <div className="left-hub-content">
            <div className="version-control-item-left-pane">
                {leftPaneContent}
            </div>
        </div>
    </div>;

const RightPane = ({rightPaneContent}: PageProps) =>
    <div className="rightPane hotkey-section hotkey-section-1" role="main">
        <div className="right-hub-content">
            <div className="vc-right-hub-summary-container">
                {rightPaneContent}
            </div>
            <div className="hub-pivot">
                <div className="views" />
                <div className="filters" />
            </div>
            <div className="hub-pivot-content">
                <div className="version-control-item-right-pane mode-changes-explorer" />
            </div>
        </div>
    </div>;

