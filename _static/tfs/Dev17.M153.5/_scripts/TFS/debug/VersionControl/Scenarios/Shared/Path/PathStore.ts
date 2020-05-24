import * as VSSStore from  "VSS/Flux/Store";
import { PathParser } from  "VersionControl/Scenarios/Shared/Path/PathParser";

export interface PathState {
    isGit: boolean;
    repositoryName: string;
    path: string;
    isRoot: boolean;
    folders: FolderPart[];
    itemName: string;
    isDirty: boolean;
    isEditing: boolean;
    inputText: string;
}

export interface FolderPart {
    name: string;
    path: string;
}

/**
 * A store containing the state of the path of the current item.
 */
export class PathStore extends VSSStore.Store {
    public state = {} as PathState;

    public changeRepository = (repositoryName: string, isGit: boolean) => {
        this.state = {
            isGit,
            repositoryName,
            folders: [],
            inputText: "",
        } as PathState;

        this.emitChanged();
    }

    public startEditing = (text: string) => {
        this.state.isEditing = true;
        this.state.inputText = text || "";
        this.emitChanged();
    }

    public cancelEditing = () => {
        this.state.isEditing = false;
        this.state.inputText = "";

        this.emitChanged();
    }

    public changeInputText = (text: string): void => {
        if (text != undefined) {
            this.state.inputText = text;
            this.emitChanged();
        }
    }

    /**
     * Sets a new path and resets other state.
     */
    public setPath = (path: string) => {
        if (this.state.path === path &&
            !this.state.isEditing &&
            !this.state.isDirty) {
            return;
        }

        this.state.path = path;
        this.state.isEditing = false;
        this.state.inputText = "";

        const parser = new PathParser(path);
        this.state.isRoot = parser.isRoot;
        this.state.folders = parser.folders.map((name, index) => ({ name, path: parser.getFolderPath(index) }));
        this.state.itemName = parser.lastPartName;
        this.state.isDirty = false;

        if (!this.state.isGit) {
            this.state.repositoryName = parser.getRootPath();
        }

        this.emitChanged();
    }

    public changeDirty = (isDirty: boolean) => {
        if (this.state.isDirty !== isDirty) {
            this.state.isDirty = isDirty;

            this.emitChanged();
        }
    }
}
