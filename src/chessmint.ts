var master: ChessMint;
var Config: any = undefined;
var context: any = undefined;
var ecoTable: Map<string, any> | null = null;

class TopMove
{
    readonly from: string;
    readonly to: string;
    readonly line: string[];
    readonly move: string;
    readonly depth: number;
    readonly promotion: string | null;
    readonly cp: number | null;
    readonly mate: number | null;

    constructor(line: string, depth: number, cp: number | null, mate: number | null)
    {
        this.line = line.split(" ");
        this.move = this.line[0];
        this.promotion = this.move.length > 4 ? this.move.substring(4, 5) : null;
        this.from = this.move.substring(0, 2);
        this.to = this.move.substring(2, 4);
        this.cp = cp;
        this.mate = mate;
        this.depth = depth;
    }
}

class GameController
{
    controller: ChessboardGame;
    chessboard: HTMLElement;
    options: GameOptions;
    private depthBar: HTMLElement | null;
    private evalBar: HTMLElement | null;
    private evalBarFill: HTMLElement | null;
    private evalScore: HTMLElement | null;
    private evalScoreAbbreviated: HTMLElement | null;
    private currentMarkings: Marking[];
    private master: ChessMint;

    constructor(master: ChessMint, chessboard: HTMLElement)
    {
        this.master = master;
        this.chessboard = chessboard;
        this.controller = (chessboard as any).game as ChessboardGame;
        this.options = this.controller.getOptions();

        this.depthBar = null;
        this.evalBar = null;
        this.evalBarFill = null;
        this.evalScore = null;
        this.evalScoreAbbreviated = null;
        this.currentMarkings = [];

        let self = this;
        // this.controller.debug_hook = function ()
        // {
        //     for (var prop in self.controller)
        //     {
        //         if (typeof (self.controller as any)[prop] === 'function' && prop !== "debug_hook")
        //         {
        //             (self.controller as any)[prop] = function (func)
        //             {
        //                 return function ()
        //                 {
        //                     console.log(func.name, arguments);
        //                     return func.apply(func, arguments);
        //                 };
        //             }((self.controller as any)[prop]);
        //             console.log(prop);
        //         }
        //     }
        // }



        // hook to update the engine on every move
        this.controller.on('Move', (event: IGameEvent) =>
        {
            console.log("On Move", event.data);
            this.UpdateEngine(false);
        });

        // check if a new game has started
        this.controller.on('ModeChanged', (event: IGameEvent) =>
        {
            if (event.data === "playing")
            {
                // at this point, the fen notation isn't updated yet, we should delay this
                setTimeout(() => { this.ResetGame(); }, 100);
            }
        });

        // flip the evaluation board
        this.controller.on('UpdateOptions', (event: IGameEvent) =>
        {
            this.options = this.controller.getOptions();
            if (event.data.flipped != undefined && this.evalBar != null) 
            {
                if (!this.options.isWhiteOnBottom && event.data.flipped) this.evalBar.classList.add("evaluation-bar-flipped");
                else this.evalBar.classList.remove("evaluation-bar-flipped");
            }
        });

        this.CreateAnalysisTools();
        setTimeout(() => { this.ResetGame(); }, 100);
    }

    UpdateExtensionOptions()
    {
        let options = this.master.options;
        if (options.evaluation_bar && this.evalBar == null) this.CreateAnalysisTools();
        else if (!options.evaluation_bar && this.evalBar != null)
        {
            this.evalBar.remove();
            this.evalBar = null;
        }

        if (options.depth_bar && this.depthBar == null) this.CreateAnalysisTools();
        else if (!options.depth_bar && this.depthBar != null)
        {
            this.depthBar.parentElement!.remove();
            this.depthBar = null;
        }

        if (!options.show_hints)
        {
            this.RemoveCurrentMarkings();
        }

        if (!options.move_analysis)
        {
            let lastMove = this.controller.getLastMove();
            if (lastMove)
            {
                this.controller.markings.removeOne(`effect|${lastMove.to}`);
            }
        }
    }

