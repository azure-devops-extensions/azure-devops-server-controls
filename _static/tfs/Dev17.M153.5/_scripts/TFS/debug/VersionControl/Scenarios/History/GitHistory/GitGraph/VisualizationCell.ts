import {
    ExcisionVisComponents,
    VisComponents
} from "VersionControl/Scenarios/History/GitHistory/GitGraph/VisualizationContracts";

/**
 * Represents a single visual cell that will be rendered in a graph row
 */
export class VisualizationCell {
    private _id: number;
    private _components: VisComponents;
    private _excisionComponents: ExcisionVisComponents;
    private _highlitComponents: VisComponents;
    private _highlitExcisionComponents: ExcisionVisComponents;

    constructor(
        id: number,
        components: VisComponents,
        excisionComponents: ExcisionVisComponents
    ) {
        this._id = id;
        this._components = components;
        this._excisionComponents = excisionComponents;

        this._highlitComponents = VisComponents.None;
        this._highlitExcisionComponents = ExcisionVisComponents.None;
    }

    /**
     * Sets the given VisComponents to the current cell
     * @param componentsToSet
     */
    public setComponents(componentsToSet: VisComponents): void {
        this._components |= componentsToSet;
    }

    /**
     * Checks if the current cell has the given VisComponents
     * @param query
     */
    public hasComponent(query: VisComponents): boolean {
        return VisComponentsHelper.HasComponent(this._components, query);
    }

    /**
     * Sets the given ExcisionVisComponents to the current cell
     * @param excisionComponentsToSet
     */
    public setExcisionComponents(excisionComponentsToSet: ExcisionVisComponents): void {
        this._excisionComponents |= excisionComponentsToSet;
    }

    /**
     * Checks if the current cell has the given ExcisionVisComponents
     * @param query
     */
    public hasExcisionComponent(query: ExcisionVisComponents): boolean {
        return ExcisionVisComponentsHelper.HasComponent(this._excisionComponents, query);
    }

    /**
     * Checks if the current cell has any highlit component or highlit excision component
     */
    public hasHighlights(): boolean {
        return this._highlitComponents != VisComponents.None || this._highlitExcisionComponents != ExcisionVisComponents.None;
    }

    /**
     * Checks if any VisComponents of the cell is highlit
     * @param query
     */
    public hasHighlitComponent(query: VisComponents): boolean {
        return VisComponentsHelper.HasComponent(this._highlitComponents, query);
    }

    /**
     * Checks if any ExcisionVisComponents of the cell is highlit
     * @param query
     */
    public hasHighlitExcisionComponent(query: ExcisionVisComponents): boolean {
        return ExcisionVisComponentsHelper.HasComponent(this._highlitExcisionComponents, query);
    }

    /**
     * Sets the given highlights to the components of the cell, if the corresponding VisComponents is present in the cell
     * @param components
     */
    public setHighlights(components: VisComponents): boolean {
        let changed: boolean = false;
        VisComponentsHelper.ToList(this._components).forEach((comp: VisComponents) => {
            changed = (comp & components) != VisComponents.None || changed;
            this._highlitComponents |= (comp & components);
        })
        return changed;
    }

    /**
     * Sets the given highlights to the excision components of the cell, if the corresponding ExcisionVisComponents is present in the cell
     * @param excisionComponents
     */
    public setExcisionHighlights(excisionComponents: ExcisionVisComponents): boolean {
        let changed: boolean = false;
        ExcisionVisComponentsHelper.ToList(this._excisionComponents).forEach((comp: ExcisionVisComponents) => {
            changed = (comp & excisionComponents) != ExcisionVisComponents.None || changed;
            this._highlitExcisionComponents |= (comp & excisionComponents);
        })
        return changed;
    }

    /**
     * Highlights all the components and excision components in the cell
     */
    public highlightAll(): void {
        this._highlitComponents = this._components;
        this._highlitExcisionComponents = this._excisionComponents;
    }

