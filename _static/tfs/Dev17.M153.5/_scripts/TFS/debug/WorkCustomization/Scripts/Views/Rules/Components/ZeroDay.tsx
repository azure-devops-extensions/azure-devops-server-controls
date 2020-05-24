/// <reference types="react" />

import "VSS/LoaderPlugins/Css!WorkCustomization/Views/Rules/Components/ZeroDay";
import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";
import * as Locations from "VSS/Locations";
import { Component, Props, State } from "VSS/Flux/Component";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { Fabric } from "OfficeFabric/Fabric";
import { PrimaryButton } from "OfficeFabric/Button";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { Link } from "OfficeFabric/Link";

export interface IZeroDayProps extends Props {
    onNewPlanCallback: () => void;
}

export class ZeroDay extends Component<IZeroDayProps, State> {

    public render(): JSX.Element {
        return <Fabric>
            <div className="zero-day-container">
                <div>
                    <img src={Locations.urlHelper.getVersionedContentUrl("WorkCustomization/custom-rules-zero-day.svg")} alt={Resources.RulesZeroDayAltText} />
                </div>
                <div className="primary ms-font-xxl">
                    <span>{Resources.RulesZeroDayTitle}</span>
                </div>
                <div className="ms-font-m">
                    <FormatComponent format={Resources.RulesZeroDaySubtitle}>
                        <Link href={Resources.CreateRuleFwLink} target="_blank" rel="external">{Resources.RulesFwLinkText}</Link>
                    </FormatComponent>
                </div>
                <div className="action">
                    <FocusZone>
                        <PrimaryButton className="new-rule-cta" text={Resources.RulesZeroDayCTAText} onClick={this.props.onNewPlanCallback}></PrimaryButton>
                    </FocusZone>
                </div>
            </div>
        </Fabric>;
    }
}