    private CreateAnalysisTools()
    {
        // we must wait for a little bit because at this point
        // the chessboard has not been added to chessboard layout (#board-layout-main)
        let interval1 = setInterval(() =>
        {
            let layoutChessboard = this.chessboard.parentElement;
            if (layoutChessboard == null) return;

            let layoutMain = layoutChessboard.parentElement;
            if (layoutMain == null) return;

            clearInterval(interval1);

            if (this.master.options.depth_bar && this.depthBar == null)
            {
                // create depth bar
                let depthBar = document.createElement("div",);
                depthBar.classList.add("depthBarLayout");
                depthBar.innerHTML = `<div class="depthBar"><span class="depthBarProgress"></span></div>`;

                layoutMain.insertBefore(depthBar, layoutChessboard.nextSibling);
                this.depthBar = depthBar.querySelector(".depthBarProgress") as HTMLElement;
            }

            if (this.master.options.evaluation_bar && this.evalBar == null)
            {

                // create eval bar
                let evalBar = document.createElement("div");
                evalBar.style.flex = "1 1 auto;";
                evalBar.innerHTML = `
                <div class="evaluation-bar-bar">
                    <span class="evaluation-bar-scoreAbbreviated evaluation-bar-dark">0.0</span>
                    <span class="evaluation-bar-score evaluation-bar-dark ">+0.00</span>
                    <div class="evaluation-bar-fill">
                    <div class="evaluation-bar-color evaluation-bar-black"></div>
                    <div class="evaluation-bar-color evaluation-bar-draw"></div>
                    <div class="evaluation-bar-color evaluation-bar-white" style="transform: translate3d(0px, 50%, 0px);"></div>
                    </div>
                </div>`;

                let layoutEvaluation = layoutChessboard.querySelector("#board-layout-evaluation");
                if (layoutEvaluation == null)
                {
                    layoutEvaluation = document.createElement("div");
                    layoutEvaluation.classList.add("board-layout-evaluation");
                    layoutChessboard.insertBefore(layoutEvaluation, layoutChessboard.firstElementChild);
                }

                layoutEvaluation.innerHTML = "";
                layoutEvaluation.appendChild(evalBar);


                this.evalBar = layoutEvaluation.querySelector(".evaluation-bar-bar");
                this.evalBarFill = layoutEvaluation.querySelector(".evaluation-bar-white");
                this.evalScore = layoutEvaluation.querySelector(".evaluation-bar-score");
                this.evalScoreAbbreviated = layoutEvaluation.querySelector(".evaluation-bar-scoreAbbreviated");

                if (!this.options.isWhiteOnBottom && this.options.flipped)
                    this.evalBar!.classList.add("evaluation-bar-flipped");
            }
        }, 10);
    }

    private UpdateEngine(isNewGame: boolean)
    {
        // console.log("UpdateEngine", isNewGame);
        let FENs = this.controller.getFEN();
        this.master.engine.UpdatePosition(FENs, isNewGame);
        this.SetCurrentDepth(0);
    }

    private ResetGame()
    {
        this.UpdateEngine(true);
    }

    private RemoveCurrentMarkings()
    {
        this.currentMarkings.forEach((marking) =>
        {
            let key = marking.type + "|";
            if (marking.data.square != null) key += marking.data.square;
            else key += `${marking.data.from}${marking.data.to}`;

            this.controller.markings.removeOne(key);
        });

        this.currentMarkings = [];
    }

