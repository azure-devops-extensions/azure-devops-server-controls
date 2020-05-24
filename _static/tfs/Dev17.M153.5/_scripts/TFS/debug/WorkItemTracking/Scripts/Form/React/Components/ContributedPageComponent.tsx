import React = require("react");
import { ILayoutPage } from "WorkItemTracking/Scripts/Form/Layout";
import { ContributionComponent } from "WorkItemTracking/Scripts/Form/React/Components/ContributionComponent";
import { createPageContribution } from "WorkItemTracking/Scripts/Form/Contributions";

export interface IContributedPageProps {
    page: ILayoutPage;
}

export class ContributedPageComponent extends React.Component<IContributedPageProps, {}> {

    private _controlElement: ContributionComponent;
    private _resolveControlElement = (element: ContributionComponent) => this._controlElement = element;
    private _resizeHandlerDelegate = () => this._updateSize();
    private readonly MIN_PAGE_HEIGHT: number = 150;

    public render(): JSX.Element {

        return <ContributionComponent
            contribution={this.props.page}
            createContribution={createPageContribution}
            ref={this._resolveControlElement} />;
    }

    public componentDidMount() {
        // Set the size of the contributed component so it takes all available space.
        this._updateSize();

        // Hook into resize events so we handle orientation changes properly
        window.addEventListener("resize", this._resizeHandlerDelegate);
    }

    public componentWillUnmount() {
        // Unhook from the resize event
        window.removeEventListener("resize", this._resizeHandlerDelegate);
    }

    private _updateSize() {
        // Get the remaining height below the control.
        const screenHeight = window.innerHeight;
        const contributionElement: HTMLDivElement = this._controlElement.contributionControlElement;
        const clientRect = contributionElement.getBoundingClientRect();
        let height = screenHeight - clientRect.top;

        // Get the height of the perf bar, if it exists and is visible.
        const perfBarNodes = document.body.getElementsByClassName("perf-bar-container");

        if (perfBarNodes && perfBarNodes.length == 1) {
            const perfBar: HTMLElement = perfBarNodes.item(0) as HTMLElement;

            if (this._isVisible(perfBar)) {
                height = height - perfBar.clientHeight;
            }
        }

        // Set a minimum size for these elements
        height = Math.max(height, this.MIN_PAGE_HEIGHT);

        contributionElement.style.height = height + "px";
    }

    private _isVisible(elem: HTMLElement): boolean {
        return !(elem.offsetWidth <= 0 && elem.offsetHeight <= 0);
    }
}
