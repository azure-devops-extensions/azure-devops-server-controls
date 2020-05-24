/// <reference types="jquery" />

export class BladeDimensions { 
    /**
    * This is the width of an open blade.
    */
    public static BladeWidth: number = 435;
}


/**
 * Constants for each blade. The system to open and close still use the level to open blade. This come from the legacy system
 * where blade were leveled above each other. This could be refactored later but the mechanism is still working and we had no
 * valid reason to change it.
 */
export class BladeLevelConstants {
    /**
     * Use this constant to open the catalog
     */
    public static CatalogBladeLevel: number = 1;

    /**
     * Use this constant to open the configuration
     */
    public static CatalogConfigurationLevel: number = 2;
}