    HintMoves(topMoves: TopMove[], lastTopMoves: TopMove[], isBestMove: boolean)
    {
        let options = this.master.options;
        let bestMove = topMoves[0];

        if (options.show_hints)
        {
            this.RemoveCurrentMarkings();
            topMoves.forEach((move, idx) =>
            {
                // isBestMove means final evaluation, don't include the moves
                // that has less depth than the best move
                if (isBestMove && move.depth != bestMove.depth) return;

                let color = (idx == 0) ? this.options.arrowColors.default : this.options.arrowColors.alt;

                this.currentMarkings.push({
                    data: {
                        from: move.from,
                        color: color,
                        opacity: 0.7,
                        to: move.to,
                    },
                    node: true,
                    persistent: true,
                    type: "arrow",
                });

                if (move.mate != null)
                {
                    this.currentMarkings.push({
                        data: {
                            square: move.to,
                            type: move.mate < 0 ? "ResignWhite" : "WinnerWhite",
                        },
                        node: true,
                        persistent: true,
                        type: "effect",
                    });
                }
            });

            // reverse the markings to make the best move arrow appear on top
            this.currentMarkings.reverse();
            this.controller.markings.addMany(this.currentMarkings);
        }

        if (options.depth_bar)
        {
            let depthPercent =
                (isBestMove ? bestMove.depth : bestMove.depth - 1)
                / this.master.engine.depth * 100;

            this.SetCurrentDepth(depthPercent);
        }

        if (options.evaluation_bar)
        {
            let score = (bestMove.mate != null ? bestMove.mate : bestMove.cp) as number;
            if (this.controller.getTurn() == 2) score *= -1;

            this.SetEvaluation(score, bestMove.mate != null);
        }
    }

    SetCurrentDepth(percent: number)
    {
        if (this.depthBar == null) return;
        let style = this.depthBar.style;

        if (percent <= 0)
        {
            this.depthBar.classList.add("disable-transition");
            style.width = `0%`;
            this.depthBar.classList.remove("disable-transition");
        } else
        {
            if (percent > 100) percent = 100;
            style.width = `${percent}%`;
        }
    }

    SetEvaluation(score: number, isMate: boolean)
    {
        if (this.evalBar == null) return;

        var percent: number, textScore: string, textScoreAbb: string;

        if (!isMate)
        {
            let eval_max = 500;
            let eval_min = -500;
            let smallScore = score / 100;

            percent = 90 - (((score - eval_min) / (eval_max - eval_min)) * (95 - 5)) + 5;
            if (percent < 5) percent = 5;
            else if (percent > 95) percent = 95;

            textScore = (score >= 0 ? "+" : "") + smallScore.toFixed(2);
            textScoreAbb = Math.abs(smallScore).toFixed(1);

        } else
        {
            percent = score < 0 ? 100 : 0;
            textScore = "M" + Math.abs(score).toString();
            textScoreAbb = textScore;
        }

        this.evalBarFill!.style.transform = `translate3d(0px, ${percent}%, 0px)`;
        this.evalScore!.innerText = textScore;
        this.evalScoreAbbreviated!.innerText = textScoreAbb;
        let classSideAdd = (score >= 0) ? "evaluation-bar-dark" : "evaluation-bar-light";
        let classSideRemove = (score >= 0) ? "evaluation-bar-light" : "evaluation-bar-dark";

        this.evalScore!.classList.remove(classSideRemove);
        this.evalScoreAbbreviated!.classList.remove(classSideRemove);

        this.evalScore!.classList.add(classSideAdd);
        this.evalScoreAbbreviated!.classList.add(classSideAdd);
    }
}

class StockfishEngine
{
    private stockfish: Worker;
    private loaded: boolean;
    private ready: boolean;
    private isEvaluating: boolean;
    private isRequestedStop: boolean;
    private isInTheory: boolean; // is the game still in theory openings
    private master: ChessMint;
    private readyCallbacks: { (): void; }[];
    private goDoneCallbacks: { (): void; }[];

    private topMoves: TopMove[];
    private lastTopMoves: TopMove[];

    private options: { [opt: string]: string | number | boolean; };

    depth: number;
    readonly threads: number;

