/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import { IHubStore, HubItemGroup, IHubItem, IHubGroupColumn, Direction} from "MyExperiences/Scenarios/Shared/Models";
import * as HubGroup from "MyExperiences/Scenarios/Shared/Components/HubGroup";
import { HubActions } from "MyExperiences/Scenarios/Shared/Actions";

export interface HubGroupViewComponentProps {
    groups: HubItemGroup<IHubItem>[];
    allowGroupReordering: boolean;
}

export class HubGroupReorderComponent extends React.Component<HubGroupViewComponentProps, {}> {
    constructor(props: HubGroupViewComponentProps) {
        super(props);

        this.state = {
            groups: this.props.groups
        };
    }

    private onReorderClick(direction: Direction, index: number, groups: HubItemGroup<IHubItem>[]): void {
        HubActions.HubGroupSwapAction.invoke({ direction: direction, index: index, groups: groups });
    }

    public render(): JSX.Element {
        var groups = this.props.groups;

        var hubGroupElements: JSX.Element[] = [];
        for (let i = 0; i < groups.length; ++i) {

            if (this.props.allowGroupReordering) {
                if (this.props.groups.length > 1) {
                    groups[i].toolbarProps = {
                        handleReorderEvent: (direction) => { this.onReorderClick(direction, i, groups)},
                        headerButtonIndex: i.toString(),
                        showDown: groups.length > 1 && i !== groups.length - 1,
                        showUp: groups.length > 1 && i !== 0,
                        lastGroupPosition: i == groups.length - 1
                    };
                    groups[i].headerIndex = i.toString();
                    groups[i].isFirstGroup = i == 0;
                    groups[i].isSecondGroup = i === 1;
                    groups[i].isSecondToLastGroup = i === groups.length - 2;
                    groups[i].isLastGroup = i == groups.length - 1;
                }
            }

            var singleGroup =
                // @TODO: remove the "as any" below. Don't try to spread a class instance.
                <li key={groups[i].id} >
                    <HubGroup.HubGroup { ...(groups[i] as any)} />
                </li>;
            hubGroupElements.push(singleGroup);
        }

       return <ul className="hub-groups"> {hubGroupElements} </ul>;
    }
}