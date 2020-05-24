import * as React from "react";
import { css } from "OfficeFabric/Utilities";

import { TreeCellProps, TreeCell } from "Presentation/Scripts/TFS/Components/Tree/TreeCell";

import { WikiPage } from "TFS/Wiki/Contracts";
import { WikiTreeNodeDraggable, WikiTreeNodeDraggableProps } from "Wiki/Scenarios/Overview/Components/WikiTreeNodeDraggable";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Overview/Components/WikiTreeNode";

export interface WikiTreeNodeProps extends TreeCellProps, WikiTreeNodeDraggableProps { }

export const WikiTreeNode = (props: WikiTreeNodeProps): JSX.Element => (
    <WikiTreeNodeDraggable {...props}>
        {
            props.item && props.item.isNonConformant &&
            <span className={css("tree-node-icon", "bowtie-icon", "bowtie-status-warning") } />
        }
        <TreeCell {...props} />
    </WikiTreeNodeDraggable>
);
