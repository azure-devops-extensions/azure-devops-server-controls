import * as VSSStore from "VSS/Flux/Store";
import * as Utils_String from "VSS/Utils/String";
import { BrowserCheckUtils } from "VSS/Utils/UI";
import { IPivotedTextBoxPair } from "VSSPreview/Flux/Components/PivotedTextBoxWithCopy";
import { SupportedIde, SupportedIdeType } from "TFS/VersionControl/Contracts";
import { CallbackHub } from "VersionControl/Scenarios/Shared/CallbackHub";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { IdeSource } from "VersionControl/Scenarios/NewGettingStarted/Sources/IdeSource";
import * as ActionsHub from "VersionControl/Scenarios/NewGettingStarted/ActionsHub";

const SshProtocolName = "SSH";

export interface MainState {
    isWindowsPlatform: boolean;
    isHosted: boolean;
    toggleButtonSelectedKey: string;
    // State for "Clone to computer" section.
    hasGitContributePermission: boolean;
    cloneUrlPairs: IPivotedTextBoxPair[];
    supportedIdes?: SupportedIde[];
    selectedIde?: SupportedIde;
    isVisualStudioSelected?: boolean;
    isSshSelected: boolean;
    // State for "Push from command line" section.
    pushCommandPairs: IPivotedTextBoxPair[];
    // State for "Initialize with files" section.
    isCreatingFile: boolean;
    lastErrorMessage: string;
}

export class MainStore extends VSSStore.Store {
    private _state: MainState;

    constructor(isHosted: boolean, initialCloneURL: string, sshEnabled: boolean, sshUrl: string) {
        super();

        const cloneUrlPairs = MainStore._getCloneUrlPairs(initialCloneURL, sshEnabled, sshUrl);
        const pushCommandPairs = MainStore._getPushCommandPairs(cloneUrlPairs);

        this._state = {
            isWindowsPlatform: BrowserCheckUtils.isWindows(),
            isHosted: isHosted,
            toggleButtonSelectedKey: cloneUrlPairs[0].key,
            isSshSelected: false,
            hasGitContributePermission: false,
            cloneUrlPairs: cloneUrlPairs,
            pushCommandPairs: pushCommandPairs,
            isCreatingFile: false,
            lastErrorMessage: null,
        };
    }

    public getState(): MainState {
        return this._state;
    }

    public createFilesRequested = () => {
        this._setState({
            isCreatingFile: true,
            lastErrorMessage: null,
        } as MainState);
    }

    public createFilesCompleted = (errorMessage: string) => {
        const extendedErrorMessage =
            errorMessage
                ? VCResources.InitRepoWithReadMeError + " " + errorMessage
                : null;

        this._setState({
            isCreatingFile: false,
            lastErrorMessage: extendedErrorMessage
        } as MainState);
    }

    public changeSelectedIde = (payload: ActionsHub.ChangeSelectedIdePayload) => {
        this._setState({
            selectedIde: payload.selectedIde,
            isVisualStudioSelected: payload.isSelectedIdeVisualStudio
        } as any);
    }

    public setToggleButtonSelectedIndex = (newSelectedText: string) => {
        this._setState({
            toggleButtonSelectedKey: newSelectedText,
            isSshSelected: newSelectedText === SshProtocolName
        } as MainState);
    }

    public setSupportedIdes = (payload: ActionsHub.SetSupportedIdesPayload) => {
        const favoriteIde = payload.ides.filter(ide => ide.ideType === payload.favoriteIdeType)[0];

        this._setState({
            supportedIdes: payload.ides,
            selectedIde: favoriteIde,
            isVisualStudioSelected: payload.isFavoriteIdeVisualStudio
        } as any);
    }

    public updateGitContributePermission = (hasGitContributePermission: boolean): void => {
        this._setState({ hasGitContributePermission } as MainState);
    }

    private static _getCloneUrlPairs(initialCloneUrl: string, isSshEnabled: boolean, sshUrl: string): IPivotedTextBoxPair[] {
        const pairs: IPivotedTextBoxPair[] = [{
            key: MainStore.getSchemaForUrl(initialCloneUrl),
            value: [initialCloneUrl]
        }];

        if (isSshEnabled) {
            pairs.push({
                key: SshProtocolName,
                value: [sshUrl]
            });
        }

        pairs.forEach((value: IPivotedTextBoxPair) => {
            value.ariaLabel = Utils_String.format(VCResources.GettingStarted_ProtocolButtonAriaLabel, value.key);
        });

        return pairs;
    }

    private static _getPushCommandPairs(cloneUrlPairs: IPivotedTextBoxPair[]): IPivotedTextBoxPair[] {
        const pushCommandPairs = cloneUrlPairs.map((protocolPairObject) => {
            const addOriginCommand: string = Utils_String.format(VCResources.GettingStarted_GitRemoteAddOriginCommand,
                protocolPairObject.value);
            return {
                "key": protocolPairObject.key,
                "value": [addOriginCommand, VCResources.GettingStarted_GitPushAllCommand]
            }
        });

        pushCommandPairs.forEach((value: IPivotedTextBoxPair) => {
            value.ariaLabel = Utils_String.format(VCResources.GettingStarted_ProtocolButtonAriaLabel, value.key);
        });

        return pushCommandPairs;
    }

    private static getSchemaForUrl(url: string): string {
        const trimUrl = url.trim();
        return trimUrl.substr(0, trimUrl.indexOf(":")).toUpperCase();
    }

    private _setState(partialState: MainState): void {
        for (const key in partialState) {
            this._state[key] = partialState[key];
        }

        this.emitChanged();
    }
}