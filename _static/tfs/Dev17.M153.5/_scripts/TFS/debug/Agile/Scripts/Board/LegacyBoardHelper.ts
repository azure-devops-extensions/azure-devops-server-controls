import { BoardModel } from "Agile/Scripts/TFS.Agile.Boards";
import Utils_Core = require("VSS/Utils/Core");
import Diag = require("VSS/Diag");
import { BoardGenerator } from "Agile/Scripts/Board/BoardsGenerator";

export module LegacyBoardHelper {
    export function getBoardModelFromJSONIsland(): BoardModel {
        var data: { boardModel: BoardModel } = Utils_Core.parseJsonIsland($(document), ".backlog-board-model", true);
        if (!data) {
            Diag.Debug.fail("boardModel JSON island must always be available @ page load");
        }

        initializeBoardModel(data.boardModel);

        return data.boardModel;
    }

    export function initializeBoardModel(boardModel: BoardModel): BoardModel {
        if (boardModel && boardModel.board && !boardModel.board.node) {
            boardModel.board.node = BoardGenerator.createBoardRootNode(boardModel.boardSettings);
        }

        return boardModel;
    }
}