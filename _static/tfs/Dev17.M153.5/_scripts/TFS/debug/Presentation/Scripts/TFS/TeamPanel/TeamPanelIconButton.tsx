import * as TeamPanelResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { IconButton } from "OfficeFabric/Button";
import * as React from "react";
import { IconType } from "OfficeFabric/Icon";
import { TooltipHost } from "VSSUI/Tooltip";
import { TeamPanel } from "Presentation/Scripts/TFS/TeamPanel/TeamPanel";

export interface ITeamPanelIconButtonProps {
    projectName: string;
    projectId: string;
    teamId: string;
    teamName: string;
}

export interface ITeamPanelIconButtonState {
    isPanelOpen: boolean;
}

export class TeamPanelIconButton extends React.Component<ITeamPanelIconButtonProps, ITeamPanelIconButtonState> {
    constructor(props: ITeamPanelIconButtonProps) {
        super(props);

        this.state = {
            isPanelOpen: false
        };
    }

    public render(): JSX.Element {
        const iconProps = {
            iconName: "People",
            iconType: IconType.default,
        };

        return (
            <div>
                <TooltipHost content={TeamPanelResources.ShowTeamProfile}>
                    <IconButton
                        className="team-panel-button"
                        ariaLabel={TeamPanelResources.ShowTeamProfile}
                        onClick={this._onClick}
                        iconProps={iconProps}>
                    </IconButton>
                </TooltipHost >
                {this.state.isPanelOpen && (
                    <TeamPanel
                        teamPanelContext={this.props}
                        onDismiss={this._onTeamPanelDismiss}
                    />
                )}
            </div>
        );
    }
    private _onTeamPanelDismiss = () => {
        this.setState({ isPanelOpen: false });
    }

    private _onClick = () => {
        this.setState({ isPanelOpen: true });
    }

}