    /**
     * Unsets highlight on all the components and excision components in the cell
     */
    public unsetAllHighlights(): void {
        this._highlitComponents = VisComponents.None;
        this._highlitExcisionComponents = ExcisionVisComponents.None;
    }

    public get id(): number {
        return this._id;
    }

    public get components(): VisComponents {
        return this._components;
    }

    public get excisionComponents(): ExcisionVisComponents {
        return this._excisionComponents;
    }

    public get highlitComponents(): VisComponents {
        return this._highlitComponents;
    }

    public get highlitExcisionComponents(): ExcisionVisComponents {
        return this._highlitExcisionComponents;
    }

    // Visualization components
    public get isEmpty(): boolean {
        // Should not use hasComponent for empty check
        return this._components === VisComponents.None && this._excisionComponents === ExcisionVisComponents.None;
    }

    public get isMerge(): boolean {
        return this.hasComponent(VisComponents.MergeNode);
    }

    public get leftMiddle(): boolean {
        return this.hasComponent(VisComponents.LeftCenter);
    }

    public get topLeft(): boolean {
        return this.hasComponent(VisComponents.TopLeft);
    }

    public get topMiddle(): boolean {
        return this.hasComponent(VisComponents.TopMiddle);
    }

    public get topRight(): boolean {
        return this.hasComponent(VisComponents.TopRight);
    }

    public get rightMiddle(): boolean {
        return this.hasComponent(VisComponents.RightCenter);
    }

    public get bottomRight(): boolean {
        return this.hasComponent(VisComponents.BottomRight);
    }

    public get bottomMiddle(): boolean {
        return this.hasComponent(VisComponents.BottomMiddle);
    }

    public get bottomLeft(): boolean {
        return this.hasComponent(VisComponents.BottomLeft);
    }

    public get circle(): boolean {
        return this.hasComponent(VisComponents.Circle);
    }

    public get leftMerge(): boolean {
        return this.hasComponent(VisComponents.LeftMerge);
    }

    public get rightMerge(): boolean {
        return this.hasComponent(VisComponents.RightMerge);
    }

    public get octopusMerge(): boolean {
        return this.hasComponent(VisComponents.OctopusMerge);
    }

    // Excision visualization components
    public get incomingExcision(): boolean {
        return this.hasExcisionComponent(ExcisionVisComponents.IncomingExcision);
    }

    public get outgoingExcision(): boolean {
        return this.hasExcisionComponent(ExcisionVisComponents.OutgoingExcision);
    }

    public get incomingSelectedExcision(): boolean {
        return this.hasExcisionComponent(ExcisionVisComponents.IncomingSelectedExcision);
    }

    public get outgoingSelectedExcision(): boolean {
        return this.hasExcisionComponent(ExcisionVisComponents.OutgoingSelectedExcision);
    }

    public get continuingSelectedTrackingLine(): boolean {
        return this.hasExcisionComponent(ExcisionVisComponents.ContinuingSelectedTrackingLine);
    }

    public get excisionHorizontal(): boolean {
        return this.hasExcisionComponent(ExcisionVisComponents.ExcisionHorizontal);
    }

    // Highlit visualization components
    // TODO: Rename method name to leftCenterHighlit to match the corresponding VisComponents enum value
    public get leftMiddleHighlit(): boolean {
        return this.hasHighlitComponent(VisComponents.LeftCenter);
    }

    public get topLeftHighlit(): boolean {
        return this.hasHighlitComponent(VisComponents.TopLeft);
    }

    public get topMiddleHighlit(): boolean {
        return this.hasHighlitComponent(VisComponents.TopMiddle);
    }

    public get topRightHighlit(): boolean {
        return this.hasHighlitComponent(VisComponents.TopRight);
    }

    // TODO: Rename method name to rightCenterHighlit to match the corresponding VisComponents enum value
    public get rightMiddleHighlit(): boolean {
        return this.hasHighlitComponent(VisComponents.RightCenter);
    }

    public get bottomRightHighlit(): boolean {
        return this.hasHighlitComponent(VisComponents.BottomRight);
    }

