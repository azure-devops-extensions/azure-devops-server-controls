/// <reference types="react" />
/// <reference types="react-dom" />

import {HubItemGroup, IHubItem, IHubGroupColumn, Direction} from  "MyExperiences/Scenarios/Shared/Models";
import * as React from "react";
import * as HubSpinner from "MyExperiences/Scenarios/Shared/Components/HubSpinner";
import * as HubGroupAlert from "MyExperiences/Scenarios/Shared/Components/HubGroupAlert";
import * as DetailsList from "OfficeFabric/DetailsList";
import * as DetailsRowComponent from "OfficeFabric/components/DetailsList/DetailsRow";
import { Fabric } from "OfficeFabric/Fabric";
import { HubRow } from "MyExperiences/Scenarios/Shared/Components/HubRow";
import * as Toolbar from "MyExperiences/Scenarios/Shared/Components/ToolbarComponent";

import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/Shared/Components/HubGroup";
import "VSS/LoaderPlugins/Css!fabric";

export class HubGroup extends React.Component<HubItemGroup<IHubItem>, {}> {
    private _toolbarRef;

    public refs: {
        [key: string]: React.ReactInstance,
        toolbar: HTMLElement
    };

    /// Getting style class for the specific hub group and updating the opacity when the div is active/focused to give it a "hidden" look but still allowing accessibility.
    private onMouseOver(): void {
        this.onBlur();

        /** hide all arrows that may have been focused via keyboard so only one arrow shows at a time */
        this.addHideArrowClass(this.props.headerIndex);
        /** reveal the arrows on the current header that is being hovered over */
        this.removeHideArrowClass(this.props.headerIndex);
    }

    private onKeyboardFocus(): void {
        var allArrows: HTMLCollectionOf<Element> = document.getElementsByClassName("button-focus");
        var downArrows = document.getElementsByClassName("bowtie-arrow-down");
        
        this.removeHideArrowClass(this.props.headerIndex);
        
        /**  besides the first hub group, disable access to down arrow when tabbing through the page */
        for (let i = 0; i < downArrows.length; i++) {
            var disableDownArrowTabIndex = downArrows[i] as HTMLElement;
            if (`hub-group-header-${this.props.headerIndex}` === `hub-group-header-${i}` && !this.props.isFirstGroup) {
                disableDownArrowTabIndex.tabIndex = -1;
            }
        }
    }

    private onBlur(): void {
        var allArrows: HTMLCollectionOf<Element> = document.getElementsByClassName("button-focus");
        var downArrow = this.getCurrentArrow("bowtie-arrow-down", this.props.headerIndex);

        // removing hide-arrow classes for ALL hub groups
        for (var i = 0; i < allArrows.length; i++) {
            var hidingDisplayedArrows = allArrows[i] as HTMLElement;
            hidingDisplayedArrows.classList.add('hide-arrows');
        }

        /** adding tab index to down arrow on first hub group */
        if (`hub-group-header-${this.props.headerIndex}` === `hub-group-header-0`) {
            downArrow.tabIndex = 0;
        }
    }

    private onKeyDown(event: React.KeyboardEvent<HTMLSpanElement>): void {
        var activeElementId: string = document.activeElement.id;
        
        // retrieving the arrow we want to focus on if there > 2 hub groups
        var downArrow = this.getCurrentArrow("bowtie-arrow-down", this.props.headerIndex);
        var upArrow = this.getCurrentArrow("bowtie-arrow-up", (Number(this.props.headerIndex) - 1).toString())

        /** creating toolbar - if both arrows are present, allow left and right arrows to toggle between the displayed arrows */
        if (!this.props.isFirstGroup && !this.props.isLastGroup) {
            if (activeElementId === `up-arrow-button-${this.props.headerIndex}` && ((event.keyCode === 39) || (event.keyCode === 37))) {
                downArrow.focus();              

            } else if (activeElementId === `down-arrow-button-${this.props.headerIndex}` && ((event.keyCode == 39) || (event.keyCode === 37))) {
                upArrow.focus();
            }
        }

        /** ensure that the button we are focused on is either an up or down button for this particular hub group */
        if ((activeElementId === `up-arrow-button-${this.props.headerIndex}`) && ((event.keyCode === 13) || (event.keyCode === 32))) {
            this.props.toolbarProps.handleReorderEvent(Direction.Up);
            
            /** takes care of the scenario if there are only two hub groups and reveals/focuses on down arrow for first group */
            if (downArrow === undefined) {
                downArrow = this.revealArrow("bowtie-arrow-down", "hide-down-arrow", `down-arrow-button-${this.props.headerIndex}`);
            } 

            if (this.props.isSecondGroup) {
                downArrow.tabIndex = 0;
                downArrow.focus();
            }
            
        } else if ((activeElementId === `down-arrow-button-${this.props.headerIndex}`) && ((event.keyCode === 13 || event.keyCode === 32))) { 
            this.props.toolbarProps.handleReorderEvent(Direction.Down);
            
            /** takes care of the scenario if there are only two hub groups and reveals/focuses on up arrow for last group */
            if (upArrow === undefined) {
                upArrow = this.revealArrow("bowtie-arrow-up", "hide-up-arrow", `up-arrow-button-${this.props.headerIndex}`);
            }

            if (this.props.isSecondToLastGroup) {
                upArrow.focus();
            } 
        }
    }

