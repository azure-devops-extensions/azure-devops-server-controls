import Controls = require("VSS/Controls");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import {addTooltipIfOverflow} from "Presentation/Scripts/TFS/TFS.UI.Controls.Accessibility.Utils";

/**
* options contract for a control that *Presents* a numerical count. 
*/
export interface CountControlOptions {
    /**
    * Title to show at the top of the widget. 
    */
    header: string;

    /**
    * Number (scalar) to show within the content. 
    */
    count: number;

    /**
    * Text to show at the bottom of the widget. 
    */
    footer: string;
 
}

/**
* A control that *Presents* a numerical count, which it links to.
*/
export class CountControl extends Controls.Control<CountControlOptions>{

    // dom section constants.
    public static DomClass_Root: string = "count-control";
    public static DomClass_TileFooter: string = "footer";
    public static DomClass_TileCount: string = "big-count";

    private $header: JQuery;
    private $count: JQuery;
    private $footer: JQuery;

    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            coreCssClass: CountControl.DomClass_Root
        }, options));
    }

    public initialize(): void {
        super.initialize();

        // draws the control. 
        this._render();
    }
    
    /**
    * performs the actual dom composition of the control. 
    */
    private _render(): void {
        var container = this.getElement();
        container.empty();
        
        this.$header = $("<h2/>").
            addClass(TFS_Dashboards_Constants.WidgetDomClassNames.Title).
            addClass(TFS_Dashboards_Constants.WidgetDomClassNames.TruncatedTextWithEllipsis).
            appendTo(container);
        this.$count = $("<div/>").
            addClass(CountControl.DomClass_TileCount).
            addClass(TFS_Dashboards_Constants.WidgetDomClassNames.TruncatedTextWithEllipsis).
            appendTo(container);
        this.$footer = $("<div/>").
            addClass(CountControl.DomClass_TileFooter).
            addClass(TFS_Dashboards_Constants.WidgetDomClassNames.TruncatedTextWithEllipsis).
            appendTo(container);

        this.setHeader(this._options.header);
        this.setCount(this._options.count); 
        this.setFooter(this._options.footer);
        
    }

    /**
    * Renders the title/header
    * @param {string} title
    */
    public setHeader(title: string): void {
        this.$header.
            text(title);

        addTooltipIfOverflow(this.$header);
    }

    /**
    * Renders the count/scalar
    * @param {number} count
    */
    public setCount(count: number): void {        
        //Gracefully degrade if caller did not have count data on hand (e.g. repaint after load started)
        if (count != null) {
            this.$count.text(count.toString());
            this.$count.css("font-size", this._getFontSizeCountLength(count.toString().length));
        }        
    }

    /**
    * auto shrink font size for the count automatically
    * @param {number} count number
    */
    public _getFontSizeCountLength(len: number): number {
        switch (len) {
            case 4:
                return 60;
            case 5:
                return 50;
            case 6: 
                return 40;
            case 7: 
                return 30;
            case 8:
                return 25;
        }
    }

    /**
    * Renders the footer
    * @param {string} footer
    */
    public setFooter(footer: string): void {
        this.$footer.text(footer);
    }
}
