/// <reference types="react" />

import * as React from "react";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";

import { KeyCode } from "VSS/Utils/UI";
import { FavoriteToggle } from "ScaledAgile/Scripts/PlanHub/Components/FavoriteToggle";

import { PlanHubActionsCreator } from "ScaledAgile/Scripts/PlanHub/Actions/PlanHubActionsCreator";
import { TabRowPlanData } from "ScaledAgile/Scripts/PlanHub/Models/TabRowPlanData";

import { ButtonComponent } from "VSSPreview/Flux/Components/Button";
import { onClickNavigationHandler, getPlanURL } from "ScaledAgile/Scripts/Shared/Utils/PlanXhrNavigationUtils";

import { autobind } from "OfficeFabric/Utilities";

import { getId as getTooltipId } from "OfficeFabric/Utilities";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";

export interface INameColumnProps {
    plan: TabRowPlanData;
    planHubActionsCreator: PlanHubActionsCreator;
}

export class NameColumn extends React.Component<INameColumnProps, {}> {

    public render(): JSX.Element {
        const { plan } = this.props;
        const columnRootClassName = "plan-name-column-wrapper";
        const columnClassName = "plan-name-ellipsis";
        const columnTooltip = getTooltipId(columnClassName);
        if (plan.isDeleted) {
            return <div className={columnRootClassName}>
                <div className={columnClassName}>
                    <span className="bowtie-icon bowtie-plan"></span>
                     <TooltipHost
                            overflowMode={TooltipOverflowMode.Parent}
                            content={plan.name}
                            directionalHint={DirectionalHint.bottomCenter}
                            id={columnTooltip}>
                            {plan.name}
                     </TooltipHost>
                </div>
                <FavoriteToggle isDeleted={true} onToggle={this._toggle} isMyFavorite={true} />
            </div>;
        }

        // Pre-emptively show the element as favorited or unfavorited before the call returns from the svc.
        let missingFavoriteData = plan.favorite === undefined;
        const shouldShowAsFavorite = missingFavoriteData === plan.isChangingFavoriteState;
        return <div className={columnRootClassName}>
            <div className={columnClassName}>
                <span className="bowtie-icon bowtie-plan"></span>
                <a href={getPlanURL(plan.id)} onClick={this._onLinkClick} className="plan-name-title" tabIndex={0}>
                    <TooltipHost
                        overflowMode={TooltipOverflowMode.Parent}
                        content={plan.name}
                        directionalHint={DirectionalHint.bottomCenter}
                        id={columnTooltip}
                        >
                        {plan.name}
                    </TooltipHost>
                </a>
            </div>
            <FavoriteToggle onToggle={this._toggle} isMyFavorite={shouldShowAsFavorite} />
        </div>;
    }

    @autobind
    private _onLinkClick(event: React.MouseEvent<HTMLElement>) {
        onClickNavigationHandler((event.currentTarget as HTMLAnchorElement).href, event.nativeEvent);
    }

    @autobind
    private _toggle() {
        if (this.props.plan.isChangingFavoriteState) {
            return;
        }

        if (this.props.plan.favorite) {
            this.props.planHubActionsCreator.unfavoritePlan(this.props.plan);
        }
        else {
            this.props.planHubActionsCreator.favoritePlan(this.props.plan);
        }
    }
}
