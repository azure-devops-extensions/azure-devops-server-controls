/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "VSS/Flux/Component";

/**
 * @brief Base state interface
 */
export interface IStateless {
}

/**
 * @brief Base state interface
 */
export interface IState extends ComponentBase.State {
}

/**
 * @brief Base Properties interface
 */
export interface IProps extends ComponentBase.Props {

    /**
     * @brief: Optional instance id for the component. This is mainly used for re-usable controller views.
     * Refer below:
     * https://microsoft.sharepoint.com/teams/VSinCIExperience/_layouts/OneNote.aspx?id=%2Fteams%2FVSinCIExperience%2FSiteAssets%2FVS.in%20CI%20Experience%20Notebook&wd=target%28Knowledge%20Bank.one%7CEEE8B281-5C3D-4270-B5F1-82E49BEF6C72%2FReusable%20controller%20views%7CE4121EDF-FD03-41F1-8BE8-40C1C0B59868%2F%29
     *
     */
    instanceId?: string;
}

/**
 * @brief abstract class for React components. All the other components classes should be derived from this one.
 * @returns
 */
export abstract class Component<P extends IProps, S extends IState> extends ComponentBase.Component<P, S> {

    constructor(props: P) {
        super(props);
        this.state = {} as S;
    }

    /**
     * @brief React's render method
     * @returns JSX element
     */
    public abstract render(): JSX.Element;

    /**
   * Taken from office fabric base component: https://github.com/OfficeDev/office-ui-fabric-react/blob/master/packages/utilities/src/BaseComponent.ts
   * Helper to return a memoized ref resolver function.
   * @params refName Name of the member to assign the ref to.
   *
   * @examples
   * class Foo extends BaseComponent<...> {
   *   private _root: HTMLElement;
   *
   *   public render() {
   *     return <div ref={ this._resolveRef('_root') } />
   *   }
   * }
   */
    protected _resolveRef(refName: string) {
        if (!this._resolves) {
            this._resolves = {};
        }
        if (!this._resolves[refName]) {
            this._resolves[refName] = (ref) => {
                return this[refName] = ref;
            };
        }

        return this._resolves[refName];
    }

    private _resolves: { [name: string]: (ref: any) => any };

}