    constructor(master: ChessMint)
    {
        let self = this;
        let stockfishPath = Config.threadedEnginePaths.stockfish;
        let stockfishJs = stockfishPath.multiThreaded.loader as string; //singleThreaded multiThreaded
        let stockfishWASM = stockfishPath.multiThreaded.engine as string;

        this.master = master;
        this.loaded = false;
        this.ready = false;
        this.isEvaluating = false;
        this.isRequestedStop = false;
        this.readyCallbacks = []
        this.goDoneCallbacks = []
        this.topMoves = []
        this.lastTopMoves = []
        this.isInTheory = false;

        this.depth = this.master.options.depth;
        this.threads = this.master.options.threads;

        this.options = {
            // "Debug Log File": "",
            "Threads": this.threads,
            "Hash": 512,
            "Ponder": true,
            "MultiPV": 3,
            // "Skill Level": 20,
            // "Move Overhead": 10,
            // "Slow Mover": 100,
            // "nodestime": 0,
            // "UCI_Chess960": false,
            // "UCI_AnalyseMode": false,
            // "UCI_LimitStrength": false,
            // "UCI_Elo": 1350,
            // "UCI_ShowWDL": false,
        }

        if (this.master.options.use_nnue)
        {
            this.options["Use NNUE"] = true;
            this.options["EvalFile"] = stockfishPath.multiThreaded.nnue;
        }

        try
        {
            this.stockfish = new Worker(stockfishJs + "#" + stockfishWASM);
            this.stockfish.onmessage = function (e) { self.ProcessMessage(e) };
        } catch (e)
        {
            alert("Failed to load stockfish");
            throw e;
        }

        this.send("uci");
        this.onReady(() =>
        {
            this.UpdateOptions();
            this.send("ucinewgame");
        });
    }

    send(cmd: string): void
    {
        this.stockfish.postMessage(cmd);
    }

    go(): void
    {
        this.onReady(() =>
        {
            this.stopEvaluation(() =>
            {
                console.assert(!this.isEvaluating, "Duplicated Stockfish go command");

                this.isEvaluating = true;
                this.send(`go depth ${this.depth}`);
            })
        });
    }

    onReady(callback: { (): void; })
    {
        if (this.ready) callback();
        else
        {
            this.readyCallbacks.push(callback);
            // console.log("send is ready");
            this.send("isready");
        }
    }

    stopEvaluation(callback: { (): void; })
    {
        // stop the evaluation if it is evaluating
        if (this.isEvaluating)
        {
            // cancel the previous callbacks, replace it with this one
            this.goDoneCallbacks = [callback];
            this.isRequestedStop = true;
            this.send("stop")
        }
        else
        {
            // if there is no evaluation going on, call the function immediately
            callback();
        }
    }

    UpdatePosition(FENs: string | null = null, isNewGame: boolean = true)
    {
        this.onReady(() =>
        {
            this.stopEvaluation(() =>
            {
                this.MoveAndGo(FENs, isNewGame);
            });
        })
    }

    UpdateExtensionOptions()
    {
        this.depth = this.master.options.depth;
        // trigger this method to show hints, analysis,.. if it was disabled before
        // if this.isEvaluating is false, it already found the best move
        if (this.topMoves.length > 0)
            this.onTopMoves(null, !this.isEvaluating);
    }

    private UpdateOptions(options: { [opt: string]: string | number | boolean; } | null = null)
    {
        if (options === null) options = this.options;

        Object.keys(options).forEach((key) =>
        {
            this.send(`setoption name ${key} value ${options![key]}`);
        });
    }