    public get bottomMiddleHighlit(): boolean {
        return this.hasHighlitComponent(VisComponents.BottomMiddle);
    }

    public get bottomLeftHighlit(): boolean {
        return this.hasHighlitComponent(VisComponents.BottomLeft);
    }

    public get circleHighlit(): boolean {
        return this.hasHighlitComponent(VisComponents.Circle);
    }

    public get leftMergeHighlit(): boolean {
        return this.hasHighlitComponent(VisComponents.LeftMerge);
    }

    public get rightMergeHighlit(): boolean {
        return this.hasHighlitComponent(VisComponents.RightMerge);
    }

    public get octopusMergeHighlit(): boolean {
        return this.hasHighlitComponent(VisComponents.OctopusMerge);
    }

    // Highlit excision visualization components
    public get incomingExcisionHighlit(): boolean {
        return this.hasHighlitExcisionComponent(ExcisionVisComponents.IncomingExcision);
    }

    public get outgoingExcisionHighlit(): boolean {
        return this.hasHighlitExcisionComponent(ExcisionVisComponents.OutgoingExcision);
    }

    public get incomingSelectedExcisionHighlit(): boolean {
        return this.hasHighlitExcisionComponent(ExcisionVisComponents.IncomingSelectedExcision);
    }

    public get outgoingSelectedExcisionHighlit(): boolean {
        return this.hasHighlitExcisionComponent(ExcisionVisComponents.OutgoingSelectedExcision);
    }

    public get continuingSelectedTrackingLineHighlit(): boolean {
        return this.hasHighlitExcisionComponent(ExcisionVisComponents.ContinuingSelectedTrackingLine);
    }

    public get excisionHorizontalHighlit(): boolean {
        return this.hasHighlitExcisionComponent(ExcisionVisComponents.ExcisionHorizontal);
    }
}

/**
 * Helper class for VisComponents
 */
export class VisComponentsHelper {

    /**
     * Sets the given components in the base components provided and returns the result
     * @param base
     * @param componentsToSet
     */
    public static SetComponents(base: VisComponents, componentsToSet: VisComponents): VisComponents {
        base |= componentsToSet;
        return base;
    }

    /**
     * UnSets the given components from the base components provided and returns the result
     * @param base
     * @param componentsToUnSet
     */
    public static UnsetComponents(base: VisComponents, componentsToUnSet: VisComponents): VisComponents {
        base &= ~componentsToUnSet;
        return base;
    }

    /**
     * Gets the VisComponents from the string provided
     * @param componentsString - String which holds the component values, e.g. "leftMiddle, rightMiddle". Result => 136
     */
    public static GetComponentsFromString(componentsString: string): VisComponents {
        let base: VisComponents = VisComponents.None;
        componentsString = componentsString.toLowerCase();

        Object.keys(VisComponents).map(function (k: string) { return k.toLowerCase(); }).forEach((individualComponent: string) => {
            const enumValue = parseInt(individualComponent);

            if (!isNaN(enumValue) && (componentsString.indexOf(VisComponents[individualComponent].toLowerCase()) >= 0)) {
                const enumString: string = VisComponents[individualComponent];
                base = VisComponentsHelper.SetComponents(base, VisComponents[enumString]);
            }
        });

        return base;
    }

    /**
     * Checks if the given component is present in the base components
     * @param base - e.g. 7
     * @param query - e.g. VisComponents.TopMiddle. Will return true.
     */
    public static HasComponent(base: VisComponents, query: VisComponents): boolean {
        return (base & query) != 0;
    }

    /**
     * Converts the single VisComponents with multiple values into an array of individual VisComponents
     * @param components - e.g. 3 => [ VisComponents.TopLeft, VisComponents.TopMiddle ]
     */
    public static ToList(components: VisComponents): VisComponents[] {
        const componentsArray: VisComponents[] = [];

        Object.keys(VisComponents).map(function (k: string) { return VisComponents[k]; }).forEach((individualComponent: VisComponents) => {
            if ((components & individualComponent) != 0) {
                componentsArray.push(individualComponent);
            }
        });

        return componentsArray;
    }