    private revealArrow(showArrow: string, hideArrow: string, buttonIndexClass: string): HTMLElement {
        var arrow = document.getElementById(buttonIndexClass);
        arrow.classList.add(showArrow);
        arrow.classList.remove(hideArrow)

        return arrow;
    }

    private getCurrentArrow(arrow: string, index: string): HTMLElement {
        var allArrows: HTMLCollectionOf<Element> = document.getElementsByClassName(arrow);
        var currentArrow = allArrows[index] as HTMLElement;
        return currentArrow;
    }

    // add class for one hub group
    private addHideArrowClass(index: string): void {
        var allArrows: HTMLCollectionOf<Element> = document.getElementsByClassName("button-focus");

        for (var i = 0; i < allArrows.length; i++) {
            if (`hub-group-header-${index}` === `hub-group-header-${i}`) {
                var revealArrow = allArrows[i] as HTMLElement;
                revealArrow.classList.add('hide-arrows');
            }
        }
    }

    // remove class for one hub group
    private removeHideArrowClass(index: string): void {
        var allArrows: HTMLCollectionOf<Element> = document.getElementsByClassName('button-focus');
        
        for (var i = 0; i < allArrows.length; i++) {
            if (`hub-group-header-${index}` === `hub-group-header-${i}`) {
                var revealArrow = allArrows[i] as HTMLElement;
                revealArrow.classList.remove('hide-arrows');
            }
        }
    }

    private renderList = (group: HubItemGroup<IHubItem>): JSX.Element => {
        let columnClasses: IDictionaryStringTo<string> = {};
        let detailsListProps: DetailsList.IDetailsListProps = {
            items: group.items,
            columns: group.columns.map<DetailsList.IColumn>((column, index) => {
                return {
                    fieldName: null,
                    key: index.toString(),
                    minWidth: (column.minWidth === undefined) ? 1 : column.minWidth,
                    maxWidth: (column.maxWidth === undefined) ? Infinity : column.maxWidth,
                    name: index.toString(),
                    hubGroupColumn: column, // This is not a part of the IColumn interface but is needed for createCell
                    onRender: (item, index, column) => {
                        // Need to cast to any to access the hidden property hubGroupColumn
                        let hubGroupColumn: IHubGroupColumn<IHubItem> = (column as any).hubGroupColumn;
                        let cellInfo = hubGroupColumn.createCell(item);

                        // Restore column class name for cell and append cell class name
                        if (columnClasses[column.key] != null) {
                            column.className = columnClasses[column.key];
                        } else {
                            columnClasses[column.key] = column.className != null ? column.className : "";
                        }

                        if (cellInfo && cellInfo.className) {
                            column.className += " " + cellInfo.className;
                        }

                        return cellInfo.content;
                    },
                    className: column.className
                };
            }),
            constrainMode: DetailsList.ConstrainMode.unconstrained,
            isHeaderVisible: false,
            selectionMode: DetailsList.SelectionMode.none,
            onRenderRow: (props: DetailsRowComponent.IDetailsRowProps): JSX.Element => {
                return <HubRow rowProps={props} />;
            }
        };

        return (<DetailsList.DetailsList {...detailsListProps} />);
    };

    public renderToolbar(): JSX.Element {
        if (this.props.toolbarProps) {

            return (<span className="ms-Fabric ms-u-fadeIn200 reorder-buttons"
                tabIndex={-1}
                onFocus={() => this.onKeyboardFocus()}
                onClick={() => this.onBlur()}
                onBlur={() => this.onBlur()}
                onKeyDown={(event) => this.onKeyDown(event)}
                >
                <Toolbar.ToolbarComponent {...this.props.toolbarProps} />
            </span>);
        }
        else {
            return null;
        }
    }

    public classTitleName(): string {
        let cssTitleClass = !this.props.title ? "title-single ms-font-m" : "title ms-font-m";
        return cssTitleClass;
    }

    public render(): JSX.Element {
        var index = this.props.headerIndex;
        return (
            <div className="hub-group">
                <div className="hub-group-header"
                     id={`hub-group-header-${index}`}
                     onMouseOver={() => this.onMouseOver()}
                     onMouseLeave={() => this.onBlur()}
                     onClick={() => this.onBlur()}
                     >
                    <h2 className={this.classTitleName() }>
                        <span className="title ms-font-m">{this.props.title}</span>
                    </h2>
                    {this.renderToolbar()}
                </div>
            {
                this.props.isLoading ? <HubSpinner.HubSpinner /> :
                    this.props.alert ? <HubGroupAlert.HubGroupAlert>{this.props.alert}</HubGroupAlert.HubGroupAlert> :
                        this.renderList(this.props)
            }
        </div>
        );
    }
}