    private ProcessMessage(event: MessageEvent<any>)
    {
        this.ready = false;
        let line: string = (event && typeof event === "object") ? event.data : event;

        console.log("SF: " + line);

        if (line === 'uciok')
        {
            this.loaded = true;
            this.master.onEngineLoaded();
        }
        else if (line === 'readyok')
        {
            this.ready = true;
            if (this.readyCallbacks.length > 0)
            {
                let copy = this.readyCallbacks;
                this.readyCallbacks = [];
                copy.forEach(function (callback) { callback(); });
            }
        }
        else if (this.isEvaluating && line === 'Load eval file success: 1')
        {
            // we have sent the "go" command before stockfish loaded the eval file
            // this.isEvaluating will be stuck at true, this fixes it.
            this.isEvaluating = false;
            this.isRequestedStop = false;
            if (this.goDoneCallbacks.length > 0)
            {
                let copy = this.goDoneCallbacks;
                this.goDoneCallbacks = [];
                copy.forEach(function (callback) { callback(); });
            }
        }
        else
        {
            let match = line.match(/^info .*\bdepth (\d+) .*\bseldepth (\d+) .*\bmultipv (\d+) .*\bscore (\w+) (-?\d+) .*\bpv (.+)/);

            if (match)
            {
                if (!this.isRequestedStop)
                {
                    let cp = (match[4] == "cp") ? parseInt(match[5]) : null;
                    let mate = (match[4] == "cp") ? null : parseInt(match[5]);
                    let move = new TopMove(match[6], parseInt(match[1]), cp, mate);

                    this.onTopMoves(move, false);
                }
            }
            else if (match = line.match(/^bestmove ([a-h][1-8][a-h][1-8][qrbn]?)?/))
            {
                this.isEvaluating = false;
                if (this.goDoneCallbacks.length > 0)
                {
                    let copy = this.goDoneCallbacks;
                    this.goDoneCallbacks = [];
                    copy.forEach(function (callback) { callback(); });
                }

                if (!this.isRequestedStop && match![1] !== undefined)
                {
                    const index = this.topMoves.findIndex(object => object.move === match![1]);
                    if (index < 0)
                    {
                        console.assert(false, `The engine returned the best move "${match[1]}" but it's not in the top move list: `, this.topMoves);
                        debugger;
                    }
                    this.onTopMoves(this.topMoves[index], true);
                }

                this.isRequestedStop = false;
            }
        }
    }

    private MoveAndGo(FENs: string | null = null, isNewGame: boolean = true)
    {
        // let it go, let it gooo
        let go = () =>
        {
            this.lastTopMoves = isNewGame ? [] : this.topMoves;

            if (isNewGame) this.isInTheory = ecoTable != null;;

            if (this.isInTheory)
            {
                let shortFen = this.master.game.controller.getFEN().split(" ").slice(0, 3).join(" ");
                if (ecoTable!.get(shortFen) !== true) this.isInTheory = false;
            }

            this.topMoves = [];
            if (FENs != null) this.send(`position fen ${FENs}`);
            this.go();
        };

        this.onReady(() =>
        {
            if (isNewGame)
            {
                this.send("ucinewgame");
                this.onReady(go);
            }
            else
            {
                go();
            }
        });
    }