    /**
     * 
     * @param components
     */
    public static mirrorHorizontal(components: VisComponents): VisComponents {
        let ret: VisComponents = VisComponents.None;
        VisComponentsHelper.ToList(components).forEach((component: VisComponents) => {
            if (component === VisComponents.BottomLeft) { ret |= VisComponents.BottomRight; }
            else if (component === VisComponents.BottomRight) { ret |= VisComponents.BottomLeft; }
            else if (component === VisComponents.TopLeft) { ret |= VisComponents.TopRight; }
            else if (component === VisComponents.TopRight) { ret |= VisComponents.TopLeft; }
            else if (component === VisComponents.LeftMerge) { ret |= VisComponents.RightMerge; }
            else if (component === VisComponents.RightMerge) { ret |= VisComponents.LeftMerge; }
            else if (component === VisComponents.RightCenter) { ret |= VisComponents.LeftCenter; }
            else if (component === VisComponents.LeftCenter) { ret |= VisComponents.RightCenter; }
            else { ret |= component; }
        });
        return ret;
    }
}

/**
 * Helper class for ExcisionVisComponents
 */
export class ExcisionVisComponentsHelper {

    /**
     * Sets the given excision components in the base excision components provided and returns the result
     * @param base
     * @param excisionComponentsToSet
     */
    public static SetComponents(base: ExcisionVisComponents, excisionComponentsToSet: ExcisionVisComponents): ExcisionVisComponents {
        base |= excisionComponentsToSet;
        return base;
    }

    /**
     * UnSets the given excision components from the base excision components provided and returns the result
     * @param base
     * @param excisionComponentsToUnSet
     */
    public static UnsetComponents(base: ExcisionVisComponents, excisionComponentsToUnSet: ExcisionVisComponents): ExcisionVisComponents {
        base &= ~excisionComponentsToUnSet;
        return base;
    }

    /**
     * Gets the ExcisionVisComponents from the string provided
     * @param excisionComponentsString - String which holds the component values, e.g. "outgoingExcision, incomingExcision". Result => 3
     */
    public static GetComponentsFromString(excisionComponentsString: string): ExcisionVisComponents {
        let base: ExcisionVisComponents = ExcisionVisComponents.None;
        excisionComponentsString = excisionComponentsString.toLowerCase();

        Object.keys(ExcisionVisComponents).map(function (k: string) { return k.toLowerCase(); }).forEach((individualComponent: string) => {
            const enumValue = parseInt(individualComponent);

            if (!isNaN(enumValue) && (excisionComponentsString.indexOf(ExcisionVisComponents[individualComponent].toLowerCase()) >= 0)) {
                const enumString: string = VisComponents[individualComponent];
                base = ExcisionVisComponentsHelper.SetComponents(base, ExcisionVisComponents[enumString]);
            }
        });

        return base;
    }

    /**
     * Checks if the given excision component is present in the base excision components
     * @param base - e.g. 7
     * @param query - e.g. ExcisionVisComponents.IncomingExcision. Will return true.
     */
    public static HasComponent(base: ExcisionVisComponents, query: ExcisionVisComponents): boolean {
        return (base & query) != 0;
    }

    /**
     * Converts the single ExcisionVisComponents with multiple values into an array of individual ExcisionVisComponents
     * @param excisionComponents - e.g. 3 => [ VisComponents.OutgoingExcision, VisComponents.IncomingExcision ]
     */
    public static ToList(excisionComponents: ExcisionVisComponents): ExcisionVisComponents[] {
        const excisionComponentsArray: ExcisionVisComponents[] = [];

        Object.keys(ExcisionVisComponents).map(function (k: string) { return ExcisionVisComponents[k]; }).forEach((individualComponent: ExcisionVisComponents) => {
            if ((excisionComponents & individualComponent) != 0) {
                excisionComponentsArray.push(individualComponent);
            }
        });

        return excisionComponentsArray;
    }
}
