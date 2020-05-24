import * as React from "react";

import { FileDropTarget } from "Presentation/Scripts/TFS/Components/Tree/DropTarget";
import { TreeCell, TreeCellProps } from "Presentation/Scripts/TFS/Components/Tree/TreeCell";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

import "VSS/LoaderPlugins/Css!VersionControl/FileNameCell";

export interface FileNameCellProps extends TreeCellProps {
    item: ItemModel;
    canDrop?: boolean;
    onFilesDrop?(dataDrop: DataTransfer): void;
}

export const FileNameCell = (props: FileNameCellProps): JSX.Element =>
    <FileDropTarget
        className="vc-file-name-cell-drop-target"
        isEnabled={props.canDrop}
        onFilesDrop={props.onFilesDrop}>
        <TreeCell {...props} />
    </FileDropTarget>;