    AnalyzeLastMove(): void
    {
        let effectType: string | null = null;

        let lastMove = this.master.game.controller.getLastMove();
        if (lastMove === undefined) return;

        if (this.isInTheory)
        {
            effectType = "Book";
        }
        else
        {
            const index = this.lastTopMoves.findIndex(object => object.from === lastMove!.from && object.to === lastMove!.to);

            // check if the last move is in the last top moves
            if (index !== -1)
            {
                let effectTopMoves = ["BestMove", "Excellent", "Good"];
                effectType = effectTopMoves[index];
            }
            else
            {
                let lastBestMove = this.lastTopMoves[0];
                let bestMove = this.topMoves[0];

                if (lastBestMove.mate != null)
                {
                    // if last move is losing mate, this move just escapes a mate
                    // if last move is winning mate, this move is a missed win
                    if (bestMove.mate == null)
                    {
                        effectType = lastBestMove.mate > 0 ? "MissedWin" : "Brilliant";
                    } else
                    {
                        // both move are mate
                        effectType = lastBestMove.mate > 0 ? "ResignWhite" : "WinnerWhite";
                    }
                }
                else if (bestMove.mate != null)
                {
                    // brilliant if it found a mate, blunder if it moved into a mate
                    effectType = bestMove.mate < 0 ? "Brilliant" : "Blunder";
                }
                else if (bestMove.cp != null && lastBestMove.cp != null)
                {
                    let evalDiff = -(bestMove.cp + lastBestMove.cp);

                    if (evalDiff > 100)
                        effectType = "Brilliant";
                    else if (evalDiff > 0) effectType = "GreatFind";
                    else if (evalDiff > -10) effectType = "BestMove";
                    else if (evalDiff > -25) effectType = "Excellent";
                    else if (evalDiff > -50) effectType = "Good";
                    else if (evalDiff > -100) effectType = "Inaccuracy";
                    else if (evalDiff > -250) effectType = "Mistake";
                    else effectType = "Blunder";
                } else
                {
                    console.assert(false, "Error while analyzing last move");
                }
            }
        }

        // this.master.game.controller.markings.removeOne(`effect|${lastMove.to}`);
        this.master.game.controller.markings.addOne({
            data: {
                square: lastMove.to,
                type: effectType as string,
            },
            node: true,
            persistent: true,
            type: "effect",
        });
    }

    private onTopMoves(move: TopMove | null = null, isBestMove: boolean = false)
    {
        if (move != null)
        {
            const index = this.topMoves.findIndex(object => object.move === move.move);

            if (isBestMove)
            {
                // check if the best move returned from stockfish matches
                // with the best move in the list, bring it to the top of
                // the list if it doesn't match
                if (this.topMoves[0].move != move.move)
                {
                    this.topMoves.splice(index, 1);
                    this.topMoves.splice(0, 0, move);
                    // console.log(this.topMoves);
                }
            } else
            {
                if (index === -1)
                {
                    this.topMoves.push(move);
                    this.SortTopMoves();
                }
                else if (move.depth >= this.topMoves[index].depth)
                {
                    // only replace if this move has a higher depth than
                    // the one in the current top move list
                    this.topMoves[index] = move;
                    this.SortTopMoves();
                }
            }
        }


        let top_pv_moves = this.topMoves.slice(0, this.options["MultiPV"] as number);
        this.master.game.HintMoves(top_pv_moves, this.lastTopMoves, isBestMove);
        if (this.master.options.move_analysis) this.AnalyzeLastMove();

        if (this.master.options.auto_move && isBestMove && this.master.game.controller.getPlayingAs() == this.master.game.controller.getTurn())
        {
            let bestMove = top_pv_moves[0];
            let legalMoves = this.master.game.controller.getLegalMoves();
            const index = legalMoves.findIndex(move => move.from === bestMove.from && move.to == bestMove.to);

            console.assert(index !== -1, "Illegal best move");

            let moveData = legalMoves[index];
            moveData.userGenerated = true;

            if (bestMove.promotion != null)
                moveData.promotion = bestMove.promotion;

            this.master.game.controller.move(moveData);
        }
    }

    private SortTopMoves()
    {
        // sort the top move list to bring the best moves on top (index 0)
        this.topMoves.sort(function (a, b)
        {
            if (b.mate === null)
            {
                // this move is mate and the other is not
                if (a.mate !== null)
                {
                    // a negative mate value is a losing move
                    return a.mate < 0 ? 1 : -1
                }

                // both moves has no mate, compare the depth first than centipawn
                if (a.depth === b.depth)
                {
                    if (a.cp === b.cp) return 0;
                    return (a.cp as number) > (b.cp as number) ? -1 : 1;
                }

                return a.depth > b.depth ? -1 : 1;
            }
            else
            {
                // both this move and other move is mate
                if (a.mate !== null)
                {
                    // both losing move, which takes more moves is better
                    // both winning move, which takes less move is better
                    if ((a.mate < 0 && b.mate < 0) ||
                        (a.mate > 0 && b.mate > 0))
                    {
                        return a.mate < b.mate ? 1 : -1;
                    }

                    // comparing a losing move with a winning move, positive mate score is winning
                    return a.mate > b.mate ? -1 : 1;
                }

                return b.mate < 0 ? 1 : -1;
            }
        });
    }
}

