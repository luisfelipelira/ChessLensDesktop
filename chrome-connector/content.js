(() => {
    let previousSignature = '', fallbackTurn = null, protectEnabled = false, executing = false, chosenFrom = null, lastPieces = {}, lastSide = 'w', gameEndedSent = false;
    const role = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };

    function findBoard() {
        if (location.hostname.includes('chess.com')) return document.querySelector('wc-chess-board, chess-board, .board');
        return document.querySelector('cg-board');
    }

    function orientation(board) {
        const classes = `${board.className || ''} ${board.parentElement?.className || ''}`;
        return /flipped|orientation-black/.test(classes) ? 'b' : 'w';
    }

    function chessComPieces(board) {
        const result = {};
        board.querySelectorAll('.piece, piece').forEach(el => {
            const cls = typeof el.className === 'string' ? el.className : el.className?.baseVal || '';
            const kind = cls.match(/(?:^|\s)([wb])([prnbqk])(?:\s|$)/);
            const sq = cls.match(/square-([1-8])([1-8])/);
            if (kind && sq) result['abcdefgh'[+sq[1] - 1] + sq[2]] = kind[1] + kind[2];
        });
        return result;
    }

    function lichessPieces(board, side) {
        const result = {}, br = board.getBoundingClientRect(), cell = br.width / 8;
        board.querySelectorAll('piece').forEach(el => {
            const cls = [...el.classList], color = cls.includes('white') ? 'w' : cls.includes('black') ? 'b' : null;
            const type = Object.keys(role).find(x => cls.includes(x));
            if (!color || !type) return;
            const r = el.getBoundingClientRect(), col = Math.max(0, Math.min(7, Math.floor((r.left + r.width / 2 - br.left) / cell))), row = Math.max(0, Math.min(7, Math.floor((r.top + r.height / 2 - br.top) / cell)));
            const file = side === 'w' ? col : 7 - col, rank = side === 'w' ? 8 - row : row + 1;
            result['abcdefgh'[file] + rank] = color + role[type];
        });
        return result;
    }

    function placement(pieces) {
        const rows = [];
        for (let rank = 8; rank >= 1; rank--) {
            let row = '', empty = 0;
            for (const file of 'abcdefgh') {
                const p = pieces[file + rank];
                if (!p) empty++;
                else { if (empty) { row += empty; empty = 0; } row += p[0] === 'w' ? p[1].toUpperCase() : p[1]; }
            }
            if (empty) row += empty; rows.push(row);
        }
        return rows.join('/');
    }

    function inferredTurn(signature, playerColor) {
        const plyEls = [...document.querySelectorAll('[data-ply]')];
        const plies = plyEls.map(e => Number(e.getAttribute('data-ply'))).filter(Number.isFinite);
        if (plies.length) return Math.max(...plies) % 2 ? 'b' : 'w';
        if (signature !== previousSignature && previousSignature && fallbackTurn) fallbackTurn = fallbackTurn === 'w' ? 'b' : 'w';
        if (!fallbackTurn) fallbackTurn = playerColor;
        return fallbackTurn;
    }

    function castling(p) {
        let c = '';
        if (p.e1 === 'wk' && p.h1 === 'wr') c += 'K'; if (p.e1 === 'wk' && p.a1 === 'wr') c += 'Q';
        if (p.e8 === 'bk' && p.h8 === 'br') c += 'k'; if (p.e8 === 'bk' && p.a8 === 'br') c += 'q';
        return c || '-';
    }

    function playerClock(board) {
        const br = board.getBoundingClientRect(), candidates = [...document.querySelectorAll('[class*="clock"], [data-cy*="clock"], time')].map(el => { const text = (el.textContent || '').trim(), m = text.match(/(\d{1,2}):(\d{2})(?:[.,](\d))?/), r = el.getBoundingClientRect(); return m && r.width > 0 ? { m, r } : null }).filter(Boolean).filter(x => x.r.top < br.bottom + br.height * .35 && x.r.bottom > br.top + br.height * .45);
        if (!candidates.length) return null;
        candidates.sort((a, b) => b.r.top - a.r.top); const m = candidates[0].m;
        return Number(m[1]) * 60 + Number(m[2]) + Number(m[3] || 0) / 10;
    }

    async function scan() {
        const ended = document.querySelector('[data-cy*="game-over"], .game-over-modal, .game-over-header-component, .result-wrap');
        if (ended && !gameEndedSent) { gameEndedSent = true; chrome.runtime.sendMessage({ type: 'chesslens-game-ended' }).catch(() => { }); }
        const board = findBoard(); if (!board || board.getBoundingClientRect().width < 200) return;
        if (!ended) gameEndedSent = false;
        const side = orientation(board), site = location.hostname.includes('lichess') ? 'Lichess' : 'Chess.com';
        const pieces = site === 'Lichess' ? lichessPieces(board, side) : chessComPieces(board);
        if (Object.keys(pieces).length < 2) return;
        const signature = placement(pieces), turn = inferredTurn(signature, side);
        previousSignature = signature; lastPieces = pieces; lastSide = side;
        const fen = `${signature} ${turn} ${castling(pieces)} - 0 1`;
        try { await chrome.runtime.sendMessage({ type: 'chesslens-position', payload: { fen, turn, playerColor: side, site, url: location.href, clockSeconds: playerClock(board) } }); } catch (_) { }
    }

    function allowedMode() {
        return true
    }

    function playUci(uci) {
        if (!allowedMode() || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return;
        const board = findBoard(); if (!board) return;
        const side = orientation(board), r = board.getBoundingClientRect(), cell = r.width / 8;
        const point = sq => { const file = 'abcdefgh'.indexOf(sq[0]), rank = +sq[1], col = side === 'w' ? file : 7 - file, row = side === 'w' ? 8 - rank : rank - 1; return { x: r.left + (col + .5) * cell, y: r.top + (row + .5) * cell } };
        const from = point(uci.slice(0, 2)), to = point(uci.slice(2, 4)); executing = true;
        chrome.runtime.sendMessage({ type: 'chesslens-click-move', from, to }).finally(() => setTimeout(() => { executing = false }, 500));
    }

    async function pollCommand() { try { const r = await chrome.runtime.sendMessage({ type: 'chesslens-command' }); protectEnabled = !!r?.data?.protectSite; if (r?.data?.command?.uci) playUci(r.data.command.uci) } catch (_) { } }

    function squareFromPoint(board, x, y) { const r = board.getBoundingClientRect(), cell = r.width / 8, col = Math.max(0, Math.min(7, Math.floor((x - r.left) / cell))), row = Math.max(0, Math.min(7, Math.floor((y - r.top) / cell))), file = lastSide === 'w' ? col : 7 - col, rank = lastSide === 'w' ? 8 - row : row + 1; return 'abcdefgh'[file] + rank }
    function intercept(event) { if (!protectEnabled || executing || !allowedMode()) return; const board = findBoard(); if (!board || !board.contains(event.target)) return; event.preventDefault(); event.stopImmediatePropagation(); if (event.type !== 'pointerdown') return; const sq = squareFromPoint(board, event.clientX, event.clientY); if (!chosenFrom) { if (lastPieces[sq]?.[0] === lastSide) chosenFrom = sq; return } if (sq === chosenFrom) { chosenFrom = null; return } const from = chosenFrom; chosenFrom = null; chrome.runtime.sendMessage({ type: 'chesslens-proposal', payload: { from, to: sq, promotion: 'q' } }).catch(() => { }) }
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) document.addEventListener(type, intercept, true);

    setInterval(scan, 1200);
    setInterval(pollCommand, 500);
    scan();
    addEventListener('pagehide', () => { chrome.runtime.sendMessage({ type: 'chesslens-game-ended' }).catch(() => { }); });
})();
