/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReorderButtonComponent from "MyExperiences/Scenarios/Shared/Components/ReorderButtonComponent";
import { Direction, IToolbarComponentProps } from "MyExperiences/Scenarios/Shared/Models";
import * as Diag from "VSS/Diag";
import { Fabric } from "OfficeFabric/Fabric";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";

export class ToolbarComponent extends React.Component<IToolbarComponentProps, {}> {
    public classNameDownButton(): string {
        let downButton = (!this.props.lastGroupPosition) ? "hubgroups-reorder-button bowtie-arrow-down" : "hubgroups-reorder-button hide-down-arrow";
        return downButton;
    }

    public classNameUpButton(): string {
        let upButton = ((this.props.headerButtonIndex === "0")) ? "hubgroups-reorder-button hide-up-arrow" : "hubgroups-reorder-button bowtie-arrow-up";
        return upButton;
    }
        

    public render(): JSX.Element {

        // logic that determines which buttons to display
        var upButton = () => {
            return (<ReorderButtonComponent.ReorderButtonComponent
                        key="1"
                        buttonId={`up-arrow-button-${this.props.headerButtonIndex}`}
                        direction={Direction.Up}
                        handleReorderEvent={(direction) => this.props.handleReorderEvent(direction)}
                        ariaLabel={MyExperiencesResources.Favorites_UpArrow}
                        className={this.classNameUpButton()}
                    />
                )};

        var downButton = () => {
            return (<ReorderButtonComponent.ReorderButtonComponent
                        key="2"
                        buttonId={`down-arrow-button-${this.props.headerButtonIndex}`}
                        direction= {Direction.Down}
                        handleReorderEvent={(direction) => this.props.handleReorderEvent(direction)}
                        ariaLabel={MyExperiencesResources.Favorites_DownArrow}
                        className={this.classNameDownButton()}
                    />
                )};

        var buttons: JSX.Element[] = [];

        buttons.push(upButton());
        buttons.push(downButton());

        return (
            <div className="button-focus hide-arrows" tabIndex={-1}>
                 { buttons }
            </div>
        );
    }
}