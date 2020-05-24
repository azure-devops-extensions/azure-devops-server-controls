import * as React from "react";
import { delay } from "VSS/Utils/Core";
import { KeyboardAccesibleComponent } from "Presentation/Scripts/TFS/Components/KeyboardAccessible";
import { Upsell } from "ProjectOverview/Scripts/Components/Upsell";
import { ProjectInfoState } from "ProjectOverview/Scripts/Stores/ProjectInfoStore";
import { UpsellTypes } from "ProjectOverview/Scripts/Generated/Contracts";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";
import * as TelemetryClient from "ProjectOverview/Scripts/TelemetryClient";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/UpsellSection";

/**
 * TODO:
 *   1. Update the empty props once support is server support is added
 *   2. Add missing URLs for learn more links - for release upsell
 */

export interface UpsellSectionProps {
    projectInfoState: ProjectInfoState;
    upsellToShow: UpsellTypes;
    onAddBuildClick: () => void;
    onAddWorkClick: () => void;
    onAddReleaseClick: () => void;
    onAddCodeClick: () => void;
    onDismissUpsell: (upsellType: UpsellTypes) => void;
    headingLevel: number;
}

export class UpsellSection extends React.Component<UpsellSectionProps, {}> {
    constructor(props: UpsellSectionProps, context?: any) {
        super(props, context);
    }

    public render() {
        return (
            <div className="upsell-section-container">
                {
                    (this.props.upsellToShow === UpsellTypes.Build) &&
                    <BuildUpsell
                        onAddBuildClick={this.props.onAddBuildClick}
                        onHideUpsellClick={() => this.props.onDismissUpsell(UpsellTypes.Build)}
                        headingLevel={this.props.headingLevel} />
                }
                {
                    (this.props.upsellToShow === UpsellTypes.Code) &&
                    <CodeUpsell
                        onAddCodeClick={this.props.onAddCodeClick}
                        onHideUpsellClick={() => this.props.onDismissUpsell(UpsellTypes.Code)}
                        headingLevel={this.props.headingLevel} />
                }
                {
                    (this.props.upsellToShow === UpsellTypes.Release) &&
                    <ReleaseUpsell
                        onAddReleaseClick={this.props.onAddReleaseClick}
                        onHideUpsellClick={() => this.props.onDismissUpsell(UpsellTypes.Release)}
                        headingLevel={this.props.headingLevel} />
                }
                {
                    (this.props.upsellToShow === UpsellTypes.Work) &&
                    <WorkUpsell
                        onAddWorkClick={this.props.onAddWorkClick}
                        onHideUpsellClick={() => this.props.onDismissUpsell(UpsellTypes.Work)}
                        headingLevel={this.props.headingLevel} />
                }
            </div>);
    }

    private _getUpsellKey = (upsellType: string): string => {
        return this.props.projectInfoState.projectInfo.info.id + "-" + upsellType;
    }
}
const BuildUpsell = (props: {
    onAddBuildClick: () => void,
    onHideUpsellClick: () => void,
    headingLevel: number,
}): JSX.Element => {
    return (
        <Upsell
            cssClass="upsell-section"
            onCloseUpsellClick={props.onHideUpsellClick}
            imageCssClass={"ms-svg-illustration ms-svg-illustration-build"}
            imageFileName={"illustration-build.svg"}
            heading={ProjectOverviewResources.Upsells_Build_Heading}
            description={ProjectOverviewResources.Upsells_Build_Description}
            onButtonClick={props.onAddBuildClick}
            buttonText={ProjectOverviewResources.Upsells_Build_ButtonText}
            isButtonCTA={true}
            learnMoreText={ProjectOverviewResources.Upsells_Build_LearnMoreText}
            learnMoreURL={ProjectOverviewResources.Upsells_Build_LearnMoreLink}
            isCTAEnabled={true}
            headingLevel={props.headingLevel} />
    );
};

const ReleaseUpsell = (props: {
    onAddReleaseClick: () => void,
    onHideUpsellClick: () => void,
    headingLevel: number,
}): JSX.Element => {
    return (
        <Upsell
            cssClass="upsell-section"
            onCloseUpsellClick={props.onHideUpsellClick}
            imageCssClass={"ms-svg-illustration ms-svg-illustration-release"}
            imageFileName={"illustration-release.svg"}
            heading={ProjectOverviewResources.Upsells_Release_Heading}
            description={ProjectOverviewResources.Upsells_Release_Description}
            onButtonClick={props.onAddReleaseClick}
            buttonText={ProjectOverviewResources.Upsells_Release_ButtonText}
            isButtonCTA={true}
            learnMoreText={ProjectOverviewResources.Upsells_Release_LearnMoreText}
            learnMoreURL={ProjectOverviewResources.Upsells_Release_LearnMoreLink}
            isCTAEnabled={true}
            headingLevel={props.headingLevel} />
    );
};

const WorkUpsell = (props: {
    onAddWorkClick: () => void,
    onHideUpsellClick: () => void,
    headingLevel: number,
}): JSX.Element => {
    return (
        <Upsell
            cssClass="upsell-section"
            onCloseUpsellClick={props.onHideUpsellClick}
            imageCssClass={"ms-svg-illustration ms-svg-illustration-work"}
            imageFileName={"illustration-work.svg"}
            heading={ProjectOverviewResources.Upsells_Work_Heading}
            description={ProjectOverviewResources.Upsells_Work_Description}
            onButtonClick={props.onAddWorkClick}
            buttonText={ProjectOverviewResources.Upsells_Work_ButtonText}
            isButtonCTA={true}
            learnMoreText={ProjectOverviewResources.Upsells_Work_LearnMoreText}
            learnMoreURL={ProjectOverviewResources.Upsells_Work_LearnMoreLink}
            isCTAEnabled={true}
            headingLevel={props.headingLevel} />
    );
};

const CodeUpsell = (props: {
    onAddCodeClick: () => void,
    onHideUpsellClick: () => void,
    headingLevel: number,
}): JSX.Element => {
    return (
        <Upsell
            cssClass="upsell-section"
            onCloseUpsellClick={props.onHideUpsellClick}
            imageCssClass={"ms-svg-illustration ms-svg-illustration-work"}
            imageFileName={"illustration-code.svg"}
            heading={ProjectOverviewResources.Upsells_Code_Heading}
            description={ProjectOverviewResources.Upsells_Code_Description}
            onButtonClick={props.onAddCodeClick}
            buttonText={ProjectOverviewResources.Upsells_Code_ButtonText}
            isButtonCTA={true}
            learnMoreText={ProjectOverviewResources.Upsells_Code_LearnMoreText}
            learnMoreURL={ProjectOverviewResources.Upsells_Code_LearnMoreLink}
            isCTAEnabled={true}
            headingLevel={props.headingLevel} />
    );
};