class ChessMint
{
    engine: StockfishEngine;
    game: GameController;
    options: ExtensionOptions;

    constructor(chessboard: HTMLElement, options: ExtensionOptions)
    {
        this.options = options;
        this.game = new GameController(this, chessboard);
        this.engine = new StockfishEngine(this);

        window.addEventListener("ChessMintUpdateOptions", (event) =>
        {
            this.options = (event as any).detail;
            this.game.UpdateExtensionOptions();
            this.engine.UpdateExtensionOptions();

            // show a notification when the settings is updated, but only if the previous notification has gone.
            if ((window as any).toaster.notifications.findIndex((noti: any) => noti.id == "chessmint-settings-updated") == -1)
            {
                (window as any).toaster.add({
                    id: "chessmint-settings-updated",
                    duration: 2000,
                    icon: "circle-gearwheel",
                    content: `Settings updated!`,
                })
            }

        }, false);
    }

    onEngineLoaded()
    {
        (window as any).toaster.add({
            id: "chess.com",
            duration: 3000,
            icon: "circle-info",
            content: `ChessMint is enabled!`,
        })
    }
}

var ChromeRequest = (function ()
{
    var requestId = 0;

    function getData(data?: any)
    {
        var id = requestId++;

        return new Promise(function (resolve, reject)
        {
            var listener = function (evt: any)
            {
                if (evt.detail.requestId == id)
                {
                    // Deregister self
                    window.removeEventListener("ChessMintSendOptions", listener);
                    resolve(evt.detail.data);
                }
            }

            window.addEventListener("ChessMintSendOptions", listener);

            var payload = { data: data, id: id };

            window.dispatchEvent(new CustomEvent("ChessMintGetOptions", { detail: payload }));
        });
    }

    return { getData: getData };
})();

function InitChessMint(chessboard: HTMLElement)
{
    fetch(Config.pathToEcoJson).then(async function (response)
    {
        let table = await response.json();
        ecoTable = new Map(table.map((data: any) => [data.f, true]));
    });

    // get the extension option first
    ChromeRequest.getData().then(function (options)
    {
        try
        {
            master = new ChessMint(chessboard, options as ExtensionOptions);
        } catch (e)
        {
            console.error(e);
            alert("Failed to load Chess Master");
        }
    });
}

// function MainWorker()
// {
//     console.log(self);
//     console.log("I'm thread");
//     self.InitChessMint();
// }

// var blob = new Blob(["onmessage = function(e){" + MainWorker.toString() + "; MainWorker();};"]);
// var blobURL = window.URL.createObjectURL(blob);

// let mainWorker = new Worker(blobURL);
// mainWorker.postMessage({})
// InitChessMint();


// the site define a `chess-board` element as `class ChessBoard`
// when it got defined, we hook its `createGame` method to initalize our code
// all custom elements:
// -  "chess-board":          class ChessBoard
// -  "eco-opening":          class EcoOpening
// -  "evaluation-bar":       class EvaluationBar
// -  "evaluation-lines":     class EvaluationLines
// -  "horizontal-move-list": class HorizontalMoveList
// -  "vertical-move-list":   class VML
customElements.whenDefined("chess-board").then(function (ctor: CustomElementConstructor)
{
    ctor.prototype._createGame = ctor.prototype.createGame;
    ctor.prototype.createGame = function (e: any)
    {
        let result = this._createGame(e);
        InitChessMint(this);
        return result;
    }
});